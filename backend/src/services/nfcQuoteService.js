// Devis Entreprise : demande publique, chiffrage par l'admin, acceptation par le client
// → commande de N cartes (offre Entreprise) rattachées aux membres du compte Business.
const crypto = require('crypto');
const { pool } = require('../db');
const notifier = require('./n8nNotifier');
const pre = require('./nfcPreorderService');
const { findOfferByCode } = require('../models/nfcOfferModel');
const { frontendUrl } = require('../utils/nfcConfig');
const { trackingUrl } = require('../utils/nfcPreorderPayload');
const { QUOTE_STATUSES } = require('../models/nfcQuoteModel');

const { PreorderError } = pre;
const MIN_QTY = 2;
const MAX_QTY = 5000;
const DEDICATED_SUPPLIER_FROM = 100; // au-delà : commande fournisseur dédiée
const TEAM_EDITABLE = ['pending_payment', 'payment_submitted', 'rejected', 'paid', 'design_en_cours'];

function quoteLinks(q) {
  const front = frontendUrl();
  return {
    quote_url: `${front}/nfc/devis/${encodeURIComponent(q.reference)}?t=${q.public_token}`,
    admin_quote_url: `${front}/admin/nfc-quotes?ref=${encodeURIComponent(q.reference)}`,
  };
}

function quotePayload(q) {
  return {
    reference: q.reference,
    company: q.company,
    contact_name: q.contact_name,
    email: q.email,
    phone: q.phone,
    quantity: Number(q.quantity),
    desired_date: dateOnly(q.desired_date),
    message: q.message || null,
    status: q.status,
    price_per_card: q.price_per_card === null ? null : Number(q.price_per_card),
    total_amount: q.total_amount === null ? null : Number(q.total_amount),
    valid_until: dateOnly(q.valid_until),
    admin_message: q.admin_message || null,
    decline_reason: q.decline_reason || null,
    dedicated_supplier: !!q.dedicated_supplier,
  };
}

async function emitQuote(conn, q, event, events) {
  events.push(await notifier.emitGeneric(conn, event, { quote: quotePayload(q), links: quoteLinks(q) }));
}

// Date SQL (objet Date renvoyé par mysql2, ou chaîne) → « AAAA-MM-JJ »
function dateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function isExpired(validUntil) {
  const d = dateOnly(validUntil);
  return !!d && new Date(`${d}T23:59:59`) < new Date();
}

function toDateOrNull(raw) {
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()) ? s : null;
}

async function lockQuote(conn, where, params) {
  const [[q]] = await conn.query(`SELECT * FROM nfc_quotes WHERE ${where} FOR UPDATE`, params);
  if (!q) throw new PreorderError(404, 'Devis introuvable.');
  return q;
}

// ── Demande (public) ──────────────────────────────────────────────────────────

async function requestQuote(body = {}, { userId = null } = {}) {
  const errors = {};
  const company = pre.cleanText(body.company, 200);
  if (company.length < 2 || company.length > 160) errors.company = 'Nom de l\'entreprise requis.';
  const contactName = pre.cleanText(body.contact_name, 150);
  if (contactName.length < 2 || contactName.length > 120) errors.contact_name = 'Nom du contact requis.';
  const email = String(body.email || '').trim().toLowerCase();
  if (!pre.EMAIL_RE.test(email) || email.length > 190) errors.email = 'Adresse e-mail invalide.';
  const phone = pre.normalizePhone(body.phone);
  if (!phone) errors.phone = 'Numéro invalide : saisissez un numéro sénégalais, par exemple 77 123 45 67.';
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < MIN_QTY || quantity > MAX_QTY) errors.quantity = `Nombre de cartes : entre ${MIN_QTY} et ${MAX_QTY}.`;
  const desiredDate = toDateOrNull(body.desired_date);
  const message = pre.cleanText(body.message, 2000) || null;
  if (Object.keys(errors).length) throw new PreorderError(422, Object.values(errors)[0], { errors });

  // Compte Business du demandeur (administrateur du compte)
  let businessAccountId = null;
  if (userId) {
    const [[ba]] = await pool.query(
      'SELECT id FROM business_accounts WHERE admin_user_id = ? AND deleted_at IS NULL LIMIT 1', [userId]
    ).catch(() => [[null]]);
    if (ba) businessAccountId = ba.id;
  }

  const token = crypto.randomBytes(32).toString('hex');
  return pre.withTransaction(async (conn, events) => {
    const [r] = await conn.query(
      `INSERT INTO nfc_quotes (public_token, user_id, business_account_id, company, contact_name, email, phone,
         quantity, desired_date, message, dedicated_supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, userId || null, businessAccountId, company, contactName, email, phone, quantity, desiredDate, message,
        quantity >= DEDICATED_SUPPLIER_FROM ? 1 : 0]
    );
    const reference = `PF-DEV-${String(r.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE nfc_quotes SET reference = ? WHERE id = ?', [reference, r.insertId]);
    const q = await lockQuote(conn, 'id = ?', [r.insertId]);
    await emitQuote(conn, q, 'quote.requested', events);
    return { reference, status: q.status };
  });
}

// ── Consultation / réponse du client (lien du devis) ──────────────────────────

async function getPublicQuote(reference, token) {
  const [[q]] = await pool.query('SELECT * FROM nfc_quotes WHERE reference = ?', [String(reference || '')]);
  if (!q || !pre.safeEqual(q.public_token, token)) throw new PreorderError(404, 'Devis introuvable.');
  const out = quotePayload(q);
  out.expired = q.status === 'devis_envoye' && isExpired(q.valid_until);
  if (q.order_id) {
    const [[o]] = await pool.query('SELECT reference, public_token FROM nfc_preorders WHERE id = ?', [q.order_id]);
    if (o) out.tracking_url = trackingUrl(o);
  }
  return out;
}

function memberInfo(m) {
  return {
    name: [m.prenom, m.nom].filter(Boolean).join(' ').trim(),
    title: m.poste || '',
    phone: pre.normalizePhone(m.phone) || '',
    email: m.email || '',
    profile_url: m.url_slug ? `portefolia.tech/portfolio/${m.url_slug}` : '',
  };
}

// Membres d'un compte Business : administrateur + membres actifs, avec leur portfolio le plus récent
async function businessMembers(conn, businessAccountId) {
  if (!businessAccountId) return [];
  const [rows] = await conn.query(
    `SELECT u.id AS user_id, u.prenom, u.nom, u.email, u.phone, x.poste,
            (SELECT p.id FROM portfolios p WHERE p.utilisateur_id = u.id AND (p.deleted_at IS NULL OR p.deleted_at = '0000-00-00 00:00:00') ORDER BY p.est_public DESC, p.id DESC LIMIT 1) AS portfolio_id,
            (SELECT p.url_slug FROM portfolios p WHERE p.utilisateur_id = u.id AND (p.deleted_at IS NULL OR p.deleted_at = '0000-00-00 00:00:00') ORDER BY p.est_public DESC, p.id DESC LIMIT 1) AS url_slug
     FROM (
       SELECT ba.admin_user_id AS user_id, NULL AS poste, 0 AS ord FROM business_accounts ba WHERE ba.id = ?
       UNION
       SELECT bm.user_id, bm.poste, 1 AS ord FROM business_members bm WHERE bm.business_account_id = ? AND bm.status = 'active' AND bm.user_id IS NOT NULL
     ) x JOIN utilisateurs u ON u.id = x.user_id
     ORDER BY x.ord, u.prenom`, [businessAccountId, businessAccountId]
  );
  return rows;
}

async function acceptQuote(reference, token) {
  const offer = await findOfferByCode('entreprise');
  if (!offer) throw new PreorderError(500, 'Offre Entreprise introuvable.');
  return pre.withTransaction(async (conn, events) => {
    const q = await lockQuote(conn, 'reference = ?', [String(reference || '')]);
    if (!pre.safeEqual(q.public_token, token)) throw new PreorderError(404, 'Devis introuvable.');
    if (q.status !== 'devis_envoye') throw new PreorderError(409, 'Ce devis ne peut plus être accepté.');
    if (isExpired(q.valid_until)) {
      throw new PreorderError(409, 'Ce devis a expiré : contactez-nous pour le renouveler.');
    }

    // Compte client : demandeur connecté, sinon compte existant avec cet e-mail
    let userId = q.user_id;
    if (!userId) {
      const [[u]] = await conn.query(
        "SELECT id FROM utilisateurs WHERE LOWER(TRIM(email)) = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00') LIMIT 1", [q.email]
      );
      if (u) userId = u.id;
    }

    const orderToken = crypto.randomBytes(32).toString('hex');
    const total = Number(q.price_per_card) * Number(q.quantity);
    const [r] = await conn.query(
      `INSERT INTO nfc_preorders
        (public_token, user_id, offer_id, offer_code, offer_name, stock_type, quote_id, business_account_id,
         full_name, card_name, email, phone, quantity, unit_price, total_amount, currency, notes, customization, source)
       VALUES (?, ?, ?, 'entreprise', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'XOF', ?, ?, 'devis')`,
      [orderToken, userId || null, offer.id, offer.name, q.stock_type || 'blank', q.id, q.business_account_id,
        q.contact_name, q.company, q.email, q.phone, q.quantity, q.price_per_card, total, q.message,
        JSON.stringify({ quote_reference: q.reference, company: q.company })]
    );
    const orderRef = `PF-NFC-${String(r.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE nfc_preorders SET reference = ? WHERE id = ?', [orderRef, r.insertId]);

    // Une carte par membre (pré-remplie depuis le compte Business), le reste à compléter par l'entreprise
    const members = await businessMembers(conn, q.business_account_id);
    const design = JSON.stringify({ template: 'classique', finish: 'noir', notes: q.message || undefined });
    const rows = Array.from({ length: Number(q.quantity) }, (_, i) => {
      const m = members[i];
      return [r.insertId, i + 1, m ? m.user_id : null, m ? m.portfolio_id : null, JSON.stringify(m ? memberInfo(m) : {}), design];
    });
    for (let i = 0; i < rows.length; i += 200) {
      await conn.query(
        'INSERT INTO nfc_order_items (order_id, position, holder_user_id, portfolio_id, printed_info, design) VALUES ?',
        [rows.slice(i, i + 200)]
      );
    }

    await conn.query(
      "UPDATE nfc_quotes SET status = 'devis_accepte', accepted_at = NOW(), order_id = ? WHERE id = ?", [r.insertId, q.id]
    );
    events.push(await notifier.emit(conn, r.insertId, 'preorder.created'));
    await emitQuote(conn, { ...q, status: 'devis_accepte' }, 'quote.accepted', events);
    const [[order]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ?', [r.insertId]);
    return { order_reference: orderRef, tracking_url: trackingUrl(order), prefilled_members: Math.min(members.length, Number(q.quantity)) };
  });
}

async function declineQuote(reference, token, reason) {
  return pre.withTransaction(async (conn, events) => {
    const q = await lockQuote(conn, 'reference = ?', [String(reference || '')]);
    if (!pre.safeEqual(q.public_token, token)) throw new PreorderError(404, 'Devis introuvable.');
    if (!['devis_demande', 'devis_envoye'].includes(q.status)) throw new PreorderError(409, 'Ce devis est déjà clôturé.');
    const motif = pre.cleanText(reason, 500) || null;
    await conn.query("UPDATE nfc_quotes SET status = 'devis_refuse', declined_at = NOW(), decline_reason = ? WHERE id = ?", [motif, q.id]);
    await emitQuote(conn, { ...q, status: 'devis_refuse', message: motif }, 'quote.declined', events);
    return { status: 'devis_refuse' };
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function listQuotes({ status, q, page = 1, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (status && QUOTE_STATUSES.includes(status)) { where.push('q.status = ?'); params.push(status); }
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push('(q.reference LIKE ? OR q.company LIKE ? OR q.contact_name LIKE ? OR q.email LIKE ? OR q.phone LIKE ?)');
    params.push(like, like, like, like, like);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pg = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 20));
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM nfc_quotes q ${sqlWhere}`, params);
  const [rows] = await pool.query(
    `SELECT q.*, o.reference AS order_reference, o.status AS order_status, ba.company_name AS business_name
     FROM nfc_quotes q LEFT JOIN nfc_preorders o ON o.id = q.order_id LEFT JOIN business_accounts ba ON ba.id = q.business_account_id
     ${sqlWhere} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`, [...params, lim, (pg - 1) * lim]
  );
  const [counts] = await pool.query('SELECT status, COUNT(*) AS n FROM nfc_quotes GROUP BY status');
  return {
    total: Number(total), page: pg, limit: lim,
    by_status: Object.fromEntries(QUOTE_STATUSES.map((s) => [s, Number((counts.find((c) => c.status === s) || {}).n || 0)])),
    liste: rows.map(({ public_token, ...rest }) => rest),
  };
}

async function sendQuote(id, body = {}, ctx = {}) {
  const price = Number(body.price_per_card);
  if (!Number.isInteger(price) || price < 100 || price > 10000000) throw new PreorderError(422, 'Prix par carte invalide (F CFA, nombre entier).');
  const stockType = ['logo_printed', 'blank'].includes(body.stock_type) ? body.stock_type : 'blank';
  let validUntil = toDateOrNull(body.valid_until);
  if (!validUntil) {
    const d = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    validUntil = d.toISOString().slice(0, 10);
  }
  const adminMessage = pre.cleanText(body.admin_message, 2000) || null;
  return pre.withTransaction(async (conn, events) => {
    const q = await lockQuote(conn, 'id = ?', [id]);
    if (!['devis_demande', 'devis_envoye'].includes(q.status)) throw new PreorderError(409, 'Ce devis est déjà clôturé.');
    const total = price * Number(q.quantity);
    await conn.query(
      `UPDATE nfc_quotes SET status = 'devis_envoye', price_per_card = ?, total_amount = ?, valid_until = ?, admin_message = ?,
         stock_type = ?, dedicated_supplier = ?, handled_by = ?, sent_at = NOW() WHERE id = ?`,
      [price, total, validUntil, adminMessage, stockType, body.dedicated_supplier ? 1 : 0, ctx.adminId || null, q.id]
    );
    const fresh = await lockQuote(conn, 'id = ?', [q.id]);
    await emitQuote(conn, fresh, 'quote.sent', events);
    await pre.logAdmin(conn, ctx, 'NFC_QUOTE_SEND', { id: q.id, reference: q.reference, price_per_card: price, total });
    const { public_token, ...rest } = fresh;
    return rest;
  });
}

async function cancelQuote(id, ctx = {}) {
  return pre.withTransaction(async (conn) => {
    const q = await lockQuote(conn, 'id = ?', [id]);
    if (!['devis_demande', 'devis_envoye'].includes(q.status)) throw new PreorderError(409, 'Ce devis est déjà clôturé.');
    await conn.query("UPDATE nfc_quotes SET status = 'annule' WHERE id = ?", [q.id]);
    await pre.logAdmin(conn, ctx, 'NFC_QUOTE_CANCEL', { id: q.id, reference: q.reference });
    return { status: 'annule' };
  });
}

// ── Cartes de l'équipe (commande Entreprise, depuis le lien de suivi) ─────────

async function teamFor(order, conn = pool) {
  if (order.offer_code !== 'entreprise') return null;
  const [items] = await conn.query(
    'SELECT id, position, holder_user_id, printed_info FROM nfc_order_items WHERE order_id = ? ORDER BY position', [order.id]
  );
  const members = await businessMembers(conn, order.business_account_id);
  return {
    editable: TEAM_EDITABLE.includes(order.status),
    items: items.map((i) => {
      let info = {};
      try { info = JSON.parse(i.printed_info || '{}'); } catch { info = {}; }
      return { id: i.id, position: i.position, holder_user_id: i.holder_user_id, info };
    }),
    members: members.map((m) => ({ user_id: m.user_id, name: [m.prenom, m.nom].filter(Boolean).join(' '), email: m.email, poste: m.poste || '' })),
  };
}

async function updateTeamItem(reference, token, itemId, body = {}) {
  return pre.withTransaction(async (conn) => {
    const [[o]] = await conn.query('SELECT * FROM nfc_preorders WHERE reference = ? FOR UPDATE', [String(reference || '')]);
    if (!o || !pre.safeEqual(o.public_token, token)) throw new PreorderError(404, 'Commande introuvable.');
    if (o.offer_code !== 'entreprise') throw new PreorderError(409, 'Réservé aux commandes Entreprise.');
    if (!TEAM_EDITABLE.includes(o.status)) throw new PreorderError(409, 'Les cartes ne sont plus modifiables : le bon à tirer est en cours.');
    const [[item]] = await conn.query('SELECT * FROM nfc_order_items WHERE id = ? AND order_id = ? FOR UPDATE', [Number(itemId), o.id]);
    if (!item) throw new PreorderError(404, 'Carte introuvable.');

    let holder = item.holder_user_id;
    let portfolioId = item.portfolio_id;
    if (body.member_user_id !== undefined) {
      if (body.member_user_id === null || body.member_user_id === '') {
        holder = null;
        portfolioId = null;
      } else {
        const m = (await businessMembers(conn, o.business_account_id)).find((x) => Number(x.user_id) === Number(body.member_user_id));
        if (!m) throw new PreorderError(422, 'Ce membre ne fait pas partie de l\'entreprise.');
        holder = m.user_id;
        portfolioId = m.portfolio_id;
      }
    }
    const raw = body.info || {};
    const info = {
      name: pre.cleanText(raw.name, 80),
      title: pre.cleanText(raw.title, 80),
      phone: raw.phone ? (pre.normalizePhone(raw.phone) || '') : '',
      email: String(raw.email || '').trim().toLowerCase().slice(0, 190),
      profile_url: '',
    };
    if (raw.phone && !info.phone) throw new PreorderError(422, 'Numéro invalide (ex. 77 123 45 67).');
    if (info.email && !pre.EMAIL_RE.test(info.email)) throw new PreorderError(422, 'Adresse e-mail invalide.');
    if (portfolioId) {
      const [[p]] = await conn.query('SELECT url_slug FROM portfolios WHERE id = ?', [portfolioId]);
      if (p) info.profile_url = `portefolia.tech/portfolio/${p.url_slug}`;
    }
    await conn.query(
      'UPDATE nfc_order_items SET holder_user_id = ?, portfolio_id = ?, printed_info = ? WHERE id = ?',
      [holder, portfolioId, JSON.stringify(info), item.id]
    );
    return { ok: true, item: { id: item.id, position: item.position, holder_user_id: holder, info } };
  });
}

module.exports = {
  dateOnly, isExpired,
  MIN_QTY, MAX_QTY, DEDICATED_SUPPLIER_FROM,
  requestQuote, getPublicQuote, acceptQuote, declineQuote,
  listQuotes, sendQuote, cancelQuote,
  teamFor, updateTeamItem, quotePayload,
};
