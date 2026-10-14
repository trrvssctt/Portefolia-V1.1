// Offres de cartes NFC (prix et options en base, modifiables depuis l'admin)
// et lignes de commande : une ligne = une carte physique à imprimer.
const { pool } = require('../db');

// options :
//   print_faces       'info' (face infos seule, logo Portefolia imprimé en usine) | 'both' (2 faces imprimées à Dakar)
//   allow_templates   choix du gabarit de la face infos
//   allow_colors      choix des couleurs
//   allow_photo       photo sur la face infos
//   allow_logo        logo du client sur la face logo
//   allow_notes       notes de design pour l'équipe
//   needs_design      un designer prépare le BAT (sinon : le visuel validé à la commande sert de BAT)
//   block_without_stock  commande impossible quand le stock du type de carte est épuisé
//   features          arguments affichés sur la page de comparaison
const DEFAULT_OFFERS = [
  {
    code: 'standard', name: 'Standard', price: 12500, stock_type: 'logo_printed', is_quote: 0, sort_order: 1,
    tagline: 'L\'essentiel, prêt en quelques jours',
    description: 'Logo Portefolia imprimé en usine, face infos au modèle Portefolia.',
    options: {
      print_faces: 'info', allow_templates: false, allow_colors: false, allow_photo: false, allow_logo: false,
      allow_notes: false, needs_design: false, block_without_stock: false,
      features: ['Logo Portefolia sur une face', 'Nom, poste, téléphone, e-mail et lien du profil', 'Puce NFC reliée à votre portfolio'],
    },
  },
  {
    code: 'personnalisee', name: 'Personnalisée', price: 20000, stock_type: 'logo_printed', is_quote: 0, sort_order: 2,
    tagline: 'Votre style, vos couleurs',
    description: 'Logo Portefolia imprimé en usine, face infos personnalisée : gabarit, couleurs et photo.',
    options: {
      print_faces: 'info', allow_templates: true, allow_colors: true, allow_photo: true, allow_logo: false,
      allow_notes: false, needs_design: false, block_without_stock: false,
      features: ['Logo Portefolia sur une face', 'Choix du gabarit et des couleurs', 'Votre photo sur la carte', 'Puce NFC reliée à votre portfolio'],
    },
  },
  {
    code: 'premium', name: 'Premium', price: 30000, stock_type: 'blank', is_quote: 0, sort_order: 3,
    tagline: 'Votre marque, sur les deux faces',
    description: 'Votre logo et un design sur mesure, imprimés sur une carte vierge.',
    options: {
      print_faces: 'both', allow_templates: false, allow_colors: true, allow_photo: false, allow_logo: true,
      allow_notes: true, needs_design: true, block_without_stock: true,
      features: ['Votre logo sur une face', 'Design sur mesure par notre équipe', 'Bon à tirer à valider avant impression', 'Puce NFC reliée à votre portfolio'],
    },
  },
  {
    code: 'entreprise', name: 'Entreprise', price: null, stock_type: null, is_quote: 1, sort_order: 4,
    tagline: 'Toute votre équipe, à votre image',
    description: 'Le logo de votre entreprise et les infos de chaque membre. Tarif selon le volume.',
    options: {
      print_faces: 'both', allow_templates: false, allow_colors: true, allow_photo: false, allow_logo: true,
      allow_notes: true, needs_design: true, block_without_stock: false,
      features: ['Logo de votre entreprise', 'Une carte par membre de l\'équipe', 'Gestion depuis votre espace Business', 'Tarif dégressif selon le volume'],
    },
  },
];

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_offers (
      id           INT NOT NULL AUTO_INCREMENT,
      code         VARCHAR(30)  NOT NULL,
      name         VARCHAR(60)  NOT NULL,
      tagline      VARCHAR(160) NULL,
      description  VARCHAR(500) NULL,
      price        INT UNSIGNED NULL,
      currency     CHAR(3)      NOT NULL DEFAULT 'XOF',
      stock_type   ENUM('logo_printed','blank') NULL,
      is_quote     TINYINT(1)   NOT NULL DEFAULT 0,
      options      LONGTEXT     NULL,
      is_active    TINYINT(1)   NOT NULL DEFAULT 1,
      sort_order   INT          NOT NULL DEFAULT 0,
      updated_by   INT          NULL,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_offer_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  for (const o of DEFAULT_OFFERS) {
    await pool.query(
      `INSERT IGNORE INTO nfc_offers (code, name, tagline, description, price, stock_type, is_quote, options, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.code, o.name, o.tagline, o.description, o.price, o.stock_type, o.is_quote, JSON.stringify(o.options), o.sort_order]
    );
  }

  // Commande : offre (figée au moment de la commande) et personnalisation
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_id INT NULL AFTER user_id');
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_code VARCHAR(30) NULL AFTER offer_id');
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS offer_name VARCHAR(60) NULL AFTER offer_code');
  await pool.query('ALTER TABLE nfc_preorders ADD COLUMN IF NOT EXISTS customization LONGTEXT NULL AFTER notes');

  // Une ligne par carte physique à imprimer
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_order_items (
      id                 INT NOT NULL AUTO_INCREMENT,
      order_id           INT NOT NULL,
      position           TINYINT UNSIGNED NOT NULL DEFAULT 1,
      holder_user_id     INT NULL,
      holder_member_id   INT NULL,
      portfolio_id       INT NULL,
      printed_info       LONGTEXT NULL,
      design             LONGTEXT NULL,
      preview_front_url  VARCHAR(500) NULL,
      preview_back_url   VARCHAR(500) NULL,
      print_front_url    VARCHAR(500) NULL,
      print_back_url     VARCHAR(500) NULL,
      bat_revision       TINYINT UNSIGNED NOT NULL DEFAULT 0,
      card_id            INT NULL,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_item_order (order_id),
      KEY idx_item_card (card_id),
      CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES nfc_preorders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await migrateLegacyPreorders();
}

// Précommandes d'avant les offres : rattachées à Standard, avec leurs lignes de carte
async function migrateLegacyPreorders() {
  const [[std]] = await pool.query("SELECT id, name FROM nfc_offers WHERE code = 'standard'");
  if (!std) return;
  await pool.query(
    "UPDATE nfc_preorders SET offer_id = ?, offer_code = 'standard', offer_name = ? WHERE offer_id IS NULL",
    [std.id, std.name]
  );
  const [orphans] = await pool.query(
    `SELECT p.* FROM nfc_preorders p
     WHERE NOT EXISTS (SELECT 1 FROM nfc_order_items i WHERE i.order_id = p.id)`
  );
  for (const p of orphans) {
    const info = JSON.stringify({ name: p.card_name, title: '', phone: p.phone, email: p.email });
    const design = JSON.stringify({ template: 'classique', finish: 'noir' });
    const rows = Array.from({ length: Math.max(1, Number(p.quantity) || 1) }, (_, i) => [p.id, i + 1, p.user_id, info, design]);
    await pool.query('INSERT INTO nfc_order_items (order_id, position, holder_user_id, printed_info, design) VALUES ?', [rows]);
  }
}

function parseOffer(row) {
  if (!row) return null;
  let options = {};
  try { options = row.options ? JSON.parse(row.options) : {}; } catch { options = {}; }
  return {
    ...row,
    price: row.price === null ? null : Number(row.price),
    is_quote: !!row.is_quote,
    is_active: !!row.is_active,
    options,
  };
}

async function listOffers({ activeOnly = true } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM nfc_offers ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(parseOffer);
}

async function findOfferByCode(code, conn = pool) {
  const [[row]] = await conn.query('SELECT * FROM nfc_offers WHERE code = ?', [String(code || '')]);
  return parseOffer(row);
}

async function findOfferById(id, conn = pool) {
  const [[row]] = await conn.query('SELECT * FROM nfc_offers WHERE id = ?', [id]);
  return parseOffer(row);
}

const OPTION_FLAGS = ['allow_templates', 'allow_colors', 'allow_photo', 'allow_logo', 'allow_notes', 'needs_design', 'block_without_stock'];

function offerError(message) {
  const e = new Error(message);
  e.status = 422;
  return e;
}

// Modification d'une offre depuis l'admin (code et type de stock non modifiables)
async function updateOffer(id, body = {}, adminId = null) {
  const current = await findOfferById(id);
  if (!current) { const e = new Error('Offre introuvable.'); e.status = 404; throw e; }
  const next = { ...current, options: { ...current.options } };

  if (body.name !== undefined) {
    next.name = String(body.name).trim();
    if (next.name.length < 2 || next.name.length > 60) throw offerError('Nom : 2 à 60 caractères.');
  }
  if (body.tagline !== undefined) next.tagline = String(body.tagline || '').trim().slice(0, 160) || null;
  if (body.description !== undefined) next.description = String(body.description || '').trim().slice(0, 500) || null;
  if (body.price !== undefined) {
    if (body.price === null || body.price === '') {
      if (!current.is_quote) throw offerError('Prix obligatoire (seule l\'offre sur devis peut ne pas en avoir).');
      next.price = null;
    } else {
      const price = Number(body.price);
      if (!Number.isInteger(price) || price < 100 || price > 10000000) throw offerError('Prix invalide (en F CFA, nombre entier).');
      next.price = price;
    }
  }
  if (body.is_active !== undefined) next.is_active = !!body.is_active;
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isInteger(n) || n < 0 || n > 99) throw offerError('Ordre d\'affichage invalide.');
    next.sort_order = n;
  }
  const o = body.options || {};
  for (const f of OPTION_FLAGS) if (o[f] !== undefined) next.options[f] = !!o[f];
  if (o.print_faces !== undefined) {
    if (!['info', 'both'].includes(o.print_faces)) throw offerError('Faces imprimées invalides.');
    next.options.print_faces = o.print_faces;
  }
  if (o.features !== undefined) {
    if (!Array.isArray(o.features)) throw offerError('Arguments invalides.');
    next.options.features = o.features.map((x) => String(x || '').trim().slice(0, 120)).filter(Boolean).slice(0, 8);
  }

  await pool.query(
    `UPDATE nfc_offers SET name = ?, tagline = ?, description = ?, price = ?, is_active = ?, sort_order = ?,
       options = ?, updated_by = ? WHERE id = ?`,
    [next.name, next.tagline, next.description, next.price, next.is_active ? 1 : 0, next.sort_order,
      JSON.stringify(next.options), adminId, id]
  );
  return findOfferById(id);
}

module.exports = { init, DEFAULT_OFFERS, listOffers, findOfferByCode, findOfferById, updateOffer, parseOffer };
