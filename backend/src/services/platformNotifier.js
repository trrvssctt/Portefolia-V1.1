// Outbox des événements de la plateforme vers le workflow n8n « Notifications admin ».
// Même principe que les précommandes : enregistrement en base, envoi au webhook, renvoi des échecs.
const crypto = require('crypto');
const { pool } = require('../db');

const MAX_ATTEMPTS = 5;
const RETRY_EVERY_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 5000;

function frontendUrl() {
  return (process.env.FRONTEND_URL || process.env.FRONTEND_BASE || 'https://portefolia.tech').replace(/\/+$/, '');
}

// Enregistre un événement ; `data` est fusionné dans le payload. Retourne l'event_id.
async function emit(conn, event, data = {}) {
  const id = crypto.randomUUID();
  const payload = { event_id: id, event, occurred_at: new Date().toISOString(), ...data };
  await (conn || pool).query(
    'INSERT INTO platform_events (id, event, payload) VALUES (?, ?, ?)', [id, event, JSON.stringify(payload)]
  );
  return id;
}

async function deliver(id) {
  const [[row]] = await pool.query('SELECT * FROM platform_events WHERE id = ?', [id]);
  if (!row || row.delivered_at) return;
  const url = process.env.N8N_PLATFORM_WEBHOOK_URL;
  if (!url) {
    await pool.query(
      "UPDATE platform_events SET attempts = attempts + 1, last_error = 'n8n non configuré (N8N_PLATFORM_WEBHOOK_URL)' WHERE id = ?", [id]
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
    await pool.query('UPDATE platform_events SET attempts = attempts + 1, delivered_at = NOW(), last_error = NULL WHERE id = ?', [id]);
  } catch (err) {
    console.warn(`[n8n plateforme] envoi ${row.event} (${id}) échoué:`, err.message);
    await pool.query('UPDATE platform_events SET attempts = attempts + 1, last_error = ? WHERE id = ?',
      [String(err.message || err).slice(0, 480), id]).catch(() => {});
  }
}

function flush(ids) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!list.length) return;
  setImmediate(async () => {
    for (const id of list) {
      try { await deliver(id); } catch (e) { console.warn('[n8n plateforme] flush:', e.message); }
    }
  });
}

async function retryPending() {
  try {
    const [rows] = await pool.query(
      `SELECT id FROM platform_events WHERE delivered_at IS NULL AND attempts < ?
       AND created_at <= NOW() - INTERVAL 1 MINUTE ORDER BY created_at ASC LIMIT 50`, [MAX_ATTEMPTS]
    );
    for (const r of rows) await deliver(r.id);
  } catch (err) {
    console.warn('[n8n plateforme] retryPending:', err.message);
  }
}

let timer = null;
function start() {
  if (timer) return;
  timer = setInterval(retryPending, RETRY_EVERY_MS);
  if (timer.unref) timer.unref();
}

module.exports = { emit, deliver, flush, retryPending, start, frontendUrl };
