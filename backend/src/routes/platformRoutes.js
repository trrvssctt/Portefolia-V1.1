// Notifications de la plateforme via n8n : routes internes (n8n) et désinscription des relances.
const express = require('express');
const internalAuth = require('../middlewares/internalAuth');
const relances = require('../services/platformRelanceService');

function handleError(res, err, label) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(`platform.${label} error:`, err);
  return res.status(500).json({ error: 'Erreur serveur' });
}

// Monté sur /api/internal/platform (en-tête X-Internal-Key)
const internalRouter = express.Router();
internalRouter.use(internalAuth);
internalRouter.post('/expired-reminders', async (req, res) => {
  try { return res.json(await relances.claimExpiredReminders()); } catch (err) { return handleError(res, err, 'expiredReminders'); }
});
internalRouter.post('/relances/:id/result', async (req, res) => {
  try { return res.json(await relances.recordRelanceResult(req.params.id, req.body || {})); } catch (err) { return handleError(res, err, 'relanceResult'); }
});
internalRouter.post('/daily-digest', async (req, res) => {
  try { return res.json(await relances.dailyDigest()); } catch (err) { return handleError(res, err, 'dailyDigest'); }
});

function page(title, text) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Portefolia</title></head>
<body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:480px;margin:60px auto;background:#fff;border-radius:12px;padding:32px;text-align:center">
<p style="font-size:20px;font-weight:700;color:#1B5E20;margin:0 0 12px">Portefolia</p>
<h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 20px">${text}</p>
<a href="https://portefolia.tech" style="color:#2E7D32;font-weight:600">Retour sur Portefolia</a>
</div></body></html>`;
}

// Monté sur /api/platform (public, lien signé des e-mails de relance)
const publicRouter = express.Router();
publicRouter.get('/relances/unsubscribe', async (req, res) => {
  try {
    const ok = await relances.unsubscribe(req.query.u, req.query.t);
    res.status(ok ? 200 : 400).type('html').send(ok
      ? page('Désinscription confirmée', 'Vous ne recevrez plus nos rappels de renouvellement. Votre compte reste accessible et vous pouvez le réactiver à tout moment depuis votre espace.')
      : page('Lien invalide', 'Ce lien de désinscription est incomplet ou invalide. Répondez simplement à l\'e-mail reçu et nous ferons le nécessaire.'));
  } catch (err) {
    console.error('platform.unsubscribe error:', err);
    res.status(500).type('html').send(page('Erreur', 'Réessayez dans quelques instants.'));
  }
});

module.exports = { internalRouter, publicRouter };
