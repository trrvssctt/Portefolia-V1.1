'use strict';

const { pool } = require('../db');
const sendEmail = require('../utils/sendEmail');

// ─── helper : log admin action ───────────────────────────────────────────────
async function logAction(req, action, resource, extra = {}) {
  try {
    const adminId = req.user ? req.user.id : null;
    const details = JSON.stringify({ ...extra, path: req.originalUrl });
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;
    const ua = req.headers['user-agent'] || null;
    await pool.query(
      'INSERT INTO admin_action_logs (admin_id, action, resource, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, action, resource, details, ip, ua]
    );
  } catch (err) {
    console.error('logAction error:', err.message);
  }
}

// ─── CA total d'un utilisateur (sous-requête réutilisable) ───────────────────
// paiements n'a pas de utilisateur_id direct → passe par abonnements ou commandes
const CA_SUBQUERY = `(
  SELECT COALESCE(SUM(pa.montant), 0)
  FROM paiements pa
  LEFT JOIN abonnements pab ON pab.id = pa.abonnement_id
  LEFT JOIN commandes   pc  ON pc.id  = pa.commande_id
  WHERE (pab.utilisateur_id = u.id OR pc.utilisateur_id = u.id)
    AND pa.statut = 'RÉUSSI'
) AS ca_total`;

// ─── profil360 : sous-requêtes ───────────────────────────────────────────────

async function getClientInfos(id) {
  const [rows] = await pool.query(`
    SELECT
      u.id, u.nom, u.prenom, CONCAT(u.prenom, ' ', u.nom) AS nom_complet,
      u.email,
      u.phone AS telephone,
      NULL AS ville,
      u.date_inscription,
      u.statut, u.subscription_status,
      u.last_payment_at, u.next_billing_date,
      pl.name AS plan_nom, pl.id AS plan_id, pl.price_cents AS plan_prix,
      (SELECT COUNT(*) FROM portfolios p WHERE p.utilisateur_id = u.id) AS nb_portfolios,
      ${CA_SUBQUERY}
    FROM utilisateurs u
    LEFT JOIN abonnements a ON a.utilisateur_id = u.id
      AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
    LEFT JOIN plans pl ON a.plan_id = pl.id
    WHERE u.id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function getAbonnementActuel(id) {
  const [rows] = await pool.query(`
    SELECT a.*, pl.name AS plan_nom, pl.price_cents AS prix,
      DATEDIFF(a.date_echeance, NOW()) AS jours_restants,
      admin.full_name AS valide_par_nom
    FROM abonnements a
    LEFT JOIN plans pl ON a.plan_id = pl.id
    LEFT JOIN admin_users admin ON a.valide_par = admin.id
    WHERE a.utilisateur_id = ? AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function getHistoriquePaiements(id) {
  const [rows] = await pool.query(`
    SELECT
      p.id, p.montant, p.statut, p.type_flux,
      pab.reference_wave,
      p.created_at, pl.name AS plan_nom, pab.duree_mois,
      admin.full_name AS valide_par_nom
    FROM paiements p
    LEFT JOIN abonnements pab ON pab.id = p.abonnement_id
    LEFT JOIN commandes   pc  ON pc.id  = p.commande_id
    LEFT JOIN plans       pl  ON pl.id  = pab.plan_id
    LEFT JOIN admin_users admin ON admin.id = pab.valide_par
    WHERE (pab.utilisateur_id = ? OR pc.utilisateur_id = ?)
    ORDER BY p.created_at DESC
  `, [id, id]);
  return rows;
}

async function getPortfoliosClient(id) {
  const [rows] = await pool.query(`
    SELECT p.id, p.titre, p.url_slug AS slug,
      IF(p.est_public, 'PUBLISHED', 'DRAFT') AS statut,
      p.theme,
      p.date_creation AS created_at, p.date_modification AS updated_at,
      (SELECT COUNT(*) FROM analytics_events ae WHERE ae.portfolio_id = p.id) AS nb_vues
    FROM portfolios p
    WHERE p.utilisateur_id = ?
    ORDER BY p.date_creation DESC
  `, [id]);
  return rows;
}

async function getTimelineActivite(id) {
  const events = [];

  // Paiements — pas de utilisateur_id direct, JOIN via abonnements/commandes
  try {
    const [rows] = await pool.query(`
      SELECT p.created_at AS date, 'PAIEMENT' AS type,
        CONCAT(
          CASE p.type_flux
            WHEN 'WAVE'   THEN 'Paiement Wave'
            WHEN 'STRIPE' THEN 'Paiement Stripe'
            ELSE COALESCE(p.type_flux, 'Paiement') END,
          ' — ', p.statut,
          CASE WHEN p.montant IS NOT NULL
            THEN CONCAT(' (', FORMAT(p.montant, 0), ' FCFA)')
            ELSE '' END
        ) AS libelle,
        CONCAT('Réf: ', COALESCE(pab.reference_wave, p.reference_transaction, CAST(p.id AS CHAR))) AS detail,
        '#22c55e' AS couleur
      FROM paiements p
      LEFT JOIN abonnements pab ON pab.id = p.abonnement_id
      LEFT JOIN commandes   pc  ON pc.id  = p.commande_id
      WHERE (pab.utilisateur_id = ? OR pc.utilisateur_id = ?)
    `, [id, id]);
    events.push(...rows);
  } catch (e) { console.error('timeline:paiements', e.message); }

  // Abonnements
  try {
    const [rows] = await pool.query(`
      SELECT created_at AS date, 'ABONNEMENT' AS type,
        CONCAT('Abonnement ', COALESCE(statut_v2, statut)) AS libelle,
        CONCAT('Échéance: ', COALESCE(DATE_FORMAT(date_echeance, '%d/%m/%Y'), 'N/A')) AS detail,
        '#6366f1' AS couleur
      FROM abonnements WHERE utilisateur_id = ?
    `, [id]);
    events.push(...rows);
  } catch (e) { console.error('timeline:abonnements', e.message); }

  // subscription_history
  try {
    const [rows] = await pool.query(`
      SELECT created_at AS date, 'STATUT_CHANGE' AS type,
        CONCAT('Statut: ', COALESCE(new_status, '')) AS libelle,
        COALESCE(commentaire, '') AS detail,
        '#f59e0b' AS couleur
      FROM subscription_history WHERE utilisateur_id = ?
    `, [id]);
    events.push(...rows);
  } catch (e) { /* table may not exist */ }

  // subscription_reminders
  try {
    const [rows] = await pool.query(`
      SELECT sent_at AS date, 'RAPPEL_EMAIL' AS type,
        CONCAT('Rappel envoyé (J-', COALESCE(days_before, '?'), ')') AS libelle,
        COALESCE(type, '') AS detail,
        '#f97316' AS couleur
      FROM subscription_reminders WHERE utilisateur_id = ?
    `, [id]);
    events.push(...rows);
  } catch (e) { /* table may not exist */ }

  // Portfolios
  try {
    const [rows] = await pool.query(`
      SELECT date_creation AS date, 'PORTFOLIO' AS type,
        CONCAT('Portfolio créé : ', titre) AS libelle,
        CONCAT('Statut: ', IF(est_public, 'PUBLISHED', 'DRAFT')) AS detail,
        '#3b82f6' AS couleur
      FROM portfolios WHERE utilisateur_id = ?
    `, [id]);
    events.push(...rows);
  } catch (e) { console.error('timeline:portfolios', e.message); }

  return events
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);
}

// ─── ENDPOINT 1 : GET /api/admin/clients ────────────────────────────────────
async function listClients(req, res) {
  try {
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 200);
    const offset = (page - 1) * limit;

    const { search, statut, sort } = req.query;
    const plan_id   = req.query.plan_id ? Number(req.query.plan_id) : null;
    const searchVal = search ? `%${search}%` : null;
    const statutVal = (statut && statut !== 'NONE') ? statut : null;
    const sortVal   = sort || 'date_desc';

    const filterParams = [
      searchVal, searchVal, searchVal, searchVal, searchVal,
      statutVal, statutVal,
      plan_id, plan_id,
    ];

    const mainSql = `
      SELECT
        u.id, u.nom, u.prenom,
        CONCAT(u.prenom, ' ', u.nom) AS nom_complet,
        u.email,
        u.phone AS telephone,
        NULL AS ville,
        u.date_inscription,
        u.statut AS statut_compte,
        u.subscription_status,
        u.last_payment_at, u.next_billing_date,
        pl.name AS plan_nom, pl.id AS plan_id,
        a.statut_v2 AS abonnement_statut, a.date_echeance,
        DATEDIFF(a.date_echeance, NOW()) AS jours_restants,
        (SELECT COUNT(*) FROM portfolios p WHERE p.utilisateur_id = u.id) AS nb_portfolios,
        ${CA_SUBQUERY}
      FROM utilisateurs u
      LEFT JOIN abonnements a ON a.utilisateur_id = u.id
        AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
      LEFT JOIN plans pl ON a.plan_id = pl.id
      WHERE u.role = 'USER'
        AND (? IS NULL OR (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ? OR u.phone LIKE ?))
        AND (? IS NULL OR u.subscription_status = ?)
        AND (? IS NULL OR pl.id = ?)
      ORDER BY
        CASE WHEN ? = 'nom_asc'      THEN u.nom             END ASC,
        CASE WHEN ? = 'montant_desc' THEN (
          SELECT COALESCE(SUM(px.montant), 0) FROM paiements px
          LEFT JOIN abonnements ax ON ax.id = px.abonnement_id
          LEFT JOIN commandes   cx ON cx.id = px.commande_id
          WHERE (ax.utilisateur_id = u.id OR cx.utilisateur_id = u.id)
            AND px.statut = 'RÉUSSI'
        ) END DESC,
        CASE WHEN ? = 'date_asc'     THEN u.date_inscription END ASC,
        u.date_inscription DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM utilisateurs u
      LEFT JOIN abonnements a ON a.utilisateur_id = u.id
        AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
      LEFT JOIN plans pl ON a.plan_id = pl.id
      WHERE u.role = 'USER'
        AND (? IS NULL OR (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ? OR u.phone LIKE ?))
        AND (? IS NULL OR u.subscription_status = ?)
        AND (? IS NULL OR pl.id = ?)
    `;

    const tabSql = `
      SELECT
        COUNT(*)                                                                           AS total,
        COALESCE(SUM(CASE WHEN subscription_status = 'ACTIVE'          THEN 1 ELSE 0 END), 0) AS actifs,
        COALESCE(SUM(CASE WHEN subscription_status = 'PENDING_PAYMENT' THEN 1 ELSE 0 END), 0) AS en_attente,
        COALESCE(SUM(CASE WHEN subscription_status = 'EXPIRED'         THEN 1 ELSE 0 END), 0) AS expires,
        COALESCE(SUM(CASE WHEN statut = 'BLOQUÉ'                       THEN 1 ELSE 0 END), 0) AS bloques
      FROM utilisateurs WHERE role = 'USER'
    `;

    const [clientsResult, countResult, tabResult] = await Promise.all([
      pool.query(mainSql, [...filterParams, sortVal, sortVal, sortVal, limit, offset]),
      pool.query(countSql, filterParams),
      pool.query(tabSql),
    ]);

    const clients   = clientsResult[0];
    const total     = Number(countResult[0][0].total);
    const compteurs = tabResult[0][0] || { total: 0, actifs: 0, en_attente: 0, expires: 0, bloques: 0 };

    return res.json({
      clients,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      compteurs,
    });
  } catch (err) {
    console.error('listClients error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 2 : GET /api/admin/clients/:id/profil360 ──────────────────────
async function getProfil360(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide' });

    const [infos, abonnement, paiements, portfolios, timeline] = await Promise.all([
      getClientInfos(id),
      getAbonnementActuel(id),
      getHistoriquePaiements(id),
      getPortfoliosClient(id),
      getTimelineActivite(id),
    ]);

    if (!infos) return res.status(404).json({ error: 'Client introuvable' });

    return res.json({ infos, abonnement, paiements, portfolios, timeline });
  } catch (err) {
    console.error('getProfil360 error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 3 : POST /api/admin/clients/:id/bloquer ───────────────────────
async function bloquerClient(req, res) {
  try {
    const id     = Number(req.params.id);
    const { motif } = req.body;
    if (!id)    return res.status(400).json({ error: 'ID invalide' });
    if (!motif) return res.status(400).json({ error: 'Motif requis' });

    const [users] = await pool.query(
      "SELECT id, email, prenom, nom FROM utilisateurs WHERE id = ? AND role = 'USER'",
      [id]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'Client introuvable' });

    await pool.query("UPDATE utilisateurs SET statut = 'BLOQUÉ' WHERE id = ?", [id]);

    await pool.query('DELETE FROM refresh_tokens WHERE utilisateur_id = ?', [id]).catch(() => {});

    await sendEmail({
      to: user.email,
      subject: 'Votre compte Portefolia a été suspendu',
      html: `<p>Bonjour ${user.prenom},</p>
<p>Votre compte Portefolia a été suspendu pour le motif suivant :</p>
<blockquote style="border-left:4px solid #ef4444;margin:16px 0;padding:8px 16px;color:#374151;">${motif}</blockquote>
<p>Pour contester cette décision, contactez-nous à <a href="mailto:support@portefolia.tech">support@portefolia.tech</a>.</p>`,
    }).catch(err => console.error('bloquerClient:email', err.message));

    await logAction(req, 'bloquer_client', 'clients', { client_id: id, motif });

    return res.json({ success: true, message: 'Client bloqué avec succès' });
  } catch (err) {
    console.error('bloquerClient error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 4 : POST /api/admin/clients/:id/debloquer ─────────────────────
async function debloquerClient(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide' });

    const [users] = await pool.query(
      "SELECT id, email, prenom, nom FROM utilisateurs WHERE id = ? AND role = 'USER'",
      [id]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'Client introuvable' });

    await pool.query("UPDATE utilisateurs SET statut = 'ACTIF' WHERE id = ?", [id]);

    await sendEmail({
      to: user.email,
      subject: 'Votre compte Portefolia a été réactivé',
      html: `<p>Bonjour ${user.prenom},</p>
<p>Votre compte Portefolia a été réactivé. Vous pouvez vous connecter dès maintenant.</p>
<p><a href="${process.env.FRONTEND_BASE || 'https://portefolia.tech'}/connexion">Se connecter →</a></p>`,
    }).catch(err => console.error('debloquerClient:email', err.message));

    await logAction(req, 'debloquer_client', 'clients', { client_id: id });

    return res.json({ success: true, message: 'Client débloqué avec succès' });
  } catch (err) {
    console.error('debloquerClient error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 5 : POST /api/admin/clients/:id/envoyer-email ─────────────────
async function envoyerEmailClient(req, res) {
  try {
    const id = Number(req.params.id);
    const { sujet, message } = req.body;
    if (!id)              return res.status(400).json({ error: 'ID invalide' });
    if (!sujet || !message) return res.status(400).json({ error: 'Sujet et message requis' });

    const [users] = await pool.query(
      "SELECT id, email, prenom, nom FROM utilisateurs WHERE id = ? AND role = 'USER'",
      [id]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'Client introuvable' });

    await sendEmail({
      to: user.email,
      subject: sujet,
      html: `<p>Bonjour ${user.prenom} ${user.nom},</p>\n${message.replace(/\n/g, '<br>')}`,
    });

    await logAction(req, 'envoyer_email_client', 'clients', { client_id: id, sujet });

    return res.json({ success: true, message: 'Email envoyé avec succès' });
  } catch (err) {
    console.error('envoyerEmailClient error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 6 : PUT /api/admin/clients/:id/plan ───────────────────────────
async function changerPlanClient(req, res) {
  try {
    const id = Number(req.params.id);
    const { nouveau_plan_id, commentaire } = req.body;
    if (!id || !nouveau_plan_id) return res.status(400).json({ error: 'ID et nouveau_plan_id requis' });

    const [users] = await pool.query(
      "SELECT id, email, prenom, nom FROM utilisateurs WHERE id = ? AND role = 'USER'",
      [id]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'Client introuvable' });

    const [plans] = await pool.query('SELECT * FROM plans WHERE id = ?', [Number(nouveau_plan_id)]);
    const nouveauPlan = plans[0];
    if (!nouveauPlan) return res.status(404).json({ error: 'Plan introuvable' });
    nouveauPlan.prix = nouveauPlan.price_cents; // alias pour le reste de la fonction

    const [abos] = await pool.query(`
      SELECT a.id, a.plan_id, pl.price_cents AS prix_actuel
      FROM abonnements a
      LEFT JOIN plans pl ON a.plan_id = pl.id
      WHERE a.utilisateur_id = ? AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
      ORDER BY a.created_at DESC LIMIT 1
    `, [id]);
    const aboActuel = abos[0] || null;

    const prixActuel = aboActuel ? Number(aboActuel.prix_actuel || 0) : 0;
    const prixNouv   = Number(nouveauPlan.prix || 0);
    const isUpgrade  = prixNouv > prixActuel;
    const adminId    = req.user ? req.user.id : null;

    await pool.query(
      `INSERT INTO upgrades (utilisateur_id, ancien_plan_id, nouveau_plan_id, type, commentaire, statut, admin_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        aboActuel ? aboActuel.plan_id : null,
        Number(nouveau_plan_id),
        isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
        commentaire || null,
        isUpgrade ? 'PENDING' : 'APPROVED',
        adminId,
      ]
    ).catch(() => {});

    if (!isUpgrade && aboActuel) {
      await pool.query('UPDATE abonnements SET plan_id = ? WHERE id = ?', [Number(nouveau_plan_id), aboActuel.id]);
    }

    await sendEmail({
      to: user.email,
      subject: isUpgrade ? 'Mise à jour de votre plan Portefolia' : 'Changement de plan Portefolia',
      html: `<p>Bonjour ${user.prenom},</p>
<p>Votre plan a été ${isUpgrade ? 'mis à jour vers' : 'changé vers'} <strong>${nouveauPlan.name}</strong>.</p>
${commentaire ? `<p>${commentaire}</p>` : ''}`,
    }).catch(err => console.error('changerPlan:email', err.message));

    await logAction(req, 'changer_plan_client', 'clients', {
      client_id: id, nouveau_plan_id, type: isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
    });

    return res.json({
      success: true,
      message: isUpgrade ? 'Upgrade créé (paiement en attente)' : 'Downgrade appliqué directement',
    });
  } catch (err) {
    console.error('changerPlanClient error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 7 : PUT /api/admin/clients/:id/infos ──────────────────────────
async function mettreAJourInfosClient(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide' });

    const { nom, prenom, email, telephone } = req.body;

    if (email) {
      const [dup] = await pool.query(
        'SELECT id FROM utilisateurs WHERE email = ? AND id != ?',
        [email, id]
      );
      if (dup[0]) return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre compte' });
    }

    await pool.query(
      `UPDATE utilisateurs SET
        nom    = COALESCE(?, nom),
        prenom = COALESCE(?, prenom),
        email  = COALESCE(?, email),
        phone  = COALESCE(?, phone)
       WHERE id = ? AND role = 'USER'`,
      [nom || null, prenom || null, email || null, telephone || null, id]
    );

    await logAction(req, 'update_client_infos', 'clients', {
      client_id: id, fields: Object.keys(req.body),
    });

    return res.json({ success: true, message: 'Informations mises à jour' });
  } catch (err) {
    console.error('mettreAJourInfosClient error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 8 : POST /api/admin/clients/:id/forcer-renouvellement ─────────
async function forcerRenouvellement(req, res) {
  try {
    const id = Number(req.params.id);
    const duree_mois = Number(req.body.duree_mois);
    const { commentaire } = req.body;

    if (!id)                              return res.status(400).json({ error: 'ID invalide' });
    if (![1, 3, 12].includes(duree_mois)) return res.status(400).json({ error: 'duree_mois doit être 1, 3 ou 12' });
    if (!commentaire)                     return res.status(400).json({ error: 'Commentaire requis' });

    const [users] = await pool.query(
      "SELECT id, email, prenom, nom FROM utilisateurs WHERE id = ? AND role = 'USER'",
      [id]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'Client introuvable' });

    const [abos] = await pool.query(
      'SELECT plan_id FROM abonnements WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    const planId  = abos[0] ? abos[0].plan_id : null;
    const adminId = req.user ? req.user.id : null;

    const dateEcheance = new Date();
    dateEcheance.setMonth(dateEcheance.getMonth() + duree_mois);

    const [aboResult] = await pool.query(
      `INSERT INTO abonnements (utilisateur_id, plan_id, statut_v2, duree_mois, date_echeance, valide_par, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', ?, ?, ?, NOW(), NOW())`,
      [id, planId, duree_mois, dateEcheance, adminId]
    );

    await pool.query(
      `INSERT INTO subscription_history (utilisateur_id, abonnement_id, new_status, commentaire, flag, admin_id, created_at)
       VALUES (?, ?, 'ACTIVE', ?, 'MANUEL', ?, NOW())`,
      [id, aboResult.insertId, commentaire, adminId]
    ).catch(() => {});

    await pool.query(
      `UPDATE utilisateurs SET subscription_status = 'ACTIVE', next_billing_date = ? WHERE id = ?`,
      [dateEcheance, id]
    );

    await sendEmail({
      to: user.email,
      subject: 'Votre abonnement Portefolia a été renouvelé',
      html: `<p>Bonjour ${user.prenom},</p>
<p>Votre abonnement Portefolia a été renouvelé pour <strong>${duree_mois} mois</strong>.</p>
<p>Accès valable jusqu'au <strong>${dateEcheance.toLocaleDateString('fr-FR')}</strong>.</p>`,
    }).catch(err => console.error('forcerRenouvellement:email', err.message));

    await logAction(req, 'forcer_renouvellement', 'clients', {
      client_id: id, duree_mois, commentaire, abonnement_id: aboResult.insertId,
    });

    return res.json({
      success: true,
      message: `Abonnement renouvelé pour ${duree_mois} mois`,
      date_echeance: dateEcheance,
    });
  } catch (err) {
    console.error('forcerRenouvellement error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ENDPOINT 9 : GET /api/admin/clients/export ─────────────────────────────
async function exportClientsCSV(req, res) {
  try {
    const { search, statut } = req.query;
    const plan_id   = req.query.plan_id ? Number(req.query.plan_id) : null;
    const searchVal = search ? `%${search}%` : null;
    const statutVal = (statut && statut !== 'NONE') ? statut : null;

    const [rows] = await pool.query(`
      SELECT
        u.id,
        CONCAT(u.prenom, ' ', u.nom) AS nom_complet,
        u.email,
        u.phone AS telephone,
        pl.name AS plan_nom,
        u.subscription_status AS statut,
        u.date_inscription,
        ${CA_SUBQUERY}
      FROM utilisateurs u
      LEFT JOIN abonnements a ON a.utilisateur_id = u.id
        AND a.statut_v2 IN ('ACTIVE','PENDING_PAYMENT','GRACE_PERIOD')
      LEFT JOIN plans pl ON a.plan_id = pl.id
      WHERE u.role = 'USER'
        AND (? IS NULL OR (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ? OR u.phone LIKE ?))
        AND (? IS NULL OR u.subscription_status = ?)
        AND (? IS NULL OR pl.id = ?)
      ORDER BY u.date_inscription DESC
    `, [
      searchVal, searchVal, searchVal, searchVal, searchVal,
      statutVal, statutVal,
      plan_id, plan_id,
    ]);

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clients_portefolia_${date}.csv"`);

    const headers = ['ID', 'Nom complet', 'Email', 'Téléphone', 'Plan', 'Statut', 'Date inscription', 'CA total (FCFA)'];
    const escape  = (v) => `"${String(v || '').replace(/"/g, '""')}"`;

    const lines = [
      headers.join(';'),
      ...rows.map(r => [
        r.id,
        escape(r.nom_complet),
        escape(r.email),
        escape(r.telephone),
        escape(r.plan_nom),
        escape(r.statut),
        r.date_inscription ? new Date(r.date_inscription).toLocaleDateString('fr-FR') : '',
        r.ca_total || 0,
      ].join(';')),
    ];

    // BOM UTF-8 pour compatibilité Excel
    return res.send('﻿' + lines.join('\r\n'));
  } catch (err) {
    console.error('exportClientsCSV error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listClients,
  getProfil360,
  bloquerClient,
  debloquerClient,
  envoyerEmailClient,
  changerPlanClient,
  mettreAJourInfosClient,
  forcerRenouvellement,
  exportClientsCSV,
};
