// Réglages de la carte NFC : lus dans la table nfc_settings (prix, numéro Wave…),
// avec un petit cache pour ne pas interroger la base à chaque requête.
const { pool } = require('../db');
const { DEFAULT_SETTINGS } = require('../models/nfcPreorderModel');

const CACHE_MS = 60 * 1000;
let cache = null;
let cachedAt = 0;

// Clés modifiables depuis l'admin et leur type
const EDITABLE = {
  unit_price: 'int',
  max_quantity: 'int',
  batch_threshold: 'int',
  expiry_hours: 'int',
  wave_number: 'string',
  wave_link: 'string',
  wave_link_supports_amount: 'bool',
};

function frontendUrl() {
  return (process.env.FRONTEND_URL || process.env.FRONTEND_BASE || 'https://portefolia.tech').replace(/\/+$/, '');
}

function parse(raw) {
  const s = { ...DEFAULT_SETTINGS, ...raw };
  return {
    unit_price: Number(s.unit_price) || Number(DEFAULT_SETTINGS.unit_price),
    currency: s.currency || 'XOF',
    max_quantity: Number(s.max_quantity) || 10,
    batch_threshold: Number(s.batch_threshold) || 10,
    expiry_hours: Number(s.expiry_hours) || 72,
    wave_number: s.wave_number || DEFAULT_SETTINGS.wave_number,
    wave_link: s.wave_link || '',
    wave_link_supports_amount: s.wave_link_supports_amount === '1' || s.wave_link_supports_amount === 'true',
  };
}

async function getNfcConfig({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cachedAt < CACHE_MS) return cache;
  try {
    const [rows] = await pool.query('SELECT cle, valeur FROM nfc_settings');
    const raw = {};
    for (const r of rows) raw[r.cle] = r.valeur;
    cache = parse(raw);
  } catch (err) {
    console.warn('nfcConfig: lecture nfc_settings impossible, valeurs par défaut', err.message);
    cache = parse({});
  }
  cachedAt = Date.now();
  return cache;
}

async function updateNfcConfig(fields, adminId) {
  const errors = [];
  const updates = [];
  for (const [cle, type] of Object.entries(EDITABLE)) {
    if (fields[cle] === undefined) continue;
    let v = fields[cle];
    if (type === 'int') {
      v = Number(v);
      if (!Number.isInteger(v) || v <= 0) { errors.push(`${cle} doit être un entier positif`); continue; }
      v = String(v);
    } else if (type === 'bool') {
      v = v === true || v === '1' || v === 'true' ? '1' : '0';
    } else {
      v = String(v).trim().slice(0, 255);
    }
    updates.push([cle, v]);
  }
  if (errors.length) {
    const err = new Error(errors.join(', '));
    err.status = 422;
    throw err;
  }
  for (const [cle, valeur] of updates) {
    await pool.query(
      `INSERT INTO nfc_settings (cle, valeur, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), updated_by = VALUES(updated_by)`,
      [cle, valeur, adminId || null]
    );
  }
  return getNfcConfig({ fresh: true });
}

// Lien de paiement Wave : null si aucun lien marchand n'est configuré
function buildWaveLink(cfg, amount) {
  if (!cfg.wave_link) return null;
  if (!cfg.wave_link_supports_amount) return cfg.wave_link;
  try {
    const u = new URL(cfg.wave_link);
    u.searchParams.set('amount', String(amount));
    return u.toString();
  } catch {
    return cfg.wave_link;
  }
}

function formatFcfa(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F CFA';
}

module.exports = { getNfcConfig, updateNfcConfig, buildWaveLink, formatFcfa, frontendUrl };
