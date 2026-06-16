// templates.js — portfolio template catalog + plan gating
(function () {
  const FAMILIES = {
    editorial: { label: 'Éditorial', desc: 'Nom en serif, timeline & sidebar' },
    classique: { label: 'Classique', desc: 'Centré, sections en cartes' },
    minimal:   { label: 'Minimal', desc: 'Épuré, une colonne, beaucoup d\'air' },
    sombre:    { label: 'Sombre', desc: 'Fond sombre, accent vif' },
  };
  const P = {
    Émeraude: '#1F9D5B', Indigo: '#4F46E5', Océan: '#0E7490', Violet: '#7C3AED',
    Ambre: '#C2410C', Rose: '#E11D48', Ardoise: '#475569', Or: '#B45309',
  };
  // ordered combos — index drives tier
  const ORDER = [
    ['editorial', 'Émeraude'],   // 0 free (default)
    ['classique', 'Émeraude'],   // 1 starter
    ['minimal', 'Ardoise'],      // 2
    ['sombre', 'Émeraude'],      // 3
    ['editorial', 'Indigo'],     // 4
    ['classique', 'Indigo'],     // 5 pro
    ['minimal', 'Indigo'],       // 6
    ['editorial', 'Océan'],      // 7
    ['sombre', 'Violet'],        // 8
    ['classique', 'Ambre'],      // 9
    ['minimal', 'Émeraude'],     // 10
    ['editorial', 'Violet'],     // 11
    ['sombre', 'Océan'],         // 12
    ['classique', 'Océan'],      // 13
    ['minimal', 'Ambre'],        // 14
    ['editorial', 'Ambre'],      // 15 business
    ['sombre', 'Ambre'],         // 16
    ['classique', 'Violet'],     // 17
    ['minimal', 'Violet'],       // 18
    ['editorial', 'Rose'],       // 19
    ['sombre', 'Rose'],          // 20
    ['classique', 'Rose'],       // 21
    ['minimal', 'Océan'],        // 22
    ['editorial', 'Or'],         // 23
    ['sombre', 'Or'],            // 24
  ];
  const tierOf = (i) => i === 0 ? 'free' : i < 5 ? 'starter' : i < 15 ? 'pro' : 'business';
  const TIER_META = {
    free:     { label: 'Gratuit',  plan: 'Gratuit' },
    starter:  { label: 'Starter',  plan: 'Starter' },
    pro:      { label: 'Pro',      plan: 'Pro' },
    business: { label: 'Business', plan: 'Business' },
  };
  const TEMPLATES = ORDER.map(([family, pal], i) => ({
    id: 't' + (i + 1),
    name: i === 0 ? 'Essentiel' : `${FAMILIES[family].label} · ${pal}`,
    family, paletteName: pal, primary: P[pal], tier: tierOf(i),
    isDefault: i === 0,
  }));

  const PLAN_TIERS = {
    Gratuit:  ['free'],
    Starter:  ['free', 'starter'],
    Pro:      ['free', 'starter', 'pro'],
    Business: ['free', 'starter', 'pro', 'business'],
  };
  const PLAN_LIMITS = { Gratuit: 1, Starter: 5, Pro: 15, Business: 25 };

  function paletteVars(primary) {
    return {
      '--accent': primary,
      '--accent-600': `color-mix(in srgb, ${primary} 78%, #000)`,
      '--accent-tint': `color-mix(in srgb, ${primary} 9%, #fff)`,
    };
  }
  function isUnlocked(tpl, plan) { return PLAN_TIERS[plan].includes(tpl.tier); }

  Object.assign(window, { FAMILIES, TEMPLATES, PLAN_TIERS, PLAN_LIMITS, TIER_META, paletteVars, isUnlocked });
})();
