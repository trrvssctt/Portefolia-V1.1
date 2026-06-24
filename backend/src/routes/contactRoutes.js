const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const sendEmail = require('../utils/sendEmail');
const auth = require('../middlewares/authMiddleware');
const adminAuth = require('../middlewares/adminAuth');

const CONTACT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'contact@portefolia.tech';
const FRONTEND = process.env.FRONTEND_URL || 'https://portefolia.tech';

// ─── Init table ───────────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        nom           VARCHAR(150) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        sujet         VARCHAR(100) NOT NULL DEFAULT 'Question générale',
        message       TEXT NOT NULL,
        is_read       BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.warn('contact_messages table init:', e.message);
  }
})();

// ─── POST /api/contact — public ───────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { nom, email, sujet = 'Question générale', message } = req.body || {};
  if (!nom?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'nom, email et message sont requis' });
  }

  try {
    await pool.query(
      'INSERT INTO contact_messages (nom, email, sujet, message) VALUES (?, ?, ?, ?)',
      [nom.trim(), email.trim(), sujet.trim(), message.trim()]
    );

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0"
  style="margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:28px 40px;text-align:center">
    <img src="${FRONTEND}/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" height="36"
      style="filter:brightness(0) invert(1)">
    <h1 style="color:#fff;font-size:18px;font-weight:700;margin:12px 0 0">Nouveau message de contact</h1>
  </td></tr>
  <tr><td style="padding:32px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <tr><td style="padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">De</td>
          <td style="padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600">${nom} &lt;${email}&gt;</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Sujet</td>
          <td style="padding:10px 16px;font-size:14px;color:#111827">${sujet}</td></tr>
    </table>
    <div style="font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px">${message}</div>
    <div style="text-align:center;margin-top:28px">
      <a href="${FRONTEND}/admin/contact-messages"
        style="display:inline-block;padding:12px 28px;background:#2E7D32;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px">
        Voir dans l'admin →
      </a>
    </div>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#9ca3af;margin:0">Portefolia · contact@portefolia.tech · ${FRONTEND}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    await sendEmail(CONTACT_EMAIL, `[Contact] ${sujet} — ${nom}`, html).catch(e =>
      console.error('contact email send error:', e.message)
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('contact route error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/contact/admin — liste (admin) ───────────────────────────────────
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200'
    );
    const [cnt] = await pool.query(
      'SELECT COUNT(*) AS unread FROM contact_messages WHERE is_read = FALSE'
    );
    return res.json({ messages: rows, unread: cnt[0].unread });
  } catch (err) {
    console.error('contact admin list error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/contact/admin/:id/read — marquer lu ──────────────────────────
router.patch('/admin/:id/read', auth, adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /api/contact/admin/:id ───────────────────────────────────────────
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
