// Production des cartes NFC : bon à tirer (BAT), attribution des codes, impression, livraison.
// Statuts : paid → design_en_cours → bat_envoye → bat_valide → en_impression → prete → livree
const { pool } = require('../db');
const notifier = require('./n8nNotifier');
const pre = require('./nfcPreorderService');
const cards = require('./nfcCardService');
const { findOfferById } = require('../models/nfcOfferModel');
const { getNfcConfig, frontendUrl } = require('../utils/nfcConfig');
const { uploadAsset } = require('../utils/nfcAssets');

const { PreorderError } = pre;

// Statut de la commande comptable (table commandes) correspondant à l'étape de fabrication
const COMMANDE_STATUT = { en_impression: 'En_traitement', prete: 'Gravée', livree: 'Livrée' };

async function offerOf(conn, p) {
  return p.offer_id ? findOfferById(p.offer_id, conn) : null;
}

async function itemsOf(conn, orderId, { lock = false } = {}) {
  const [rows] = await conn.query(
    `SELECT * FROM nfc_order_items WHERE order_id = ? ORDER BY position ${lock ? 'FOR UPDATE' : ''}`, [orderId]
  );
  return rows;
}

async function syncCommande(conn, p, status) {
  const statut = COMMANDE_STATUT[status];
  if (!statut || !p.commande_id) return;
  await conn.query(
    `UPDATE commandes SET statut = ?${status === 'livree' ? ', date_livraison = NOW()' : ''} WHERE id = ?`,
    [statut, p.commande_id]
  );
}

// ── Codes de carte ────────────────────────────────────────────────────────────

// Attribue une carte physique du bon stock à chaque ligne qui n'en a pas encore (premier entré, premier sorti)
async function assignCards(conn, p, events) {
  const offer = await offerOf(conn, p);
  const stockType = p.stock_type || (offer && offer.stock_type);
  const items = (await itemsOf(conn, p.id, { lock: true })).filter((i) => !i.card_id);
  if (!items.length) return { assigned: 0, missing: 0, stock_type: stockType };
  if (!stockType) return { assigned: 0, missing: items.length, stock_type: null };

  let assigned = 0;
  for (const item of items) {
    const [[card]] = await conn.query(
      "SELECT id FROM nfc_physical_cards WHERE type_stock = ? AND statut = 'en_stock' ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
      [stockType]
    );
    if (!card) break;
    await conn.query(
      `UPDATE nfc_physical_cards SET statut = 'attribuee', user_id = ?, portfolio_id = ?, order_id = ?, order_item_id = ?,
         assigned_at = NOW() WHERE id = ?`,
      [item.holder_user_id || p.user_id, item.portfolio_id, p.id, item.id, card.id]
    );
    await conn.query('UPDATE nfc_order_items SET card_id = ? WHERE id = ?', [card.id, item.id]);
    assigned++;
  }
  if (assigned) events.push(...await cards.checkStockAlerts(conn));
  return { assigned, missing: items.length - assigned, stock_type: stockType };
}

// ── Étapes ────────────────────────────────────────────────────────────────────

async function setStatus(conn, p, to, extraSet = '') {
  pre.assertTransition(p, to);
  await conn.query(`UPDATE nfc_preorders SET status = ?${extraSet ? `, ${extraSet}` : ''} WHERE id = ?`, [to, p.id]);
}

// Envoie le BAT au client : chaque carte doit avoir ses visuels
async function sendBatInternal(conn, p, events) {
  const items = await itemsOf(conn, p.id);
  const ready = items.length > 0 && items.every((i) => i.preview_front_url && i.preview_back_url && i.print_front_url && i.print_back_url);
  if (!ready) return false;
  await setStatus(conn, p, 'bat_envoye', 'bat_sent_at = NOW(), bat_reminder_count = 0, last_bat_reminder_at = NULL');
  events.push(await notifier.emit(conn, p.id, 'bat.sent'));
  return true;
}

// Après validation du paiement (dans la même transaction)
async function afterPayment(conn, orderId, events) {
  const p = await pre.lockById(conn, orderId);
  const offer = await offerOf(conn, p);
  const needsDesign = !!(offer && offer.options && offer.options.needs_design);
  // Standard / Personnalisée : le visuel validé à la commande sert de BAT
  if (!needsDesign && await sendBatInternal(conn, p, events)) return 'bat_envoye';
  await setStatus(conn, p, 'design_en_cours');
  events.push(await notifier.emit(conn, p.id, 'order.design_started'));
  return 'design_en_cours';
}

async function startDesign(id, ctx = {}) {
  return pre.withTransaction(async (conn, events) => {
    const p = await pre.lockById(conn, id);
    await setStatus(conn, p, 'design_en_cours');
    events.push(await notifier.emit(conn, p.id, 'order.design_started'));
    await pre.logAdmin(conn, ctx, 'NFC_ORDER_DESIGN_START', { id: p.id, reference: p.reference });
    return pre.getById(p.id, conn);
  });
}

// Dépôt du BAT par l'admin (fichiers prêts à imprimer : 600 dpi, 3 mm de fond perdu)
async function uploadBat(id, files = {}, itemId = null, ctx = {}) {
  const front = files.front && files.front[0];
  const back = files.back && files.back[0];
  if (!front && !back) throw new PreorderError(422, 'Ajoutez au moins un visuel (recto ou verso).');
  const [[p0]] = await pool.query('SELECT * FROM nfc_preorders WHERE id = ?', [id]);
  if (!p0) throw new PreorderError(404, 'Commande introuvable.');
  if (!['paid', 'design_en_cours', 'bat_envoye'].includes(p0.status)) {
    throw new PreorderError(409, `Le BAT ne peut plus être modifié : la commande est ${pre.STATUS_LABELS[p0.status] || p0.status}.`);
  }
  const prefix = `${p0.reference}_bat`;
  const urls = {};
  if (front) urls.front = await uploadAsset(front, 'bat', { folder: 'nfc/bat', prefix: `${prefix}_recto` }).catch((e) => { throw new PreorderError(e.status || 502, e.message); });
  if (back) urls.back = await uploadAsset(back, 'bat', { folder: 'nfc/bat', prefix: `${prefix}_verso` }).catch((e) => { throw new PreorderError(e.status || 502, e.message); });

  return pre.withTransaction(async (conn) => {
    const p = await pre.lockById(conn, id);
    const sets = [];
    const params = [];
    if (urls.front) { sets.push('print_front_url = ?', 'preview_front_url = ?'); params.push(urls.front, previewUrl(urls.front)); }
    if (urls.back) { sets.push('print_back_url = ?', 'preview_back_url = ?'); params.push(urls.back, previewUrl(urls.back)); }
    sets.push('bat_revision = bat_revision + 1');
    const where = itemId ? 'order_id = ? AND id = ?' : 'order_id = ?';
    const [r] = await conn.query(`UPDATE nfc_order_items SET ${sets.join(', ')} WHERE ${where}`, [...params, p.id, ...(itemId ? [Number(itemId)] : [])]);
    if (!r.affectedRows) throw new PreorderError(404, 'Carte de la commande introuvable.');
    await pre.logAdmin(conn, ctx, 'NFC_ORDER_BAT_UPLOAD', { id: p.id, reference: p.reference, item_id: itemId || 'toutes', ...urls });
    return { ok: true, items: await itemsOf(conn, p.id) };
  });
}

// Version allégée pour l'aperçu (transformation Cloudinary à la volée)
function previewUrl(url) {
  return String(url).replace('/image/upload/', '/image/upload/w_1200,f_auto,q_auto/');
}

async function sendBat(id, ctx = {}) {
  return pre.withTransaction(async (conn, events) => {
    const p = await pre.lockById(conn, id);
    pre.assertTransition(p, 'bat_envoye');
    if (!await sendBatInternal(conn, p, events)) {
      throw new PreorderError(422, 'Déposez le recto et le verso de chaque carte avant d\'envoyer le BAT.');
    }
    await pre.logAdmin(conn, ctx, 'NFC_ORDER_BAT_SEND', { id: p.id, reference: p.reference });
    return pre.getById(p.id, conn);
  });
}

// Lot d'impression : alerte admin quand le nombre de cartes au BAT validé atteint le seuil
async function checkPrintBatch(conn, addedItems, events) {
  const cfg = await getNfcConfig();
  const [[q]] = await conn.query(
    "SELECT COUNT(*) AS n FROM nfc_order_items i JOIN nfc_preorders p ON p.id = i.order_id WHERE p.status = 'bat_valide'"
  );
  const n = Number(q.n);
  const before = n - addedItems;
  if (before < cfg.print_batch_threshold && n >= cfg.print_batch_threshold) {
    events.push(await notifier.emitGeneric(conn, 'print_batch.ready', {
      print: { cards: n, threshold: cfg.print_batch_threshold },
      links: { admin_production_url: `${frontendUrl()}/admin/nfc-preorders?status=bat_valide` },
    }));
  }
}

async function approveBatLocked(conn, p, events, by) {
  pre.assertTransition(p, 'bat_valide');
  await conn.query(
    "UPDATE nfc_preorders SET status = 'bat_valide', bat_validated_at = NOW(), bat_comment = NULL WHERE id = ?", [p.id]
  );
  const fresh = await pre.lockById(conn, p.id);
  const attribution = await assignCards(conn, fresh, events);
  events.push(await notifier.emit(conn, p.id, 'bat.approved'));
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM nfc_order_items WHERE order_id = ?', [p.id]);
  await checkPrintBatch(conn, Number(n), events);
  return { status: 'bat_valide', approved_by: by, ...attribution };
}

// Validation du BAT par le client (lien de suivi)
async function approveBatByClient(reference, token) {
  return pre.withTransaction(async (conn, events) => {
    const [[p]] = await conn.query('SELECT * FROM nfc_preorders WHERE reference = ? FOR UPDATE', [String(reference || '')]);
    if (!p || !pre.safeEqual(p.public_token, token)) throw new PreorderError(404, 'Commande introuvable.');
    const r = await approveBatLocked(conn, p, events, 'client');
    return { status: r.status };
  });
}

// Validation du BAT par l'admin pour le client (accord reçu par WhatsApp, etc.)
async function approveBatByAdmin(id, ctx = {}) {
  return pre.withTransaction(async (conn, events) => {
    const p = await pre.lockById(conn, id);
    const r = await approveBatLocked(conn, p, events, 'admin');
    await pre.logAdmin(conn, ctx, 'NFC_ORDER_BAT_APPROVE', { id: p.id, reference: p.reference, ...r });
    return r;
  });
}

async function requestBatChanges(reference, token, comment) {
  const text = pre.cleanText(comment, 1000);
  if (text.length < 3) throw new PreorderError(422, 'Décrivez la correction souhaitée.');
  return pre.withTransaction(async (conn, events) => {
    const [[p]] = await conn.query('SELECT * FROM nfc_preorders WHERE reference = ? FOR UPDATE', [String(reference || '')]);
    if (!p || !pre.safeEqual(p.public_token, token)) throw new PreorderError(404, 'Commande introuvable.');
    if (p.status !== 'bat_envoye') throw new PreorderError(409, 'Aucun bon à tirer en attente de validation.');
    await setStatus(conn, p, 'design_en_cours', 'bat_revision = bat_revision + 1');
    await conn.query('UPDATE nfc_preorders SET bat_comment = ? WHERE id = ?', [text, p.id]);
    events.push(await notifier.emit(conn, p.id, 'bat.changes_requested'));
    return { status: 'design_en_cours' };
  });
}

// Avancement de la fabrication par l'admin
async function advance(id, to, ctx = {}) {
  if (!['en_impression', 'prete', 'livree'].includes(to)) throw new PreorderError(422, 'Étape inconnue.');
  return pre.withTransaction(async (conn, events) => {
    const p = await pre.lockById(conn, id);
    pre.assertTransition(p, to);
    if (to === 'en_impression') {
      const a = await assignCards(conn, p, events);
      if (a.missing > 0) {
        throw new PreorderError(409,
          `Stock insuffisant : il manque ${a.missing} carte(s) « ${a.stock_type ? cards.STOCK_LABELS[a.stock_type] : 'type à définir'} ». Recevez un lot dans « Stock & codes ».`);
      }
      await setStatus(conn, p, to, 'printing_at = NOW()');
    } else if (to === 'prete') {
      await conn.query(
        "UPDATE nfc_physical_cards SET statut = 'imprimee', printed_at = NOW() WHERE order_id = ? AND statut = 'attribuee'", [p.id]
      );
      await setStatus(conn, p, to, 'ready_at = NOW()');
    } else {
      await conn.query(
        "UPDATE nfc_physical_cards SET statut = 'livree', delivered_at = NOW() WHERE order_id = ? AND statut IN ('attribuee','imprimee')", [p.id]
      );
      await setStatus(conn, p, to, 'delivered_at = NOW()');
    }
    await syncCommande(conn, p, to);
    events.push(await notifier.emit(conn, p.id, { en_impression: 'order.printing', prete: 'order.ready', livree: 'order.delivered' }[to]));
    await pre.logAdmin(conn, ctx, 'NFC_ORDER_ADVANCE', { id: p.id, reference: p.reference, from: p.status, to });
    return pre.getById(p.id, conn);
  });
}

// ── File d'impression ─────────────────────────────────────────────────────────

async function printQueue({ statuses = ['bat_valide', 'en_impression'], ids = null } = {}) {
  const params = [statuses];
  let extra = '';
  if (ids && ids.length) { extra = ' AND p.id IN (?)'; params.push(ids); }
  const [rows] = await pool.query(
    `SELECT i.id AS item_id, i.position, i.print_front_url, i.print_back_url, i.preview_back_url, i.printed_info,
            p.id AS order_id, p.reference, p.status, p.quantity, p.offer_name, p.offer_code,
            COALESCE(p.stock_type, o.stock_type) AS stock_type, o.options AS offer_options,
            c.code AS card_code, u.email AS holder_email
     FROM nfc_order_items i
     JOIN nfc_preorders p ON p.id = i.order_id
     LEFT JOIN nfc_offers o ON o.id = p.offer_id
     LEFT JOIN nfc_physical_cards c ON c.id = i.card_id
     LEFT JOIN utilisateurs u ON u.id = i.holder_user_id
     WHERE p.status IN (?)${extra}
     ORDER BY p.bat_validated_at ASC, p.id ASC, i.position ASC`, params
  );
  return rows.map((r) => {
    let options = {};
    try { options = JSON.parse(r.offer_options || '{}'); } catch { options = {}; }
    let info = {};
    try { info = JSON.parse(r.printed_info || '{}'); } catch { info = {}; }
    const { offer_options, printed_info, ...rest } = r;
    return { ...rest, print_faces: options.print_faces || 'info', holder_name: info.name || '' };
  });
}

// Passe en impression les commandes au BAT validé (toutes, ou celles indiquées)
async function startPrintBatch(ids, ctx = {}) {
  const [rows] = await pool.query(
    `SELECT id, reference FROM nfc_preorders WHERE status = 'bat_valide'${ids && ids.length ? ' AND id IN (?)' : ''} ORDER BY bat_validated_at ASC`,
    ids && ids.length ? [ids] : []
  );
  const started = [];
  const blocked = [];
  for (const r of rows) {
    try {
      await advance(r.id, 'en_impression', ctx);
      started.push(r.reference);
    } catch (err) {
      blocked.push({ reference: r.reference, error: err.message });
    }
  }
  return { started, blocked };
}

module.exports = {
  assignCards, afterPayment, startDesign, uploadBat, sendBat,
  approveBatByClient, approveBatByAdmin, requestBatChanges, advance,
  printQueue, startPrintBatch, previewUrl,
};
