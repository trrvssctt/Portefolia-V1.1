const { pool } = require('../db');

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM admin_users WHERE email = ? LIMIT 1', [email]);
  return rows[0];
}

async function getRolePermissionsByAdminId(adminId) {
  const [rows] = await pool.query(
    `SELECT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     JOIN admin_users a ON a.role_id = r.id
     WHERE a.id = ?`,
    [adminId]
  );
  return rows.map((r) => r.name);
}

async function getRoleNameByAdminId(adminId) {
  const [rows] = await pool.query(
    `SELECT r.name FROM roles r
     JOIN admin_users a ON a.role_id = r.id
     WHERE a.id = ? LIMIT 1`,
    [adminId]
  );
  return rows[0] && rows[0].name;
}

// Idempotent seed: ensures the permission matrix is correct on every server start.
// Safe to run multiple times — uses INSERT IGNORE throughout.
async function initRbacPermissions() {
  try {
    // 1. Add missing admin_users permissions
    await pool.query(`INSERT IGNORE INTO permissions (name, description) VALUES
      ('admin_users:read',  'Voir la liste des administrateurs'),
      ('admin_users:write', 'Créer, modifier et supprimer des administrateurs')`);

    // 2. Grant ALL permissions to super_admin
    await pool.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r JOIN permissions p ON 1=1
      WHERE r.name = 'super_admin'`);

    // 3. admin_technique: full ops access (no admin_users permissions)
    await pool.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r JOIN permissions p
      ON p.name IN ('users:read','users:write','payments:read','payments:write','infra:access')
      WHERE r.name = 'admin_technique'`);

    // 4. admin_contenu: content only
    await pool.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r JOIN permissions p
      ON p.name IN ('content:read','content:write')
      WHERE r.name = 'admin_contenu'`);

    // 5. admin_support: read-only on users and payments
    await pool.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r JOIN permissions p
      ON p.name IN ('users:read','payments:read')
      WHERE r.name = 'admin_support'`);

    console.log('[adminUserModel] RBAC permissions synced');
  } catch (err) {
    console.warn('[adminUserModel] initRbacPermissions warning:', err.message || err);
  }
}

module.exports = { findById, findByEmail, getRolePermissionsByAdminId, getRoleNameByAdminId, initRbacPermissions };
