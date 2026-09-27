const { pool } = require('../db');
const planModel = require('../models/planModel');

// Limites par portfolio — mêmes règles que portfolioController (création / mise à jour)
// Free=2/2/1, Starter=3/3/0, Pro=10/10/5, autres (Premium, Business) illimités
const ITEM_TABLES = {
  projects:    { table: 'projets',     label: 'projets',       none: 'de projets' },
  competences: { table: 'competences', label: 'compétences',   none: 'de compétences' },
  experiences: { table: 'experiences', label: 'expérience(s)', none: "d'expériences" },
};

async function resolvePlanLimits(userId, jwtRole) {
  const role = (jwtRole || '').toString().toUpperCase();
  const isBusinessRole = role === 'BUSINESS_ADMIN' || role === 'BUSINESS_MEMBER';
  const userPlans = await planModel.listUserPlans(userId);
  const latestPlan = userPlans && userPlans.length ? userPlans[0] : null;
  const planSlug = latestPlan && latestPlan.slug ? String(latestPlan.slug).trim().toLowerCase() : 'gratuit';

  const isFree = !isBusinessRole && (planSlug === 'gratuit' || planSlug === 'free');
  const isStarter = !isBusinessRole && ['starter', 'standard'].includes(planSlug);
  const isPro = !isBusinessRole && ['professionnel', 'pro', 'professional'].includes(planSlug);
  const isPremium = !isBusinessRole && ['premium', 'premium_pro', 'premium-plus'].includes(planSlug);
  const isBusiness = isBusinessRole || ['business'].includes(planSlug);
  const effectivelyFree = isFree || (!isBusinessRole && !latestPlan && !isStarter && !isPro && !isPremium && !isBusiness);

  if (effectivelyFree) return { label: 'Gratuit', projects: 2, competences: 2, experiences: 1 };
  if (isStarter) return { label: 'Starter', projects: 3, competences: 3, experiences: 0 };
  if (isPro) return { label: 'Professionnel', projects: 10, competences: 10, experiences: 5 };
  return { label: 'Avancé', projects: Infinity, competences: Infinity, experiences: Infinity };
}

/**
 * Vérifie que le portfolio appartient à l'utilisateur et que la limite de son plan
 * n'est pas atteinte pour ce type d'élément. Renvoie null si OK, sinon { status, error }.
 */
async function checkItemLimit({ userId, jwtRole, portfolioId, kind }) {
  const cfg = ITEM_TABLES[kind];
  if (!cfg) throw new Error(`checkItemLimit: type inconnu ${kind}`);

  const [owned] = await pool.query(
    'SELECT id FROM portfolios WHERE id = ? AND utilisateur_id = ? LIMIT 1',
    [portfolioId, userId]
  );
  if (!owned.length) return { status: 403, error: 'Portfolio introuvable ou non autorisé' };

  const limits = await resolvePlanLimits(userId, jwtRole);
  const limit = limits[kind];
  if (limit === Infinity) return null;

  if (limit === 0) {
    return { status: 403, error: `Plan ${limits.label} : ajout ${cfg.none} non autorisé.` };
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${cfg.table} WHERE portfolio_id = ?`,
    [portfolioId]
  );
  if (Number(total) >= limit) {
    return { status: 403, error: `Plan ${limits.label} : maximum ${limit} ${cfg.label} par portfolio.` };
  }
  return null;
}

module.exports = { resolvePlanLimits, checkItemLimit };
