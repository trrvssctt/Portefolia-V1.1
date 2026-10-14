// Commandes de cartes NFC par offre (Standard, Personnalisée, Premium) : création, suivi client,
// et cartes du client. Le paiement Wave, la validation et les notifications restent ceux des précommandes.
const crypto = require('crypto');
const { pool } = require('../db');
const notifier = require('./n8nNotifier');
const pre = require('./nfcPreorderService');
const cards = require('./nfcCardService');
const { listOffers, findOfferByCode } = require('../models/nfcOfferModel');
const { getNfcConfig, frontendUrl } = require('../utils/nfcConfig');
const { uploadAsset, isOwnAssetUrl, VISUAL_FIELDS } = require('../utils/nfcAssets');
const { trackingUrl } = require('../utils/nfcPreorderPayload');

const { PreorderError } = pre;

const TEMPLATES = ['classique', 'moderne', 'photo'];
const FINISHES = ['noir', 'graphite', 'blanc'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const CARD_HOST = 'portefolia.tech/portfolio/';

// ── Offres ────────────────────────────────────────────────────────────────────

// Cartes déjà promises (commandes en cours sans carte attribuée) par type de stock
async function reservedByStockType(conn = pool) {
  const [rows] = await conn.query(
    `SELECT o.stock_type, COUNT(i.id) AS n
     FROM nfc_order_items i
     JOIN nfc_preorders p ON p.id = i.order_id
     JOIN nfc_offers o ON o.id = p.offer_id
     WHERE i.card_id IS NULL AND o.stock_type IS NOT NULL
       AND p.status NOT IN ('cancelled','expired')
     GROUP BY o.stock_type`
  );
  return Object.fromEntries(rows.map((r) => [r.stock_type, Number(r.n)]));
}

async function availability(conn = pool) {
  const stock = await cards.getStock(conn);
  const reserved = await reservedByStockType(conn);
  const out = {};
  for (const t of stock.types) out[t.type_stock] = Math.max(0, t.available - (reserved[t.type_stock] || 0));
  return out;
}

async function publicOffers() {
  const [offers, avail, cfg] = await Promise.all([listOffers(), availability(), getNfcConfig()]);
  return {
    max_quantity: cfg.max_quantity,
    offers: offers.map((o) => {
      const blocked = !!o.options.block_without_stock && o.stock_type && (avail[o.stock_type] || 0) <= 0;
      return {
        code: o.code,
        name: o.name,
        tagline: o.tagline,
        description: o.description,
        price: o.price,
        currency: o.currency,
        is_quote: o.is_quote,
        options: o.options,
        available: !blocked,
      };
    }),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function parseJson(v) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(String(v || '{}')); } catch { return {}; }
}

function validateInfo(raw, account) {
  const info = parseJson(raw);
  const errors = {};
  const name = pre.cleanText(info.name || [account.prenom, account.nom].filter(Boolean).join(' '), 120);
  if (name.length < 2 || name.length > 80) errors.name = 'Nom à imprimer requis (2 à 80 caractères).';
  const title = pre.cleanText(info.title, 120);
  if (title.length > 80) errors.title = 'Poste trop long (80 caractères maximum).';
  const phone = pre.normalizePhone(info.phone || account.phone);
  if (!phone) errors.phone = 'Numéro invalide : saisissez un numéro sénégalais, par exemple 77 123 45 67.';
  const email = String(info.email || account.email || '').trim().toLowerCase();
  if (!pre.EMAIL_RE.test(email) || email.length > 190) errors.email = 'Adresse e-mail invalide.';
  if (Object.keys(errors).length) throw new PreorderError(422, Object.values(errors)[0], { errors });
  return { name, title, phone, email };
}

function validateDesign(raw, offer) {
  const d = parseJson(raw);
  const o = offer.options || {};
  const design = {
    template: o.allow_templates && TEMPLATES.includes(d.template) ? d.template : 'classique',
    finish: FINISHES.includes(d.finish) ? d.finish : 'noir',
  };
  if (o.allow_colors && d.colors) {
    const c = d.colors;
    if (![c.bg, c.text, c.accent].every((x) => HEX_RE.test(String(x || '')))) {
      throw new PreorderError(422, 'Couleurs invalides.');
    }
    design.colors = { bg: c.bg, text: c.text, accent: c.accent };
  }
  if (o.allow_photo && d.photo_url) {
    if (!isOwnAssetUrl(d.photo_url)) throw new PreorderError(422, 'Photo invalide : envoyez-la depuis le formulaire.');
    design.photo_url = d.photo_url;
  }
  if (design.template === 'photo' && !design.photo_url) {
    throw new PreorderError(422, 'Ajoutez votre photo pour ce gabarit.');
  }
  if (o.allow_logo) {
    if (!d.logo_url || !isOwnAssetUrl(d.logo_url)) throw new PreorderError(422, 'Ajoutez votre logo (PNG ou SVG).');
    design.logo_url = d.logo_url;
  }
  if (o.allow_notes && d.notes) design.notes = pre.cleanText(d.notes, 1000);
  return design;
}

// ── Création ──────────────────────────────────────────────────────────────────

async function createCardOrder({ userId, body = {}, files = {} }) {
  if (!userId) throw new PreorderError(401, 'Connectez-vous pour commander votre carte.');
  const cfg = await getNfcConfig();
  const offer = await findOfferByCode(body.offer_code || 'standard');
  if (!offer || !offer.is_active) throw new PreorderError(422, 'Offre indisponible.');
  if (offer.is_quote || offer.price === null) throw new PreorderError(422, 'Cette offre se commande sur devis.');

  const [[account]] = await pool.query(
    'SELECT id, prenom, nom, email, phone FROM utilisateurs WHERE id = ?', [userId]
  );
  if (!account) throw new PreorderError(401, 'Compte introuvable.');

  const info = validateInfo(body.info, account);
  const design = validateDesign(body.design, offer);
  const quantity = Number(body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > cfg.max_quantity) {
    throw new PreorderError(422, `Quantité invalide (entre 1 et ${cfg.max_quantity}).`);
  }
  const city = pre.cleanText(body.city, 80) || null;

  // La carte doit ouvrir un portfolio du client
  const portfolioId = await cards.resolvePortfolioForUser(pool, userId, body.portfolio_id ? Number(body.portfolio_id) : null)
    .catch((e) => { throw new PreorderError(e.status || 422, e.message); });
  if (!portfolioId) throw new PreorderError(422, 'Créez d\'abord votre portfolio : c\'est lui que la carte ouvrira.');
  const [[portfolio]] = await pool.query('SELECT url_slug FROM portfolios WHERE id = ?', [portfolioId]);
  info.profile_url = `${CARD_HOST}${portfolio ? portfolio.url_slug : ''}`;

  // Une seule commande en cours (non payée) par compte, e-mail ou téléphone
  const [[mine]] = await pool.query(
    'SELECT reference, status FROM nfc_preorders WHERE user_id = ? AND status IN (?) ORDER BY id DESC LIMIT 1',
    [userId, pre.ACTIVE_STATUSES]
  );
  const existing = mine ? { preorder: mine, match: 'compte' } : await pre.findActiveByContact({ email: info.email, phone: info.phone });
  if (existing) {
    const p = existing.preorder;
    throw new PreorderError(409,
      `Une commande (${p.reference}) ${pre.ACTIVE_MESSAGES[p.status]}. Finalisez-la avant d'en passer une nouvelle.`,
      { reference: p.reference, active_status: p.status });
  }

  // Stock (Premium : cartes vierges)
  if (offer.options.block_without_stock && offer.stock_type) {
    const avail = await availability();
    if ((avail[offer.stock_type] || 0) < quantity) {
      throw new PreorderError(409, 'Rupture de stock pour cette offre. Laissez-nous votre e-mail : nous vous prévenons dès le retour des cartes.',
        { out_of_stock: true });
    }
  }

  // Visuels recto/verso (aperçu + fichiers d'impression), rendus par le navigateur
  const visuals = {};
  for (const field of VISUAL_FIELDS) {
    const file = files[field] && files[field][0];
    if (!file) throw new PreorderError(422, 'Visuels de la carte manquants : rechargez la page et réessayez.');
    visuals[field] = await uploadAsset(file, 'visual', { folder: 'nfc/commandes', prefix: `u${userId}_${field}` })
      .catch((e) => { throw new PreorderError(e.status || 502, e.message); });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const total = offer.price * quantity;
  const fullName = [account.prenom, account.nom].filter(Boolean).join(' ').trim() || info.name;
  const customization = { info, design, portfolio_id: portfolioId };

  const order = await pre.withTransaction(async (conn, events) => {
    const [res] = await conn.query(
      `INSERT INTO nfc_preorders
        (public_token, user_id, offer_id, offer_code, offer_name, full_name, card_name, email, phone, city,
         quantity, unit_price, total_amount, currency, notes, customization, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')`,
      [token, userId, offer.id, offer.code, offer.name, fullName, info.name, info.email, info.phone, city,
        quantity, offer.price, total, offer.currency, design.notes || null, JSON.stringify(customization)]
    );
    const reference = `PF-NFC-${String(res.insertId).padStart(4, '0')}`;
    await conn.query('UPDATE nfc_preorders SET reference = ? WHERE id = ?', [reference, res.insertId]);
    const rows = Array.from({ length: quantity }, (_, i) => [
      res.insertId, i + 1, userId, portfolioId, JSON.stringify(info), JSON.stringify(design),
      visuals.preview_front, visuals.preview_back, visuals.print_front, visuals.print_back,
    ]);
    await conn.query(
      `INSERT INTO nfc_order_items
        (order_id, position, holder_user_id, portfolio_id, printed_info, design,
         preview_front_url, preview_back_url, print_front_url, print_back_url) VALUES ?`, [rows]
    );
    events.push(await notifier.emit(conn, res.insertId, 'preorder.created'));
    const [[row]] = await conn.query('SELECT * FROM nfc_preorders WHERE id = ?', [res.insertId]);
    return row;
  });

  return { order, token, tracking_url: trackingUrl(order) };
}

// ── Suivi client ──────────────────────────────────────────────────────────────

function parseItem(i) {
  return { ...i, printed_info: parseJson(i.printed_info), design: parseJson(i.design) };
}

async function itemsFor(orderIds) {
  if (!orderIds.length) return {};
  const [rows] = await pool.query(
    `SELECT i.*, c.code AS card_code, c.statut AS card_statut
     FROM nfc_order_items i LEFT JOIN nfc_physical_cards c ON c.id = i.card_id
     WHERE i.order_id IN (?) ORDER BY i.order_id, i.position`, [orderIds]
  );
  const by = {};
  for (const r of rows) (by[r.order_id] = by[r.order_id] || []).push(parseItem(r));
  return by;
}

async function myOrders(userId) {
  const [orders] = await pool.query(
    'SELECT * FROM nfc_preorders WHERE user_id = ? ORDER BY id DESC LIMIT 50', [userId]
  );
  const items = await itemsFor(orders.map((o) => o.id));
  return orders.map((o) => {
    const { public_token, customization, ...rest } = o;
    return { ...rest, customization: parseJson(customization), items: items[o.id] || [], tracking_url: trackingUrl(o) };
  });
}

async function orderItems(orderId) {
  return (await itemsFor([orderId]))[orderId] || [];
}

// ── Cartes du client ──────────────────────────────────────────────────────────

async function myCards(userId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.type_stock, c.statut, c.portfolio_id, c.tap_count, c.last_tap_at, c.delivered_at,
            c.deactivation_reason, p.url_slug AS portfolio_slug, p.titre AS portfolio_title, o.reference AS order_reference
     FROM nfc_physical_cards c
     LEFT JOIN portfolios p ON p.id = c.portfolio_id
     LEFT JOIN nfc_preorders o ON o.id = c.order_id
     WHERE c.user_id = ? ORDER BY c.id DESC`, [userId]
  );
  const [portfolios] = await pool.query(
    `SELECT id, titre, url_slug, est_public FROM portfolios
     WHERE utilisateur_id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00') ORDER BY id DESC`, [userId]
  );
  return { cards: rows.map((c) => ({ ...c, url: cards.cardUrl(c.code) })), portfolios };
}

async function lockMyCard(conn, userId, cardId) {
  const [[c]] = await conn.query('SELECT * FROM nfc_physical_cards WHERE id = ? AND user_id = ? FOR UPDATE', [cardId, userId]);
  if (!c) throw new PreorderError(404, 'Carte introuvable.');
  return c;
}

// Le client choisit le portfolio ouvert par sa carte (sans réimpression)
async function setMyCardPortfolio(userId, cardId, portfolioId) {
  return pre.withTransaction(async (conn) => {
    await lockMyCard(conn, userId, cardId);
    const pid = await cards.resolvePortfolioForUser(conn, userId, Number(portfolioId))
      .catch((e) => { throw new PreorderError(e.status || 422, e.message); });
    await conn.query('UPDATE nfc_physical_cards SET portfolio_id = ? WHERE id = ?', [pid, cardId]);
    await conn.query('UPDATE nfc_order_items SET portfolio_id = ? WHERE card_id = ?', [pid, cardId]);
    return { ok: true };
  });
}

// Carte perdue ou volée : désactivée immédiatement (l'admin peut la réactiver)
async function declareMyCardLost(userId, cardId, reason) {
  return pre.withTransaction(async (conn, events) => {
    const c = await lockMyCard(conn, userId, cardId);
    if (c.statut === 'desactivee') return { ok: true };
    const motif = pre.cleanText(reason, 200) || 'Perte ou vol déclaré par le titulaire';
    await conn.query(
      `UPDATE nfc_physical_cards SET previous_statut = statut, statut = 'desactivee', deactivation_reason = ?,
         deactivated_at = NOW() WHERE id = ?`, [motif, cardId]
    );
    events.push(await notifier.emitGeneric(conn, 'card.reported_lost', {
      card: { code: c.code, reason: motif },
      links: { admin_stock_url: `${frontendUrl()}/admin/nfc-stock?q=${c.code}` },
    }));
    return { ok: true };
  });
}

module.exports = {
  TEMPLATES, FINISHES,
  publicOffers, availability, reservedByStockType,
  validateInfo, validateDesign, createCardOrder,
  myOrders, orderItems, myCards, setMyCardPortfolio, declareMyCardLost,
};
