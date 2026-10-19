-- Migration 011 : offres de cartes NFC, lignes de commande (une par carte physique)
-- Exécutée automatiquement au démarrage par backend/src/models/nfcOfferModel.js (idempotent),
-- y compris le rattachement des précommandes existantes à l'offre Standard.

CREATE TABLE IF NOT EXISTS nfc_offers (
  id           INT NOT NULL AUTO_INCREMENT,
  code         VARCHAR(30)  NOT NULL,
  name         VARCHAR(60)  NOT NULL,
  tagline      VARCHAR(160) NULL,
  description  VARCHAR(500) NULL,
  price        INT UNSIGNED NULL,          -- NULL = sur devis
  currency     CHAR(3)      NOT NULL DEFAULT 'XOF',
  stock_type   ENUM('logo_printed','blank') NULL,
  is_quote     TINYINT(1)   NOT NULL DEFAULT 0,
  options      LONGTEXT     NULL,          -- JSON : faces imprimées, gabarits, couleurs, photo, logo, arguments…
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order   INT          NOT NULL DEFAULT 0,
  updated_by   INT          NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_offer_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Les 4 offres (Standard 5 000, Personnalisée 6 500, Premium 12 500, Entreprise sur devis — prix du 19/10/2026)
-- sont insérées par nfcOfferModel.init() avec leurs options.

ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_id INT NULL AFTER user_id;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_code VARCHAR(30) NULL AFTER offer_id;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_name VARCHAR(60) NULL AFTER offer_code;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS customization LONGTEXT NULL AFTER notes;

CREATE TABLE IF NOT EXISTS nfc_order_items (
  id                 INT NOT NULL AUTO_INCREMENT,
  order_id           INT NOT NULL,
  position           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  holder_user_id     INT NULL,
  holder_member_id   INT NULL,
  portfolio_id       INT NULL,
  printed_info       LONGTEXT NULL,   -- JSON : nom, poste, téléphone, e-mail, URL du profil
  design             LONGTEXT NULL,   -- JSON : gabarit, finition, couleurs, photo, logo, notes
  preview_front_url  VARCHAR(500) NULL,
  preview_back_url   VARCHAR(500) NULL,
  print_front_url    VARCHAR(500) NULL,  -- 600 dpi, 3 mm de fond perdu
  print_back_url     VARCHAR(500) NULL,
  bat_revision       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  card_id            INT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_item_order (order_id),
  KEY idx_item_card (card_id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quantité maximale par commande : 5 cartes identiques
UPDATE nfc_settings SET valeur = '5' WHERE cle = 'max_quantity';

-- 19/10/2026 : nouveaux prix
UPDATE nfc_offers SET price = 5000  WHERE code = 'standard';
UPDATE nfc_offers SET price = 6500  WHERE code = 'personnalisee';
UPDATE nfc_offers SET price = 12500 WHERE code = 'premium';
