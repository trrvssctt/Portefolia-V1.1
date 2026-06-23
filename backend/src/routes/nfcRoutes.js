'use strict';

const express   = require('express');
const router    = express.Router();
const { pool }  = require('../db');
const sendEmail = require('../utils/sendEmail');

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRONTEND  = process.env.FRONTEND_BASE || 'https://portefolia.tech';

function buildWaitlistEmail(email) {
  const prenom = email.split('@')[0];
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0"
  style="margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:36px 40px;text-align:center">
    <img src="${FRONTEND}/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" height="40"
      style="filter:brightness(0) invert(1);display:block;margin:0 auto 16px">
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;letter-spacing:-.3px">
      Vous êtes sur la liste ! 🎉
    </h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px">
    <p style="font-size:16px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${prenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">
      Votre inscription sur la liste d'attente de la <strong>Carte NFC Portefolia</strong>
      a bien été enregistrée. Vous serez parmi les premiers à être notifié(e) dès le lancement.
    </p>

    <!-- Prix highlight -->
    <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:12px;padding:20px 24px;margin:0 0 28px;text-align:center">
      <p style="font-size:13px;color:#2E7D32;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin:0 0 6px">
        Prix de lancement
      </p>
      <p style="font-size:32px;font-weight:900;color:#1B5E20;margin:0">30 000 F CFA</p>
      <p style="font-size:12px;color:#4CAF50;margin:8px 0 0">par carte · gravure laser incluse</p>
    </div>

    <!-- Features -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:33%">
          <div style="background:#f9fafb;border-radius:10px;padding:14px;text-align:center">
            <p style="font-size:22px;margin:0 0 6px">💳</p>
            <p style="font-size:12px;font-weight:700;color:#111827;margin:0 0 3px">Métal gravé laser</p>
            <p style="font-size:11px;color:#6b7280;margin:0">Finition premium</p>
          </div>
        </td>
        <td style="padding:8px 6px;vertical-align:top;width:33%">
          <div style="background:#f9fafb;border-radius:10px;padding:14px;text-align:center">
            <p style="font-size:22px;margin:0 0 6px">📡</p>
            <p style="font-size:12px;font-weight:700;color:#111827;margin:0 0 3px">NFC intégré</p>
            <p style="font-size:11px;color:#6b7280;margin:0">Un tap = votre portfolio</p>
          </div>
        </td>
        <td style="padding:8px 0 8px 12px;vertical-align:top;width:33%">
          <div style="background:#f9fafb;border-radius:10px;padding:14px;text-align:center">
            <p style="font-size:22px;margin:0 0 6px">🔗</p>
            <p style="font-size:12px;font-weight:700;color:#111827;margin:0 0 3px">Lien intelligent</p>
            <p style="font-size:11px;color:#6b7280;margin:0">Toujours à jour</p>
          </div>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px">
      En attendant, créez ou complétez votre portfolio sur Portefolia pour être prêt(e)
      le jour J.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px">
      <a href="${FRONTEND}" style="display:inline-block;padding:14px 36px;
        background:linear-gradient(135deg,#2E7D32,#1BC29A);color:#fff;
        font-size:15px;font-weight:700;text-decoration:none;border-radius:10px">
        Préparer mon portfolio →
      </a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#9ca3af;margin:0">
      Portefolia · contact@portefolia.tech · <a href="${FRONTEND}" style="color:#9ca3af">${FRONTEND}</a>
    </p>
    <p style="font-size:11px;color:#9ca3af;margin:6px 0 0">
      Vous recevez cet email car vous vous êtes inscrit(e) sur la liste d'attente NFC.
    </p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

router.post('/waitlist', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'Email invalide.' });
    }
    const normalised = String(email).trim().toLowerCase();

    // Vérifier si déjà inscrit
    const [[existing]] = await pool.query(
      'SELECT id FROM nfc_waitlist WHERE email = ? LIMIT 1',
      [normalised]
    );
    if (existing) {
      return res.status(409).json({ already: true, message: 'Vous êtes déjà sur la liste d\'attente.' });
    }

    await pool.query(
      'INSERT INTO nfc_waitlist (email, created_at) VALUES (?, NOW())',
      [normalised]
    );

    // Envoyer l'email de confirmation (best-effort)
    try {
      await sendEmail(
        normalised,
        '✓ Vous êtes sur la liste d\'attente — Carte NFC Portefolia',
        buildWaitlistEmail(normalised)
      );
    } catch (mailErr) {
      console.warn('nfc/waitlist mail error:', mailErr.message);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('nfc/waitlist error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
