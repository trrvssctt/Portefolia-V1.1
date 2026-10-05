const onboardingModel = require('../models/onboardingModel');

const TOUR_KEY_RE = /^[a-z0-9_]{1,50}$/;
const STATUSES = ['in_progress', 'completed', 'skipped'];

// GET /api/onboarding — progression de toutes les visites de l'utilisateur connecté
exports.getMine = async (req, res) => {
  try {
    const tours = await onboardingModel.listForUser(req.userId);
    res.json({ tours });
  } catch (err) {
    console.error('onboarding.getMine:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// PUT /api/onboarding/:tourKey — enregistre l'étape courante / le statut
exports.save = async (req, res) => {
  const { tourKey } = req.params;
  if (!TOUR_KEY_RE.test(tourKey)) return res.status(400).json({ error: 'tour_key invalide' });

  const status = req.body?.status || 'in_progress';
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'status invalide' });

  const step = Number.parseInt(req.body?.current_step, 10);
  const current_step = Number.isFinite(step) && step >= 0 ? Math.min(step, 1000) : 0;
  const rawId = req.body?.current_step_id;
  const current_step_id = typeof rawId === 'string' && rawId ? rawId.slice(0, 80) : null;

  try {
    const tour = await onboardingModel.upsert(req.userId, tourKey, { status, current_step, current_step_id });
    res.json({ tour });
  } catch (err) {
    console.error('onboarding.save:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// DELETE /api/onboarding/:tourKey — réinitialise une visite (pour la refaire depuis le début)
exports.reset = async (req, res) => {
  const { tourKey } = req.params;
  if (!TOUR_KEY_RE.test(tourKey)) return res.status(400).json({ error: 'tour_key invalide' });
  try {
    await onboardingModel.reset(req.userId, tourKey);
    res.json({ ok: true });
  } catch (err) {
    console.error('onboarding.reset:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
