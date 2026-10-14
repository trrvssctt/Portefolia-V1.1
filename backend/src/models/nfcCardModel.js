// Inventaire des cartes NFC physiques : lots fournisseur et cartes (une puce = un code unique
// encodé en usine, verrouillé, au format https://portefolia.tech/c/{CODE}).
const { pool } = require('../db');

const STOCK_TYPES = ['logo_printed', 'blank'];
const CARD_STATUSES = ['en_commande', 'en_stock', 'attribuee', 'imprimee', 'livree', 'desactivee'];

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_card_batches (
      id           INT NOT NULL AUTO_INCREMENT,
      type_stock   ENUM('logo_printed','blank') NOT NULL,
      quantity     INT UNSIGNED NOT NULL,
      supplier     VARCHAR(120) NULL,
      notes        VARCHAR(500) NULL,
      status       ENUM('en_commande','recu') NOT NULL DEFAULT 'en_commande',
      created_by   INT NULL,
      received_at  DATETIME NULL,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_physical_cards (
      id                   INT NOT NULL AUTO_INCREMENT,
      code                 CHAR(6) NOT NULL,
      type_stock           ENUM('logo_printed','blank') NOT NULL,
      statut               ENUM('en_commande','en_stock','attribuee','imprimee','livree','desactivee')
                           NOT NULL DEFAULT 'en_commande',
      batch_id             INT NULL,
      user_id              INT NULL,
      portfolio_id         INT NULL,
      order_id             INT NULL,
      order_item_id        INT NULL,
      previous_statut      VARCHAR(20) NULL,
      deactivation_reason  VARCHAR(255) NULL,
      tap_count            INT UNSIGNED NOT NULL DEFAULT 0,
      last_tap_at          DATETIME NULL,
      assigned_at          DATETIME NULL,
      printed_at           DATETIME NULL,
      delivered_at         DATETIME NULL,
      deactivated_at       DATETIME NULL,
      notes                VARCHAR(500) NULL,
      created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_card_code (code),
      KEY idx_card_stock (type_stock, statut),
      KEY idx_card_user (user_id),
      KEY idx_card_order (order_id),
      KEY idx_card_batch (batch_id),
      CONSTRAINT fk_card_batch FOREIGN KEY (batch_id) REFERENCES nfc_card_batches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Analytics : distinguer les visites venant d'un tap de carte
  await pool.query("ALTER TABLE visites ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'web'");
  await pool.query('ALTER TABLE visites ADD COLUMN IF NOT EXISTS card_id INT NULL');

  // Les événements n8n peuvent concerner autre chose qu'une précommande (stock, devis…)
  await pool.query('ALTER TABLE nfc_preorder_events MODIFY preorder_id INT NULL').catch(() => {});
}

module.exports = { init, STOCK_TYPES, CARD_STATUSES };
