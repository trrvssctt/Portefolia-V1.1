// NFC.jsx — Cartes NFC. window.NFCScreen
const NFC_STATUS = {
  active: { label: 'Active', tint: 'var(--accent-tint)', color: 'var(--accent-600)', dot: 'var(--accent)' },
  pending: { label: 'En attente', tint: '#FEF3E2', color: '#B45309', dot: '#F59E0B' },
  inactive: { label: 'Inactive', tint: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

function NFCCardItem({ c, go, openModal }) {
  const s = NFC_STATUS[c.status] || NFC_STATUS.inactive;
  const isActive = c.status === 'active';
  return (
    <div className="bg-white rounded-2xl border border-line overflow-hidden flex flex-col hover:shadow-[0_10px_36px_rgba(16,24,40,0.08)] transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Mini NFC card */}
          <div className="relative w-16 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: isActive ? 'linear-gradient(140deg, var(--accent), var(--accent-600))' : c.status === 'pending' ? 'linear-gradient(140deg,#F59E0B,#D97706)' : 'linear-gradient(140deg,#A1A1AA,#71717A)' }}>
            <Icon name="wifi" size={14} className="text-white/90 rotate-90" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/40"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-ink text-sm leading-tight line-clamp-1">{c.portfolio}</h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                style={{ background: s.tint, color: s.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }}></span>{s.label}
              </span>
            </div>
            <p className="text-xs font-mono text-muted/80 mt-1">UID : {c.uid}</p>
            <div className="flex flex-wrap gap-x-3 mt-2 text-xs text-muted">
              <span>Commandée le {c.ordered}</span>
              {c.activated && <span>· Activée le {c.activated}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line">
          <button onClick={() => go('portfolio')} className="flex-1 h-9 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5">
            <Icon name="eye" size={14} /> Voir portfolio
          </button>
          {isActive ? (
            <button className="flex-1 h-9 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5">
              <Icon name="pause" size={13} /> Désactiver
            </button>
          ) : (
            <button onClick={() => openModal('order-nfc')} className="flex-1 h-9 rounded-[10px] text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5" style={{ background: 'var(--accent)' }}>
              <Icon name="zap" size={14} /> Activer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NFCStat({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-4 flex items-center gap-3.5">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-ink/60"><Icon name={icon} size={18} /></span>
      <div><p className="text-xl font-semibold text-ink leading-none tabular-nums">{value}</p><p className="text-xs text-muted mt-1">{label}</p></div>
    </div>
  );
}

function NFCScreen({ go, openModal }) {
  const d = window.DATA.nfc;
  const cards = d.cards;
  const active = cards.filter(c => c.status === 'active').length;
  const pending = cards.filter(c => c.status === 'pending').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="nfc" go={go} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="wifi" size={20} style={{ color: 'var(--accent-600)' }} />
              <h1 className="text-2xl sm:text-[28px] font-bold text-ink tracking-tight">Mes cartes NFC</h1>
            </div>
            <p className="text-muted text-sm mt-1">Partagez votre portfolio d'un simple geste.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-10 px-4 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors">Types de cartes</button>
            <button onClick={() => openModal('order-nfc')} className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white transition-colors" style={{ background: 'var(--accent)' }}>
              <Icon name="plus" size={16} /> Commander
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NFCStat icon="card" label="Total cartes" value={cards.length} />
          <NFCStat icon="checkcircle" label="Actives" value={active} />
          <NFCStat icon="clock" label="En attente" value={pending} />
          <NFCStat icon="dollar" label="Prix unitaire" value={d.price.replace(' F CFA', ' F')} />
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl border border-line p-2.5 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input placeholder="Rechercher par portfolio…" className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-zinc-50 border border-transparent focus:border-line outline-none text-sm text-ink placeholder:text-muted" />
          </div>
          <button className="h-9 px-3 rounded-[10px] border border-line text-sm font-medium text-ink/70 hover:bg-zinc-50 transition-colors flex items-center gap-1.5">Tous statuts <Icon name="chevron" size={14} /></button>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map(c => <NFCCardItem key={c.id} c={c} go={go} openModal={openModal} />)}
        </div>

        {/* Promo strip */}
        <div className="rounded-2xl border border-line bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
            <Icon name="scan" size={22} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Besoin de cartes pour votre équipe ?</p>
            <p className="text-sm text-muted mt-0.5">Commandez en lot et profitez de tarifs dégressifs dès 10 cartes.</p>
          </div>
          <button onClick={() => go('formules')} className="h-10 px-4 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors shrink-0">Découvrir l'offre Business</button>
        </div>
      </div>
    </div>
  );
}
window.NFCScreen = NFCScreen;
