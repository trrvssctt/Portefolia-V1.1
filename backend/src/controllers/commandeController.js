const commandeModel = require('../models/commandeModel');
const carteModel = require('../models/carteModel');
const portfolioModel = require('../models/portfolioModel');
const paiementModel = require('../models/paiementModel');
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

function genOrderNumber() {
  return 'CMD-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
}

function genCardUid() {
  return 'NFC_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
}

async function createOrder(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { adresse_livraison } = req.body;

    // Accepte { items: [{portfolio_id, quantity}] } OU { portfolio_id, quantity }
    let items = req.body.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      const { portfolio_id, quantity = 1 } = req.body;
      if (!portfolio_id) return res.status(400).json({ error: 'portfolio_id required' });
      items = [{ portfolio_id, quantity }];
    }

    // Vérifier que tous les portfolios appartiennent à l'utilisateur
    const resolvedItems = [];
    for (const item of items) {
      const { portfolio_id, quantity = 1 } = item;
      if (!portfolio_id) return res.status(400).json({ error: 'portfolio_id required dans chaque item' });
      const portfolio = await portfolioModel.findById(portfolio_id);
      if (!portfolio || String(portfolio.utilisateur_id) !== String(userId)) {
        return res.status(403).json({ error: `Portfolio ${portfolio_id} non autorisé` });
      }
      resolvedItems.push({ portfolio, quantity: Number(quantity) });
    }

    const montant = resolvedItems.reduce((sum, it) => sum + it.quantity * 30000, 0);
    const numero = genOrderNumber();
    const order = await commandeModel.createCommande({
      utilisateur_id: userId,
      numero_commande: numero,
      montant_total: montant,
      adresse_livraison,
      type_commande: 'commande_carte',
    });

    const cards = [];
    for (const { portfolio, quantity } of resolvedItems) {
      for (let i = 0; i < quantity; i++) {
        const uid = genCardUid();
        const card = await carteModel.createCarte({ commande_id: order.id, uid_nfc: uid, lien_portfolio: portfolio.url_slug });
        cards.push(card);
      }
    }

    return res.status(201).json({ order, cards });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Public order creation (no authentication required)
async function createPublicOrder(req, res) {
  try {
    const { product = null, plan_id = null, quantity = 1, nom, prenom, email, telephone = null, profession = null, site = null, adresse_livraison = null, logo_url = null } = req.body;

    if (!nom || !prenom || !email) return res.status(400).json({ error: 'nom, prenom et email requis' });

    // find or create a guest user for this email
    let user = await require('../models/userModel').findByEmail(email);
    if (!user) {
      // create guest user with random password
      const randPass = Math.random().toString(36).slice(2, 10);
      const newUser = await require('../models/userModel').createUser({ nom, prenom, email, mot_de_passe: await require('bcrypt').hash(randPass, 10), photo_profil: null, biographie: null, role: 'GUEST' });
      user = { id: newUser.id, nom, prenom, email };
    }

    const numero = genOrderNumber();
    let pricePer = 15000;
    // if plan_id provided, derive price from nfc_cards table
    if (plan_id) {
      try {
        const planMod = require('../models/carte_visite_model');
        const plan = await planMod.getById(Number(plan_id));
        if (plan) {
          pricePer = Number(plan.price_cents || 0);
        }
      } catch (e) {
        // fallback
      }
    } else if (product) {
      pricePer = product === 'custom-nfc' ? 45000 : 15000;
    }
    const montant = Number(quantity) * Number(pricePer);

    // decide type: if plan_id provided, treat as abonnement, otherwise as commande_carte
    const typeCommande = plan_id ? 'abonnement' : 'commande_carte';
    const order = await commandeModel.createCommande({ utilisateur_id: user.id, numero_commande: numero, montant_total: montant, adresse_livraison, type_commande: typeCommande });

    // prepare directory for vcf files
    const visitesDir = path.join(__dirname, '..', '..', 'public', 'Visites_Carte');
    try { fs.mkdirSync(visitesDir, { recursive: true }); } catch (e) { /* ignore */ }

    // create cartes linked to order, storing design metadata with customer info and optional logo
    const cards = [];
    for (let i = 0; i < Number(quantity); i++) {
      const uid = genCardUid();
      const design = JSON.stringify({ customer: { nom, prenom, email, telephone, profession, site }, logo_url, product });
      // generate vCard content
      const sanitizedFirst = (prenom || '').toString().trim().replace(/\s+/g, '_');
      const sanitizedLast = (nom || '').toString().trim().replace(/\s+/g, '_');
      const filename = `${sanitizedFirst}-${sanitizedLast}-${Date.now()}-${i}.vcf`;
      const filePath = path.join(visitesDir, filename);
      const vcardLines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${sanitizedLast};${sanitizedFirst};;;`,
        `FN:${prenom} ${nom}`,
        email ? `EMAIL;TYPE=INTERNET:${email}` : '',
        telephone ? `TEL;TYPE=CELL:${telephone}` : '',
        profession ? `TITLE:${profession}` : '',
        site ? `URL:${site}` : '',
        'END:VCARD'
      ].filter(Boolean).join('\n');

      try {
        fs.writeFileSync(filePath, vcardLines, 'utf8');
      } catch (e) {
        console.warn('Could not write vcf file:', e.message || e);
      }

      // vcf url (served from backend static path)
      const baseUrl = process.env.APP_URL || 'https://portefolia.tech';
      const vcfUrl = `${baseUrl}/uploads/visites_carte/${filename}`;

      const card = await carteModel.createCarte({ commande_id: order.id, uid_nfc: uid, lien_portfolio: null, design: JSON.stringify({ design, vcf_url: vcfUrl }) });
      cards.push({ ...card, vcf_url: vcfUrl });
    }

    return res.status(201).json({ order, cards, message: 'Commande créée. Nous vous contacterons pour le paiement.' });
  } catch (err) {
    console.error('Error creating public order:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listOrders(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await commandeModel.findByUser(userId);
    return res.json({ orders: rows });
  } catch (err) {
    console.error('Error listing orders:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getOrder(req, res) {
  try {
    const id = Number(req.params.id);
    const order = await commandeModel.findById(id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (String(order.utilisateur_id) !== String(req.userId)) return res.status(403).json({ error: 'Forbidden' });
    const cards = await carteModel.findByCommande(order.id);

    // Si commandes.paiement_statut n'est pas encore à jour, on cross-check la table paiements
    if (!order.paiement_statut || order.paiement_statut === 'non_payé' || order.paiement_statut === 'en_attente_validation') {
      const [paiRows] = await pool.query(
        "SELECT statut FROM paiements WHERE commande_id = ? ORDER BY id DESC LIMIT 1",
        [id]
      );
      if (paiRows && paiRows.length > 0) {
        const ps = (paiRows[0].statut || '').toLowerCase();
        if (ps === 'confirmed' || ps === 'paid' || ps === 'réussi' || ps === 'reussi') {
          order.paiement_statut = 'payé';
        } else if (ps === 'pending_admin' || ps === 'pending') {
          order.paiement_statut = 'en_attente_validation';
        } else if (ps === 'failed') {
          order.paiement_statut = 'refusé';
        }
      }
    }

    return res.json({ order, cards });
  } catch (err) {
    console.error('Error fetching order:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { statut } = req.body;
    const updated = await commandeModel.updateStatus(id, statut);
    return res.json({ order: updated });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Utilisateur soumet une preuve de paiement (Wave ref, etc.)
async function submitPaymentProof(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    const order = await commandeModel.findById(id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (String(order.utilisateur_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    if (order.paiement_statut === 'payé') return res.status(400).json({ error: 'Paiement déjà validé' });

    const { mode, reference } = req.body;
    if (!mode || !reference) return res.status(400).json({ error: 'mode et reference requis' });

    const updated = await commandeModel.updatePaiement(id, {
      paiement_statut: 'en_attente_validation',
      paiement_mode: mode,
      paiement_reference: reference,
    });

    // Créer ou mettre à jour l'entrée dans la table paiements
    try {
      const [existing] = await pool.query('SELECT id FROM paiements WHERE commande_id = ? LIMIT 1', [id]);
      if (existing.length > 0) {
        await pool.query(
          'UPDATE paiements SET statut = ?, moyen_paiement = ?, reference_transaction = ?, updated_at = NOW() WHERE id = ?',
          ['pending_admin', mode, reference, existing[0].id]
        );
      } else {
        // INSERT sans abonnement_id pour éviter la contrainte NOT NULL sur cette colonne
        await pool.query(
          'INSERT INTO paiements (commande_id, moyen_paiement, reference_transaction, montant, statut, image_paiement, type_paiement) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, mode, reference, order.montant_total, 'pending_admin', '', 'commande_nfc']
        );
      }
    } catch (pErr) {
      console.warn('submitPaymentProof: paiements insert failed', pErr.message);
    }

    return res.json({ order: updated });
  } catch (err) {
    console.error('submitPaymentProof error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function cancelOrder(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    const order = await commandeModel.findById(id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (String(order.utilisateur_id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    if (order.paiement_statut !== 'non_payé') {
      return res.status(400).json({ error: 'Impossible d\'annuler : un paiement a déjà été enregistré sur cette commande' });
    }
    if (order.statut === 'Annulée') {
      return res.status(400).json({ error: 'Commande déjà annulée' });
    }
    const updated = await commandeModel.updateStatus(id, 'Annulée');
    return res.json({ order: updated });
  } catch (err) {
    console.error('cancelOrder error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createOrder, createPublicOrder, listOrders, getOrder, updateOrderStatus, submitPaymentProof, cancelOrder };
