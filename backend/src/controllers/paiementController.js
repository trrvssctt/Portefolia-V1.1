// controllers/paiementController.js
const paiementModel = require('../models/paiementModel'); // ajuste le chemin si besoin
const { pool } = require('../db');
const invoiceModel = require('../models/invoiceModel');
const userModel = require('../models/userModel');
const planModel = require('../models/planModel');
const commandeModelLocal = require('../models/commandeModel');
const sendEmail = require('../utils/sendEmail');
const { emailPaiementCommandeValide } = require('../utils/emailTemplates');
const abonnementModel = require('../models/abonnementModel');

// Normalize status strings (remove diacritics and lowercase)
function normalizeStatusStr(s) {
  if (!s && s !== 0) return '';
  try {
    return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  } catch (e) {
    return s.toString().toLowerCase();
  }
}

// Liste (endpoint admin) : /api/admin/paiements
async function listAdmin(req, res) {
  try {
    const userId = req.userId;
    const remote = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    console.log(`[paiementController.listAdmin] called by userId=${userId} ip=${remote} query=`, req.query);

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const status = req.query.status || null; // pending, confirmed, paid, cancelled
    const user_id = req.query.user_id || null;
    const from = req.query.from || null; // ISO datetime lower bound for historical filtering
    const to = req.query.to || null;     // ISO datetime upper bound for historical filtering

    const data = await paiementModel.list({ page, limit, status, user_id, from, to });

    // Normalize items array (some implementations return { paiements } or { items })
    const items = Array.isArray(data.paiements)
      ? data.paiements
      : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    // Compute safe statistics to avoid NaN (e.g., 0/0)
    const normalize = (s) => {
      if (!s && s !== 0) return '';
      try {
        return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
      } catch (e) {
        return s.toString().toLowerCase();
      }
    };

    const parsed = (items || []).map((p) => ({
      montant: Number(p.montant || p.montant_total || p.amount || 0),
      status: normalize(p.status || p.statut || ''),
    }));

    const total = parsed.length;
    const paidStatuses = ['paid', 'reussi', 'confirmed', 'réussi'];
    const paid = parsed.filter((p) => paidStatuses.includes(p.status)).length;
    const pending = parsed.filter(p => p.status === 'pending').length;
    const failed = parsed.filter(p => p.status === 'failed').length;
    const refunded = parsed.filter(p => p.status === 'refunded').length;
    const totalRevenue = parsed.filter(p => paidStatuses.includes(p.status)).reduce((acc, p) => acc + (p.montant || 0), 0);
    const avgAmount = paid > 0 ? Math.round(totalRevenue / paid) : 0;

    const stats = { total, paid, pending, failed, refunded, totalRevenue, avgAmount };

    console.log(`[paiementController.listAdmin] returning ${items.length} paiements (page=${page} limit=${limit}) stats=`, stats);
    // Return original data and attach stats for client-side safety
    return res.json(Object.assign({}, data, { stats }));
  } catch (err) {
    console.error('paiementController.listAdmin error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}


// Récupérer un paiement par id : /api/admin/paiements/:id
async function getById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const paiement = await paiementModel.findById(id);
    if (!paiement) return res.status(404).json({ error: 'Not found' });

    return res.json({ paiement });
  } catch (err) {
    console.error('paiementController.getById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Mettre à jour le statut : PUT /api/admin/paiements/:id/status
async function updateStatus(req, res) {
  try {
    const id = Number(req.params.id);
        const { status, notes, motif } = req.body || {};
        if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });

    // Ici tu peux vérifier si l'utilisateur est admin ou a les droits
    // const userId = req.userId; // si tu utilises auth middleware
    // if (!isAdmin(userId)) return res.status(403).json({ error: 'Forbidden' });

        console.log(`[paiementController.updateStatus] id=${id} received status=`, status);
        // Normalize incoming status and map various confirmed/paid variants -> 'reussi'
        let targetStatus = normalizeStatusStr(status || '');
        // map common variants (english + french normalized forms + provider variants) to canonical 'reussi'
        const successVariants = [
            'confirmed', 'paid', 'success', 'succeeded', 'completed',
            // french normalized forms
            'confirme', 'paye', 'payee', 'paye', 'reussi', 'reussie'
        ];
        if (successVariants.includes(targetStatus)) targetStatus = 'reussi';
    // french variants for refunded (ex: 'remboursé' -> normalized 'rembourse')
    if (['refunded', 'rembourse', 'remboursement', 'remboursee', 'remboursees', 'rembourses','Remboursé'].includes(targetStatus)) targetStatus = 'refunded';

        const refundReason = notes || motif || null;

        // Map canonical statuses to DB enum values
        function toDbStatus(canonical) {
            if (!canonical) return 'En_attente';
            switch (canonical) {
                case 'reussi':
                case 'paid':
                case 'confirmed':
                    return 'Réussi';
                case 'refunded':
                    return 'Remboursé';
                case 'failed':
                    return 'Échoué';
                case 'pending':
                    return 'En_attente';
                default:
                    return 'En_attente';
            }
        }

        const dbStatus = toDbStatus(targetStatus);
        console.log(`[paiementController.updateStatus] normalized targetStatus=${targetStatus} -> dbStatus=${dbStatus}`);
        const updated = await paiementModel.updateStatus(id, dbStatus, dbStatus === 'Remboursé' ? refundReason : null);
        console.log('[paiementController.updateStatus] updated paiement:', updated && updated.id ? { id: updated.id, utilisateur_id: updated.utilisateur_id, montant: updated.montant || updated.montant_total, statut: updated.status || updated.statut } : updated);

    // Si le paiement passe à RÉUSSI et qu'il a un abonnement_id lié →
    // activer l'abonnement + user + user_plans exactement comme le flow Wave Validation
    if (targetStatus === 'reussi' && updated && updated.abonnement_id) {
      try {
        const aboId = updated.abonnement_id;
        const adminId = req.userId || null;

        // Vérifier que l'abonnement est bien en attente (évite double-validation)
        const [[abo]] = await pool.query(
          "SELECT statut_v2, utilisateur_id, plan_id, date_debut, date_echeance FROM abonnements WHERE id = ? LIMIT 1",
          [aboId]
        );
        if (abo && abo.statut_v2 === 'PENDING_PAYMENT') {
          await abonnementModel.validateSubscription(aboId, adminId, `Validation manuelle depuis page Paiements (paiement #${id})`);

          // Récupérer les dates fraîchement calculées
          const [[fresh]] = await pool.query(
            'SELECT date_debut, date_echeance FROM abonnements WHERE id = ? LIMIT 1',
            [aboId]
          );

          // Synchroniser user_plans pour que le dashboard affiche le bon plan
          if (abo.plan_id) {
            await pool.query('DELETE FROM user_plans WHERE utilisateur_id = ?', [abo.utilisateur_id]);
            await planModel.subscribeUser({
              utilisateur_id:    abo.utilisateur_id,
              plan_id:           abo.plan_id,
              start_date:        fresh?.date_debut   ?? null,
              end_date:          fresh?.date_echeance ?? null,
              status:            'active',
              payment_reference: updated.reference_transaction || null,
            });
          }
          console.log(`[paiementController.updateStatus] abonnement #${aboId} activé via validation manuelle`);
        }
      } catch (aboErr) {
        console.error('[paiementController.updateStatus] erreur activation abonnement:', aboErr.message);
      }
    }

    // If payment becomes successful ('reussi'), generate invoice and notify user
        if (targetStatus === 'reussi') {
      try {
                const userId = updated && (updated.utilisateur_id || updated.user_id);
                console.log(`[paiementController.updateStatus] handling success for paiement id=${id} userId=${userId}`);
        if (userId) {
          const amount = Number(updated.montant_total || updated.montant || updated.amount || 0);
          const reference = updated.reference || updated.reference_transaction || `INV-${Date.now()}-${Math.floor(1000 + Math.random()*9000)}`;
          const currency = updated.currency || 'XOF';

          // create invoice record
                    const invoice = await invoiceModel.createInvoice({ utilisateur_id: userId, plan_id: null, amount, currency, reference, status: 'paid' });
                    console.log(`[paiementController.updateStatus] invoice created id=${invoice && invoice.id}`);

          // Persist invoice_id into invoice_id column and attempt metadata JSON set
          try {
            // Try combined update (metadata JSON functions may not be supported in all DBs)
            await pool.query(
              `UPDATE paiements SET invoice_id = ?, metadata =
                 CASE
                   WHEN metadata IS NULL THEN JSON_OBJECT('invoice_id', ?)
                   ELSE JSON_SET(metadata, '$.invoice_id', ?)
                 END,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [invoice.id, invoice.id, invoice.id, id]
            );
          } catch (e) {
            // Fallback: try to set invoice_id alone
            try {
              await pool.query('UPDATE paiements SET invoice_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [invoice.id, id]);
            } catch (e2) {
              console.warn('paiementController: could not persist invoice_id into paiements', e2.message || e2);
            }
          }

          // Attempt to send invoice email to user
                    try {
                        const isCommandeNFC = !!(updated && updated.commande_id);
                        const user = await userModel.findById(userId);
                        console.log('[paiementController.updateStatus] found user for email:', user && user.email, 'isCommandeNFC:', isCommandeNFC);

                        // For NFC card orders: update commandes.paiement_statut and send the right email
                        if (isCommandeNFC) {
                          try {
                            await commandeModelLocal.updatePaiement(updated.commande_id, { paiement_statut: 'payé' });
                          } catch (cErr) {
                            console.warn('paiementController: could not update commandes.paiement_statut', cErr.message);
                          }
                          if (user && user.email) {
                            try {
                              const commande = await commandeModelLocal.findById(updated.commande_id);
                              const tpl = emailPaiementCommandeValide({
                                prenom: user.prenom || user.nom || 'Client',
                                numero_commande: commande ? commande.numero_commande : updated.commande_id,
                                montant: commande ? commande.montant_total : updated.montant,
                                paiement_mode: commande ? commande.paiement_mode : null,
                              });
                              await sendEmail(user.email, tpl.subject, tpl.html);
                              console.log('[paiementController.updateStatus] NFC order email sent to', user.email);
                            } catch (mailErr) {
                              console.warn('paiementController: NFC order email non envoyé', mailErr.message);
                            }
                          }
                        }

                        if (user && user.email && !isCommandeNFC) {
              const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth`;
                                        const invoiceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/admin/invoices/${invoice.id}`;

                                        // Ensure planName / planDescription exist to avoid ReferenceError in template
                                        let planName = 'Premium';
                                        let planDescription = 'Accès complet à toutes les fonctionnalités';
                                        try {
                                            if (invoice && invoice.plan_id) {
                                                const p = await planModel.getPlanById(invoice.plan_id);
                                                if (p) {
                                                    planName = p.name || planName;
                                                    planDescription = p.description || planDescription;
                                                }
                                            }
                                        } catch (e) { /* ignore */ }

                                        const emailBody = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmation de paiement - Portefolia</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09);">
        <tr>
          <td style="background:#2E7D32;padding:32px 40px 24px;text-align:center;">
            <img src="https://portefolia.tech/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" width="160" style="display:block;margin:0 auto 4px;max-width:160px;" onerror="this.style.display='none'">
            <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,.80);">Confirmation de paiement</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fdf8;border-bottom:1px solid #e8f5e9;padding:18px 40px;text-align:center;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#1b5e20;">Paiement confirmé</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:16px;color:#111827;margin:0 0 8px;">Bonjour <strong>${user.prenom || user.nom || 'Client'}</strong>,</p>
            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">
              Votre paiement a bien été validé. Voici le récapitulatif de votre transaction.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">N° facture</td>
                    <td align="right" style="font-size:13px;font-weight:700;color:#111827;padding:7px 0;border-top:1px solid #e2e8f0;">#${invoice.id}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Référence</td>
                    <td align="right" style="font-size:13px;font-weight:700;color:#1d4ed8;padding:7px 0;border-top:1px solid #e2e8f0;">${reference}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Service</td>
                    <td align="right" style="font-size:13px;font-weight:700;color:#111827;padding:7px 0;border-top:1px solid #e2e8f0;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Montant</td>
                    <td align="right" style="font-size:13px;font-weight:700;color:#2E7D32;padding:7px 0;border-top:1px solid #e2e8f0;">${Math.round(Number(amount)).toLocaleString('fr-FR')} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Date</td>
                    <td align="right" style="font-size:13px;font-weight:700;color:#111827;padding:7px 0;border-top:1px solid #e2e8f0;">${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="text-align:center;margin:28px 0 12px;">
              <a href="${loginUrl}" style="display:inline-block;background:#2E7D32;color:#ffffff;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;" target="_blank" rel="noopener">Accéder à mon compte</a>
            </p>
            <p style="font-size:12px;color:#94a3b8;text-align:center;margin:8px 0 0;">
              Conservez la référence <strong>${reference}</strong> pour tout suivi.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
              Besoin d'aide ?
              <a href="mailto:support@portefolia.tech" style="color:#2E7D32;text-decoration:none;font-weight:600;">support@portefolia.tech</a>
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">
              &copy; ${new Date().getFullYear()} Portefolia &middot;
              <a href="https://portefolia.tech/mentions-legales" style="color:#94a3b8;text-decoration:none;">Mentions légales</a>
              &middot;
              <a href="https://portefolia.tech/confidentialite" style="color:#94a3b8;text-decoration:none;">Confidentialité</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

                            await sendEmail(user.email, `✅ Paiement confirmé — Facture #${invoice.id}`, emailBody, { text: `Facture ${invoice.id} - ${amount} ${currency}` });
                            console.log(`[paiementController.updateStatus] sendEmail OK to ${user.email} for invoice ${invoice.id}`);
            }
          } catch (e) {
                        console.error('paiementController: failed to send invoice email', e && (e.stack || e.message || e));
          }

          // attach invoice_id to the returned paiement object for immediate client consumption
          try { if (updated && typeof updated === 'object') updated.invoice_id = invoice.id; } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.error('paiementController: error while creating invoice', e);
      }
        }

        // If payment is refunded, create a refund invoice and notify user
        if (targetStatus === 'refunded') {
            try {
                const userId = updated && (updated.utilisateur_id || updated.user_id);
                if (userId) {
                    const amount = Number(updated.montant_total || updated.montant || updated.amount || 0);
                    const reference = updated.reference || updated.reference_transaction || `REFUND-${Date.now()}-${Math.floor(1000 + Math.random()*9000)}`;
                    const currency = updated.currency || 'XOF';

                    // create refund invoice (store as negative amount or status 'refunded')
                    const invoice = await invoiceModel.createInvoice({ utilisateur_id: userId, plan_id: null, amount: -Math.abs(amount), currency, reference, status: 'refunded' });

                    // Persist invoice_id into paiements and metadata like before
                    try {
                        await pool.query(
                            `UPDATE paiements SET invoice_id = ?, metadata =
                                 CASE
                                     WHEN metadata IS NULL THEN JSON_OBJECT('invoice_id', ?)
                                     ELSE JSON_SET(metadata, '$.invoice_id', ?)
                                 END,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?`,
                            [invoice.id, invoice.id, invoice.id, id]
                        );
                    } catch (e) {
                        try {
                            await pool.query('UPDATE paiements SET invoice_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [invoice.id, id]);
                        } catch (e2) {
                            console.warn('paiementController: could not persist refund invoice_id into paiements', e2.message || e2);
                        }
                    }

                    // send refund email with reason
                    try {
                        const user = await userModel.findById(userId);
                        if (user && user.email) {
                            const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth`;
                            const invoiceUrl = `${process.env.APP_URL || 'http://localhost:3000'}/admin/invoices/${invoice.id}`;
                            const refundHtml = `
                               <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de remboursement - Portefolia</title>
    <style>
        /* Styles pour l'email de remboursement */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        
        .refund-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
        }
        
        .refund-header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
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
        
        .refund-title {
            margin: 15px 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        
        .refund-subtitle {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
        }
        
        .refund-content {
            padding: 40px;
        }
        
        .greeting-section {
            margin-bottom: 30px;
            text-align: center;
        }
        
        .user-name {
            color: #4f46e5;
            font-size: 24px;
            font-weight: 700;
            margin: 10px 0;
        }
        
        .refund-icon {
            font-size: 60px;
            margin: 20px 0;
            color: #10b981;
        }
        
        .refund-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            border: 2px solid #dbeafe;
            text-align: center;
        }
        
        .refund-amount {
            font-size: 48px;
            font-weight: 800;
            color: #10b981;
            margin: 15px 0;
        }
        
        .refund-details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .refund-detail-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #4f46e5;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .detail-label {
            display: block;
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .timeline {
            margin: 40px 0;
            position: relative;
            padding-left: 30px;
        }
        
        .timeline::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e5e7eb;
        }
        
        .timeline-step {
            position: relative;
            margin-bottom: 30px;
        }
        
        .timeline-step::before {
            content: '';
            position: absolute;
            left: -28px;
            top: 5px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #4f46e5;
            border: 3px solid white;
            box-shadow: 0 0 0 2px #4f46e5;
        }
        
        .timeline-step.completed::before {
            background: #10b981;
            box-shadow: 0 0 0 2px #10b981;
        }
        
        .timeline-step h4 {
            margin: 0 0 8px 0;
            color: #1f2937;
        }
        
        .timeline-step p {
            margin: 0;
            color: #6b7280;
        }
        
        .refund-reason {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
        }
        
        .refund-reason h4 {
            color: #92400e;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .refund-actions {
            text-align: center;
            margin: 40px 0;
        }
        
        .action-btn {
            display: inline-block;
            padding: 14px 32px;
            background: #4f46e5;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
            margin: 0 10px 10px 10px;
        }
        
        .action-btn:hover {
            background: #4338ca;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(79, 70, 229, 0.3);
        }
        
        .action-btn.secondary {
            background: #6b7280;
        }
        
        .action-btn.secondary:hover {
            background: #4b5563;
        }
        
        .refund-process {
            background: #f9fafb;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
        }
        
        .refund-process h4 {
            color: #1f2937;
            margin-top: 0;
        }
        
        .refund-footer {
            text-align: center;
            padding: 30px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
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
        
        .estimated-timeline {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
            border: 1px solid #bbf7d0;
        }
        
        .warning-note {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
        }
        
        @media (max-width: 768px) {
            .refund-content {
                padding: 20px;
            }
            
            .refund-details-grid {
                grid-template-columns: 1fr;
            }
            
            .contact-info {
                flex-direction: column;
                gap: 15px;
            }
            
            .action-btn {
                display: block;
                margin: 10px 0;
            }
            
            .refund-amount {
                font-size: 36px;
            }
        }
    </style>
</head>
<body>
    <div class="refund-container">
        <!-- En-tête avec logo -->
        <div class="refund-header">
            <div class="logo-container">
                <!-- Remplacer src par l'URL de votre logo -->
                <img src="https://example.com/logo.png" alt="Portefolia Logo" class="logo">
                <h1 class="refund-title">Confirmation de remboursement</h1>
                <p class="refund-subtitle">Votre demande a été traitée avec succès</p>
            </div>
        </div>
        
        <!-- Contenu principal -->
        <div class="refund-content">
            <!-- Salutation personnalisée -->
            <div class="greeting-section">
                <p>Cher(e) client(e),</p>
                <div class="user-name">${user.prenom || user.nom || 'Cher client'}</div>
                <p style="font-size: 18px; color: #4b5563; margin-top: 10px;">
                    Nous confirmons le traitement de votre remboursement.
                </p>
            </div>
            
            <!-- Icône et montant du remboursement -->
            <div class="refund-summary">
                <div class="refund-icon">💸</div>
                <div style="font-size: 18px; color: #6b7280;">Montant remboursé</div>
                <div class="refund-amount">${Math.abs(amount)} ${currency}</div>
                <div style="color: #6b7280; margin-top: 10px;">
                    Ce montant sera crédité sur votre compte d'origine
                </div>
            </div>
            
            <!-- Détails du remboursement -->
            <div class="refund-details-grid">
                <div class="refund-detail-card">
                    <span class="detail-label">Numéro de transaction</span>
                    <div class="detail-value">#REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
                </div>
                
                <div class="refund-detail-card">
                    <span class="detail-label">Date de traitement</span>
                    <div class="detail-value">${new Date().toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    })}</div>
                </div>
                
                <div class="refund-detail-card">
                    <span class="detail-label">Statut</span>
                    <div class="detail-value" style="color: #10b981;">
                        ✅ Traité avec succès
                    </div>
                </div>
            </div>
            
            <!-- Motif du remboursement -->
            <div class="refund-reason">
                <h4>
                    <span>📝</span> Motif du remboursement
                </h4>
                <p style="color: #92400e; margin: 10px 0 0 0;">
                    ${refundReason || 'Non spécifié. Pour plus d\'informations, contactez notre service client.'}
                </p>
            </div>
            
            <!-- Chronologie du remboursement -->
            <div class="timeline">
                <h3 style="margin-bottom: 30px; color: #1f2937;">⏱️ Chronologie du traitement</h3>
                
                <div class="timeline-step completed">
                    <h4>Demande de remboursement reçue</h4>
                    <p>Nous avons bien reçu votre demande</p>
                </div>
                
                <div class="timeline-step completed">
                    <h4>Validation du remboursement</h4>
                    <p>Votre demande a été approuvée par notre équipe</p>
                </div>
                
                <div class="timeline-step completed">
                    <h4>Traitement financier</h4>
                    <p>Le remboursement a été initié auprès de notre banque</p>
                </div>
                
                <div class="timeline-step">
                    <h4>Crédit sur votre compte</h4>
                    <p>Délai estimé : 3 à 10 jours ouvrés selon votre banque</p>
                </div>
            </div>
            
            <!-- Délais estimés -->
            <div class="estimated-timeline">
                <h4 style="margin-top: 0; color: #065f46;">⏳ Délais de traitement</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px;">
                    <div style="flex: 1; min-width: 200px;">
                        <strong>Cartes de crédit/débit:</strong><br>
                        <span style="color: #065f46;">2 à 5 jours ouvrés</span>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <strong>Virement bancaire:</strong><br>
                        <span style="color: #065f46;">3 à 10 jours ouvrés</span>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <strong>Portefeuille électronique:</strong><br>
                        <span style="color: #065f46;">24 à 48 heures</span>
                    </div>
                </div>
            </div>
            
            <!-- Processus de remboursement -->
            <div class="refund-process">
                <h4>💡 Comment fonctionne le processus de remboursement ?</h4>
                <ul style="color: #6b7280;">
                    <li>Le remboursement est effectué sur le moyen de paiement d'origine</li>
                    <li>Les délais dépendent de votre institution bancaire</li>
                    <li>Vous recevrez une notification une fois le crédit effectué</li>
                    <li>Tous les frais de transaction sont pris en charge par Portefolia</li>
                </ul>
            </div>
            
            <!-- Avertissement important -->
            <div class="warning-note">
                <h4 style="margin-top: 0; color: #b91c1c; display: flex; align-items: center; gap: 10px;">
                    <span>⚠️</span> Informations importantes
                </h4>
                <p style="color: #b91c1c; margin: 10px 0;">
                    Si vous ne voyez pas le remboursement dans les délais indiqués, vérifiez auprès de votre banque.
                    En cas de problème, contactez notre service client avec le numéro de transaction.
                </p>
            </div>
            
            <!-- Boutons d'action -->
            <div class="refund-actions">
                <a href="${invoiceUrl}" class="action-btn">
                    📄 Voir la note de remboursement
                </a>
                <a href="${loginUrl}" class="action-btn secondary">
                    🔗 Accéder à mon compte
                </a>
            </div>
            
            <!-- Liens alternatifs -->
            <div style="text-align: center; margin: 20px 0;">
                <p style="color: #6b7280; margin-bottom: 10px;">
                    <strong>Liens alternatifs :</strong>
                </p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <small>
                        Note de remboursement : 
                        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                            ${invoiceUrl}
                        </code>
                    </small>
                    <small>
                        Connexion à votre compte : 
                        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                            ${loginUrl}
                        </code>
                    </small>
                </div>
            </div>
        </div>
        
        <!-- Pied de page -->
        <div class="refund-footer">
            <div class="contact-info">
                <div class="contact-item">
                    <strong>📞 Service client</strong><br>
                    <a href="tel:+33123456789" style="color: #4f46e5; text-decoration: none;">+33 1 23 45 67 89</a><br>
                    <a href="mailto:support@portefolia.com" style="color: #4f46e5;">remboursements@portefolia.com</a>
                </div>
                
                <div class="contact-item">
                    <strong>⏰ Horaires d'ouverture</strong><br>
                    Lundi - Vendredi<br>
                    9h - 18h (heure française)
                </div>
                
                <div class="contact-item">
                    <strong>📍 Notre siège</strong><br>
                    123 Avenue de l'Innovation<br>
                    75000 Paris, France
                </div>
            </div>
            
            <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px;">
                <strong>Transparence :</strong> Nous nous engageons à traiter tous les remboursements dans les délais les plus courts.<br>
                Pour toute question concernant cette transaction, contactez-nous en mentionnant le numéro de transaction.
            </p>
            
            <p style="margin: 20px 0 0 0; color: #4b5563;">
                Cordialement,<br>
                <strong>Le service financier de Portefolia</strong><br>
                Votre satisfaction est notre priorité
            </p>
            
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Portefolia. Tous droits réservés.<br>
                <a href="https://portefolia.tech/refund-policy" style="color: #9ca3af;">Politique de remboursement</a> • 
                <a href="https://portefolia.tech/terms" style="color: #9ca3af;">Conditions générales</a> • 
                <a href="https://portefolia.tech/privacy" style="color: #9ca3af;">Confidentialité</a>
            </p>
        </div>
    </div>
</body>
</html>
                            `;
                            await sendEmail(user.email, 'Confirmation de remboursement', refundHtml, { text: `Remboursement ${invoice.id} - ${Math.abs(amount)} ${currency}` });
                        }
                    } catch (e) {
                        console.error('paiementController: failed to send refund email', e && (e.stack || e.message || e));
                    }

                    // attach invoice_id to response
                    try { if (updated && typeof updated === 'object') updated.invoice_id = invoice.id; } catch (e) { /* ignore */ }
                }
            } catch (e) {
                console.error('paiementController: error while creating refund invoice', e);
            }
        }

    return res.json({ paiement: updated });
  } catch (err) {
    console.error('paiementController.updateStatus error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Upcoming payments derived from abonnements (next N days)
async function upcoming(req, res) {
  try {
    const days = Math.max(Number(req.query.days) || 30, 1);
    const { pool } = require('../db');
    const [rows] = await pool.query(`
      SELECT a.id AS abonnement_id, a.utilisateur_id, a.plan_id, a.montant, a.currency, a.start_date, a.end_date, a.payment_reference, a.statut AS abonnement_statut,
             u.prenom AS user_prenom, u.nom AS user_nom, u.email AS user_email, p.name AS plan_name
      FROM abonnements a
      LEFT JOIN utilisateurs u ON u.id = a.utilisateur_id
      LEFT JOIN plans p ON p.id = a.plan_id
      WHERE a.statut IN ('active','pending')
        AND a.end_date IS NOT NULL
        AND a.end_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL ? DAY)
      ORDER BY a.end_date ASC
    `, [days]);

    // Map abonnements to a payment-like structure for the admin UI
    const upcoming = (rows || []).map((r) => ({
      id: r.abonnement_id,
      reference: r.payment_reference || null,
      commande_id: null,
      utilisateur_id: r.utilisateur_id,
      user_name: `${r.user_prenom || ''} ${r.user_nom || ''}`.trim() || null,
      user_email: r.user_email || null,
      image_paiement: null,
      payment_method: null,
      montant: Number(r.montant || 0),
      status: 'upcoming',
      date_paiement: r.end_date || null,
      created_at: r.start_date || null,
      notes: `Abonnement ${r.plan_name || r.plan_id}`,
    }));

    return res.json({ upcoming });
  } catch (err) {
    console.error('paiementController.upcoming error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function sendConfirmationEmail(req, res) {
  try {
    const id = Number(req.params.id);
    const paiement = await paiementModel.findById(id);
    if (!paiement) return res.status(404).json({ error: 'Paiement introuvable' });

    const userId = paiement.utilisateur_id;
    if (!userId) return res.status(400).json({ error: 'Aucun utilisateur associé' });

    const user = await userModel.findById(userId);
    if (!user || !user.email) return res.status(400).json({ error: 'Email utilisateur introuvable' });

    const isCommandeNFC = !!(paiement.commande_id);

    if (isCommandeNFC) {
      const commande = await commandeModelLocal.findById(paiement.commande_id);
      const tpl = emailPaiementCommandeValide({
        prenom: user.prenom || user.nom || 'Client',
        numero_commande: commande ? commande.numero_commande : paiement.commande_id,
        montant: commande ? commande.montant_total : paiement.montant,
        paiement_mode: commande ? commande.paiement_mode : null,
      });
      await sendEmail(user.email, tpl.subject, tpl.html);
    } else {
      // Abonnement / réabonnement / upgrade
      const amount = paiement.montant || 0;
      const currency = 'FCFA';
      const reference = paiement.reference_transaction || paiement.reference || `PAY-${paiement.id}`;
      let planName = 'Premium';
      try {
        if (paiement.abonnement_id) {
          const [abRows] = await pool.query(
            'SELECT p.name FROM abonnements a LEFT JOIN plans p ON p.id = a.plan_id WHERE a.id = ? LIMIT 1',
            [paiement.abonnement_id]
          );
          if (abRows && abRows[0] && abRows[0].name) planName = abRows[0].name;
        }
      } catch (e) { /* ignore */ }

      const loginUrl = `${process.env.APP_URL || 'https://portefolia.tech'}/auth`;
      const emailBody = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.09);">
        <tr><td style="background:#2E7D32;padding:32px 40px 24px;text-align:center;">
          <img src="https://portefolia.tech/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" width="160" style="display:block;margin:0 auto 4px;max-width:160px;" onerror="this.style.display='none'">
          <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,.80);">Confirmation de paiement</p>
        </td></tr>
        <tr><td style="background:#f8fdf8;border-bottom:1px solid #e8f5e9;padding:18px 40px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#1b5e20;">Paiement confirmé ✅</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#111827;margin:0 0 8px;">Bonjour <strong>${user.prenom || user.nom || 'Client'}</strong>,</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Votre paiement a bien été validé. Voici le récapitulatif de votre transaction.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 28px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Référence</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#1d4ed8;padding:7px 0;border-top:1px solid #e2e8f0;">${reference}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Service</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#111827;padding:7px 0;border-top:1px solid #e2e8f0;">${planName}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Montant</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#2E7D32;padding:7px 0;border-top:1px solid #e2e8f0;">${Math.round(Number(amount)).toLocaleString('fr-FR')} ${currency}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:7px 0;border-top:1px solid #e2e8f0;">Date</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#111827;padding:7px 0;border-top:1px solid #e2e8f0;">${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="text-align:center;margin:28px 0 12px;">
            <a href="${loginUrl}" style="display:inline-block;background:#2E7D32;color:#ffffff;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;text-decoration:none;">Accéder à mon compte</a>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Besoin d'aide ? <a href="mailto:support@portefolia.tech" style="color:#2E7D32;text-decoration:none;font-weight:600;">support@portefolia.tech</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
      await sendEmail(user.email, `✅ Paiement confirmé — Référence ${reference}`, emailBody);
    }

    return res.json({ ok: true, sent_to: user.email });
  } catch (err) {
    console.error('paiementController.sendConfirmationEmail error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { listAdmin, getById, updateStatus, upcoming, sendConfirmationEmail };
