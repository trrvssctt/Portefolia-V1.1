// Production des cartes NFC : statuts de fabrication, bon à tirer (BAT), suivi des dates.
const { pool } = require('../db');

// Statuts de paiement (inchangés) puis de production ; « converted » est conservé pour l'historique
const ORDER_STATUSES = [
  'pending_payment', 'payment_submitted', 'paid', 'rejected', 'expired', 'cancelled', 'converted',
  'design_en_cours', 'bat_envoye', 'bat_valide', 'en_impression', 'prete', 'livree',
];

async function init() {
  await pool.query(
    `ALTER TABLE nfc_preorders MODIFY status ENUM(${ORDER_STATUSES.map((s) => `'${s}'`).join(',')})
     NOT NULL DEFAULT 'pending_payment'`
  );
  const columns = [
    "stock_type ENUM('logo_printed','blank') NULL AFTER offer_name",
    'bat_revision TINYINT UNSIGNED NOT NULL DEFAULT 0',
    'bat_comment VARCHAR(1000) NULL',
    'bat_sent_at DATETIME NULL',
    'bat_validated_at DATETIME NULL',
    'bat_reminder_count TINYINT UNSIGNED NOT NULL DEFAULT 0',
    'last_bat_reminder_at DATETIME NULL',
    'printing_at DATETIME NULL',
    'ready_at DATETIME NULL',
    'delivered_at DATETIME NULL',
  ];
  for (const def of columns) {
    await pool.query(`ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS ${def}`);
  }
  // Type de carte des commandes déjà passées : celui de leur offre
  await pool.query(
    `UPDATE nfc_preorders p JOIN nfc_offers o ON o.id = p.offer_id
     SET p.stock_type = o.stock_type WHERE p.stock_type IS NULL AND o.stock_type IS NOT NULL`
  );
  // Ancienne « conversion en commande » : équivaut à une carte en impression
  await pool.query("UPDATE nfc_preorders SET status = 'en_impression', printing_at = COALESCE(printing_at, updated_at) WHERE status = 'converted'");
}

module.exports = { init, ORDER_STATUSES };
