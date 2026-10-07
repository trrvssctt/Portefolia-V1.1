const { pool } = require('../db');

// Valeurs initiales des réglages NFC (modifiables ensuite depuis l'admin)
const DEFAULT_SETTINGS = {
  unit_price: '12500',
  currency: 'XOF',
  max_quantity: '10',
  batch_threshold: '10',
  expiry_hours: '72',
  wave_number: '+221 78 131 13 71',
  wave_link: '',
  wave_link_supports_amount: '0',
};

async function init() {
  // Réglages de la carte NFC (prix, numéro Wave…) : clé / valeur
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_settings (
      cle         VARCHAR(60)  NOT NULL PRIMARY KEY,
      valeur      VARCHAR(255) NOT NULL,
      updated_by  INT NULL,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  for (const [cle, valeur] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.query('INSERT IGNORE INTO nfc_settings (cle, valeur) VALUES (?, ?)', [cle, valeur]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_preorders (
      id                       INT NOT NULL AUTO_INCREMENT,
      reference                VARCHAR(20)  NULL,
      public_token             CHAR(64)     NOT NULL,
      user_id                  INT NULL,
      full_name                VARCHAR(120) NOT NULL,
      card_name                VARCHAR(80)  NOT NULL,
      email                    VARCHAR(190) NOT NULL,
      phone                    VARCHAR(20)  NOT NULL,
      city                     VARCHAR(80)  NULL,
      quantity                 TINYINT UNSIGNED NOT NULL DEFAULT 1,
      unit_price               INT UNSIGNED NOT NULL,
      total_amount             INT UNSIGNED NOT NULL,
      currency                 CHAR(3)      NOT NULL DEFAULT 'XOF',
      status                   ENUM('pending_payment','payment_submitted','paid','rejected','expired','cancelled','converted')
                               NOT NULL DEFAULT 'pending_payment',
      wave_transaction_id      VARCHAR(64)  NULL,
      wave_sender_phone        VARCHAR(20)  NULL,
      payment_submitted_at     DATETIME     NULL,
      paid_at                  DATETIME     NULL,
      rejected_at              DATETIME     NULL,
      validated_by             INT NULL,
      rejection_reason         VARCHAR(255) NULL,
      client_reminder_count    TINYINT UNSIGNED NOT NULL DEFAULT 0,
      last_client_reminder_at  DATETIME     NULL,
      last_admin_reminder_at   DATETIME     NULL,
      commande_id              INT NULL,
      source                   VARCHAR(30)  NOT NULL DEFAULT 'web',
      notes                    VARCHAR(500) NULL,
      created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_preorder_reference (reference),
      UNIQUE KEY uq_preorder_token (public_token),
      UNIQUE KEY uq_preorder_wave_tx (wave_transaction_id),
      KEY idx_preorder_status_created (status, created_at),
      KEY idx_preorder_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Outbox : événements à transmettre à n8n (renvoyés tant qu'ils n'ont pas été reçus)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_preorder_events (
      id            CHAR(36)     NOT NULL,
      preorder_id   INT          NOT NULL,
      event         VARCHAR(40)  NOT NULL,
      payload       LONGTEXT     NOT NULL,
      attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
      delivered_at  DATETIME     NULL,
      last_error    VARCHAR(500) NULL,
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_events_pending (delivered_at, attempts),
      KEY idx_events_preorder (preorder_id),
      CONSTRAINT fk_events_preorder FOREIGN KEY (preorder_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Journal des e-mails réellement envoyés (rempli par n8n)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_preorder_notifications (
      id           INT NOT NULL AUTO_INCREMENT,
      preorder_id  INT NOT NULL,
      event_id     CHAR(36)     NULL,
      channel      ENUM('email','whatsapp','telegram') NOT NULL DEFAULT 'email',
      audience     ENUM('client','admin') NOT NULL,
      template     VARCHAR(60)  NOT NULL,
      recipient    VARCHAR(190) NOT NULL,
      status       ENUM('sent','failed') NOT NULL,
      error        VARCHAR(500) NULL,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notif_preorder (preorder_id, created_at),
      CONSTRAINT fk_notif_preorder FOREIGN KEY (preorder_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { init, DEFAULT_SETTINGS };
