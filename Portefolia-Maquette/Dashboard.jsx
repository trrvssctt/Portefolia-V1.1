// Dashboard.jsx — modernized user dashboard. window.DashboardScreen
function Stat({ label, value, sub, icon, primary }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${primary ? '' : 'bg-zinc-100 text-ink/60'}`}
          style={primary ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : undefined}>
          <Icon name={icon} size={17} />
        </span>
      </div>
      <p className="text-[28px] leading-none font-semibold text-ink tracking-tight tabular-nums">{value}</p>
      <p className="text-sm font-medium text-ink/80 mt-2">{label}</p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function PlanUsage({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted"><strong className="text-ink font-semibold">{used}</strong> / {limit} portfolios</span>
        <span className="text-muted">{limit - used} restants</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: 'var(--accent)' }}></div>
      </div>
    </div>
  );
}

function PortfolioRow({ p, onView, onEdit }) {
  return (
    <div className="group bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-ink/15 transition-colors">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
        style={{ background: p.accent ? 'linear-gradient(140deg, var(--accent), var(--accent-600))' : 'linear-gradient(140deg, #3F3F46, #18181B)' }}>
        {p.title.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-ink text-[15px] truncate">{p.title}</h3>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${p.public ? '' : 'bg-zinc-100 text-muted'}`}
            style={p.public ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : undefined}>
            <Icon name={p.public ? 'globe' : 'lock'} size={11} /> {p.public ? 'Public' : 'Privé'}
          </span>
        </div>
        <p className="text-sm text-muted truncate">{p.desc}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
          <span className="font-mono text-ink/50">/{p.slug}</span>
          <span>· {p.date}</span>
          {p.views > 0 && <span className="flex items-center gap-1"><Icon name="trending" size={12} /> {p.views.toLocaleString('fr-FR')} vues</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onView} className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors">
          <Icon name="eye" size={15} /> <span className="hidden sm:inline">Voir</span>
        </button>
        <button onClick={onEdit} className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors">
          <Icon name="edit" size={15} /> <span className="hidden sm:inline">Éditer</span>
        </button>
      </div>
    </div>
  );
}

function DashboardScreen({ go, openModal }) {
  const d = window.DATA;
  const onOpenPortfolio = () => go('portfolio');
  const quick = [
    { label: 'Nouveau portfolio', icon: 'plus', primary: true, action: () => openModal('create') },
    { label: 'Cartes NFC', icon: 'wifi', to: 'nfc' },
    { label: 'Mon profil', icon: 'user', to: 'profil' },
    { label: 'Analytics', icon: 'bar', to: 'analytics' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="dashboard" go={go} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-8">

        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-ink tracking-tight">Bonjour, {d.profile.prenom}</h1>
            <p className="text-muted text-sm mt-1">Voici l'état de vos portfolios aujourd'hui.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full border border-line text-sm font-semibold text-ink bg-white">
            <Icon name="sparkles" size={14} style={{ color: 'var(--accent-600)' }} /> Formule {d.plan.label}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Portfolios" value={d.kpis.portfolios} sub={`sur ${d.plan.limit} maximum`} icon="folder" primary />
          <Stat label="Vues totales" value={d.kpis.vues.toLocaleString('fr-FR')} sub="sur tous vos portfolios" icon="trending" />
          <Stat label="Portfolios publics" value={d.kpis.publics} sub="visibles en ligne" icon="globe" />
          <Stat label="Activités" value={d.kpis.activites} sub="ce mois-ci" icon="clock" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Portfolios column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Mes portfolios</h2>
                <div className="mt-2.5 w-64 max-w-full"><PlanUsage used={d.kpis.portfolios} limit={d.plan.limit} /></div>
              </div>
              <button onClick={() => openModal('create')} className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0 transition-colors"
                style={{ background: 'var(--accent)' }}>
                <Icon name="plus" size={16} /> <span className="hidden sm:inline">Nouveau</span>
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2.5 bg-white border border-line rounded-2xl p-2.5">
              <div className="relative flex-1">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input placeholder="Rechercher un portfolio…" className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-zinc-50 border border-transparent focus:border-line outline-none text-sm text-ink placeholder:text-muted" />
              </div>
              <button className="h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">
                Visibilité <Icon name="chevron" size={14} />
              </button>
              <button className="h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors hidden sm:flex items-center gap-1.5">
                Plus récent <Icon name="chevron" size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {d.portfolios.map(p => (
                <PortfolioRow key={p.id} p={p} onView={onOpenPortfolio} onEdit={() => openModal('edit', { portfolio: p })} />
              ))}
              <button onClick={() => go('portfolios')} className="w-full text-center text-sm font-medium py-2 hover:underline flex items-center justify-center gap-1.5" style={{ color: 'var(--accent-600)' }}>
                Voir tous mes portfolios <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-line p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">Actions rapides</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {quick.map(q => (
                  <button key={q.label} onClick={() => q.action ? q.action() : go(q.to)} className={`flex items-center gap-2.5 h-12 px-3 rounded-xl text-sm font-medium transition-colors text-left ${q.primary ? 'text-white' : 'border border-line text-ink hover:bg-zinc-50'}`}
                    style={q.primary ? { background: 'var(--ink-nav)' } : undefined}>
                    <Icon name={q.icon} size={16} className={q.primary ? '' : 'text-muted'} /> <span className="leading-tight">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current plan */}
            <div className="bg-white rounded-2xl border border-line p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">Formule actuelle</h3>
              <div className="flex items-center justify-between rounded-xl p-3.5 mb-3.5"
                style={{ background: 'var(--accent-tint)' }}>
                <div>
                  <p className="text-sm font-bold text-ink">{d.plan.name}</p>
                  <p className="text-xs text-ink/60 mt-0.5">{d.plan.price} / mois</p>
                </div>
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--accent)' }}><Icon name="sparkles" size={17} /></span>
              </div>
              <PlanUsage used={d.kpis.portfolios} limit={d.plan.limit} />
              <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-line text-xs">
                <span className="flex items-center gap-1.5 text-muted"><Icon name="clock" size={14} /> Renouvellement {d.plan.renew}</span>
                <button className="font-semibold hover:underline" style={{ color: 'var(--accent-600)' }}>Gérer</button>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-2xl border border-line p-5">
              <h3 className="text-sm font-semibold text-ink mb-3.5">Activité récente</h3>
              <div className="relative space-y-1">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-line"></div>
                {d.activity.map((a, i) => (
                  <div key={i} className="relative flex items-start gap-3 py-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-zinc-100 text-ink/55">
                      <Icon name={a.icon} size={15} />
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] font-semibold text-ink leading-tight">{a.title}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{a.desc}</p>
                      <p className="text-[11px] text-muted/70 mt-0.5">{a.when}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.DashboardScreen = DashboardScreen;
