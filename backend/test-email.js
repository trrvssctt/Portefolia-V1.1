/**
 * Test de la configuration SMTP LWS.
 * Usage : node test-email.js votre@destinataire.com
 */
require('dotenv').config();
const sendEmail = require('./src/utils/sendEmail');

const to = process.argv[2] || process.env.ADMIN_EMAIL;
if (!to) { console.error('Usage : node test-email.js destinataire@email.com'); process.exit(1); }

console.log('SMTP config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  from: process.env.EMAIL_FROM,
});

sendEmail({
  to,
  subject: '✅ Test email — Portefolia SMTP LWS',
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1a1a2e;">Connexion SMTP réussie !</h2>
      <p>Le serveur <strong>mail.portefolia.tech</strong> est correctement configuré.</p>
      <p style="color:#6b7280;font-size:13px;">Envoyé depuis Portefolia — ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  `,
})
  .then(() => { console.log('✅ Email envoyé avec succès à', to); })
  .catch(err => {
    console.error('❌ Erreur SMTP :', err.message);
    if (err.code === 'EAUTH') console.error('→ Vérifiez SMTP_USER et SMTP_PASS dans le .env');
    if (err.code === 'ECONNREFUSED') console.error('→ Impossible de joindre', process.env.SMTP_HOST, 'port', process.env.SMTP_PORT);
    if (err.code === 'ESOCKET') console.error('→ Essayez SMTP_TLS_REJECT_UNAUTHORIZED=false ou changez le port (587)');
    process.exit(1);
  });
