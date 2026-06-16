// shell.jsx — shared chrome: UserNav, BusinessTopNav, PrototypeLauncher
const Logo = ({ business }) => (
  <div className="flex items-center gap-2.5">
    <span className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white"
      style={{ background: business ? 'linear-gradient(140deg,#2A2D3A,#15161D)' : 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>
      <Icon name="layout" size={17} stroke={2.2} />
    </span>
    <span className="text-[19px] font-bold tracking-tight text-ink">
      {business ? 'Sahel Studio' : 'Portefolia'}
    </span>
  </div>
);

function UserNav({ active, go }) {
  const d = window.DATA;
  const items = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'portfolios', label: 'Mes Portfolios' },
    { key: 'nfc', label: 'Cartes NFC' },
    { key: 'formules', label: 'Formules' },
  ];
  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button onClick={() => go('landing')}><Logo /></button>
          <div className="hidden md:flex items-center gap-1">
            {items.map(it => (
              <button key={it.key} onClick={() => go(it.key)}
                className={`h-9 px-3.5 rounded-[10px] text-sm font-medium transition-colors ${active === it.key ? 'text-white' : 'text-muted hover:text-ink hover:bg-zinc-100'}`}
                style={active === it.key ? { background: 'var(--ink-nav)' } : undefined}>
                {it.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => go('analytics')} title="Analytics"
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors ${active === 'analytics' ? 'text-white' : 'text-muted hover:text-ink hover:bg-zinc-100'}`}
            style={active === 'analytics' ? { background: 'var(--ink-nav)' } : undefined}>
            <Icon name="bar" size={18} />
          </button>
          <button className="w-9 h-9 rounded-[10px] flex items-center justify-center text-muted hover:text-ink hover:bg-zinc-100 transition-colors relative">
            <Icon name="bell" size={18} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }}></span>
          </button>
          <button onClick={() => go('profil')} className="flex items-center gap-2 h-10 pl-1.5 pr-2.5 rounded-full hover:bg-zinc-100 transition-colors">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-600))' }}>
              {d.profile.prenom[0]}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-ink">{d.profile.prenom} {d.profile.nom}</span>
            </span>
            <Icon name="chevron" size={14} className="text-muted hidden sm:block" />
          </button>
        </div>
      </div>
    </nav>
  );
}

function BusinessTopNav({ active, go }) {
  const items = [
    { key: 'business', label: 'Tableau de bord' },
    { key: 'business-portfolios', label: 'Portfolios' },
    { key: 'business-analytics', label: 'Analytics' },
    { key: 'business-members', label: 'Membres' },
  ];
  return (
    <nav className="sticky top-0 z-40 text-white border-b border-white/10"
      style={{ background: 'var(--biz-nav)' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[9px] flex items-center justify-center bg-white/12">
              <Icon name="building" size={16} stroke={2} />
            </span>
            <span className="text-[17px] font-bold tracking-tight">Sahel Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {items.map(it => (
              <button key={it.key} onClick={() => go(it.key)}
                className={`h-9 px-3.5 rounded-[10px] text-sm font-medium transition-colors ${active === it.key ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white hover:bg-white/8'}`}>
                {it.label}
              </button>
            ))}
          </div>
        </div>
        <button className="flex items-center gap-2 h-10 pl-1.5 pr-2.5 rounded-full hover:bg-white/10 transition-colors">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white/15">M</span>
          <Icon name="chevron" size={14} className="text-white/50 hidden sm:block" />
        </button>
      </div>
    </nav>
  );
}

function PrototypeLauncher({ current, go }) {
  const [open, setOpen] = React.useState(false);
  const groups = [
    { label: 'Marketing', items: [['landing', 'Landing'], ['faq', 'FAQ'], ['contact', 'Contact'], ['docs', 'Documentation'], ['apropos', 'À propos'], ['blog', 'Blog'], ['carrieres', 'Carrières']] },
    { label: 'Espace utilisateur', items: [['dashboard', 'Tableau de bord'], ['portfolios', 'Mes Portfolios'], ['nfc', 'Cartes NFC'], ['formules', 'Formules'], ['profil', 'Profil'], ['analytics', 'Analytics']] },
    { label: 'Espace Business', items: [['business', 'Dashboard Business'], ['business-members', 'Membres & invitation'], ['business-join', 'Page d\'invitation']] },
    { label: 'Administration', items: [['admin', 'Dashboard admin'], ['admin-clients', 'Clients'], ['admin-wave', 'Validation Wave'], ['admin-finance', 'Finance'], ['admin-paiements', 'Paiements'], ['admin-team', 'Admins']] },
    { label: 'Public', items: [['portfolio', 'Portfolio public']] },
  ];
  return (
    <div className="fixed bottom-5 left-5 z-[60] print:hidden">
      {open && (
        <div className="absolute bottom-14 left-0 w-64 bg-white rounded-2xl border border-line shadow-[0_12px_40px_rgba(16,24,40,0.16)] p-2 max-h-[70vh] overflow-y-auto">
          {groups.map(g => (
            <div key={g.label} className="mb-1.5 last:mb-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted px-2.5 pt-2 pb-1">{g.label}</p>
              {g.items.map(([key, label]) => (
                <button key={key} onClick={() => { go(key); setOpen(false); }}
                  className={`w-full text-left text-sm px-2.5 py-2 rounded-lg transition-colors flex items-center gap-2 ${current === key ? 'font-semibold' : 'text-ink/80 hover:bg-zinc-50'}`}
                  style={current === key ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : undefined}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: current === key ? 'var(--accent)' : '#D4D4D8' }}></span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-11 px-4 rounded-full text-white text-sm font-semibold shadow-[0_8px_24px_rgba(16,24,40,0.22)] transition-transform hover:-translate-y-0.5"
        style={{ background: 'var(--ink-nav)' }}>
        <Icon name={open ? 'x' : 'layers'} size={16} />
        {open ? 'Fermer' : 'Écrans'}
      </button>
    </div>
  );
}

Object.assign(window, { UserNav, BusinessTopNav, PrototypeLauncher, Logo });
