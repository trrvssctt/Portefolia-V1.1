-- Migration: 009_fix_rbac_permissions.sql
-- Adds missing admin_users permissions and fixes role permission matrix

-- 1. Add missing permissions
INSERT IGNORE INTO permissions (name, description) VALUES
  ('admin_users:read',  'Voir la liste des administrateurs'),
  ('admin_users:write', 'Créer, modifier et supprimer des administrateurs');

-- 2. Grant ALL permissions to super_admin explicitly
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON 1=1
WHERE r.name = 'super_admin';

-- 3. Fix admin_technique: operational access (users, payments, infra) — NO admin management
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'users:read', 'users:write',
  'payments:read', 'payments:write',
  'infra:access'
)
WHERE r.name = 'admin_technique';

-- 4. admin_contenu: content only (already seeded, but ensure completeness)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('content:read', 'content:write')
WHERE r.name = 'admin_contenu';

-- 5. admin_support: user + payment read, commandes read via users:read
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('users:read', 'payments:read')
WHERE r.name = 'admin_support';
