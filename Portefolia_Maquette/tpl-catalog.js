// tpl-catalog.js — 46 template presets. Each = { id, name, famille, couleur, tier }
// familles: editorial | classique | minimal | sombre  (ce que PhonePreview simule)
// tiers cumulatifs: essai(1) · starter(+5=6) · pro(+15=21) · business(+25=46)
(function () {
  const E = 'editorial', C = 'classique', M = 'minimal', S = 'sombre';
  // variantes de layout par famille (chacune change la mise en page, pas juste la couleur) :
  //   editorial : classic | cover | split
  //   classique : centered | sidebar | band
  //   minimal   : list | center | index
  //   sombre    : panel | hero | mono
  // [name, famille, couleur, tier, variant]
  const RAW = [
    // ESSAI (1)
    ['Clarté', E, '#2E7D32', 'essai', 'classic'],
    // STARTER (+5 = 6)
    ['Atlas', C, '#1565C0', 'starter', 'centered'],
    ['Miel', M, '#D97706', 'starter', 'list'],
    ['Horizon', M, '#0E7490', 'starter', 'center'],
    ['Nuit', S, '#22C55E', 'starter', 'hero'],
    ['Baobab', C, '#B45309', 'starter', 'sidebar'],
    // PRO (+15 = 21)
    ['Larsson', E, '#1A1A2E', 'pro', 'split'],
    ['Obsidian', S, '#6366F1', 'pro', 'panel'],
    ['Papier', E, '#9A3412', 'pro', 'cover'],
    ['Organic', M, '#15803D', 'pro', 'index'],
    ['Studio', C, '#7C3AED', 'pro', 'band'],
    ['Gradient', M, '#DB2777', 'pro', 'center'],
    ['Savane', C, '#CA8A04', 'pro', 'sidebar'],
    ['Blueprint', S, '#38BDF8', 'pro', 'mono'],
    ['Kodak', E, '#DC2626', 'pro', 'cover'],
    ['Terminal', S, '#22C55E', 'pro', 'mono'],
    ['Luxe Rose', C, '#BE185D', 'pro', 'centered'],
    ['Aqua', M, '#0891B2', 'pro', 'list'],
    ['Béton', M, '#52525B', 'pro', 'index'],
    ['Consulting', E, '#1D4ED8', 'pro', 'split'],
    ['Atelier', E, '#2E7D32', 'pro', 'classic'],
    // BUSINESS (+25 = 46)
    ['Onyx', S, '#A855F7', 'business', 'hero'],
    ['Marbre', C, '#334155', 'business', 'band'],
    ['Éclat', M, '#E11D48', 'business', 'center'],
    ['Carbone', S, '#F59E0B', 'business', 'panel'],
    ['Linen', E, '#7C2D12', 'business', 'split'],
    ['Prisme', M, '#8B5CF6', 'business', 'index'],
    ['Ivoire', C, '#A16207', 'business', 'sidebar'],
    ['Aurore', M, '#F97316', 'business', 'center'],
    ['Cobalt', S, '#3B82F6', 'business', 'hero'],
    ['Manuscrit', E, '#155E63', 'business', 'classic'],
    ['Velours', C, '#9D174D', 'business', 'centered'],
    ['Néon', S, '#10B981', 'business', 'mono'],
    ['Sépia', E, '#92400E', 'business', 'cover'],
    ['Cristal', M, '#06B6D4', 'business', 'list'],
    ['Émeraude', C, '#047857', 'business', 'band'],
    ['Graphite', S, '#E5E7EB', 'business', 'panel'],
    ['Pastel', M, '#F472B6', 'business', 'center'],
    ['Editorial+', E, '#0F172A', 'business', 'split'],
    ['Galerie', C, '#6D28D9', 'business', 'band'],
    ['Mono', M, '#171717', 'business', 'index'],
    ['Indigo', S, '#818CF8', 'business', 'hero'],
    ['Botanic', C, '#16A34A', 'business', 'sidebar'],
    ['Riviera', M, '#0284C7', 'business', 'list'],
    ['Noir Absolu', S, '#FACC15', 'business', 'mono'],
    ['Flagship', E, '#2E7D32', 'business', 'cover'],
  ];

  const FAMILLES = {
    editorial: { label: 'Éditorial', desc: 'Nom en avant, serif, généreux' },
    classique: { label: 'Classique', desc: 'Centré, cartes structurées' },
    minimal:   { label: 'Minimal', desc: 'Épuré, une colonne, beaucoup d\'air' },
    sombre:    { label: 'Sombre', desc: 'Fond sombre, accent vif' },
  };
  const TIERS = {
    essai:    { label: 'Essai',    plan: 'Gratuit',  rank: 0 },
    starter:  { label: 'Starter',  plan: 'Starter',  rank: 1 },
    pro:      { label: 'Pro',      plan: 'Pro',      rank: 2 },
    business: { label: 'Business', plan: 'Business', rank: 3 },
  };
  // plan -> max tier rank unlocked
  const PLAN_RANK = { Gratuit: 0, Starter: 1, Pro: 2, Business: 3 };

  const TEMPLATES = RAW.map(([name, famille, couleur, tier, variant], i) => ({
    id: 'tpl-' + (i + 1),
    name, famille, couleur, tier, variant: variant || 'default',
    family: famille, primary: couleur, // alias compat anciens consommateurs (Portfolio.jsx)
    isDefault: i === 0,
  }));

  function isUnlocked(tpl, plan) {
    return TIERS[tpl.tier].rank <= (PLAN_RANK[plan] ?? 0);
  }
  function unlockedCount(plan) {
    return TEMPLATES.filter(t => isUnlocked(t, plan)).length;
  }

  Object.assign(window, { TEMPLATES, FAMILLES, TIERS, PLAN_RANK, isUnlocked, unlockedCount });
})();
