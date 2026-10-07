-- =====================================================================
--  Portefolia — Précommandes de cartes NFC
--  Migration MySQL (8.x recommandé). À adapter au système de migration
--  du projet (dossier migrations existant, knex, sequelize, script SQL…).
--  ⚠ Vérifier le type de users.id et commandes.id avant d'exécuter
--    (INT UNSIGNED supposé ci-dessous).
-- =====================================================================

CREATE TABLE IF NOT EXISTS nfc_preorders (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference                VARCHAR(20)  NULL,                 -- PF-NFC-0001, rempli juste après l'INSERT
  public_token             CHAR(64)     NOT NULL,             -- jeton aléatoire pour la page de suivi publique
  user_id                  INT UNSIGNED NULL,                 -- si le client est connecté
  full_name                VARCHAR(120) NOT NULL,
  card_name                VARCHAR(80)  NOT NULL,             -- nom à imprimer sur la carte
  email                    VARCHAR(190) NOT NULL,
  phone                    VARCHAR(20)  NOT NULL,             -- format E.164 : +2217XXXXXXXX
  city                     VARCHAR(80)  NULL,
  quantity                 TINYINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price               INT UNSIGNED NOT NULL,             -- en F CFA, figé au moment de la précommande
  total_amount             INT UNSIGNED NOT NULL,
  currency                 CHAR(3)      NOT NULL DEFAULT 'XOF',
  status                   ENUM('pending_payment','payment_submitted','paid','rejected','expired','cancelled','converted')
                           NOT NULL DEFAULT 'pending_payment',
  wave_transaction_id      VARCHAR(64)  NULL,
  wave_sender_phone        VARCHAR(20)  NULL,
  payment_submitted_at     DATETIME     NULL,
  paid_at                  DATETIME     NULL,
  validated_by             INT UNSIGNED NULL,                 -- id de l'admin qui a validé/refusé
  rejection_reason         VARCHAR(255) NULL,                 -- motif de refus ou d'annulation
  client_reminder_count    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_client_reminder_at  DATETIME     NULL,
  last_admin_reminder_at   DATETIME     NULL,
  commande_id              INT UNSIGNED NULL,                 -- rempli lors de la conversion en commande
  source                   VARCHAR(30)  NOT NULL DEFAULT 'web', -- web | waitlist | admin
  notes                    VARCHAR(500) NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_preorder_reference (reference),
  UNIQUE KEY uq_preorder_token (public_token),
  UNIQUE KEY uq_preorder_wave_tx (wave_transaction_id),       -- une transaction Wave ne sert qu'une fois
  KEY idx_preorder_status_created (status, created_at),
  KEY idx_preorder_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Outbox : chaque événement envoyé (ou à renvoyer) vers n8n
CREATE TABLE IF NOT EXISTS nfc_preorder_events (
  id            CHAR(36)     NOT NULL,                        -- UUID v4 = event_id
  preorder_id   INT UNSIGNED NOT NULL,
  event         VARCHAR(40)  NOT NULL,                        -- preorder.created, preorder.paid…
  payload       JSON         NOT NULL,
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  delivered_at  DATETIME     NULL,
  last_error    VARCHAR(500) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_pending (delivered_at, attempts),
  KEY idx_events_preorder (preorder_id),
  CONSTRAINT fk_events_preorder FOREIGN KEY (preorder_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal des notifications réellement envoyées (rempli par n8n)
CREATE TABLE IF NOT EXISTS nfc_preorder_notifications (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  preorder_id  INT UNSIGNED NOT NULL,
  event_id     CHAR(36)     NULL,
  channel      ENUM('email','whatsapp','telegram') NOT NULL DEFAULT 'email',
  audience     ENUM('client','admin') NOT NULL,
  template     VARCHAR(60)  NOT NULL,                         -- preorder.created, reminder.client_payment_1…
  recipient    VARCHAR(190) NOT NULL,
  status       ENUM('sent','failed') NOT NULL,
  error        VARCHAR(500) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_preorder (preorder_id, created_at),
  CONSTRAINT fk_notif_preorder FOREIGN KEY (preorder_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
