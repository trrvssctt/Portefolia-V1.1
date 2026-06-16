// MarketingShell.jsx — shared public chrome. window.MarketingNav, MarketingFooter, PageHero
function MarketingNav({ go, active }) {
  const links = [
    { label: 'Fonctionnalités', key: 'landing' },
    { label: 'Tarifs', key: 'formules' },
    { label: 'Documentation', key: 'docs' },
    { label: 'À propos', key: 'apropos' },
    { label: 'Contact', key: 'contact' },
  ];
  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <button onClick={() => go('landing')}><Logo /></button>
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <button key={l.key} onClick={() => go(l.key)}
              className={`h-9 px-3 rounded-[10px] text-sm font-medium transition-colors ${active === l.key ? 'text-ink bg-zinc-100' : 'text-muted hover:text-ink hover:bg-zinc-50'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => go('dashboard')} className="hidden sm:block text-sm font-medium text-muted hover:text-ink px-3 h-9 transition-colors">Connexion</button>
          <button onClick={() => go('dashboard')} className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white transition-colors" style={{ background: 'var(--accent)' }}>Commencer</button>
        </div>
      </div>
    </nav>
  );
}

function MarketingFooter({ go }) {
  const cols = [
    { h: 'Produit', links: [['Fonctionnalités', 'landing'], ['Tarifs', 'formules'], ['Cartes NFC', 'nfc']] },
    { h: 'Support', links: [['FAQ', 'faq'], ['Contact', 'contact'], ['Documentation', 'docs']] },
    { h: 'Entreprise', links: [['À propos', 'apropos'], ['Blog', 'blog'], ['Carrières', 'carrieres']] },
  ];
  return (
    <footer className="border-t border-line bg-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 grid sm:grid-cols-4 gap-8">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-muted max-w-[200px]">La nouvelle génération de cartes de visite professionnelles.</p>
          <div className="flex gap-2 mt-4">
            {['linkedin', 'twitter', 'instagram'].map(s => (
              <a key={s} className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink hover:border-ink/30 transition-colors cursor-pointer"><Icon name={s} size={16} /></a>
            ))}
          </div>
        </div>
        {cols.map(col => (
          <div key={col.h}>
            <h4 className="text-sm font-semibold text-ink mb-3">{col.h}</h4>
            <ul className="space-y-2">
              {col.links.map(([l, k]) => <li key={l}><button onClick={() => go(k)} className="text-sm text-muted hover:text-ink transition-colors text-left">{l}</button></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between text-xs text-muted">
          <span>© 2026 Portefolia. Tous droits réservés.</span>
          <span>Dakar, Sénégal</span>
        </div>
      </div>
    </footer>
  );
}

// Editorial page header with breadcrumb + green tint
function PageHero({ go, crumb, title, subtitle, eyebrow, children }) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 60% at 50% -20%, var(--accent-tint), transparent 70%)' }}></div>
      <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12 text-center">
        <button onClick={() => go('landing')} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors mb-5">
          <Icon name="arrow" size={13} className="rotate-180" /> Accueil <span className="text-zinc-300">/</span> <span className="text-ink">{crumb}</span>
        </button>
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--accent-600)' }}>{eyebrow}</p>}
        <h1 className="font-serif text-ink leading-[1.0] tracking-tight mx-auto" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>{title}</h1>
        {subtitle && <p className="mt-4 text-lg text-ink/65 max-w-xl mx-auto leading-relaxed" style={{ textWrap: 'pretty' }}>{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}

function MarketingPage({ go, active, children }) {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav go={go} active={active} />
      {children}
      <MarketingFooter go={go} />
    </div>
  );
}

Object.assign(window, { MarketingNav, MarketingFooter, PageHero, MarketingPage });
