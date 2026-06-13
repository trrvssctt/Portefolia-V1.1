const { pool } = require('../db');
const crypto = require('crypto');

async function init() {
  // Table principale du compte entreprise (1 par admin Business)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_user_id INT NOT NULL,
      company_name VARCHAR(200) NOT NULL,
      company_logo_url TEXT NULL,
      primary_color VARCHAR(7) DEFAULT '#1a1a2e',
      secondary_color VARCHAR(7) DEFAULT '#16213e',
      accent_color VARCHAR(7) DEFAULT '#0f3460',
      font_family VARCHAR(100) DEFAULT 'Inter',
      max_members INT DEFAULT 50,
      status VARCHAR(50) DEFAULT 'active',
      plan_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Table des membres du compte Business
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_account_id INT NOT NULL,
      user_id INT NULL,
      invitation_email VARCHAR(150) NOT NULL,
      invitation_token VARCHAR(255) NULL,
      role VARCHAR(30) DEFAULT 'member',
      status VARCHAR(30) DEFAULT 'pending',
      portfolio_limit INT DEFAULT 10,
      invited_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
      FOREIGN KEY (invited_by) REFERENCES utilisateurs(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ajouter business_account_id aux utilisateurs (membres liés à un compte)
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs'`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));
    if (!existing.has('business_account_id')) {
      await pool.query('ALTER TABLE utilisateurs ADD COLUMN business_account_id INT NULL');
    }
  } catch (err) {
    console.warn('businessAccountModel.init: could not add business_account_id column:', err.message);
  }

  // Ajouter des colonnes business_accounts supplémentaires (website, description, adresse, téléphone)
  try {
    const [baCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_accounts'`
    );
    const baExisting = new Set(baCols.map(c => c.COLUMN_NAME));
    if (!baExisting.has('website_url')) {
      await pool.query("ALTER TABLE business_accounts ADD COLUMN website_url VARCHAR(500) NULL");
    }
    if (!baExisting.has('description')) {
      await pool.query("ALTER TABLE business_accounts ADD COLUMN description TEXT NULL");
    }
    if (!baExisting.has('address')) {
      await pool.query("ALTER TABLE business_accounts ADD COLUMN address VARCHAR(300) NULL");
    }
    if (!baExisting.has('phone')) {
      await pool.query("ALTER TABLE business_accounts ADD COLUMN phone VARCHAR(50) NULL");
    }
  } catch (err) {
    console.warn('businessAccountModel.init: could not add extra columns:', err.message);
  }

  // Ajouter la colonne poste aux membres business
  try {
    const [bmCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_members'`
    );
    const bmExisting = new Set(bmCols.map(c => c.COLUMN_NAME));
    if (!bmExisting.has('poste')) {
      await pool.query("ALTER TABLE business_members ADD COLUMN poste VARCHAR(120) NULL AFTER role");
    }
  } catch (err) {
    console.warn('businessAccountModel.init: could not add poste column:', err.message);
  }

  // Ajouter portfolio_type à la table portfolios pour distinguer les portfolios business
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'portfolios'`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));
    if (!existing.has('portfolio_type')) {
      await pool.query("ALTER TABLE portfolios ADD COLUMN portfolio_type VARCHAR(20) DEFAULT 'personal'");
    }
    if (!existing.has('business_account_id')) {
      await pool.query('ALTER TABLE portfolios ADD COLUMN business_account_id INT NULL');
    }
  } catch (err) {
    console.warn('businessAccountModel.init: could not add portfolio columns:', err.message);
  }
}

// --- Business Account CRUD ---

async function createAccount({ admin_user_id, company_name, plan_id = null }) {
  const [result] = await pool.query(
    `INSERT INTO business_accounts (admin_user_id, company_name, plan_id)
     VALUES (?, ?, ?)`,
    [admin_user_id, company_name, plan_id]
  );
  return { id: result.insertId, admin_user_id, company_name, plan_id };
}

async function findAccountByAdminId(admin_user_id) {
  const [rows] = await pool.query(
    'SELECT * FROM business_accounts WHERE admin_user_id = ? AND deleted_at IS NULL LIMIT 1',
    [admin_user_id]
  );
  return rows[0] || null;
}

async function findAccountById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM business_accounts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findAccountByUserId(user_id) {
  // Trouve le compte business auquel appartient cet utilisateur (admin ou membre)
  const [rows] = await pool.query(`
    SELECT ba.* FROM business_accounts ba
    LEFT JOIN business_members bm ON bm.business_account_id = ba.id
    WHERE (ba.admin_user_id = ? OR bm.user_id = ?)
      AND ba.deleted_at IS NULL
    LIMIT 1
  `, [user_id, user_id]);
  return rows[0] || null;
}

async function updateAccountSettings(id, {
  company_name,
  company_logo_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  max_members,
  status,
  website_url,
  description,
  address,
  phone,
} = {}) {
  const allowed = {
    company_name, company_logo_url, primary_color,
    secondary_color, accent_color, font_family, max_members, status,
    website_url, description, address, phone,
  };
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(allowed)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  if (sets.length === 0) return await findAccountById(id);
  params.push(id);
  await pool.query(`UPDATE business_accounts SET ${sets.join(', ')} WHERE id = ?`, params);
  return await findAccountById(id);
}

async function countActiveMembers(business_account_id) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM business_members WHERE business_account_id = ? AND status = 'active'",
    [business_account_id]
  );
  return rows[0]?.cnt || 0;
}

// --- Business Members CRUD ---

async function inviteMember({ business_account_id, invitation_email, invited_by, role = 'member', portfolio_limit = 10, poste = null }) {
  const token = crypto.randomBytes(32).toString('hex');
  const [result] = await pool.query(
    `INSERT INTO business_members
       (business_account_id, invitation_email, invitation_token, role, status, portfolio_limit, invited_by, poste)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [business_account_id, invitation_email.trim().toLowerCase(), token, role, portfolio_limit, invited_by, poste]
  );
  return { id: result.insertId, invitation_token: token };
}

async function findMemberByToken(token) {
  const [rows] = await pool.query(
    "SELECT * FROM business_members WHERE invitation_token = ? LIMIT 1",
    [token]
  );
  return rows[0] || null;
}

async function activateMember(member_id, user_id) {
  await pool.query(
    "UPDATE business_members SET user_id = ?, status = 'active', invitation_token = NULL WHERE id = ?",
    [user_id, member_id]
  );
}

async function listMembers(business_account_id) {
  const [rows] = await pool.query(`
    SELECT bm.*,
           u.nom, u.prenom, u.email AS user_email, u.photo_profil,
           (SELECT COUNT(*) FROM portfolios p WHERE p.utilisateur_id = bm.user_id AND p.portfolio_type = 'business') AS portfolio_count
    FROM business_members bm
    LEFT JOIN utilisateurs u ON u.id = bm.user_id
    WHERE bm.business_account_id = ?
    ORDER BY bm.created_at ASC
  `, [business_account_id]);
  return rows;
}

async function getMemberByUserId(user_id, business_account_id) {
  const [rows] = await pool.query(
    'SELECT * FROM business_members WHERE user_id = ? AND business_account_id = ? LIMIT 1',
    [user_id, business_account_id]
  );
  return rows[0] || null;
}

async function getMemberByEmail(invitation_email, business_account_id) {
  const [rows] = await pool.query(
    'SELECT * FROM business_members WHERE invitation_email = ? AND business_account_id = ? LIMIT 1',
    [invitation_email.trim().toLowerCase(), business_account_id]
  );
  return rows[0] || null;
}

async function updateMemberStatus(member_id, status) {
  await pool.query('UPDATE business_members SET status = ? WHERE id = ?', [status, member_id]);
}

async function removeMember(member_id) {
  await pool.query('DELETE FROM business_members WHERE id = ?', [member_id]);
}

async function getMemberProfile(member_id, business_account_id) {
  const [memberRows] = await pool.query(`
    SELECT bm.*,
           u.nom, u.prenom, u.email AS user_email, u.photo_profil,
           u.created_at AS user_created_at
    FROM business_members bm
    LEFT JOIN utilisateurs u ON u.id = bm.user_id
    WHERE bm.id = ? AND bm.business_account_id = ?
    LIMIT 1
  `, [member_id, business_account_id]);
  const member = memberRows[0] || null;
  if (!member || !member.user_id) return { member, portfolios: [] };

  const [portfolios] = await pool.query(`
    SELECT id, titre, url_slug, est_public AS is_public, theme AS theme_color,
           profile_image_url, date_creation, created_at
    FROM portfolios
    WHERE utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
    ORDER BY created_at DESC
  `, [member.user_id]);

  return { member, portfolios };
}

async function countBusinessPortfolios(user_id) {
  // Compter TOUS les portfolios de l'utilisateur (personnels + business)
  // afin que le quota business s'applique à l'ensemble de ses portfolios
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM portfolios WHERE utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')",
    [user_id]
  );
  return rows[0]?.cnt || 0;
}

// Désactiver le compte business (admin se désactive lui-même) → suspend tous les membres actifs
async function deactivateByAdminId(adminUserId) {
  const account = await findAccountByAdminId(adminUserId);
  if (!account) return null;
  await pool.query(
    "UPDATE business_accounts SET status = 'inactive' WHERE admin_user_id = ? AND deleted_at IS NULL",
    [adminUserId]
  );
  await pool.query(
    "UPDATE business_members SET status = 'suspended' WHERE business_account_id = ? AND status = 'active'",
    [account.id]
  );
  return account;
}

// Suppression douce du compte business (admin supprime son compte) → suspend tous les membres
async function softDeleteByAdminId(adminUserId) {
  const account = await findAccountByAdminId(adminUserId);
  if (!account) return null;
  await pool.query(
    "UPDATE business_accounts SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP WHERE admin_user_id = ?",
    [adminUserId]
  );
  await pool.query(
    "UPDATE business_members SET status = 'suspended' WHERE business_account_id = ?",
    [account.id]
  );
  return account;
}

module.exports = {
  init,
  createAccount,
  findAccountByAdminId,
  findAccountById,
  findAccountByUserId,
  updateAccountSettings,
  countActiveMembers,
  inviteMember,
  findMemberByToken,
  activateMember,
  listMembers,
  getMemberByUserId,
  getMemberByEmail,
  getMemberProfile,
  updateMemberStatus,
  removeMember,
  countBusinessPortfolios,
  deactivateByAdminId,
  softDeleteByAdminId,
};
