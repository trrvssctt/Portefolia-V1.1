const { pool } = require('../db');

// Progression des visites guidées (onboarding) par utilisateur.
// Une ligne par (utilisateur, visite) : une visite = un parcours propre à un plan/rôle
// (ex: personal_free, personal_pro, business_admin, business_member).
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_onboarding (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      tour_key VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
      current_step INT NOT NULL DEFAULT 0,
      current_step_id VARCHAR(80) NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_tour (user_id, tour_key),
      INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function listForUser(userId) {
  const [rows] = await pool.query(
    `SELECT tour_key, status, current_step, current_step_id, completed_at, updated_at
       FROM user_onboarding WHERE user_id = ?`,
    [userId]
  );
  return rows;
}

async function upsert(userId, tourKey, { status, current_step, current_step_id }) {
  await pool.query(
    `INSERT INTO user_onboarding (user_id, tour_key, status, current_step, current_step_id, completed_at)
     VALUES (?, ?, ?, ?, ?, ${status === 'completed' ? 'NOW()' : 'NULL'})
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       current_step = VALUES(current_step),
       current_step_id = VALUES(current_step_id),
       completed_at = ${status === 'completed' ? 'COALESCE(completed_at, NOW())' : 'NULL'}`,
    [userId, tourKey, status, current_step, current_step_id]
  );
  const [rows] = await pool.query(
    `SELECT tour_key, status, current_step, current_step_id, completed_at, updated_at
       FROM user_onboarding WHERE user_id = ? AND tour_key = ?`,
    [userId, tourKey]
  );
  return rows[0] || null;
}

async function reset(userId, tourKey) {
  await pool.query('DELETE FROM user_onboarding WHERE user_id = ? AND tour_key = ?', [userId, tourKey]);
}

module.exports = { init, listForUser, upsert, reset };
