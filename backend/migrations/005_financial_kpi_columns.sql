-- Migration 005 : Colonnes KPI financiers
-- Ajoute les colonnes nécessaires aux calculs MRR, ARR, churn, upgrades et NFC revenue
-- NOTE MySQL : les FK ne peuvent pas être déclarées inline dans ALTER TABLE ADD COLUMN.
--              Colonnes et contraintes sont séparées.

-- ─────────────────────────────────────────────
-- 1. TABLE paiements — colonnes
-- ─────────────────────────────────────────────
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS type_flux
  ENUM('ABONNEMENT','REABONNEMENT','UPGRADE','NFC','AUTRE') DEFAULT 'AUTRE';

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS plan_id
  INT NULL;

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS commande_id
  INT NULL;

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS montant_ht
  DECIMAL(10,2) NULL;

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS remise_appliquee
  DECIMAL(5,2) DEFAULT 0;

ALTER TABLE paiements ADD COLUMN IF NOT EXISTS duree_mois
  INT NULL;

-- ─────────────────────────────────────────────
-- 1b. TABLE paiements — clé étrangère vers plans
-- NOTE : pas de FK paiements→commandes ni commandes→paiements
--        car ces deux tables se référencent mutuellement (référence circulaire),
--        ce qui provoque errno 150 en MySQL. L'intégrité est gérée applicativement.
-- ─────────────────────────────────────────────
ALTER TABLE paiements DROP FOREIGN KEY IF EXISTS fk_paiements_plan;
ALTER TABLE paiements
  ADD CONSTRAINT fk_paiements_plan
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- 2. TABLE abonnements
-- ─────────────────────────────────────────────
ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS type
  ENUM('INITIAL','RENOUVELLEMENT') DEFAULT 'INITIAL';

ALTER TABLE abonnements ADD COLUMN IF NOT EXISTS montant_mensuel_equivalent
  DECIMAL(10,2) NULL COMMENT 'Montant ramené à 1 mois pour calcul MRR';

-- ─────────────────────────────────────────────
-- 3. TABLE upgrades (créer si inexistante)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upgrades (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  utilisateur_id  INT NOT NULL,
  plan_source_id  INT NOT NULL,
  plan_cible_id   INT NOT NULL,
  paiement_id     INT NULL,
  montant_delta   DECIMAL(10,2) NOT NULL COMMENT 'Prix cible - prix source',
  statut          ENUM('PENDING','VALIDATED','REJECTED') DEFAULT 'PENDING',
  valide_par      INT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  validated_at    TIMESTAMP NULL,
  CONSTRAINT fk_upgrades_utilisateur  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  CONSTRAINT fk_upgrades_plan_source  FOREIGN KEY (plan_source_id) REFERENCES plans(id),
  CONSTRAINT fk_upgrades_plan_cible   FOREIGN KEY (plan_cible_id)  REFERENCES plans(id),
  CONSTRAINT fk_upgrades_paiement     FOREIGN KEY (paiement_id)    REFERENCES paiements(id) ON DELETE SET NULL,
  CONSTRAINT fk_upgrades_valide_par   FOREIGN KEY (valide_par)     REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- 4. TABLE commandes — colonnes
-- ─────────────────────────────────────────────
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS paiement_id
  INT NULL;

ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant
  DECIMAL(10,2) NULL;

ALTER TABLE commandes ADD COLUMN IF NOT EXISTS statut_paiement
  ENUM('PENDING','PAID','FAILED') DEFAULT 'PENDING';

-- Pas de FK commandes→paiements (référence circulaire avec paiements→commandes).

-- ─────────────────────────────────────────────
-- 5. INDEX pour performance des requêtes KPI
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_paiements_type_flux_statut
  ON paiements(type_flux, statut, created_at);

CREATE INDEX IF NOT EXISTS idx_paiements_created_at
  ON paiements(created_at);

CREATE INDEX IF NOT EXISTS idx_abonnements_type_statut
  ON abonnements(type, statut, date_echeance);

CREATE INDEX IF NOT EXISTS idx_upgrades_statut
  ON upgrades(statut, created_at);
