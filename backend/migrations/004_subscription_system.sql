-- Migration 004: subscription system
-- Extends abonnements with full lifecycle tracking, adds reminder/history tables,
-- and enriches utilisateurs with denormalized subscription status columns.

-- ============================================================
-- 1. MODIFIER la table `abonnements`
-- ============================================================

ALTER TABLE abonnements
  ADD COLUMN IF NOT EXISTS statut_v2 ENUM('PENDING_PAYMENT','ACTIVE','EXPIRED','SUSPENDED','GRACE_PERIOD')
      NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN IF NOT EXISTS date_debut       TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_echeance    TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duree_mois       INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS remise_appliquee DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS montant_paye     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valide_par       INT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_validation  TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS token_acces      VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS token_expiration TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preuve_paiement  TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reference_wave   VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS motif_refus      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMP NULL DEFAULT NULL;

-- Foreign key : valide_par -> admin_users(id) SET NULL on delete
ALTER TABLE abonnements
  ADD CONSTRAINT fk_abonnements_valide_par
      FOREIGN KEY (valide_par) REFERENCES admin_users(id) ON DELETE SET NULL;

-- Unique index on token_acces (CREATE INDEX IF NOT EXISTS est valide en MySQL 8.0)
CREATE UNIQUE INDEX IF NOT EXISTS uq_abonnements_token_acces ON abonnements (token_acces);

-- ============================================================
-- 2. CRÉER la table `subscription_reminders`
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_reminders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  abonnement_id   INT NOT NULL,
  utilisateur_id  INT NOT NULL,
  type            ENUM('J_MINUS_5','J_MINUS_1','J_ECHEANCE','POST_ECHEANCE') NOT NULL,
  sent_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_to        VARCHAR(150) NULL DEFAULT NULL,
  CONSTRAINT fk_reminders_abonnement  FOREIGN KEY (abonnement_id)  REFERENCES abonnements(id)  ON DELETE CASCADE,
  CONSTRAINT fk_reminders_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. CRÉER la table `subscription_history`
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  abonnement_id   INT NOT NULL,
  ancien_statut   VARCHAR(50)  NULL DEFAULT NULL,
  nouveau_statut  VARCHAR(50)  NULL DEFAULT NULL,
  change_par      INT          NULL DEFAULT NULL,
  commentaire     TEXT         NULL DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_abonnement FOREIGN KEY (abonnement_id) REFERENCES abonnements(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_admin      FOREIGN KEY (change_par)    REFERENCES admin_users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. MODIFIER la table `utilisateurs`
-- ============================================================

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS subscription_status
      ENUM('NONE','PENDING_PAYMENT','ACTIVE','EXPIRED','SUSPENDED') NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS last_payment_at   TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP NULL DEFAULT NULL;

-- ============================================================
-- 5. INDEX DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_abonnements_statut_v2
    ON abonnements (statut_v2);

CREATE INDEX IF NOT EXISTS idx_abonnements_date_echeance
    ON abonnements (date_echeance);

CREATE INDEX IF NOT EXISTS idx_abonnements_user_statut
    ON abonnements (utilisateur_id, statut_v2);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_subscription_status
    ON utilisateurs (subscription_status);
