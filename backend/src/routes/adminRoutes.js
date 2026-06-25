const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const paiementController = require('../controllers/paiementController');
const planController = require('../controllers/planController');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');
const { requirePermission } = require('../middlewares/rbac');
const { logAdminAction } = require('../middlewares/adminLogger');

// Protected admin endpoints
router.get('/users', auth, adminAuth, requirePermission('users:read'), userController.ListUsers);
router.get('/users/debug', auth, adminAuth, requirePermission('users:read'), adminController.usersDebug);
router.get('/users/pending', auth, adminAuth, adminController.listPendingUsers);
router.get('/admin/users', auth, adminAuth, userController.ListUsers);
router.get('/commandes', auth, adminAuth, adminController.listCommandes);
// User management
router.get('/users/:id', auth, adminAuth, requirePermission('users:read'), adminController.getUser);
router.put('/users/:id', auth, adminAuth, requirePermission('users:write'), logAdminAction('update_user', 'users'), adminController.updateUser);
router.put('/users/:id/activate', auth, adminAuth, requirePermission('users:write'), logAdminAction('activate_user', 'users'), adminController.activateUser);
router.put('/users/:id/deactivate', auth, adminAuth, requirePermission('users:write'), logAdminAction('deactivate_user', 'users'), adminController.deactivateUser);
router.put('/users/:id/verify', auth, adminAuth, requirePermission('users:write'), logAdminAction('verify_user', 'users'), adminController.verifyUser);
router.delete('/users/:id', auth, adminAuth, requirePermission('users:write'), logAdminAction('delete_user', 'users'), adminController.deleteUser);
// Permanent delete (restricted)
router.delete('/users/:id/permanent', auth, adminAuth, requirePermission('system:admin'), logAdminAction('permanent_delete_user', 'users'), adminController.permanentDeleteUser);

// User plan history and change
router.get('/users/:id/plans', auth, adminAuth, requirePermission('users:read'), adminController.getUserPlans);
router.post('/users/:id/plan', auth, adminAuth, requirePermission('payments:write'), logAdminAction('change_plan', 'users'), adminController.changeUserPlan);

// User cartes
router.get('/users/:id/cartes', auth, adminAuth, requirePermission('users:read'), adminController.getUserCartes);
// User sessions (from sessions table)
router.get('/users/:id/sessions', auth, adminAuth, requirePermission('users:read'), adminController.getUserSessions);

// Confirm payment and validate (generate invoice, subscription, send email)
router.put('/users/:id/confirm-payment', auth, adminAuth, requirePermission('payments:write'), logAdminAction('confirm_payment', 'payments'), adminController.confirmPaymentAndValidate);

// Portfolios admin
router.get('/portfolios', auth, adminAuth, adminController.listPortfolios);
router.get('/portfolios/stats', auth, adminAuth, adminController.portfoliosStats); // DOIT être avant /:id
router.get('/portfolios/:id', auth, adminAuth, adminController.getPortfolio);
router.put('/portfolios/:id', auth, adminAuth, adminController.updatePortfolioAdmin);
router.delete('/portfolios/:id', auth, adminAuth, adminController.deletePortfolio);
router.put('/portfolios/:id/feature', auth, adminAuth, adminController.featurePortfolio);

// Commandes admin
router.get('/commandes', auth, adminAuth, adminController.adminListCommandes);
router.get('/commandes/:id', auth, adminAuth, adminController.adminGetCommande);
router.put('/commandes/:id/status', auth, adminAuth, adminController.adminUpdateCommandeStatus);
router.put('/commandes/:id/valider-paiement', auth, adminAuth, adminController.adminValiderPaiement);
router.put('/commandes/:id/refuser-paiement', auth, adminAuth, adminController.adminRefuserPaiement);
router.get('/commandes/:id/invoice/pdf', auth, adminAuth, adminController.getCommandeInvoicePdf);

// Analytics & reports
router.get('/totals', auth, adminAuth, adminController.totals);
router.get('/visits/monthly', auth, adminAuth, adminController.monthlyVisits);
router.get('/revenue/monthly', auth, adminAuth, adminController.monthlyRevenue);
router.get('/export/commandes.csv', auth, adminAuth, adminController.exportCommandesCsv);

// Cartes admin
router.get('/cartes', auth, adminAuth, adminController.listCartes);
router.get('/cartes/:id', auth, adminAuth, adminController.getCarte);
router.put('/cartes/:id/assign-uid', auth, adminAuth, adminController.assignUidCarte);
router.put('/cartes/:id/status', auth, adminAuth, adminController.setCarteStatus);
router.put('/cartes/:id', auth, adminAuth, adminController.updateCarte);
router.delete('/cartes/:id', auth, adminAuth, adminController.deleteCarte);

// Paiements admin (delegated to dedicated routes file)
const paiementRoutes = require('./paiementRoutes');
router.use('/paiements', paiementRoutes);
// Abonnements upcoming
router.get('/abonnements/upcoming', auth, adminAuth, adminController.listAbonnementsUpcoming);

// ── Paiements Wave — gestion admin ──────────────────────────────────────────
const waveCtrl = require('../controllers/adminWaveController');
// Paiements en attente de validation
router.get('/wave/pending',
  auth, adminAuth, requirePermission('payments:write'),
  waveCtrl.listPending
);
// Valider un paiement Wave
router.post('/wave/validate/:abonnementId',
  auth, adminAuth, requirePermission('payments:write'),
  logAdminAction('validate_wave_payment', 'payments'),
  waveCtrl.validatePayment
);
// Rejeter un paiement Wave
router.post('/wave/reject/:abonnementId',
  auth, adminAuth, requirePermission('payments:write'),
  logAdminAction('reject_wave_payment', 'payments'),
  waveCtrl.rejectPayment
);
// Historique complet des paiements Wave (paginé, filtrable)
router.get('/wave/history',
  auth, adminAuth, requirePermission('payments:write'),
  waveCtrl.listHistory
);

// Invoices admin
router.get('/invoices', auth, adminAuth, adminController.listInvoices);
router.get('/invoices/by-reference', auth, adminAuth, adminController.getInvoiceByReference);
router.get('/invoices/:id', auth, adminAuth, adminController.getInvoiceById);
router.get('/invoices/:id/html', auth, adminAuth, adminController.getInvoiceHtml);
router.get('/invoices/:id/pdf', auth, adminAuth, adminController.getInvoicePdf);
// Content admin (articles & pages)
const contentController = require('../controllers/contentController');

// Admin users (super-admin management)
router.get('/admin-users', auth, adminAuth, requirePermission('admin_users:read'), adminController.listAdminUsers);
router.post('/admin-users', auth, adminAuth, requirePermission('admin_users:write'), adminController.createAdminUser);
router.put('/admin-users/:id', auth, adminAuth, requirePermission('admin_users:write'), adminController.updateAdminUser);
router.delete('/admin-users/:id', auth, adminAuth, requirePermission('admin_users:write'), adminController.deleteAdminUser);

// Articles admin
router.get('/articles', auth, adminAuth, requirePermission('content:read'), contentController.adminListArticles);
router.post('/articles', auth, adminAuth, requirePermission('content:write'), logAdminAction('create_article', 'articles'), contentController.adminCreateArticle);
router.get('/articles/:id', auth, adminAuth, requirePermission('content:read'), contentController.adminGetArticle);
router.put('/articles/:id', auth, adminAuth, requirePermission('content:write'), logAdminAction('update_article', 'articles'), contentController.adminUpdateArticle);
router.delete('/articles/:id', auth, adminAuth, requirePermission('content:write'), logAdminAction('delete_article', 'articles'), contentController.adminDeleteArticle);

// Pages admin (slug-based)
router.get('/pages', auth, adminAuth, requirePermission('content:read'), contentController.adminListPages);
router.put('/pages/:slug', auth, adminAuth, requirePermission('content:write'), logAdminAction('update_page', 'pages'), contentController.adminUpsertPage);

// Notifications admin
router.get('/notifications', auth, adminAuth, adminController.listNotifications);
router.post('/notifications', auth, adminAuth, adminController.createNotification);
router.get('/plans/detailed-stats', auth, adminAuth, adminController.plansDetailedStats);

// Uploads (server-side Cloudinary upload endpoint)
const uploadRoutes = require('./uploadRoutes');
router.use('/uploads', uploadRoutes);

// Revenue / finance
router.get('/revenue/summary', auth, adminAuth, adminController.revenueSummary);
router.get('/revenue/users', auth, adminAuth, adminController.revenueByUser);
router.get('/revenue/stream', auth, adminAuth, adminController.revenueStream);

// Upgrade requests management
router.get('/upgrades', auth, adminAuth, adminController.listUpgrades);
router.get('/upgrades/:id', auth, adminAuth, adminController.getUpgrade);
// export invoices CSV
router.get('/invoices/export.csv', auth, adminAuth, adminController.exportInvoicesCsv);
router.put('/upgrades/:id/approve', auth, adminAuth, adminController.approveUpgrade);
router.put('/upgrades/:id/reject',  auth, adminAuth, adminController.rejectUpgrade);

// Wave pending payment management (admin validation)
const checkoutController = require('../controllers/checkoutController');
router.get('/wave-payments', auth, adminAuth, checkoutController.getWavePendingPayments);
router.post('/wave-payments/:id/approve', auth, adminAuth, logAdminAction('approve_wave_payment', 'payments'), checkoutController.approveWavePayment);

// Admin plans management — full CRUD
router.get('/plans',           auth, adminAuth, planController.listPlans);
router.post('/plans',          auth, adminAuth, planController.createPlan);
router.put('/plans/:id',       auth, adminAuth, planController.updatePlan);
router.delete('/plans/:id',    auth, adminAuth, planController.deletePlan);
router.put('/plans/:id/toggle',auth, adminAuth, planController.togglePlan);

// Backwards-compatible stats endpoints used by frontend
router.get('/stats/platform', auth, adminAuth, adminController.statsPlatform);
router.get('/stats/plans-distribution', auth, adminAuth, adminController.statsPlansDistribution);
router.get('/stats/users', auth, adminAuth, adminController.statsUsers);
router.get('/stats/portfolios', auth, adminAuth, adminController.statsPortfolios);
router.get('/stats/commandes', auth, adminAuth, adminController.statsCommandes);
router.get('/stats/plans-detailed', auth, adminAuth, adminController.plansDetailedStats);
router.get('/dashboard/stats', auth, adminAuth, adminController.dashboardStats);

// Real-time nav badges
router.get('/badges', auth, adminAuth, adminController.getBadges);

// ── Dashboard unifié ─────────────────────────────────────────────────────────
const dashboardController = require('../controllers/adminDashboardController');
router.get('/dashboard', auth, adminAuth, dashboardController.getDashboardData);

// ── KPI financiers ───────────────────────────────────────────────────────────
const kpiController = require('../controllers/financialKpiController');
router.get('/kpi/dashboard',    auth, adminAuth, kpiController.getDashboard);
router.get('/kpi/evolution',    auth, adminAuth, kpiController.getEvolution);
router.get('/kpi/previsionnel', auth, adminAuth, kpiController.getPrevisionnel);
router.get('/kpi/flux/:type',   auth, adminAuth, kpiController.getFluxDetail);

// ── Gestion clients (CRM admin) ──────────────────────────────────────────────
const clientsAdminCtrl = require('../controllers/clientsAdminController');

// Export CSV avant /:id pour éviter le conflit de route
router.get('/clients/export',                  auth, adminAuth, clientsAdminCtrl.exportClientsCSV);

router.get('/clients',                         auth, adminAuth, clientsAdminCtrl.listClients);
router.get('/clients/:id/profil360',           auth, adminAuth, clientsAdminCtrl.getProfil360);
router.post('/clients/:id/bloquer',            auth, adminAuth, logAdminAction('bloquer_client', 'clients'),            clientsAdminCtrl.bloquerClient);
router.post('/clients/:id/debloquer',          auth, adminAuth, logAdminAction('debloquer_client', 'clients'),          clientsAdminCtrl.debloquerClient);
router.post('/clients/:id/reactiver',          auth, adminAuth, logAdminAction('reactiver_client', 'clients'),          clientsAdminCtrl.reactiverClient);
router.post('/clients/:id/envoyer-email',      auth, adminAuth, logAdminAction('envoyer_email_client', 'clients'),      clientsAdminCtrl.envoyerEmailClient);
router.put('/clients/:id/plan',                auth, adminAuth, logAdminAction('changer_plan_client', 'clients'),       clientsAdminCtrl.changerPlanClient);
router.put('/clients/:id/infos',               auth, adminAuth, logAdminAction('update_client_infos', 'clients'),       clientsAdminCtrl.mettreAJourInfosClient);
router.post('/clients/:id/forcer-renouvellement', auth, adminAuth, logAdminAction('forcer_renouvellement', 'clients'), clientsAdminCtrl.forcerRenouvellement);

// ── NFC Waitlist ──────────────────────────────────────────────────────────────
const sendEmail  = require('../utils/sendEmail');
const FRONTEND_NFC = process.env.FRONTEND_BASE || 'https://portefolia.tech';

router.get('/nfc-waitlist/export', auth, adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT email, created_at FROM nfc_waitlist ORDER BY created_at DESC'
    );
    const date = new Date().toISOString().slice(0, 10);
    const csv  = ['email,date_inscription',
      ...rows.map(r => `${r.email},${new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}`)
    ].join('\n');
    res.set({
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nfc-waitlist-${date}.csv"`,
    });
    return res.send(csv);
  } catch (err) {
    console.error('nfc-waitlist export error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/nfc-waitlist', auth, adminAuth, async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM nfc_waitlist');
    const [liste] = await pool.query(
      'SELECT id, email, created_at FROM nfc_waitlist ORDER BY created_at DESC'
    );
    return res.json({ total: Number(total), liste });
  } catch (err) {
    console.error('nfc-waitlist list error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/nfc-waitlist/:id', auth, adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM nfc_waitlist WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('nfc-waitlist delete error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/nfc-waitlist/notify-all', auth, adminAuth, async (req, res) => {
  try {
    const { sujet, message } = req.body || {};
    if (!sujet || !message) return res.status(400).json({ error: 'sujet et message requis' });

    const [rows] = await pool.query('SELECT email FROM nfc_waitlist ORDER BY created_at DESC');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0" style="margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:32px 40px;text-align:center">
    <img src="${FRONTEND_NFC}/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" height="40" style="filter:brightness(0) invert(1)">
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:16px 0 0">Carte NFC Portefolia</h1>
  </td></tr>
  <tr><td style="padding:36px 40px">
    <div style="font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap">${message}</div>
    <div style="text-align:center;margin-top:32px">
      <a href="${FRONTEND_NFC}/nfc-types" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2E7D32,#1BC29A);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px">Découvrir la carte NFC</a>
    </div>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#9ca3af;margin:0">Portefolia · contact@portefolia.tech · ${FRONTEND_NFC}</p>
    <p style="font-size:11px;color:#9ca3af;margin:4px 0 0">Vous recevez cet email car vous êtes inscrit sur la liste d'attente NFC.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    let envoyes = 0, echecs = 0;
    for (const row of rows) {
      try {
        await sendEmail(row.email, sujet, html);
        envoyes++;
      } catch { echecs++; }
    }

    try {
      await pool.query(
        `INSERT INTO admin_action_logs (admin_id, action, resource, details, ip_address, user_agent)
         VALUES (?, 'NFC_WAITLIST_NOTIFY', 'nfc_waitlist', ?, ?, ?)`,
        [req.userId, JSON.stringify({ envoyes, echecs, sujet }),
         req.headers['x-forwarded-for'] || req.ip || '',
         (req.headers['user-agent'] || '').slice(0, 250)]
      );
    } catch {}

    return res.json({ success: true, envoyes, echecs });
  } catch (err) {
    console.error('nfc-waitlist notify error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
