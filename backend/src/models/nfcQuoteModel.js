// Devis Entreprise : demande → devis envoyé → accepté (commande créée) ou refusé
const { pool } = require('../db');

const QUOTE_STATUSES = ['devis_demande', 'devis_envoye', 'devis_accepte', 'devis_refuse', 'annule'];

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_quotes (
      id                   INT NOT NULL AUTO_INCREMENT,
      reference            VARCHAR(20)  NULL,
      public_token         CHAR(64)     NOT NULL,
      user_id              INT NULL,
      business_account_id  INT NULL,
      company              VARCHAR(160) NOT NULL,
      contact_name         VARCHAR(120) NOT NULL,
      email                VARCHAR(190) NOT NULL,
      phone                VARCHAR(20)  NOT NULL,
      quantity             SMALLINT UNSIGNED NOT NULL,
      desired_date         DATE NULL,
      message              VARCHAR(2000) NULL,
      status               ENUM('devis_demande','devis_envoye','devis_accepte','devis_refuse','annule') NOT NULL DEFAULT 'devis_demande',
      stock_type           ENUM('logo_printed','blank') NULL,
      dedicated_supplier   TINYINT(1) NOT NULL DEFAULT 0,
      price_per_card       INT UNSIGNED NULL,
      total_amount         INT UNSIGNED NULL,
      valid_until          DATE NULL,
      admin_message        VARCHAR(2000) NULL,
      decline_reason       VARCHAR(500) NULL,
      order_id             INT NULL,
      handled_by           INT NULL,
      sent_at              DATETIME NULL,
      accepted_at          DATETIME NULL,
      declined_at          DATETIME NULL,
      created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_quote_reference (reference),
      UNIQUE KEY uq_quote_token (public_token),
      KEY idx_quote_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Commande issue d'un devis : lien vers le devis et le compte Business
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS quote_id INT NULL AFTER offer_name');
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS business_account_id INT NULL AFTER quote_id');
}

module.exports = { init, QUOTE_STATUSES };
