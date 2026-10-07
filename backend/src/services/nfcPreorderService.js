// Précommandes de cartes NFC : logique métier et transitions de statut (point d'entrée unique).
// Les e-mails ne partent pas d'ici : chaque changement émet un événement que n8n traite.
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const notifier = require('./n8nNotifier');
const { getNfcConfig, frontendUrl } = require('../utils/nfcConfig');
const { buildPreorderPayload } = require('../utils/nfcPreorderPayload');

// ── Erreurs ───────────────────────────────────────────────────────────────────

class PreorderError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ── Statuts ───────────────────────────────────────────────────────────────────

const STATUSES = ['pending_payment', 'payment_submitted', 'paid', 'rejected', 'expired', 'cancelled', 'converted'];

// statut cible → statuts de départ autorisés
const TRANSITIONS = {
  payment_submitted: ['pending_payment', 'rejected'],
  paid: ['payment_submitted'],
  rejected: ['payment_submitted'],
  expired: ['pending_payment', 'rejected'],
  cancelled: ['pending_payment', 'payment_submitted', 'rejected'],
  converted: ['paid'],
};

const STATUS_LABELS = {
  pending_payment: 'en attente de paiement',
  payment_submitted: 'paiement déclaré',
  paid: 'payée',
  rejected: 'paiement refusé',
  expired: 'expirée',
  cancelled: 'annulée',
  converted: 'convertie en commande',
};

function assertTransition(preorder, toStatus) {
  const allowed = TRANSITIONS[toStatus] || [];
  if (!allowed.includes(preorder.status)) {
    throw new PreorderError(409,
      `Action impossible : la précommande ${preorder.reference} est ${STATUS_LABELS[preorder.status] || preorder.status}.`);
  }
}

// ── Validation des entrées ────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+2217[05678]\d{7}$/;
const WAVE_TX_RE = /^[A-Z0-9_-]{6,64}$/;

function normalizePhone(raw) {
  let s = String(raw || '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^7\d{8}$/.test(s)) s = '+221' + s;
  else if (/^221\d{9}$/.test(s)) s = '+' + s;
  return PHONE_RE.test(s) ? s : null;
}

function cleanText(v, max) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.slice(0, max);
}

function validateCreateInput(body, cfg) {
  const errors = {};
  const full_name = cleanText(body.full_name, 200);
  if (full_name.length < 2 || full_name.length > 120) errors.full_name = 'Nom complet requis (2 à 120 caractères).';

  const card_name = cleanText(body.card_name || full_name, 200);
  if (card_name.length < 2 || card_name.length > 80) errors.card_name = 'Nom à imprimer requis (2 à 80 caractères).';

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 190) errors.email = 'Adresse e-mail invalide.';

  const phone = normalizePhone(body.phone);
  if (!phone) errors.phone = 'Numéro invalide : saisissez un numéro sénégalais, par exemple 77 123 45 67.';

  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > cfg.max_quantity) {
    errors.quantity = `Quantité invalide (entre 1 et ${cfg.max_quantity}).`;
  }

  const city = cleanText(body.city, 80) || null;
  const notes = cleanText(body.notes, 500) || null;

  if (Object.keys(errors).length) {
    throw new PreorderError(422, Object.values(errors)[0], { errors });
  }
  return { full_name, card_name, email, phone, quantity, city, notes };
}

function normalizeWaveTx(raw) {
  const s = String(raw || '').trim().toUpperCase();
  return WAVE_TX_RE.test(s) ? s : null;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

// ── Utilitaires transactionnels ───────────────────────────────────────────────

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

async function lockById(conn, id) {
  const [[p]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ? FOR UPDATE', [id]);
  if (!p) throw new PreorderError(404, 'Précommande introuvable.');
  return p;
}

async function logAdmin(conn, ctx, action, details) {
  try {
    await conn.query(
      `INSERT INTO admin_action_logs (admin_id, action, resource, details, ip_address, user_agent)
       VALUES (?, ?, 'nfc_preorders', ?, ?, ?)`,
      [ctx.adminId || null, action, JSON.stringify(details), ctx.ip || '', String(ctx.userAgent || '').slice(0, 250)]
    );
  } catch (err) {
    console.warn('nfcPreorder logAdmin:', err.message);
  }
}

// ── Côté client ───────────────────────────────────────────────────────────────

// Statuts qui empêchent une nouvelle précommande pour le même e-mail / téléphone
const ACTIVE_STATUSES = ['pending_payment', 'payment_submitted', 'rejected'];

const ACTIVE_MESSAGES = {
  pending_payment: 'est en attente de paiement',
  payment_submitted: 'a un paiement en cours de vérification',
  rejected: 'attend une nouvelle déclaration de paiement',
};

async function findActiveByContact({ email, phone }) {
  const conds = [];
  const params = [];
  if (email) { conds.push('email = ?'); params.push(email); }
  if (phone) { conds.push('phone = ?'); params.push(phone); }
  if (!conds.length) return null;
  const [[p]] = await pool.query(
    `SELECT * FROM nfc_preorders
     WHERE status IN (?) AND (${conds.join(' OR ')})
     ORDER BY id DESC LIMIT 1`,
    [ACTIVE_STATUSES, ...params]
  );
  if (!p) return null;
  return { preorder: p, match: email && p.email === email ? 'email' : 'phone' };
}

function contactFromBody(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  return {
    email: EMAIL_RE.test(email) ? email : null,
    phone: body.phone ? normalizePhone(body.phone) : null,
  };
}

// Vérification en direct depuis le formulaire : ne révèle ni le lien de suivi ni les données du client
async function checkContact(body) {
  const found = await findActiveByContact(contactFromBody(body));
  if (!found) return { active: false };
  const { preorder: p, match } = found;
  return {
    active: true,
    match,
    reference: p.reference,
    status: p.status,
    message: `Une précommande (${p.reference}) ${ACTIVE_MESSAGES[p.status]} pour ${match === 'email' ? 'cet e-mail' : 'ce numéro'}.`,
  };
}

// Renvoie au client (et seulement au client) le dernier e-mail, qui contient son lien de suivi
async function resendTrackingLink(body) {
  const found = await findActiveByContact(contactFromBody(body));
  if (!found) throw new PreorderError(404, 'Aucune précommande en cours pour ces coordonnées.');
  const r = await notifier.resendLast(found.preorder.id, { clientOnly: true });
  if (!r) throw new PreorderError(409, 'Impossible de renvoyer le lien pour le moment.');
  const [user, domain] = found.preorder.email.split('@');
  return { ok: true, email_hint: `${user.slice(0, 2)}***@${domain}` };
}

async function createPreorder(body, { userId = null } = {}) {
  const cfg = await getNfcConfig();
  const input = validateCreateInput(body, cfg);

  // Une seule précommande en cours par e-mail et par téléphone
  const existing = await findActiveByContact({ email: input.email, phone: input.phone });
  if (existing) {
    const p = existing.preorder;
    throw new PreorderError(409,
      `Une précommande (${p.reference}) ${ACTIVE_MESSAGES[p.status]} pour ${existing.match === 'email' ? 'cet e-mail' : 'ce numéro'}. Retrouvez-la grâce au lien reçu par e-mail.`,
      { reference: p.reference, active_status: p.status, match: existing.match });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const unitPrice = cfg.unit_price;
  const total = unitPrice * input.quantity;

  const preorder = await withTransaction(async (conn, events) => {
    const [res] = await conn.query(
      `INSERT INTO nfc_preorders
        (public_token, user_id, full_name, card_name, email, phone, city, quantity, unit_price, total_amount, currency, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')`,
      [token, userId || null, input.full_name, input.card_name, input.email, input.phone, input.city,
        input.quantity, unitPrice, total, cfg.currency, input.notes]
    );
    const reference = `PF-NFC-${String(res.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE nfc_preorders SET reference = ? WHERE id = ?', [reference, res.insertId]);
    events.push(await notifier.emit(conn, res.insertId, 'preorder.created'));
    const [[row]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ?', [res.insertId]);
    return row;
  });

  return { preorder, token, cfg };
}

async function findByReferenceAndToken(reference, token) {
  const [[p]] = await pool.query('SELECT * FROM nfc_preorders WHERE reference = ? LIMIT 1', [String(reference || '')]);
  if (!p || !safeEqual(p.public_token, token)) throw new PreorderError(404, 'Précommande introuvable.');
  return p;
}

async function submitPayment(reference, token, body) {
  const txId = normalizeWaveTx(body.wave_transaction_id);
  if (!txId) {
    throw new PreorderError(422, "Identifiant de transaction Wave invalide (6 à 64 caractères : lettres, chiffres, - ou _).");
  }
  if (txId.startsWith('PF-NFC')) {
    throw new PreorderError(422,
      "Ceci est la référence de votre précommande. Saisissez l'identifiant de la transaction affiché dans l'application Wave.");
  }
  let senderPhone = null;
  if (body.wave_sender_phone) {
    senderPhone = normalizePhone(body.wave_sender_phone);
    if (!senderPhone) throw new PreorderError(422, 'Numéro Wave invalide.');
  }

  return withTransaction(async (conn, events) => {
    const [[p]] = await conn.query('SELECT * FROM nfc_preorders WHERE reference = ? FOR UPDATE', [String(reference || '')]);
    if (!p || !safeEqual(p.public_token, token)) throw new PreorderError(404, 'Précommande introuvable.');
    assertTransition(p, 'payment_submitted');

    const [[dup]] = await conn.query(
      'SELECT id FROM nfc_preorders WHERE wave_transaction_id = ? AND id <> ? LIMIT 1', [txId, p.id]
    );
    if (dup) throw new PreorderError(409, 'Cette transaction Wave a déjà été utilisée pour une autre précommande.');

    try {
      await conn.query(
        `UPDATE nfc_preorders
         SET status = 'payment_submitted', wave_transaction_id = ?, wave_sender_phone = ?,
             payment_submitted_at = NOW(), rejection_reason = NULL, rejected_at = NULL, last_admin_reminder_at = NULL
         WHERE id = ?`,
        [txId, senderPhone, p.id]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new PreorderError(409, 'Cette transaction Wave a déjà été utilisée pour une autre précommande.');
      throw err;
    }
    events.push(await notifier.emit(conn, p.id, 'preorder.payment_submitted'));
    return { status: 'payment_submitted' };
  });
}

// ── Côté admin ────────────────────────────────────────────────────────────────

async function validatePayment(id, ctx) {
  return withTransaction(async (conn, events) => {
    const p = await lockById(conn, id);
    assertTransition(p, 'paid');
    await conn.query(
      "UPDATE nfc_preorders SET status = 'paid', paid_at = NOW(), validated_by = ? WHERE id = ?",
      [ctx.adminId || null, p.id]
    );
    // Commande + paiement réussi : la précommande apparaît dans les finances, les stats,
    // le dashboard admin et l'historique de paiement du client
    const accounting = await recordPaidPreorder(conn, await lockById(conn, p.id));
    events.push(await notifier.emit(conn, p.id, 'preorder.paid'));
    await logAdmin(conn, ctx, 'NFC_PREORDER_VALIDATE', {
      id: p.id, reference: p.reference, wave_transaction_id: p.wave_transaction_id, ...accounting,
    });
    return getById(p.id, conn);
  });
}

async function rejectPayment(id, reason, ctx) {
  const motif = cleanText(reason, 255);
  if (motif.length < 3) throw new PreorderError(422, 'Le motif du refus est obligatoire.');
  return withTransaction(async (conn, events) => {
    const p = await lockById(conn, id);
    assertTransition(p, 'rejected');
    await conn.query(
      "UPDATE nfc_preorders SET status = 'rejected', rejection_reason = ?, rejected_at = NOW(), validated_by = ? WHERE id = ?",
      [motif, ctx.adminId || null, p.id]
    );
    events.push(await notifier.emit(conn, p.id, 'preorder.rejected'));
    await logAdmin(conn, ctx, 'NFC_PREORDER_REJECT', { id: p.id, reference: p.reference, reason: motif });
    return getById(p.id, conn);
  });
}

async function cancelPreorder(id, reason, ctx) {
  const motif = cleanText(reason, 255) || null;
  return withTransaction(async (conn, events) => {
    const p = await lockById(conn, id);
    assertTransition(p, 'cancelled');
    await conn.query(
      "UPDATE nfc_preorders SET status = 'cancelled', rejection_reason = ? WHERE id = ?",
      [motif, p.id]
    );
    events.push(await notifier.emit(conn, p.id, 'preorder.cancelled'));
    await logAdmin(conn, ctx, 'NFC_PREORDER_CANCEL', { id: p.id, reference: p.reference, reason: motif });
    return getById(p.id, conn);
  });
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  const prenom = parts.shift() || 'Client';
  const nom = parts.join(' ') || prenom;
  return { prenom, nom };
}

// Compte client de la précommande : celui de la précommande, sinon par e-mail, sinon compte invité
async function resolveCustomer(conn, p) {
  if (p.user_id) return { userId: p.user_id, guestCreated: false };
  const [[u]] = await conn.query(
    "SELECT id FROM utilisateurs WHERE LOWER(TRIM(email)) = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00') LIMIT 1",
    [p.email]
  );
  if (u) return { userId: u.id, guestCreated: false };
  const { prenom, nom } = splitName(p.full_name);
  const hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const [ins] = await conn.query(
    `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, phone, photo_profil, biographie, role, is_active, verified)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, 'GUEST', 1, 0)`,
    [nom, prenom, p.email, hash, p.phone]
  );
  return { userId: ins.insertId, guestCreated: true };
}

// Crée la commande payée et le paiement réussi d'une précommande payée (idempotent).
// Aucun e-mail n'est envoyé ici : le client a déjà la confirmation via n8n.
async function recordPaidPreorder(conn, p) {
  if (p.commande_id) return { commande_id: p.commande_id, already: true };
  const { userId, guestCreated } = await resolveCustomer(conn, p);
  const paidAt = p.paid_at || new Date();
  const numero = `CMD-${Date.now()}-${p.reference}`;
  const note = `Précommande ${p.reference} — ${p.quantity} carte(s), nom imprimé : ${p.card_name}`;

  // Les deux jeux de colonnes de commandes sont remplis : paiement_statut/montant_total (page Commandes)
  // et statut_paiement/montant (KPI finance et dashboard)
  const [cmd] = await conn.query(
    `INSERT INTO commandes
      (utilisateur_id, numero_commande, type_commande, statut, montant_total, montant, adresse_livraison,
       statut_paiement, paiement_statut, paiement_mode, paiement_reference, paiement_date, paiement_note, created_at)
     VALUES (?, ?, 'commande_carte', 'En_attente', ?, ?, ?, 'PAID', 'payé', 'wave', ?, ?, ?, NOW())`,
    [userId, numero, p.total_amount, p.total_amount, p.city, p.wave_transaction_id, paidAt, note]
  );
  const metadata = JSON.stringify({
    source: 'nfc_preorder', preorder_id: p.id, preorder_reference: p.reference,
    quantity: Number(p.quantity), unit_price: Number(p.unit_price), wave_sender_phone: p.wave_sender_phone || null,
  });
  const [pay] = await conn.query(
    `INSERT INTO paiements
      (commande_id, moyen_paiement, reference_transaction, montant, statut, type_flux, type_paiement,
       metadata, date_paiement, created_at, updated_at)
     VALUES (?, 'wave', ?, ?, 'Réussi', 'NFC', 'commande_nfc', ?, ?, ?, NOW())`,
    [cmd.insertId, p.wave_transaction_id, p.total_amount, metadata, paidAt, paidAt]
  );
  await conn.query('UPDATE commandes SET paiement_id = ? WHERE id = ?', [pay.insertId, cmd.insertId]);
  await conn.query('UPDATE nfc_preorders SET commande_id = ?, user_id = ? WHERE id = ?', [cmd.insertId, userId, p.id]);
  return { commande_id: cmd.insertId, paiement_id: pay.insertId, numero_commande: numero, guest_created: guestCreated };
}

// Lancement de la fabrication : la commande (créée à la validation du paiement) passe « En traitement »
async function convertToCommande(id, ctx) {
  return withTransaction(async (conn) => {
    let p = await lockById(conn, id);
    assertTransition(p, 'converted');
    const accounting = await recordPaidPreorder(conn, p); // précommandes validées avant cette version
    p = await lockById(conn, id);
    await conn.query(
      "UPDATE commandes SET statut = 'En_traitement' WHERE id = ? AND statut = 'En_attente'",
      [p.commande_id]
    );
    await conn.query("UPDATE nfc_preorders SET status = 'converted' WHERE id = ?", [p.id]);
    const [[cmd]] = await conn.query('SELECT numero_commande FROM commandes WHERE id = ?', [p.commande_id]);
    await logAdmin(conn, ctx, 'NFC_PREORDER_CONVERT', { id: p.id, reference: p.reference, commande_id: p.commande_id });
    return {
      preorder: await getById(p.id, conn),
      commande_id: p.commande_id,
      numero_commande: cmd ? cmd.numero_commande : null,
      guest_created: !!accounting.guest_created,
    };
  });
}

// Rattrapage : précommandes payées sans commande ni paiement (validées avant cette version)
async function backfillPaidPreorders() {
  const [rows] = await pool.query(
    "SELECT id FROM nfc_preorders WHERE status IN ('paid','converted') AND commande_id IS NULL"
  );
  const done = [];
  for (const { id } of rows) {
    done.push(await withTransaction(async (conn) => recordPaidPreorder(conn, await lockById(conn, id))));
  }
  return done;
}

async function resendLastNotification(id, ctx) {
  const p = await getById(id);
  if (!p) throw new PreorderError(404, 'Précommande introuvable.');
  const r = await notifier.resendLast(p.id);
  if (!r) throw new PreorderError(409, 'Aucune notification à renvoyer pour cette précommande.');
  await logAdmin(pool, ctx, 'NFC_PREORDER_RESEND', { id: p.id, reference: p.reference, event: r.event });
  return r;
}

async function getById(id, conn = pool) {
  const [[p]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ?', [id]);
  return p || null;
}

async function getDetail(id) {
  const p = await getById(id);
  if (!p) throw new PreorderError(404, 'Précommande introuvable.');
  const [events] = await pool.query(
    'SELECT id, event, attempts, delivered_at, last_error, created_at FROM nfc_preorder_events WHERE preorder_id = ? ORDER BY created_at DESC',
    [id]
  );
  const [notifications] = await pool.query(
    'SELECT id, event_id, channel, audience, template, recipient, status, error, created_at FROM nfc_preorder_notifications WHERE preorder_id = ? ORDER BY created_at DESC',
    [id]
  );
  return { preorder: toAdmin(p), events, notifications };
}

function toAdmin(p) {
  const { public_token, ...rest } = p;
  return rest;
}

function buildFilters({ status, q } = {}) {
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) { where.push('status = ?'); params.push(status); }
  if (q && String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    where.push('(reference LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR wave_transaction_id LIKE ? OR card_name LIKE ?)');
    params.push(like, like, like, like, like, like);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function list({ status, q, page = 1, limit = 20 } = {}) {
  const pg = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 20));
  const f = buildFilters({ status, q });
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM nfc_preorders ${f.sql}`, f.params);
  const [rows] = await pool.query(
    `SELECT * FROM nfc_preorders ${f.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...f.params, lim, (pg - 1) * lim]
  );
  return { total: Number(total), page: pg, limit: lim, liste: rows.map(toAdmin) };
}

async function listAllForExport({ status, q } = {}) {
  const f = buildFilters({ status, q });
  const [rows] = await pool.query(`SELECT * FROM nfc_preorders ${f.sql} ORDER BY created_at DESC`, f.params);
  return rows;
}

async function getStats() {
  const cfg = await getNfcConfig();
  const [rows] = await pool.query('SELECT status, COUNT(*) AS n FROM nfc_preorders GROUP BY status');
  const by_status = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) by_status[r.status] = Number(r.n);
  const [[sum]] = await pool.query(
    "SELECT COALESCE(SUM(quantity),0) AS cards, COALESCE(SUM(total_amount),0) AS amount FROM nfc_preorders WHERE status IN ('paid','converted')"
  );
  return {
    paid_count: by_status.paid + by_status.converted,
    batch_threshold: cfg.batch_threshold,
    paid_cards: Number(sum.cards),
    paid_amount: Number(sum.amount),
    by_status,
  };
}

// ── Routes internes (n8n) ─────────────────────────────────────────────────────

// Expire les précommandes impayées :
//  - 2 rappels envoyés, délai écoulé et dernier rappel vieux d'au moins 20 h ;
//  - ou, par sécurité, délai + 48 h dépassé même si les rappels n'ont pas pu partir ;
//  - et les paiements refusés non redéclarés depuis le délai.
async function expireStale() {
  const cfg = await getNfcConfig();
  const h = cfg.expiry_hours;
  const [rows] = await pool.query(
    `SELECT id FROM nfc_preorders
     WHERE (status = 'pending_payment' AND (
              (created_at <= NOW() - INTERVAL ? HOUR AND client_reminder_count >= 2
               AND last_client_reminder_at <= NOW() - INTERVAL 20 HOUR)
              OR created_at <= NOW() - INTERVAL ? HOUR))
        OR (status = 'rejected' AND rejected_at <= NOW() - INTERVAL ? HOUR)
     ORDER BY created_at ASC LIMIT 200`,
    [h, h + 48, h]
  );
  let expired = 0;
  for (const { id } of rows) {
    try {
      await withTransaction(async (conn, events) => {
        const p = await lockById(conn, id);
        assertTransition(p, 'expired');
        await conn.query("UPDATE nfc_preorders SET status = 'expired' WHERE id = ?", [p.id]);
        events.push(await notifier.emit(conn, p.id, 'preorder.expired'));
      });
      expired++;
    } catch (err) {
      if (err.status !== 409) console.warn('expireStale:', err.message);
    }
  }
  return { expired };
}

// Sélectionne les rappels à envoyer ET les réserve (compteur et date mis à jour tout de suite),
// pour qu'un échec du journal n8n ne provoque jamais de rappels en boucle.
async function claimReminders() {
  const cfg = await getNfcConfig();
  return withTransaction(async (conn) => {
    const [clients] = await conn.query(
      `SELECT * FROM nfc_preorders
       WHERE status = 'pending_payment' AND client_reminder_count < 2
         AND created_at <= NOW() - INTERVAL (24 * (client_reminder_count + 1)) HOUR
         AND (last_client_reminder_at IS NULL OR last_client_reminder_at <= NOW() - INTERVAL 20 HOUR)
       ORDER BY created_at ASC LIMIT 100 FOR UPDATE`
    );
    const [admins] = await conn.query(
      `SELECT * FROM nfc_preorders
       WHERE status = 'payment_submitted' AND payment_submitted_at <= NOW() - INTERVAL 2 HOUR
         AND (last_admin_reminder_at IS NULL OR last_admin_reminder_at <= NOW() - INTERVAL 4 HOUR)
       ORDER BY payment_submitted_at ASC LIMIT 100 FOR UPDATE`
    );

    // Le payload reflète l'état AVANT réservation : n8n en déduit le numéro du rappel (count + 1)
    const result = {
      client_payment_reminders: clients.map((p) => buildPreorderPayload(p, cfg)),
      admin_validation_pending: admins.map((p) => buildPreorderPayload(p, cfg)),
      admin_list_url: `${frontendUrl()}/admin/nfc-preorders`,
    };

    if (clients.length) {
      await conn.query(
        `UPDATE nfc_preorders SET client_reminder_count = client_reminder_count + 1, last_client_reminder_at = NOW()
         WHERE id IN (?)`,
        [clients.map((p) => p.id)]
      );
    }
    if (admins.length) {
      await conn.query('UPDATE nfc_preorders SET last_admin_reminder_at = NOW() WHERE id IN (?)', [admins.map((p) => p.id)]);
    }
    return result;
  });
}

const NOTIF_CHANNELS = ['email', 'whatsapp', 'telegram'];
const NOTIF_AUDIENCES = ['client', 'admin'];
const NOTIF_STATUSES = ['sent', 'failed'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function recordNotification(body = {}) {
  const ids = Array.isArray(body.preorder_ids) ? body.preorder_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  const channel = body.channel || 'email';
  const { audience, status } = body;
  const template = cleanText(body.template, 60);
  const recipient = cleanText(body.recipient, 190);
  const eventId = body.event_id && UUID_RE.test(String(body.event_id)) ? String(body.event_id) : null;

  if (!ids.length || !NOTIF_CHANNELS.includes(channel) || !NOTIF_AUDIENCES.includes(audience) ||
      !NOTIF_STATUSES.includes(status) || !template || !recipient) {
    throw new PreorderError(422, 'Corps de notification invalide.');
  }
  const error = body.error ? cleanText(body.error, 500) : null;

  // Les ids inexistants sont ignorés silencieusement
  await pool.query(
    `INSERT INTO nfc_preorder_notifications (preorder_id, event_id, channel, audience, template, recipient, status, error)
     SELECT id, ?, ?, ?, ?, ?, ?, ? FROM nfc_preorders WHERE id IN (?)`,
    [eventId, channel, audience, template, recipient, status, error, ids]
  );
  return { ok: true };
}

module.exports = {
  PreorderError,
  STATUSES,
  TRANSITIONS,
  assertTransition,
  normalizePhone,
  normalizeWaveTx,
  validateCreateInput,
  safeEqual,
  createPreorder,
  findByReferenceAndToken,
  checkContact,
  resendTrackingLink,
  submitPayment,
  validatePayment,
  rejectPayment,
  cancelPreorder,
  convertToCommande,
  backfillPaidPreorders,
  resendLastNotification,
  getDetail,
  list,
  listAllForExport,
  getStats,
  expireStale,
  claimReminders,
  recordNotification,
};
