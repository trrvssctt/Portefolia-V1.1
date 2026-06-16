export type TemplateTier   = 'free' | 'starter' | 'pro' | 'business';
export type TemplateFamily = 'editorial' | 'classique' | 'minimal' | 'sombre';

export interface PortfolioTemplate {
  id: string;
  name: string;
  family: TemplateFamily;
  paletteName: string;
  primary: string;
  tier: TemplateTier;
  isDefault: boolean;
}

const P: Record<string, string> = {
  Émeraude: '#1F9D5B', Indigo: '#4F46E5', Océan: '#0E7490', Violet: '#7C3AED',
  Ambre: '#C2410C', Rose: '#E11D48', Ardoise: '#475569', Or: '#B45309',
};

const FAMILY_LABELS: Record<TemplateFamily, string> = {
  editorial: 'Éditorial',
  classique: 'Classique',
  minimal:   'Minimal',
  sombre:    'Sombre',
};

const ORDER: [TemplateFamily, string][] = [
  ['editorial', 'Émeraude'],   // 0  free (default)
  ['classique', 'Émeraude'],   // 1  starter
  ['minimal',   'Ardoise'],    // 2
  ['sombre',    'Émeraude'],   // 3
  ['editorial', 'Indigo'],     // 4
  ['classique', 'Indigo'],     // 5  pro
  ['minimal',   'Indigo'],     // 6
  ['editorial', 'Océan'],      // 7
  ['sombre',    'Violet'],     // 8
  ['classique', 'Ambre'],      // 9
  ['minimal',   'Émeraude'],   // 10
  ['editorial', 'Violet'],     // 11
  ['sombre',    'Océan'],      // 12
  ['classique', 'Océan'],      // 13
  ['minimal',   'Ambre'],      // 14
  ['editorial', 'Ambre'],      // 15 business
  ['sombre',    'Ambre'],      // 16
  ['classique', 'Violet'],     // 17
  ['minimal',   'Violet'],     // 18
  ['editorial', 'Rose'],       // 19
  ['sombre',    'Rose'],       // 20
  ['classique', 'Rose'],       // 21
  ['minimal',   'Océan'],      // 22
  ['editorial', 'Or'],         // 23
  ['sombre',    'Or'],         // 24
];

const tierOf = (i: number): TemplateTier =>
  i === 0 ? 'free' : i < 5 ? 'starter' : i < 15 ? 'pro' : 'business';

export const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = ORDER.map(([family, pal], i) => ({
  id: `t${i + 1}`,
  name: i === 0 ? 'Essentiel' : `${FAMILY_LABELS[family]} · ${pal}`,
  family,
  paletteName: pal,
  primary: P[pal],
  tier: tierOf(i),
  isDefault: i === 0,
}));

export const PLAN_TIERS: Record<string, TemplateTier[]> = {
  free:     ['free'],
  starter:  ['free', 'starter'],
  pro:      ['free', 'starter', 'pro'],
  business: ['free', 'starter', 'pro', 'business'],
};

export const TIER_META: Record<TemplateTier, { label: string; plan: string }> = {
  free:     { label: 'Gratuit',  plan: 'Gratuit'  },
  starter:  { label: 'Starter',  plan: 'Starter'  },
  pro:      { label: 'Pro',      plan: 'Pro'       },
  business: { label: 'Business', plan: 'Business' },
};

export const isTemplateUnlocked = (tpl: PortfolioTemplate, planType: string): boolean =>
  (PLAN_TIERS[planType] ?? PLAN_TIERS.free).includes(tpl.tier);

export const templateById = (id: string): PortfolioTemplate =>
  PORTFOLIO_TEMPLATES.find(t => t.id === id) ?? PORTFOLIO_TEMPLATES[0];
