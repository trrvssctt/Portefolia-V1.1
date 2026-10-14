-- Migration 012 : production des cartes NFC (bon à tirer, impression, livraison)
-- Exécutée automatiquement au démarrage par backend/src/models/nfcProductionModel.js (idempotent).

ALTER TABLE nfc_preorders MODIFY status ENUM(
  'pending_payment','payment_submitted','paid','rejected','expired','cancelled','converted',
  'design_en_cours','bat_envoye','bat_valide','en_impression','prete','livree'
) NOT NULL DEFAULT 'pending_payment';

ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS stock_type ENUM('logo_printed','blank') NULL AFTER offer_name;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS bat_revision TINYINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS bat_comment VARCHAR(1000) NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS bat_sent_at DATETIME NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS bat_validated_at DATETIME NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS bat_reminder_count TINYINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS last_bat_reminder_at DATETIME NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS printing_at DATETIME NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS ready_at DATETIME NULL;
ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL;

-- Type de carte des commandes existantes : celui de leur offre
UPDATE nfc_preorders p JOIN nfc_offers o ON o.id = p.offer_id
SET p.stock_type = o.stock_type WHERE p.stock_type IS NULL AND o.stock_type IS NOT NULL;

-- Ancienne « conversion en commande » = carte en impression
UPDATE nfc_preorders SET status = 'en_impression', printing_at = COALESCE(printing_at, updated_at) WHERE status = 'converted';
