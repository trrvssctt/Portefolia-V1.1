// Source de vérité : 46 templates — 4 familles × 3 variants de layout × tiers cumulatifs
// Synchronisé avec Portefolia_Maquette/tpl-catalog.js

export type TemplateTier    = 'free' | 'starter' | 'pro' | 'business';
export type TemplateFamily  = 'editorial' | 'classique' | 'minimal' | 'sombre';
export type TemplateVariant =
  | 'classic' | 'cover'   | 'split'    // editorial
  | 'centered'| 'sidebar' | 'band'     // classique
  | 'list'    | 'center'  | 'index'    // minimal
  | 'panel'   | 'hero'    | 'mono';    // sombre

export interface PortfolioTemplate {
  id:        string;           // 'tpl-1' … 'tpl-46'
  name:      string;           // 'Clarté', 'Larsson', …
  family:    TemplateFamily;
  variant:   TemplateVariant;
  primary:   string;           // couleur hex de l'accent
  tier:      TemplateTier;
  isDefault: boolean;
}

// [name, family, couleur, tier, variant]
type RawEntry = [string, TemplateFamily, string, TemplateTier, TemplateVariant];

const E: TemplateFamily = 'editorial';
const C: TemplateFamily = 'classique';
const M: TemplateFamily = 'minimal';
const S: TemplateFamily = 'sombre';

const RAW: RawEntry[] = [
  // ── ESSAI / FREE (1) ──────────────────────────────────────────────────────
  ['Clarté',       E, '#2E7D32', 'free',     'classic' ],

  // ── STARTER (+5 = 6) ─────────────────────────────────────────────────────
  ['Atlas',        C, '#1565C0', 'starter',  'centered'],
  ['Miel',         M, '#D97706', 'starter',  'list'    ],
  ['Horizon',      M, '#0E7490', 'starter',  'center'  ],
  ['Nuit',         S, '#22C55E', 'starter',  'hero'    ],
  ['Baobab',       C, '#B45309', 'starter',  'sidebar' ],

  // ── PRO (+15 = 21) ───────────────────────────────────────────────────────
  ['Larsson',      E, '#1A1A2E', 'pro',      'split'   ],
  ['Obsidian',     S, '#6366F1', 'pro',      'panel'   ],
  ['Papier',       E, '#9A3412', 'pro',      'cover'   ],
  ['Organic',      M, '#15803D', 'pro',      'index'   ],
  ['Studio',       C, '#7C3AED', 'pro',      'band'    ],
  ['Gradient',     M, '#DB2777', 'pro',      'center'  ],
  ['Savane',       C, '#CA8A04', 'pro',      'sidebar' ],
  ['Blueprint',    S, '#38BDF8', 'pro',      'mono'    ],
  ['Kodak',        E, '#DC2626', 'pro',      'cover'   ],
  ['Terminal',     S, '#22C55E', 'pro',      'mono'    ],
  ['Luxe Rose',    C, '#BE185D', 'pro',      'centered'],
  ['Aqua',         M, '#0891B2', 'pro',      'list'    ],
  ['Béton',        M, '#52525B', 'pro',      'index'   ],
  ['Consulting',   E, '#1D4ED8', 'pro',      'split'   ],
  ['Atelier',      E, '#2E7D32', 'pro',      'classic' ],

  // ── BUSINESS (+25 = 46) ──────────────────────────────────────────────────
  ['Onyx',         S, '#A855F7', 'business', 'hero'    ],
  ['Marbre',       C, '#334155', 'business', 'band'    ],
  ['Éclat',        M, '#E11D48', 'business', 'center'  ],
  ['Carbone',      S, '#F59E0B', 'business', 'panel'   ],
  ['Linen',        E, '#7C2D12', 'business', 'split'   ],
  ['Prisme',       M, '#8B5CF6', 'business', 'index'   ],
  ['Ivoire',       C, '#A16207', 'business', 'sidebar' ],
  ['Aurore',       M, '#F97316', 'business', 'center'  ],
  ['Cobalt',       S, '#3B82F6', 'business', 'hero'    ],
  ['Manuscrit',    E, '#155E63', 'business', 'classic' ],
  ['Velours',      C, '#9D174D', 'business', 'centered'],
  ['Néon',         S, '#10B981', 'business', 'mono'    ],
  ['Sépia',        E, '#92400E', 'business', 'cover'   ],
  ['Cristal',      M, '#06B6D4', 'business', 'list'    ],
  ['Émeraude',     C, '#047857', 'business', 'band'    ],
  ['Graphite',     S, '#E5E7EB', 'business', 'panel'   ],
  ['Pastel',       M, '#F472B6', 'business', 'center'  ],
  ['Editorial+',   E, '#0F172A', 'business', 'split'   ],
  ['Galerie',      C, '#6D28D9', 'business', 'band'    ],
  ['Mono',         M, '#171717', 'business', 'index'   ],
  ['Indigo',       S, '#818CF8', 'business', 'hero'    ],
  ['Botanic',      C, '#16A34A', 'business', 'sidebar' ],
  ['Riviera',      M, '#0284C7', 'business', 'list'    ],
  ['Noir Absolu',  S, '#FACC15', 'business', 'mono'    ],
  ['Flagship',     E, '#2E7D32', 'business', 'cover'   ],
];

export const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = RAW.map(
  ([name, family, primary, tier, variant], i) => ({
    id:        `tpl-${i + 1}`,
    name,
    family,
    variant,
    primary,
    tier,
    isDefault: i === 0,
  })
);

// ── Gating par formule ────────────────────────────────────────────────────────

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

// Mapping de rétro-compatibilité : anciens IDs 't1'→'t25' → nouveaux IDs 'tpl-1'→'tpl-25'
const LEGACY_ID_MAP: Record<string, string> = Object.fromEntries(
  Array.from({ length: 25 }, (_, i) => [`t${i + 1}`, `tpl-${i + 1}`])
);

export const templateById = (id: string): PortfolioTemplate => {
  const resolved = LEGACY_ID_MAP[id] ?? id;
  return PORTFOLIO_TEMPLATES.find(t => t.id === resolved) ?? PORTFOLIO_TEMPLATES[0];
};
