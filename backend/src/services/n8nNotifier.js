// Outbox des événements de précommande NFC vers n8n.
// Les événements sont d'abord enregistrés dans nfc_preorder_events (dans la transaction métier),
// puis envoyés au webhook n8n après le commit. Les échecs sont renvoyés toutes les 5 minutes.
const crypto = require('crypto');
const { pool } = require('../db');
const { getNfcConfig } = require('../utils/nfcConfig');
const { buildPreorderPayload } = require('../utils/nfcPreorderPayload');

const MAX_ATTEMPTS = 5;
const RETRY_EVERY_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 5000;

async function computeStats(conn) {
  const cfg = await getNfcConfig();
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS n FROM nfc_preorders WHERE status IN ('paid','converted')"
  );
  return { paid_count: Number(row.n), batch_threshold: cfg.batch_threshold };
}

// À appeler DANS la transaction, après le changement de statut. Retourne l'event_id.
// options.clientOnly : n8n n'envoie que l'e-mail client (renvoi du lien de suivi)
async function emit(conn, preorderId, event, options = {}) {
  const [[preorder]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ?', [preorderId]);
  if (!preorder) throw new Error(`Précommande ${preorderId} introuvable`);
  const cfg = await getNfcConfig();
  const stats = await computeStats(conn);
  const eventId = crypto.randomUUID();
  const payload = {
    event_id: eventId,
    event,
    occurred_at: new Date().toISOString(),
    audience: options.clientOnly ? 'client' : 'all',
    ...buildPreorderPayload(preorder, cfg, stats),
  };
  await conn.query(
    'INSERT INTO nfc_preorder_events (id, preorder_id, event, payload) VALUES (?, ?, ?, ?)',
    [eventId, preorderId, event, JSON.stringify(payload)]
  );
  return eventId;
}

async function deliver(eventId) {
  const [[row]] = await pool.query('SELECT * FROM nfc_preorder_events WHERE id = ?', [eventId]);
  if (!row || row.delivered_at) return;

  const url = process.env.N8N_PREORDER_WEBHOOK_URL;
  if (!url) {
    console.log(`[n8n] non configuré — événement ${row.event} (${eventId}) non envoyé`);
    await pool.query(
      "UPDATE nfc_preorder_events SET attempts = attempts + 1, last_error = 'n8n non configuré' WHERE id = ?",
      [eventId]
    );
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Portefolia-Key': process.env.N8N_WEBHOOK_KEY || '' },
      body: row.payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await pool.query(
      'UPDATE nfc_preorder_events SET attempts = attempts + 1, delivered_at = NOW(), last_error = NULL WHERE id = ?',
      [eventId]
    );
  } catch (err) {
    console.warn(`[n8n] envoi ${row.event} (${eventId}) échoué:`, err.message);
    await pool.query(
      'UPDATE nfc_preorder_events SET attempts = attempts + 1, last_error = ? WHERE id = ?',
      [String(err.message || err).slice(0, 480), eventId]
    ).catch(() => {});
  }
}

// À appeler APRÈS le commit : l'envoi ne bloque jamais la réponse HTTP
function flush(eventIds) {
  const ids = (Array.isArray(eventIds) ? eventIds : [eventIds]).filter(Boolean);
  if (!ids.length) return;
  setImmediate(async () => {
    for (const id of ids) {
      try { await deliver(id); } catch (e) { console.warn('[n8n] flush:', e.message); }
    }
  });
}

async function retryPending() {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM nfc_preorder_events
       WHERE delivered_at IS NULL AND attempts < ? AND created_at <= NOW() - INTERVAL 1 MINUTE
       ORDER BY created_at ASC LIMIT 50`,
      [MAX_ATTEMPTS]
    );
    for (const r of rows) await deliver(r.id);
  } catch (err) {
    console.warn('[n8n] retryPending:', err.message);
  }
}

let timer = null;
function start() {
  if (timer) return;
  timer = setInterval(retryPending, RETRY_EVERY_MS);
  if (timer.unref) timer.unref();
}

// Renvoie le dernier événement d'une précommande, avec des données à jour et un nouvel event_id
async function resendLast(preorderId, options = {}) {
  const [[last]] = await pool.query(
    'SELECT event FROM nfc_preorder_events WHERE preorder_id = ? ORDER BY created_at DESC LIMIT 1',
    [preorderId]
  );
  if (!last) return null;
  const conn = await pool.getConnection();
  let eventId;
  try {
    eventId = await emit(conn, preorderId, last.event, options);
  } finally {
    conn.release();
  }
  flush(eventId);
  return { event: last.event, event_id: eventId };
}

module.exports = { emit, deliver, flush, retryPending, start, resendLast, computeStats };
