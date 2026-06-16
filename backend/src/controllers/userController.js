const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { pool } = require('../db');
const { generateReceiptPDF } = require('../utils/generateReceiptPDF');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await userModel.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  // Normalize name into prenom / nom expected by the model
  let prenom = null;
  let nom = null;
  if (name && typeof name === 'string' && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      prenom = parts[0];
      nom = parts[0];
    } else {
      nom = parts.slice(-1).join(' ');
      prenom = parts.slice(0, -1).join(' ');
    }
  } else {
    // fallback values to avoid NOT NULL errors
    prenom = 'Utilisateur';
    nom = 'Invité';
  }

  const user = await userModel.createUser({ nom, prenom, email, mot_de_passe: hashed });
  return res.status(201).json({ user });
}

// Return payments and total revenue for the authenticated user
async function getMyPayments(req, res) {
  try {
    const utilisateur_id = req.userId;
    if (!utilisateur_id) return res.status(401).json({ error: 'Unauthorized' });

    // Récupère tous les paiements liés à l'utilisateur via :
    //   1. commandes (flow legacy/Stripe)
    //   2. abonnement_id direct (flow Wave post-validation)
    //   3. reference_transaction matching payment_reference d'un abonnement
    //   4. checkouts (flow upgrade/reabonnement via checkout token)
    const [rows] = await pool.query(`
      SELECT DISTINCT
        p.id, COALESCE(p.statut, 'pending_admin') AS statut, p.montant, p.moyen_paiement, p.reference_transaction,
        p.date_paiement, p.created_at, p.updated_at, p.abonnement_id, p.invoice_id,
        p.metadata, p.image_paiement, p.type_flux,
        c.numero_commande,
        COALESCE(pl.name, pl2.name) AS plan_name,
        COALESCE(a.duree_mois, a2.duree_mois) AS duree_mois,
        COALESCE(a.date_echeance, a2.date_echeance) AS date_echeance,
        COALESCE(a.reference_wave, p.reference_transaction) AS reference_wave
      FROM paiements p
      LEFT JOIN commandes  c   ON c.id  = p.commande_id
      LEFT JOIN abonnements a  ON a.id  = p.abonnement_id
      LEFT JOIN plans      pl  ON pl.id = a.plan_id
      LEFT JOIN checkouts  ck  ON ck.paiement_id = p.id
      LEFT JOIN abonnements a2 ON a2.id = ck.abonnement_id
      LEFT JOIN plans      pl2 ON pl2.id = ck.plan_id
      WHERE
        c.utilisateur_id = ?
        OR a.utilisateur_id = ?
        OR ck.utilisateur_id = ?
        OR p.reference_transaction COLLATE utf8mb4_unicode_ci IN (
          SELECT payment_reference COLLATE utf8mb4_unicode_ci FROM abonnements
          WHERE utilisateur_id = ? AND payment_reference IS NOT NULL
        )
      ORDER BY p.created_at DESC
    `, [utilisateur_id, utilisateur_id, utilisateur_id, utilisateur_id]);

    const [tot] = await pool.query(`
      SELECT COALESCE(SUM(p.montant), 0) AS total_revenue
      FROM paiements p
      LEFT JOIN commandes c   ON c.id = p.commande_id
      LEFT JOIN abonnements a ON a.id = p.abonnement_id
      WHERE (
        c.utilisateur_id = ?
        OR a.utilisateur_id = ?
        OR p.reference_transaction COLLATE utf8mb4_unicode_ci IN (
          SELECT payment_reference COLLATE utf8mb4_unicode_ci FROM abonnements
          WHERE utilisateur_id = ? AND payment_reference IS NOT NULL
        )
      )
      AND LOWER(CONVERT(p.statut USING utf8mb4)) IN ('réussi','reussi','confirmed','paid')
    `, [utilisateur_id, utilisateur_id, utilisateur_id]);

    const totalRevenue = tot && tot[0] ? Number(tot[0].total_revenue) : 0;
    return res.json({ paiements: rows || [], totalRevenue });
  } catch (err) {
    console.error('user.getMyPayments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyReceiptPDF(req, res) {
  try {
    const utilisateur_id = req.userId;
    const paiementId = Number(req.params.id);
    if (!utilisateur_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!paiementId)    return res.status(400).json({ error: 'ID invalide' });

    // Récupère le paiement + abonnement + plan + utilisateur en une requête
    const [[row]] = await pool.query(`
      SELECT
        p.id, p.montant, p.statut, p.moyen_paiement, p.reference_transaction,
        p.date_paiement, p.created_at,
        a.id AS abo_id, a.utilisateur_id AS abo_utilisateur_id,
        a.duree_mois, a.date_echeance, a.reference_wave,
        pl.name AS plan_name,
        u.nom, u.prenom, u.email,
        c.utilisateur_id AS commande_utilisateur_id
      FROM paiements p
      LEFT JOIN abonnements a  ON a.id = p.abonnement_id
      LEFT JOIN plans       pl ON pl.id = a.plan_id
      LEFT JOIN commandes   c  ON c.id  = p.commande_id
      LEFT JOIN utilisateurs u ON u.id  = COALESCE(a.utilisateur_id, c.utilisateur_id)
      WHERE p.id = ?
      LIMIT 1
    `, [paiementId]);

    if (!row) return res.status(404).json({ error: 'Paiement introuvable' });

    // Vérification d'appartenance
    const owner = row.abo_utilisateur_id || row.commande_utilisateur_id;
    if (Number(owner) !== Number(utilisateur_id)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Seuls les paiements validés ont un reçu
    const statutNorm = (row.statut || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    if (!/reuss|paid|confirmed|success/.test(statutNorm)) {
      return res.status(400).json({ error: 'Reçu disponible uniquement pour les paiements validés' });
    }

    const now           = new Date(row.date_paiement || row.created_at || new Date());
    const receiptMonth  = String(now.getMonth() + 1).padStart(2, '0');
    const receiptNumber = `RECU-${now.getFullYear()}${receiptMonth}-${String(paiementId).padStart(5, '0')}`;

    const pdfBuffer = await generateReceiptPDF({
      receiptNumber,
      client:         { prenom: row.prenom || '', nom: row.nom || '', email: row.email || '' },
      plan:           { name: row.plan_name || 'Abonnement' },
      montant:        Number(row.montant || 0),
      duree_mois:     row.duree_mois ?? 1,
      reference_wave: row.reference_wave || row.reference_transaction || null,
      moyen_paiement: row.moyen_paiement || 'wave',
      date_paiement:  now,
      date_echeance:  row.date_echeance ?? null,
    });

    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Génération du PDF échouée' });
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="recu-portefolia-${receiptNumber}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('user.getMyReceiptPDF error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyInvoicePDF(req, res) {
  try {
    const utilisateur_id = req.userId;
    const invoiceId = Number(req.params.id);
    if (!utilisateur_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!invoiceId)      return res.status(400).json({ error: 'ID invalide' });

    const invoiceModel = require('../models/invoiceModel');
    const inv = await invoiceModel.findById(invoiceId);
    if (!inv) return res.status(404).json({ error: 'Facture introuvable' });

    // Vérification d'appartenance
    if (Number(inv.utilisateur_id) !== Number(utilisateur_id)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const [[user]] = await pool.query(
      'SELECT nom, prenom, email FROM utilisateurs WHERE id = ? LIMIT 1',
      [utilisateur_id]
    );

    const invoiceNumber = `INV-${new Date(inv.created_at || Date.now()).toISOString().slice(0, 7).replace('-', '')}-${inv.id}`;
    const amount   = Number(inv.amount || inv.montant || 0);
    const currency = inv.currency || 'XOF';

    const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Facture ${invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#111;padding:40px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .hdr h1{font-size:28px;font-weight:900;color:#1b5e20}
  .hdr .meta{text-align:right;font-size:13px;color:#6b7280}
  .div{height:3px;background:linear-gradient(to right,#2E7D32,#1BC29A);border-radius:2px;margin:0 0 28px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
  .box h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:700;margin-bottom:8px}
  .box p{font-size:14px;font-weight:600;color:#111}
  .box .sub{font-size:12px;color:#6b7280;font-weight:400}
  table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;margin-bottom:20px}
  thead th{background:#2E7D32;color:#fff;padding:12px 16px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase}
  thead th:last-child{text-align:right}
  tbody td{padding:14px 16px;border-top:1px solid #e5e7eb;font-size:13px}
  tbody td:last-child{text-align:right;font-weight:700;color:#2E7D32}
  .total-row td{background:#f0fdf4;border-top:2px solid #2E7D32;font-weight:800;font-size:14px}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af}
</style>
</head>
<body>
  <div class="hdr">
    <div><h1>Portefolia</h1><p style="font-size:13px;color:#6b7280;margin-top:4px">contact@portefolia.tech</p></div>
    <div class="meta">
      <p style="font-size:20px;font-weight:700;color:#111">FACTURE</p>
      <p>N° ${invoiceNumber}</p>
      <p style="margin-top:4px">Date : ${new Date(inv.created_at || Date.now()).toLocaleDateString('fr-FR')}</p>
    </div>
  </div>
  <div class="div"></div>
  <div class="grid">
    <div class="box"><h3>Émetteur</h3><p>Portefolia</p><p class="sub">comptabilite@portefolia.tech</p></div>
    <div class="box"><h3>Client</h3><p>${(user?.prenom || '')} ${(user?.nom || '')}</p><p class="sub">${user?.email || ''}</p></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Référence</th><th>Montant</th></tr></thead>
    <tbody>
      <tr><td>Abonnement Portefolia</td><td style="font-family:monospace;font-size:12px">${inv.reference || '—'}</td><td>${amount.toLocaleString('fr-FR')} ${currency}</td></tr>
      <tr class="total-row"><td colspan="2" style="text-align:right">Total</td><td>${amount.toLocaleString('fr-FR')} ${currency}</td></tr>
    </tbody>
  </table>
  <div class="footer">
    <p>Portefolia · contact@portefolia.tech · Merci pour votre confiance.</p>
    <p>Ce document est généré automatiquement et constitue votre facture officielle.</p>
  </div>
</body></html>`;

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="facture-portefolia-${invoiceNumber}.pdf"`,
        'Content-Length':      pdfBuffer.length,
      });
      return res.end(Buffer.from(pdfBuffer));
    } catch (e) {
      console.warn('getMyInvoicePDF: puppeteer failed, returning HTML:', e.message);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (err) {
    console.error('user.getMyInvoicePDF error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: Return payments for any user id
async function getUserPayments(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const [rows] = await pool.query(`
      SELECT p.*, c.numero_commande AS numero_commande, c.utilisateur_id AS utilisateur_id
      FROM paiements p
      LEFT JOIN commandes c ON c.id = p.commande_id
      WHERE (c.utilisateur_id = ?)
         OR EXISTS (
           SELECT 1 FROM abonnements a
           WHERE a.utilisateur_id = ?
             AND a.payment_reference IS NOT NULL
             AND p.reference_transaction COLLATE utf8mb4_unicode_ci = a.payment_reference COLLATE utf8mb4_unicode_ci
        )
      ORDER BY p.created_at DESC
    `, [id, id]);

    const [tot] = await pool.query(`
      SELECT COALESCE(SUM(p.montant),0) AS total_revenue
      FROM paiements p
      LEFT JOIN commandes c ON c.id = p.commande_id
      WHERE (
        (c.utilisateur_id = ?)
        OR EXISTS (
          SELECT 1 FROM abonnements a
          WHERE a.utilisateur_id = ?
            AND a.payment_reference IS NOT NULL
            AND p.reference_transaction COLLATE utf8mb4_unicode_ci = a.payment_reference COLLATE utf8mb4_unicode_ci
        )
      )
        AND LOWER(CONVERT(p.statut USING utf8mb4)) IN ('réussi', 'reussi', 'confirmed', 'paid')
    `, [id, id]);

    const totalRevenue = tot && tot[0] ? Number(tot[0].total_revenue) : 0;
    return res.json({ paiements: rows || [], totalRevenue });
  } catch (err) {
    console.error('user.getUserPayments error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await userModel.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  // Block login for inactive users (paid accounts awaiting validation)
  if (typeof user.is_active !== 'undefined' && user.is_active === 0) {
    return res.status(403).json({ error: 'Account inactive. Payment is pending administrative validation.' });
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
}

async function me(req, res) {
  const userId = req.userId;
  const user = await userModel.findById(userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ user });
}

// Admin: create a new client user (records which admin created it)
const planModel = require('../models/planModel');
const sendEmail = require('../utils/sendEmail');

async function adminCreateUser(req, res) {
  try {
    const adminId = req.userId;
    const { email, password, first_name, last_name, prenom, nom, bio, avatar } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // Prevent duplicates by email or phone
    const phone = req.body.phone || null;
    const existing = await userModel.findByEmailOrPhone(email, phone);
    if (existing) {
      if (existing.email && existing.email === email) return res.status(409).json({ error: 'Email already in use', field: 'email' });
      if (phone && existing.phone && existing.phone === phone) return res.status(409).json({ error: 'Phone already in use', field: 'phone' });
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashed = await require('bcrypt').hash(password, 10);
    const isActiveFlag = typeof req.body.is_active !== 'undefined' ? !!req.body.is_active : true;
    const userPayload = {
      nom: nom || last_name || '',
      prenom: prenom || first_name || '',
      email,
      phone: phone || null,
      mot_de_passe: hashed,
      photo_profil: avatar || null,
      biographie: bio || null,
      role: 'USER',
      is_active: isActiveFlag,
      verified: isActiveFlag,
    };

    const created = await userModel.createUser(userPayload);

    // attach plan if provided (frontend sends plan as slug or id)
    try {
      const planKey = req.body.plan;
      if (planKey) {
        let plan = null;
        if (typeof planKey === 'number' || String(planKey).match(/^\d+$/)) {
          plan = await planModel.getPlanById(Number(planKey));
        } else {
          plan = await planModel.getPlanBySlug(String(planKey));
        }
        if (plan && plan.id) {
          try {
            // create an abonnement record instead of older subscribeUser path
            const abonnementModel = require('../models/abonnementModel');
            const paymentToken = require('crypto').randomBytes(16).toString('hex');
            const metadata = { admin_created: true, payment_token: paymentToken };
            await abonnementModel.createAbonnement({ utilisateur_id: created.id, plan_id: plan.id, montant: Number(plan.price_cents || 0), currency: 'XOF', statut: 'active', metadata });
          } catch (e) {
            console.warn('adminCreateUser: could not create abonnement for user', e.message || e);
          }
        }
      }
    } catch (e) {
      // non-blocking
      console.warn('adminCreateUser plan attach error:', e.message || e);
    }

    // If model supports setting created_by/modified_by, attempt to set it
    try {
      await userModel.updateUser(created.id, { modified_by: adminId });
    } catch (e) {
      // ignore if DB doesn't support modified_by
    }

    const user = await userModel.findById(created.id);

    // Send onboarding email with credentials
    try {
      const plainPassword = password;
      const subject = user && (user.is_active === 1 || req.body.is_active) ? 'Vos accès Portefolia' : 'Compte Portefolia créé - en attente';
      const canLoginMsg = (user && (user.is_active === 1 || req.body.is_active))
        ? 'Vous pouvez vous connecter dès maintenant en utilisant les identifiants ci-dessous.'
        : 'Votre compte est créé mais reste inactif. Vous devrez attendre environ 2 heures avant de pouvoir vous connecter.';

      const html = `
        <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue sur Portefolia - Vos identifiants</title>
    <style>
        /* Styles pour l'email de bienvenue */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        
        .welcome-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
        }
        
        .welcome-header {
            background: linear-gradient(135deg, #28A745 0%, #20c997 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .logo-container {
            margin-bottom: 20px;
        }
        
        .logo {
            max-height: 60px;
            width: auto;
        }
        
        .welcome-title {
            margin: 15px 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        
        .welcome-subtitle {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
        }
        
        .welcome-content {
            padding: 40px;
        }
        
        .greeting-section {
            margin-bottom: 30px;
            text-align: center;
        }
        
        .user-name {
            color: #28A745;
            font-size: 24px;
            font-weight: 700;
            margin: 10px 0;
        }
        
        .credentials-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            padding: 30px;
            margin: 30px 0;
            border: 2px dashed #dee2e6;
        }
        
        .credential-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #28A745;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .credential-label {
            display: block;
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .credential-value {
            font-size: 18px;
            font-weight: 600;
            color: #212529;
            font-family: 'Courier New', monospace;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            margin-top: 5px;
            word-break: break-all;
        }
        
        .security-notice {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            border-radius: 6px;
            margin: 25px 0;
        }
        
        .security-icon {
            color: #856404;
            margin-right: 10px;
        }
        
        .cta-section {
            text-align: center;
            margin: 40px 0;
        }
        
        .login-btn {
            display: inline-block;
            padding: 16px 40px;
            background: #28A745;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(40, 167, 69, 0.2);
        }
        
        .login-btn:hover {
            background: #218838;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(40, 167, 69, 0.3);
        }
        
        .steps-section {
            margin: 40px 0;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 30px;
        }
        
        .step-number {
            background: #28A745;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            margin-right: 15px;
            flex-shrink: 0;
        }
        
        .step-content h4 {
            margin: 0 0 8px 0;
            color: #212529;
        }
        
        .step-content p {
            margin: 0;
            color: #6c757d;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-top: 4px solid #28A745;
        }
        
        .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #28A745;
        }
        
        .welcome-footer {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            margin-top: 40px;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 30px;
            margin: 20px 0;
        }
        
        .contact-item {
            text-align: center;
            min-width: 150px;
        }
        
        .help-section {
            background: #e8f5e8;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .welcome-content {
                padding: 20px;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
            
            .contact-info {
                flex-direction: column;
                gap: 15px;
            }
            
            .login-btn {
                padding: 14px 30px;
                font-size: 16px;
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <!-- En-tête avec logo -->
        <div class="welcome-header">
            <div class="logo-container">
                <!-- Remplacer src par l'URL de votre logo -->
                <img src="https://example.com/logo.png" alt="Portefolia Logo" class="logo">
                <h1 class="welcome-title">Bienvenue sur Portefolia 🎉</h1>
                <p class="welcome-subtitle">Votre espace portfolio numérique professionnel</p>
            </div>
        </div>
        
        <!-- Contenu principal -->
        <div class="welcome-content">
            <!-- Salutation personnalisée -->
            <div class="greeting-section">
                <p>Cher(e) client(e),</p>
                <div class="user-name">${user.prenom || user.first_name || 'Bienvenue'}</div>
                <p style="font-size: 18px; color: #495057; margin-top: 10px;">
                    Nous sommes ravis de vous accueillir dans notre communauté !<br>
                    ${canLoginMsg || 'Votre compte a été créé avec succès.'}
                </p>
            </div>
            
            <!-- Instructions importantes -->
            <div class="help-section">
                <h3 style="margin-top: 0; color: #28A745;">🚀 Prêt(e) à commencer ?</h3>
                <p>Voici vos identifiants de connexion. Gardez-les précieusement !</p>
            </div>
            
            <!-- Boîte des identifiants -->
            <div class="credentials-box">
                <h3 style="text-align: center; color: #495057; margin-bottom: 25px;">
                    🔐 Vos identifiants de connexion
                </h3>
                
                <div class="credential-item">
                    <span class="credential-label">Adresse email</span>
                    <div class="credential-value">${user.email}</div>
                    <small style="color: #6c757d; display: block; margin-top: 8px;">
                        Utilisez cette adresse pour vous connecter
                    </small>
                </div>
                
                <div class="credential-item">
                    <span class="credential-label">Mot de passe temporaire</span>
                    <div class="credential-value">${plainPassword}</div>
                    <small style="color: #6c757d; display: block; margin-top: 8px;">
                        Vous pourrez modifier ce mot de passe après votre première connexion
                    </small>
                </div>
            </div>
            
            <!-- Avertissement de sécurité -->
            <div class="security-notice">
                <div style="display: flex; align-items: flex-start;">
                    <span class="security-icon">⚠️</span>
                    <div>
                        <strong style="color: #856404;">Consignes de sécurité importantes :</strong>
                        <ul style="margin: 10px 0 0 0; color: #856404;">
                            <li>Ne partagez jamais vos identifiants</li>
                            <li>Changez votre mot de passe après la première connexion</li>
                            <li>Utilisez un mot de passe unique et complexe</li>
                            <li>Activez l'authentification à deux facteurs si disponible</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Bouton de connexion -->
            <div class="cta-section">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="login-btn">
                    🚀 Me connecter à mon compte
                </a>
                <p style="margin-top: 15px; color: #6c757d;">
                    ou copiez ce lien : <br>
                    <code style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px;">
                        ${process.env.FRONTEND_URL || 'http://localhost:5173'}
                    </code>
                </p>
            </div>
            
            <!-- Étapes de démarrage -->
            <div class="steps-section">
                <h3 style="text-align: center; color: #495057; margin-bottom: 30px;">
                    📋 Vos premières étapes
                </h3>
                
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Connectez-vous</h4>
                        <p>Utilisez les identifiants ci-dessus pour accéder à votre tableau de bord</p>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Sécurisez votre compte</h4>
                        <p>Changez votre mot de passe temporaire et configurez votre profil</p>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Créez votre premier portfolio</h4>
                        <p>Ajoutez vos projets, compétences et expériences professionnelles</p>
                    </div>
                </div>
                
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h4>Partagez votre profil</h4>
                        <p>Générez votre lien unique et diffusez-le auprès de vos contacts</p>
                    </div>
                </div>
            </div>
            
            <!-- Fonctionnalités principales -->
            <div style="margin: 40px 0;">
                <h3 style="text-align: center; color: #495057; margin-bottom: 30px;">
                    ✨ Ce que vous pouvez faire avec Portefolia
                </h3>
                
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🎨</div>
                        <h4 style="margin: 10px 0 5px 0;">Portfolio personnalisé</h4>
                        <p style="font-size: 14px;">Créez un portfolio unique qui vous représente</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <h4 style="margin: 10px 0 5px 0;">Analytics avancés</h4>
                        <p style="font-size: 14px;">Suivez les visites et interactions avec votre profil</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">🔗</div>
                        <h4 style="margin: 10px 0 5px 0;">Liens uniques</h4>
                        <p style="font-size: 14px;">Partagez facilement votre profil professionnel</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">📱</div>
                        <h4 style="margin: 10px 0 5px 0;">Mobile friendly</h4>
                        <p style="font-size: 14px;">Accédez et gérez votre portfolio depuis n'importe quel appareil</p>
                    </div>
                </div>
            </div>
            
            <!-- Ressources d'aide -->
            <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 30px 0;">
                <h4 style="text-align: center; color: #495057; margin-top: 0;">
                    📚 Besoin d'aide ?
                </h4>
                <div style="text-align: center;">
                    <p>Consultez notre centre d'aide ou contactez notre support :</p>
                    <div style="margin-top: 15px;">
                        <a href="https://help.portefolia.com" style="color: #28A745; margin: 0 10px;">Centre d'aide</a> •
                        <a href="https://docs.portefolia.com" style="color: #28A745; margin: 0 10px;">Documentation</a> •
                        <a href="https://blog.portefolia.com" style="color: #28A745; margin: 0 10px;">Blog</a>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Pied de page -->
        <div class="welcome-footer">
            <div class="contact-info">
                <div class="contact-item">
                    <strong>📞 Support client</strong><br>
                    <a href="tel:+33123456789" style="color: #28A745; text-decoration: none;">+33 1 23 45 67 89</a><br>
                    <a href="mailto:support@portefolia.com" style="color: #28A745;">support@portefolia.com</a>
                </div>
                
                <div class="contact-item">
                    <strong>🌐 En ligne</strong><br>
                    <a href="https://portefolia.com" style="color: #28A745;">portefolia.com</a><br>
                    <a href="https://twitter.com/portefolia" style="color: #28A745;">Twitter</a> • 
                    <a href="https://linkedin.com/company/portefolia" style="color: #28A745;">LinkedIn</a>
                </div>
                
                <div class="contact-item">
                    <strong>🏢 Notre adresse</strong><br>
                    123 Avenue de l'Innovation<br>
                    75000 Paris, France
                </div>
            </div>
            
            <p style="margin: 30px 0 0 0; color: #6c757d; font-size: 14px;">
                <strong>Confidentialité :</strong> Vos données sont protégées conformément au RGPD.<br>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
            
            <p style="margin: 20px 0 0 0; color: #495057;">
                Bienvenue dans notre communauté !<br>
                <strong>L'équipe Portefolia</strong><br>
                Votre succès est notre priorité
            </p>
            
            <p style="margin-top: 15px; font-size: 12px; color: #6c757d;">
                © ${new Date().getFullYear()} Portefolia. Tous droits réservés.<br>
                <a href="https://portefolia.tech/terms" style="color: #6c757d;">Conditions d'utilisation</a> • 
                <a href="https://portefolia.tech/privacy" style="color: #6c757d;">Politique de confidentialité</a>
            </p>
        </div>
    </div>
</body>
</html>
      `;

      // Non-blocking: log failures but don't fail the request
      await sendEmail(user.email, subject, html);
    } catch (e) {
      console.warn('adminCreateUser: failed to send onboarding email', e && e.message ? e.message : e);
    }

    return res.status(201).json({ user });
  } catch (err) {
    console.error('adminCreateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: update a user (clients only)
async function adminUpdateUser(req, res) {
  try {
    const adminId = req.userId;
    const targetId = req.params.id;
    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.role || '').toUpperCase() === 'ADMIN') return res.status(403).json({ error: 'Cannot modify admin users' });

    const updates = {};
    // Allow email change but ensure uniqueness
    if (typeof req.body.email !== 'undefined' && req.body.email) {
      const existingEmail = await userModel.findByEmail(req.body.email);
      if (existingEmail && String(existingEmail.id) !== String(targetId)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.email = req.body.email;
    }
    if (typeof req.body.first_name !== 'undefined') updates.prenom = req.body.first_name;
    if (typeof req.body.last_name !== 'undefined') updates.nom = req.body.last_name;
    if (typeof req.body.phone !== 'undefined') updates.phone = req.body.phone;
    if (typeof req.body.avatar !== 'undefined') updates.photo_profil = req.body.avatar;
    if (typeof req.body.avatar_url !== 'undefined') updates.photo_profil = req.body.avatar_url;
    if (typeof req.body.bio !== 'undefined') updates.biographie = req.body.bio;
    if (typeof req.body.password !== 'undefined' && req.body.password) {
      const hash = await require('bcrypt').hash(req.body.password, 10);
      updates.mot_de_passe = hash;
    }
    // Allow admin to toggle active status
    if (typeof req.body.is_active !== 'undefined') updates.is_active = req.body.is_active ? 1 : 0;
    if (typeof req.body.verified !== 'undefined') updates.verified = req.body.verified ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      const fresh = await userModel.findById(targetId);
      return res.json({ user: fresh });
    }

    updates.modified_by = adminId;
    const updated = await userModel.updateUser(targetId, updates);

    // Send notification email to the user about changes (non-blocking)
    try {
      const plainPassword = req.body.password;
      let body = `<p>Bonjour ${updated.prenom || updated.first_name || ''},</p>`;
      body += `<p>Votre compte a été mis à jour par un administrateur. Voici vos informations actuelles :</p>`;
      body += `<ul>`;
      body += `<li><strong>Prénom :</strong> ${updated.prenom || ''}</li>`;
      body += `<li><strong>Nom :</strong> ${updated.nom || ''}</li>`;
      body += `<li><strong>Email :</strong> ${updated.email || ''}</li>`;
      if (updated.phone) body += `<li><strong>Téléphone :</strong> ${updated.phone}</li>`;
      body += `</ul>`;
      if (plainPassword) {
        body += `<p>Un mot de passe temporaire a été défini : <strong>${plainPassword}</strong></p>`;
      }
      body += `<p>Si vous n'avez pas effectué ces changements, contactez le support.</p>`;
      body += `<p>Cordialement,<br/>L'équipe Portefolia</p>`;

      await sendEmail(updated.email, 'Mise à jour de votre compte Portefolia', body);
    } catch (e) {
      console.warn('adminUpdateUser: failed to send update email', e && e.message ? e.message : e);
    }
    return res.json({ user: updated });
  } catch (err) {
    console.error('adminUpdateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: soft-delete user (mark statut='supprimer' and record admin)
async function adminSoftDeleteUser(req, res) {
  try {
    const adminId = req.userId;
    const targetId = req.params.id;
    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.role || '').toUpperCase() === 'ADMIN') return res.status(403).json({ error: 'Cannot delete admin users' });

    const updated = await userModel.softDeleteUser(targetId, adminId);
    return res.json({ user: updated });
  } catch (err) {
    console.error('adminSoftDeleteUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminActivateUser(req, res) {
  try {
    const adminId = req.userId;
    const targetId = req.params.id;
    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await userModel.activateUser(targetId, adminId);
    return res.json({ user: updated });
  } catch (err) {
    console.error('adminActivateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function adminDeactivateUser(req, res) {
  try {
    const adminId = req.userId;
    const targetId = req.params.id;
    const user = await userModel.findById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await userModel.deactivateUser(targetId, adminId);
    return res.json({ user: updated });
  } catch (err) {
    console.error('adminDeactivateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateMe(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Disallow email changes via this endpoint
    if (req.body && (req.body.email || req.body.Email)) {
      return res.status(400).json({ error: 'Email cannot be changed via this endpoint' });
    }

    const updates = {};
    // Map possible frontend fields to DB columns
    if (typeof req.body.first_name !== 'undefined') updates.prenom = req.body.first_name;
    if (typeof req.body.last_name !== 'undefined') updates.nom = req.body.last_name;
    if (typeof req.body.avatar_url !== 'undefined') updates.photo_profil = req.body.avatar_url;
    if (typeof req.body.avatar !== 'undefined') updates.photo_profil = req.body.avatar; // alternate key
    if (typeof req.body.bio !== 'undefined') updates.biographie = req.body.bio;
    if (typeof req.body.biographie !== 'undefined') updates.biographie = req.body.biographie;
    if (typeof req.body.phone !== 'undefined') updates.phone = req.body.phone;

    // If password is provided, hash it and set mot_de_passe
    if (typeof req.body.password !== 'undefined' && req.body.password) {
      const hash = await require('bcrypt').hash(req.body.password, 10);
      updates.mot_de_passe = hash;
    }

    // If no allowed updates, return current user
    if (Object.keys(updates).length === 0) {
      const user = await userModel.findById(userId);
      if (!user) return res.status(404).json({ error: 'Not found' });
      return res.json({ user });
    }

    const updated = await userModel.updateUser(userId, updates);
    if (!updated) return res.status(400).json({ error: 'No valid fields to update' });
    return res.json({ user: updated });
  } catch (err) {
    console.error('user.updateMe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Admin: list users with normalized fields expected by frontend
async function adminListUsers(req, res) {
  console.log("je suis dans le mauvais controllers")

  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;
    const result = await userModel.listUsers({ page, limit });
    const mapped = (result.users || []).map((u) => ({
      id: u.id,
      first_name: u.prenom || u.first_name || null,
      last_name: u.nom || u.last_name || null,
      email: u.email,
      role: (u.role || 'USER').toString().toLowerCase(),
      is_active: u.is_active === 1 || u.is_active === true,
      created_at: u.date_inscription || u.created_at || null,
      updated_at: u.updated_at || null,
      deleted_at: u.deleted_at || null,
      portfolio_count: u.portfolio_count || 0,
      profile_image_url: u.photo_profil || null,
      phone: u.phone || null,
      verified: u.verified === 1 || u.verified === true,
    }));

    return res.json({ users: mapped, page: result.page, limit: result.limit });
  } catch (err) {
    console.error('adminListUsers error', err);
    return res.status(500).json({ error: 'Unable to list users' });
  }
}

async function ListUsers(req, res) {
  console.log("je suis dans le bon controllers")
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;
    const result = await userModel.listUsersClients({ page, limit });
    const mapped = (result.users || []).map((u) => ({
      id: u.id,
      first_name: u.prenom || u.first_name || null,
      last_name: u.nom || u.last_name || null,
      email: u.email,
      role: (u.role || 'USER').toString().toLowerCase(),
      is_active: u.is_active === 1 || u.is_active === true,
      created_at: u.date_inscription || u.created_at || null,
      updated_at: u.updated_at || null,
      deleted_at: u.deleted_at || null,
      portfolio_count: u.portfolio_count || 0,
      profile_image_url: u.photo_profil || null,
      phone: u.phone || null,
      verified: u.verified === 1 || u.verified === true,
    }));

    return res.json({ users: mapped, page: result.page, limit: result.limit });
  } catch (err) {
    console.error('adminListUsers error', err);
    return res.status(500).json({ error: 'Unable to list users' });
  }
}

async function adminPendingUsers(req, res) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 200;
    const result = await userModel.listPendingUsers({ page, limit });
    const mapped = (result.users || []).map((u) => ({
      id: u.id,
      first_name: u.prenom || u.first_name || null,
      last_name: u.nom || u.last_name || null,
      email: u.email,
      role: (u.role || 'USER').toString().toLowerCase(),
      is_active: u.is_active === 1 || u.is_active === true,
      created_at: u.date_inscription || u.created_at || null,
      portfolio_count: u.portfolio_count || 0,
      profile_image_url: u.photo_profil || null,
      verified: u.verified === 1 || u.verified === true,
    }));

    return res.json({ users: mapped, page: result.page, limit: result.limit });
  } catch (err) {
    console.error('adminPendingUsers error', err);
    return res.status(500).json({ error: 'Unable to list pending users' });
  }
}

// Admin API: check duplicate email or phone (used by frontend for inline validation)
async function adminCheckDuplicate(req, res) {
  try {
    const { email, phone } = req.body || {};
    if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
    const found = await userModel.findByEmailOrPhone(email || null, phone || null);
    if (!found) return res.json({ exists: false });
    const result = { exists: true };
    if (found.email && email && found.email === email) result.field = 'email';
    else if (found.phone && phone && found.phone === phone) result.field = 'phone';
    return res.json(result);
  } catch (e) {
    console.error('adminCheckDuplicate error', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Self-service: désactiver son propre compte (avec vérification mot de passe)
async function deactivateMe(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Mot de passe requis pour confirmer' });

    const [pwdRows] = await pool.query('SELECT mot_de_passe, role FROM utilisateurs WHERE id = ? LIMIT 1', [userId]);
    if (!pwdRows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const ok = await bcrypt.compare(password, pwdRows[0].mot_de_passe);
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const role = (pwdRows[0].role || '').toUpperCase();
    if (role === 'BUSINESS_ADMIN') {
      const businessAccountModel = require('../models/businessAccountModel');
      await businessAccountModel.deactivateByAdminId(userId);
    }

    await userModel.deactivateUser(userId, null);
    return res.json({ message: 'Compte désactivé' });
  } catch (err) {
    console.error('deactivateMe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Self-service: supprimer définitivement son propre compte (avec vérification mot de passe)
async function deleteMe(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Mot de passe requis pour confirmer' });

    const [pwdRows] = await pool.query('SELECT mot_de_passe, role FROM utilisateurs WHERE id = ? LIMIT 1', [userId]);
    if (!pwdRows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const ok = await bcrypt.compare(password, pwdRows[0].mot_de_passe);
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const role = (pwdRows[0].role || '').toUpperCase();
    if (role === 'BUSINESS_ADMIN') {
      const businessAccountModel = require('../models/businessAccountModel');
      await businessAccountModel.softDeleteByAdminId(userId);
    }

    await userModel.softDeleteUser(userId, null);
    return res.json({ message: 'Compte supprimé' });
  } catch (err) {
    console.error('deleteMe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Get recent activity for authenticated user
async function getActivity(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Number(req.query.limit) || 10;

    // Fetch recent activities from multiple sources
    const [portfolios] = await pool.query(`
      SELECT 'portfolio_created' as activity_type, id as entity_id, titre as title,
             created_at, CONCAT('Création du portfolio: ', COALESCE(titre, 'Sans titre')) as description,
             'folder' as icon
      FROM portfolios
      WHERE utilisateur_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    const [payments] = await pool.query(`
      SELECT 'payment_made' as activity_type, p.id as entity_id,
             CONCAT(p.montant, ' F CFA') as title,
             p.created_at,
             CONCAT('Paiement de ', p.montant, ' F CFA - ', COALESCE(p.statut, 'pending')) as description,
             'credit-card' as icon
      FROM paiements p
      LEFT JOIN commandes c ON c.id = p.commande_id
      WHERE c.utilisateur_id = ? OR EXISTS (
        SELECT 1 FROM abonnements a
        WHERE a.utilisateur_id = ? AND a.payment_reference COLLATE utf8mb4_unicode_ci = p.reference_transaction COLLATE utf8mb4_unicode_ci
      )
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [userId, userId, limit]);

    const [logins] = await pool.query(`
      SELECT 'login' as activity_type, id as entity_id,
             'Connexion réussie' as title,
             dernier_login as created_at,
             'Connexion à votre compte' as description,
             'log-in' as icon
      FROM utilisateurs
      WHERE id = ? AND dernier_login IS NOT NULL
      ORDER BY dernier_login DESC
      LIMIT ?
    `, [userId, limit]);

    // Combine and sort all activities
    const allActivities = [
      ...(portfolios || []).map(p => ({ ...p, created_at: new Date(p.created_at) })),
      ...(payments || []).map(p => ({ ...p, created_at: new Date(p.created_at) })),
      ...(logins || []).map(l => ({ ...l, created_at: new Date(l.created_at) }))
    ];

    // Sort by date and take the most recent
    allActivities.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    const recentActivity = allActivities.slice(0, limit);

    return res.json({ activities: recentActivity });
  } catch (err) {
    console.error('user.getActivity error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { register, login, me, updateMe, deactivateMe, deleteMe, adminCreateUser, adminUpdateUser, adminSoftDeleteUser, adminActivateUser, adminDeactivateUser, adminListUsers, adminPendingUsers, ListUsers, adminCheckDuplicate, getMyPayments, getMyReceiptPDF, getMyInvoicePDF, getUserPayments, getActivity };
