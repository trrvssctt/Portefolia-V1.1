// Portfolios.jsx — Mes Portfolios (card grid). window.PortfoliosScreen
function PFCard({ p, go, openModal }) {
  const initial = p.title.charAt(0).toUpperCase();
  return (
    <div className="group bg-white rounded-2xl border border-line overflow-hidden flex flex-col hover:shadow-[0_10px_36px_rgba(16,24,40,0.09)] transition-shadow duration-300">
      {/* Banner */}
      <div className="relative h-24"
        style={{ background: p.accent ? 'linear-gradient(135deg, var(--accent-tint), color-mix(in srgb, var(--accent) 30%, #fff))' : 'linear-gradient(135deg,#F4F4F5,#E4E4E7)' }}>
        <div className="absolute top-3 right-3 flex gap-1.5">
          {p.top && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-ink">
              <Icon name="star" size={11} style={{ color: 'var(--accent-600)' }} /> Top
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 ${p.public ? 'text-ink' : 'text-muted'}`}>
            <Icon name={p.public ? 'globe' : 'lock'} size={11} /> {p.public ? 'Public' : 'Privé'}
          </span>
        </div>
        <div className="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-[3px] border-white flex items-center justify-center text-white text-xl font-bold shadow-sm"
          style={{ background: p.accent ? 'linear-gradient(140deg, var(--accent), var(--accent-600))' : 'linear-gradient(140deg,#52525B,#27272A)' }}>
          {initial}
        </div>
      </div>
      {/* Body */}
      <div className="px-5 pt-9 pb-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-ink text-[15px] leading-tight line-clamp-1">{p.title}</h3>
        <p className="text-xs font-mono text-muted/80 mt-0.5">/{p.slug}</p>
        <p className="text-sm text-ink/60 mt-2 line-clamp-2 leading-relaxed flex-1">{p.bio}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><Icon name="eye" size={13} /> <strong className="text-ink/80 font-semibold">{p.views.toLocaleString('fr-FR')}</strong> vues</span>
          <span className="flex items-center gap-1.5"><Icon name="clock" size={13} /> {p.date}</span>
        </div>
      </div>
      {/* Actions */}
      <div className="border-t border-line px-3 py-2.5 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-0.5">
          <button onClick={() => openModal('share', { portfolio: p })} title="Partager" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-white transition-colors"><Icon name="share" size={15} /></button>
          <button onClick={() => go('portfolio')} title="Voir en ligne" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-white transition-colors"><Icon name="external" size={15} /></button>
          <button onClick={() => go('analytics')} title="Statistiques" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-white transition-colors"><Icon name="bar" size={15} /></button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => openModal('edit', { portfolio: p })} title="Modifier" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-white transition-colors"><Icon name="edit" size={15} /></button>
          <button onClick={() => openModal('confirm', { title: 'Supprimer ce portfolio ?', message: `« ${p.title} » sera définitivement supprimé, ainsi que ses statistiques et cartes NFC associées.`, confirmLabel: 'Supprimer', icon: 'trash', tone: 'danger' })} title="Supprimer" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-600 hover:bg-white transition-colors"><Icon name="trash" size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function PFStat({ icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-4 flex items-center gap-3.5">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-ink/60"><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-ink leading-none tabular-nums">{value}</p>
        <p className="text-xs text-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function PortfoliosScreen({ go, openModal }) {
  const d = window.DATA;
  const list = d.portfoliosGrid;
  const total = list.length, pub = list.filter(p => p.public).length;
  const views = list.reduce((s, p) => s + p.views, 0);
  const contacts = list.reduce((s, p) => s + p.contacts, 0);
  const limit = 20, pct = Math.min(total / limit * 100, 100);

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="portfolios" go={go} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-bold text-ink tracking-tight">Mes portfolios</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line text-xs font-semibold text-ink bg-white">
                <Icon name="sparkles" size={12} style={{ color: 'var(--accent-600)' }} /> Pro
              </span>
            </div>
            <p className="text-muted text-sm mt-1">Créez, gérez et partagez vos portfolios professionnels.</p>
          </div>
          <button onClick={() => openModal('create')} className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0 transition-colors" style={{ background: 'var(--accent)' }}>
            <Icon name="plus" size={16} /> Nouveau portfolio
          </button>
        </div>

        {/* Usage bar */}
        <div className="bg-white rounded-2xl border border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-ink/80">{total} / {limit} portfolios utilisés</span>
              <span className="text-muted text-xs">{limit - total} restants</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent)' }}></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PFStat icon="folder" label="Portfolios" value={total} />
          <PFStat icon="globe" label="Publics" value={pub} />
          <PFStat icon="trending" label="Vues totales" value={views.toLocaleString('fr-FR')} />
          <PFStat icon="userplus" label="Contacts collectés" value={contacts} />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-line p-2.5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input placeholder="Rechercher par titre, slug ou description…" className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-zinc-50 border border-transparent focus:border-line outline-none text-sm text-ink placeholder:text-muted" />
          </div>
          <button className="h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">Visibilité <Icon name="chevron" size={14} /></button>
          <button className="h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors hidden sm:flex items-center gap-1.5">Plus récent <Icon name="chevron" size={14} /></button>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map(p => <PFCard key={p.id} p={p} go={go} openModal={openModal} />)}
          {/* Add card */}
          <button onClick={() => openModal('create')} className="group rounded-2xl border-2 border-dashed border-line hover:border-[color:var(--accent)] flex flex-col items-center justify-center gap-3 py-12 px-6 text-center transition-colors min-h-[260px]">
            <span className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-[color:var(--accent-tint)] flex items-center justify-center transition-colors">
              <Icon name="plus" size={22} className="text-muted group-hover:text-[color:var(--accent-600)]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink/70">Nouveau portfolio</p>
              <p className="text-xs text-muted mt-0.5">{limit - total} emplacements disponibles</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
window.PortfoliosScreen = PortfoliosScreen;
