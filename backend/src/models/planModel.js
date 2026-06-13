const { pool } = require('../db');

async function init() {
  // Create plans table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      description TEXT,
      price_cents INT DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'XOF',
      billing_interval VARCHAR(50) DEFAULT 'one_time',
      is_public TINYINT(1) DEFAULT 1,
      metadata JSON DEFAULT NULL,
      external_price_id VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_features (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plan_id INT NOT NULL,
      feature VARCHAR(255) NOT NULL,
      value VARCHAR(255) DEFAULT NULL,
      position INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      utilisateur_id INT NOT NULL,
      plan_id INT NULL,
      start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_date TIMESTAMP NULL DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'active',
      payment_reference VARCHAR(255) DEFAULT NULL,
      metadata JSON DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
      FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

// Add missing columns (is_active, is_popular, position) if they don't exist yet.
// Uses try/catch because MySQL doesn't support "ADD COLUMN IF NOT EXISTS" in older versions.
async function ensureColumns() {
  const migrations = [
    "ALTER TABLE plans ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
    "ALTER TABLE plans ADD COLUMN is_popular TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE plans ADD COLUMN position INT NOT NULL DEFAULT 0",
  ];
  for (const sql of migrations) {
    try { await pool.query(sql); } catch (_) { /* column already exists — safe to ignore */ }
  }
  // Seed is_active from is_public for existing rows that have is_active still at default
  try {
    await pool.query('UPDATE plans SET is_active = is_public WHERE is_active = 1 AND is_public = 0');
  } catch (_) {}
}

// Admin: returns all non-deleted plans (including inactive)
async function listPlans() {
  await ensureColumns();
  const [rows] = await pool.query(
    `SELECT id, name, slug, description, price_cents, currency, billing_interval,
            is_public, is_active, is_popular, position, created_at, updated_at
     FROM plans WHERE deleted_at IS NULL ORDER BY position ASC, price_cents ASC`
  );
  return rows;
}

// Public: returns only active/visible plans (is_public = 1 AND is_active = 1)
async function listActivePlans() {
  await ensureColumns();
  const [rows] = await pool.query(
    `SELECT id, name, slug, description, price_cents, currency, billing_interval,
            is_public, is_active, is_popular, position, created_at, updated_at
     FROM plans WHERE deleted_at IS NULL AND is_public = 1 AND is_active = 1
     ORDER BY position ASC, price_cents ASC`
  );
  return rows;
}

async function getPlanById(id) {
  const [rows] = await pool.query('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

async function getPlanBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM plans WHERE slug = ? LIMIT 1', [slug]);
  return rows[0];
}

async function createPlan({ name, slug, description = null, price_cents = 0, currency = 'XOF', billing_interval = 'one_time', is_public = 1, metadata = null, external_price_id = null }) {
  // generate a slug from name if not provided
  let finalSlug = slug;
  if (!finalSlug) {
    const base = (name || '').toString().toLowerCase().trim()
      .replace(/[\s\u00A0\-]+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-').replace(/^-+|-+$/g, '');
    let candidate = base || `plan-${Date.now()}`;
    // ensure uniqueness
    let i = 0;
    while (true) {
      const check = i === 0 ? candidate : `${candidate}-${i}`;
      const [rows] = await pool.query('SELECT id FROM plans WHERE slug = ? LIMIT 1', [check]);
      if (!rows || rows.length === 0) {
        finalSlug = check;
        break;
      }
      i++;
    }
  }

  const [result] = await pool.query(
    `INSERT INTO plans (name, slug, description, price_cents, currency, billing_interval, is_public, metadata, external_price_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, finalSlug, description, price_cents, currency, billing_interval, is_public, metadata ? JSON.stringify(metadata) : null, external_price_id]
  );
  return { id: result.insertId };
}

async function addFeature(plan_id, feature, value = null, position = 0) {
  const [result] = await pool.query('INSERT INTO plan_features (plan_id, feature, value, position) VALUES (?, ?, ?, ?)', [plan_id, feature, value, position]);
  return { id: result.insertId };
}

async function listPlanFeatures(plan_id) {
  const [rows] = await pool.query('SELECT id, feature, value, position FROM plan_features WHERE plan_id = ? ORDER BY position ASC', [plan_id]);
  return rows;
}

async function updatePlan(id, { name, description, price_cents, currency, billing_interval, is_active, is_popular, position } = {}) {
  await ensureColumns();
  const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : undefined;
  await pool.query(
    `UPDATE plans SET
       name           = COALESCE(?, name),
       description    = ?,
       price_cents    = COALESCE(?, price_cents),
       currency       = COALESCE(?, currency),
       billing_interval = COALESCE(?, billing_interval),
       is_public      = COALESCE(?, is_public),
       is_active      = COALESCE(?, is_active),
       is_popular     = COALESCE(?, is_popular),
       position       = COALESCE(?, position)
     WHERE id = ? AND deleted_at IS NULL`,
    [
      name ?? null,
      description ?? null,
      price_cents ?? null,
      currency ?? null,
      billing_interval ?? null,
      activeVal ?? null,
      activeVal ?? null,
      is_popular !== undefined ? (is_popular ? 1 : 0) : null,
      position !== undefined ? position : null,
      id,
    ]
  );
}

async function replacePlanFeatures(plan_id, features) {
  await pool.query('DELETE FROM plan_features WHERE plan_id = ?', [plan_id]);
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const featureText = typeof f === 'string' ? f : (f.feature || '');
    if (featureText.trim()) {
      await addFeature(plan_id, featureText.trim(), f.value || null, i);
    }
  }
}

async function deletePlan(id) {
  await pool.query('UPDATE plans SET deleted_at = NOW() WHERE id = ?', [id]);
}

async function togglePlanActive(id) {
  await ensureColumns();
  await pool.query(
    `UPDATE plans SET is_active = IF(is_active = 1, 0, 1), is_public = IF(is_public = 1, 0, 1)
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
}

async function subscribeUser({ utilisateur_id, plan_id = null, start_date = null, end_date = null, status = 'active', payment_reference = null, metadata = null }) {
  const [result] = await pool.query(
    `INSERT INTO user_plans (utilisateur_id, plan_id, start_date, end_date, status, payment_reference, metadata)
     VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?)`,
    [utilisateur_id, plan_id, start_date, end_date, status, payment_reference, JSON.stringify(metadata)]
  );
  return { id: result.insertId };
}

async function listUserPlans(utilisateur_id) {
  const [rows] = await pool.query(
    'SELECT up.*, p.name, p.slug, p.price_cents, p.billing_interval, p.currency FROM user_plans up LEFT JOIN plans p ON p.id = up.plan_id WHERE up.utilisateur_id = ? ORDER BY up.created_at DESC',
    [utilisateur_id]
  );
  return rows;
}

module.exports = {
  init, ensureColumns,
  listPlans, listActivePlans, getPlanById, getPlanBySlug,
  createPlan, updatePlan, deletePlan, togglePlanActive,
  addFeature, listPlanFeatures, replacePlanFeatures,
  subscribeUser, listUserPlans,
};
