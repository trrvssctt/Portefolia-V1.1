// Cartes NFC physiques : génération des codes, lots fournisseur, stock, redirection /c/:code.
const crypto = require('crypto');
const { pool } = require('../db');
const notifier = require('./n8nNotifier');
const { getNfcConfig, frontendUrl } = require('../utils/nfcConfig');
const { STOCK_TYPES, CARD_STATUSES } = require('../models/nfcCardModel');

// URL encodée dans la puce : ne doit JAMAIS changer une fois les cartes commandées
const CARD_BASE_URL = 'https://portefolia.tech/c/';

// 31 caractères : pas de 0/O, 1/I/L (confusion à la lecture du code imprimé)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);
const MAX_BATCH = 1000;

const STOCK_LABELS = { logo_printed: 'Logo imprimé', blank: 'Vierge' };
const STATUS_LABELS = {
  en_commande: 'En commande',
  en_stock: 'En stock',
  attribuee: 'Attribuée',
  imprimee: 'Imprimée',
  livree: 'Livrée',
  desactivee: 'Désactivée',
};

class CardError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH * 2);
  let out = '';
  // Rejet des octets ≥ 248 (8 × 31) pour une distribution uniforme
  for (let i = 0; i < bytes.length && out.length < CODE_LENGTH; i++) {
    if (bytes[i] < 248) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out.length === CODE_LENGTH ? out : generateCode();
}

function normalizeCode(raw) {
  const s = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return CODE_RE.test(s) ? s : null;
}

function cardUrl(code) {
  return `${CARD_BASE_URL}${code}`;
}

async function withTransaction(fn) {
  const conn = await pool.getConnection();
  const eventIds = [];
  try {
    await conn.beginTransaction();
    const result = await fn(conn, eventIds);
    await conn.commit();
    notifier.flush(eventIds);
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function logAdmin(conn, ctx, action, details) {
  try {
    await conn.query(
      `INSERT INTO admin_action_logs (admin_id, action, resource, details, ip_address, user_agent)
       VALUES (?, ?, 'nfc_cards', ?, ?, ?)`,
      [ctx.adminId || null, action, JSON.stringify(details), ctx.ip || '', String(ctx.userAgent || '').slice(0, 250)]
    );
  } catch (err) {
    console.warn('nfcCard logAdmin:', err.message);
  }
}

// ── Lots fournisseur ──────────────────────────────────────────────────────────

async function createBatch({ type_stock, quantity, supplier, notes }, ctx = {}) {
  if (!STOCK_TYPES.includes(type_stock)) throw new CardError(422, 'Type de carte invalide.');
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_BATCH) {
    throw new CardError(422, `Quantité invalide (1 à ${MAX_BATCH}).`);
  }
  return withTransaction(async (conn) => {
    const [b] = await conn.query(
      'INSERT INTO nfc_card_batches (type_stock, quantity, supplier, notes, created_by) VALUES (?, ?, ?, ?, ?)',
      [type_stock, qty, String(supplier || '').trim().slice(0, 120) || null, String(notes || '').trim().slice(0, 500) || null, ctx.adminId || null]
    );
    // Insertion par paquets ; INSERT IGNORE écarte les (rares) collisions, que l'on recomble ensuite
    let created = 0;
    let guard = 0;
    while (created < qty && guard++ < 50) {
      const n = Math.min(200, qty - created);
      const rows = Array.from({ length: n }, () => [generateCode(), type_stock, 'en_commande', b.insertId]);
      const [r] = await conn.query(
        'INSERT IGNORE INTO nfc_physical_cards (code, type_stock, statut, batch_id) VALUES ?', [rows]
      );
      created += r.affectedRows;
    }
    if (created !== qty) throw new Error('Génération des codes incomplète');
    await logAdmin(conn, ctx, 'NFC_CARDS_BATCH_CREATE', { batch_id: b.insertId, type_stock, quantity: qty });
    return getBatch(b.insertId, conn);
  });
}

async function getBatch(id, conn = pool) {
  const [[b]] = await conn.query(
    `SELECT b.*, COUNT(c.id) AS cards,
            SUM(c.statut NOT IN ('en_commande','en_stock')) AS used
     FROM nfc_card_batches b LEFT JOIN nfc_physical_cards c ON c.batch_id = b.id
     WHERE b.id = ? GROUP BY b.id`, [id]
  );
  if (!b) throw new CardError(404, 'Lot introuvable.');
  return { ...b, cards: Number(b.cards), used: Number(b.used || 0) };
}

async function listBatches() {
  const [rows] = await pool.query(
    `SELECT b.*, COUNT(c.id) AS cards, SUM(c.statut NOT IN ('en_commande','en_stock')) AS used
     FROM nfc_card_batches b LEFT JOIN nfc_physical_cards c ON c.batch_id = b.id
     GROUP BY b.id ORDER BY b.created_at DESC`
  );
  return rows.map((b) => ({ ...b, cards: Number(b.cards), used: Number(b.used || 0) }));
}

// Lot reçu du fournisseur : ses cartes entrent en stock
async function receiveBatch(id, ctx = {}) {
  return withTransaction(async (conn, events) => {
    const [[b]] = await conn.query('SELECT * FROM nfc_card_batches WHERE id = ? FOR UPDATE', [id]);
    if (!b) throw new CardError(404, 'Lot introuvable.');
    if (b.status === 'recu') throw new CardError(409, 'Ce lot est déjà marqué comme reçu.');
    await conn.query("UPDATE nfc_card_batches SET status = 'recu', received_at = NOW() WHERE id = ?", [id]);
    const [r] = await conn.query(
      "UPDATE nfc_physical_cards SET statut = 'en_stock' WHERE batch_id = ? AND statut = 'en_commande'", [id]
    );
    await logAdmin(conn, ctx, 'NFC_CARDS_BATCH_RECEIVE', { batch_id: id, cards: r.affectedRows });
    return { batch: await getBatch(id, conn), received: r.affectedRows };
  });
}

async function batchCards(id) {
  await getBatch(id);
  const [rows] = await pool.query(
    'SELECT code, type_stock, statut FROM nfc_physical_cards WHERE batch_id = ? ORDER BY id ASC', [id]
  );
  return rows.map((r, i) => ({ n: i + 1, ...r, url: cardUrl(r.code) }));
}

// ── Stock ─────────────────────────────────────────────────────────────────────

async function getStock(conn = pool) {
  const cfg = await getNfcConfig();
  const [rows] = await conn.query(
    'SELECT type_stock, statut, COUNT(*) AS n FROM nfc_physical_cards GROUP BY type_stock, statut'
  );
  const thresholds = { logo_printed: cfg.stock_alert_logo_printed, blank: cfg.stock_alert_blank };
  const byType = {};
  for (const t of STOCK_TYPES) {
    byType[t] = { type_stock: t, label: STOCK_LABELS[t], threshold: thresholds[t], total: 0, ...Object.fromEntries(CARD_STATUSES.map((s) => [s, 0])) };
  }
  for (const r of rows) {
    byType[r.type_stock][r.statut] = Number(r.n);
    byType[r.type_stock].total += Number(r.n);
  }
  for (const t of STOCK_TYPES) {
    byType[t].available = byType[t].en_stock;
    byType[t].low = byType[t].available < byType[t].threshold;
  }
  return { types: Object.values(byType), print_batch_threshold: cfg.print_batch_threshold };
}

// Prévient l'admin (n8n) quand un stock passe sous son seuil — au plus une fois par 24 h et par type
async function checkStockAlerts(conn) {
  const stock = await getStock(conn); // même transaction : voit la carte qui vient d'être prise
  const ids = [];
  for (const t of stock.types) {
    if (!t.low || t.total === 0) continue; // aucun lot de ce type : pas d'alerte
    const [[recent]] = await conn.query(
      `SELECT id FROM nfc_preorder_events
       WHERE event = 'stock.low' AND created_at > NOW() - INTERVAL 24 HOUR
         AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.stock.type_stock')) = ?
       LIMIT 1`, [t.type_stock]
    );
    if (recent) continue;
    ids.push(await notifier.emitGeneric(conn, 'stock.low', {
      stock: { type_stock: t.type_stock, label: t.label, available: t.available, threshold: t.threshold },
      links: { admin_stock_url: `${frontendUrl()}/admin/nfc-stock` },
    }));
  }
  return ids;
}

// ── Cartes ────────────────────────────────────────────────────────────────────

const CARD_SELECT = `
  SELECT c.*, u.email AS user_email, TRIM(CONCAT(COALESCE(u.prenom,''),' ',COALESCE(u.nom,''))) AS user_name,
         p.url_slug AS portfolio_slug, p.titre AS portfolio_title, o.reference AS order_reference
  FROM nfc_physical_cards c
  LEFT JOIN utilisateurs u ON u.id = c.user_id
  LEFT JOIN portfolios p ON p.id = c.portfolio_id
  LEFT JOIN nfc_preorders o ON o.id = c.order_id`;

function decorate(c) {
  return { ...c, url: cardUrl(c.code), statut_label: STATUS_LABELS[c.statut], type_label: STOCK_LABELS[c.type_stock] };
}

async function listCards({ statut, type_stock, batch_id, q, page = 1, limit = 50 } = {}) {
  const where = [];
  const params = [];
  if (statut && CARD_STATUSES.includes(statut)) { where.push('c.statut = ?'); params.push(statut); }
  if (type_stock && STOCK_TYPES.includes(type_stock)) { where.push('c.type_stock = ?'); params.push(type_stock); }
  if (batch_id) { where.push('c.batch_id = ?'); params.push(Number(batch_id)); }
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push('(c.code LIKE ? OR u.email LIKE ? OR u.nom LIKE ? OR u.prenom LIKE ? OR o.reference LIKE ?)');
    params.push(like, like, like, like, like);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pg = Math.max(1, Number(page) || 1);
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM nfc_physical_cards c
     LEFT JOIN utilisateurs u ON u.id = c.user_id LEFT JOIN nfc_preorders o ON o.id = c.order_id ${sqlWhere}`, params
  );
  const [rows] = await pool.query(`${CARD_SELECT} ${sqlWhere} ORDER BY c.id DESC LIMIT ? OFFSET ?`, [...params, lim, (pg - 1) * lim]);
  return { total: Number(total), page: pg, limit: lim, liste: rows.map(decorate) };
}

async function getByCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) throw new CardError(404, 'Carte introuvable.');
  const [[c]] = await pool.query(`${CARD_SELECT} WHERE c.code = ?`, [code]);
  if (!c) throw new CardError(404, 'Carte introuvable.');
  return decorate(c);
}

async function lockCard(conn, id) {
  const [[c]] = await conn.query('SELECT * FROM nfc_physical_cards WHERE id = ? FOR UPDATE', [id]);
  if (!c) throw new CardError(404, 'Carte introuvable.');
  return c;
}

async function deactivateCard(id, reason, ctx = {}) {
  const motif = String(reason || '').trim().slice(0, 255);
  if (motif.length < 3) throw new CardError(422, 'Indiquez le motif (perte, vol, remplacement…).');
  return withTransaction(async (conn) => {
    const c = await lockCard(conn, id);
    if (c.statut === 'desactivee') throw new CardError(409, 'Cette carte est déjà désactivée.');
    await conn.query(
      `UPDATE nfc_physical_cards SET previous_statut = statut, statut = 'desactivee',
         deactivation_reason = ?, deactivated_at = NOW() WHERE id = ?`, [motif, id]
    );
    await logAdmin(conn, ctx, 'NFC_CARD_DEACTIVATE', { id, code: c.code, reason: motif });
  }).then(() => getCardById(id));
}

async function reactivateCard(id, ctx = {}) {
  return withTransaction(async (conn) => {
    const c = await lockCard(conn, id);
    if (c.statut !== 'desactivee') throw new CardError(409, 'Cette carte n\'est pas désactivée.');
    const back = CARD_STATUSES.includes(c.previous_statut) && c.previous_statut !== 'desactivee'
      ? c.previous_statut : (c.user_id ? 'livree' : 'en_stock');
    await conn.query(
      `UPDATE nfc_physical_cards SET statut = ?, previous_statut = NULL, deactivation_reason = NULL,
         deactivated_at = NULL WHERE id = ?`, [back, id]
    );
    await logAdmin(conn, ctx, 'NFC_CARD_REACTIVATE', { id, code: c.code, statut: back });
  }).then(() => getCardById(id));
}

// Attribue (ou réattribue) une carte à un utilisateur, par e-mail ; portfolio par défaut : le plus récent public
async function assignCard(id, { email, portfolio_id, statut }, ctx = {}) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail) throw new CardError(422, 'Indiquez l\'e-mail du titulaire.');
  return withTransaction(async (conn, events) => {
    const c = await lockCard(conn, id);
    if (c.statut === 'desactivee') throw new CardError(409, 'Réactivez la carte avant de l\'attribuer.');
    if (c.statut === 'en_commande') throw new CardError(409, 'Cette carte n\'est pas encore reçue (lot en commande).');
    const [[u]] = await conn.query(
      "SELECT id FROM utilisateurs WHERE LOWER(TRIM(email)) = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00') LIMIT 1",
      [mail]
    );
    if (!u) throw new CardError(404, 'Aucun compte avec cet e-mail.');
    const portfolioId = await resolvePortfolioForUser(conn, u.id, portfolio_id);
    const next = ['attribuee', 'imprimee', 'livree'].includes(statut) ? statut
      : (c.statut === 'en_stock' ? 'attribuee' : c.statut);
    await conn.query(
      `UPDATE nfc_physical_cards SET user_id = ?, portfolio_id = ?, statut = ?,
         assigned_at = COALESCE(assigned_at, NOW()) WHERE id = ?`,
      [u.id, portfolioId, next, id]
    );
    if (c.statut === 'en_stock') events.push(...await checkStockAlerts(conn));
    await logAdmin(conn, ctx, 'NFC_CARD_ASSIGN', { id, code: c.code, user_id: u.id, previous_user_id: c.user_id, statut: next });
  }).then(() => getCardById(id));
}

const MANUAL_STATUS = { attribuee: 'assigned_at', imprimee: 'printed_at', livree: 'delivered_at' };

async function setCardStatus(id, statut, ctx = {}) {
  if (!MANUAL_STATUS[statut] && statut !== 'en_stock') throw new CardError(422, 'Statut invalide.');
  return withTransaction(async (conn) => {
    const c = await lockCard(conn, id);
    if (c.statut === 'desactivee') throw new CardError(409, 'Réactivez la carte d\'abord.');
    if (statut === 'en_stock') {
      // Remise en stock : la carte n'est plus liée à personne
      await conn.query(
        `UPDATE nfc_physical_cards SET statut = 'en_stock', user_id = NULL, portfolio_id = NULL, order_id = NULL,
           order_item_id = NULL, assigned_at = NULL, printed_at = NULL, delivered_at = NULL WHERE id = ?`, [id]
      );
    } else {
      if (!c.user_id) throw new CardError(409, 'Attribuez d\'abord la carte à un titulaire.');
      await conn.query(
        `UPDATE nfc_physical_cards SET statut = ?, ${MANUAL_STATUS[statut]} = COALESCE(${MANUAL_STATUS[statut]}, NOW()) WHERE id = ?`,
        [statut, id]
      );
    }
    await logAdmin(conn, ctx, 'NFC_CARD_STATUS', { id, code: c.code, from: c.statut, to: statut });
  }).then(() => getCardById(id));
}

async function getCardById(id) {
  const [[c]] = await pool.query(`${CARD_SELECT} WHERE c.id = ?`, [id]);
  if (!c) throw new CardError(404, 'Carte introuvable.');
  return decorate(c);
}

// Portfolio visé par la carte : celui demandé s'il appartient à l'utilisateur, sinon son plus récent public
async function resolvePortfolioForUser(conn, userId, wantedId) {
  if (wantedId) {
    const [[p]] = await conn.query(
      "SELECT id FROM portfolios WHERE id = ? AND utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')",
      [Number(wantedId), userId]
    );
    if (!p) throw new CardError(422, 'Ce portfolio n\'appartient pas au titulaire.');
    return p.id;
  }
  const [[p]] = await conn.query(
    `SELECT id FROM portfolios WHERE utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
     ORDER BY est_public DESC, id DESC LIMIT 1`, [userId]
  );
  return p ? p.id : null;
}

// ── Redirection /c/:code ──────────────────────────────────────────────────────

// Retourne { state, slug?, code } — state : ok | inconnue | non_activee | preparation | desactivee | indisponible
async function resolveCode(rawCode, { countTap = true } = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { state: 'inconnue', code: null };
  const [[c]] = await pool.query('SELECT * FROM nfc_physical_cards WHERE code = ?', [code]);
  if (!c) return { state: 'inconnue', code };
  if (c.statut === 'desactivee') return { state: 'desactivee', code };
  if (c.statut === 'en_commande' || c.statut === 'en_stock' || !c.user_id) return { state: 'non_activee', code };
  if (c.statut === 'attribuee') return { state: 'preparation', code };

  // Carte imprimée ou livrée : portfolio choisi, sinon le plus récent public du titulaire
  const [[target]] = await pool.query(
    `SELECT url_slug FROM portfolios
     WHERE utilisateur_id = ? AND est_public = 1 AND url_slug IS NOT NULL AND url_slug <> ''
       AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
     ORDER BY (id = ?) DESC, id DESC LIMIT 1`,
    [c.user_id, c.portfolio_id || 0]
  );
  if (!target) return { state: 'indisponible', code };
  if (countTap) {
    pool.query('UPDATE nfc_physical_cards SET tap_count = tap_count + 1, last_tap_at = NOW() WHERE id = ?', [c.id])
      .catch(() => {});
  }
  return { state: 'ok', code, slug: target.url_slug };
}

function redirectUrlFor(result) {
  const front = frontendUrl();
  if (result.state === 'ok') {
    return `${front}/portfolio/${encodeURIComponent(result.slug)}?src=nfc&card=${result.code}`;
  }
  const etat = { inconnue: 'non-activee', non_activee: 'non-activee', preparation: 'en-preparation', desactivee: 'desactivee', indisponible: 'indisponible' }[result.state] || 'non-activee';
  return `${front}/carte/${etat}${result.code ? `?code=${result.code}` : ''}`;
}

// Carte valide et liée à ce portfolio : sert à marquer la visite comme venant d'un tap NFC
async function cardIdForPortfolio(rawCode, portfolioId) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const [[c]] = await pool.query(
    "SELECT c.id FROM nfc_physical_cards c JOIN portfolios p ON p.id = ? WHERE c.code = ? AND c.user_id = p.utilisateur_id AND c.statut IN ('imprimee','livree')",
    [portfolioId, code]
  );
  return c ? c.id : null;
}

module.exports = {
  CardError,
  CARD_BASE_URL,
  CODE_ALPHABET,
  STOCK_LABELS,
  STATUS_LABELS,
  generateCode,
  normalizeCode,
  cardUrl,
  createBatch,
  listBatches,
  getBatch,
  receiveBatch,
  batchCards,
  getStock,
  checkStockAlerts,
  listCards,
  getByCode,
  getCardById,
  deactivateCard,
  reactivateCard,
  assignCard,
  setCardStatus,
  resolvePortfolioForUser,
  resolveCode,
  redirectUrlFor,
  cardIdForPortfolio,
};
