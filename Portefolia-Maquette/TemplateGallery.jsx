// TemplateGallery.jsx — template thumbnail + creation modal.
// window.TemplateThumb, window.CreatePortfolioModal
function TemplateThumb({ tpl, selected, locked, onClick }) {
  const dark = tpl.family === 'sombre';
  const vars = { '--tp': tpl.primary };
  const bar = (w, c) => <div style={{ width: w, height: 4, borderRadius: 2, background: c }}></div>;
  const soft = dark ? 'rgba(255,255,255,0.16)' : '#E4E4E7';
  const soft2 = dark ? 'rgba(255,255,255,0.10)' : '#F4F4F5';

  let inner = null;
  if (tpl.family === 'editorial') {
    inner = (
      <div className="p-2.5 h-full flex flex-col gap-2" style={{ background: '#fff' }}>
        <div style={{ width: '62%', height: 9, borderRadius: 2, background: '#18181B' }}></div>
        {bar('38%', 'var(--tp)')}
        <div className="flex gap-2 flex-1 mt-1">
          <div className="w-1/3 flex flex-col gap-1.5">{bar('100%', soft)}{bar('80%', soft)}{bar('90%', soft)}</div>
          <div className="flex-1 flex flex-col gap-1.5"><div className="flex-1 rounded" style={{ background: soft2 }}></div>{bar('70%', soft)}</div>
        </div>
      </div>
    );
  } else if (tpl.family === 'classique') {
    inner = (
      <div className="p-2.5 h-full flex flex-col items-center gap-1.5" style={{ background: '#fff' }}>
        <div className="w-7 h-7 rounded-full" style={{ background: 'var(--tp)' }}></div>
        {bar('46%', '#18181B')}{bar('30%', 'var(--tp)')}
        <div className="flex gap-1.5 w-full mt-1.5 flex-1">
          <div className="flex-1 rounded" style={{ background: soft2 }}></div>
          <div className="flex-1 rounded" style={{ background: soft2 }}></div>
        </div>
      </div>
    );
  } else if (tpl.family === 'minimal') {
    inner = (
      <div className="p-3 h-full flex flex-col gap-2.5" style={{ background: '#fff' }}>
        <div style={{ width: '50%', height: 8, borderRadius: 2, background: '#18181B' }}></div>
        <div className="flex items-center gap-1.5">{bar('24%', soft)}<span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--tp)' }}></span></div>
        <div className="mt-auto flex flex-col gap-2">{bar('80%', soft)}{bar('60%', soft)}</div>
      </div>
    );
  } else {
    inner = (
      <div className="p-2.5 h-full flex flex-col gap-2" style={{ background: '#0E0F13' }}>
        <div style={{ width: '60%', height: 9, borderRadius: 2, background: '#fff' }}></div>
        {bar('38%', 'var(--tp)')}
        <div className="flex gap-2 flex-1 mt-1">
          <div className="w-1/3 flex flex-col gap-1.5">{bar('100%', soft)}{bar('80%', soft)}</div>
          <div className="flex-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}></div>
        </div>
      </div>
    );
  }

  const tierMeta = window.TIER_META[tpl.tier];
  return (
    <button onClick={onClick} className="group relative text-left">
      <div className="relative rounded-xl overflow-hidden border transition-all"
        style={{ ...vars, height: 104, borderColor: selected ? tpl.primary : '#E4E4E7', boxShadow: selected ? `0 0 0 2px ${tpl.primary}` : 'none', filter: locked ? 'grayscale(0.7)' : 'none', opacity: locked ? 0.7 : 1 }}>
        {inner}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.45)' }}>
            <span className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-ink/70"><Icon name="lock" size={14} /></span>
          </div>
        )}
        {selected && !locked && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: tpl.primary }}><Icon name="check" size={12} stroke={3} /></span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span className="text-xs font-medium text-ink truncate">{tpl.name}</span>
        {locked
          ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-muted bg-zinc-100 shrink-0">{tierMeta.label}</span>
          : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tpl.primary }}></span>}
      </div>
    </button>
  );
}

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mon-portfolio';
}

function CreatePortfolioModal({ plan, onClose, onCreate, go, editPortfolio }) {
  const T = window.TEMPLATES;
  const isEdit = !!editPortfolio;
  const [title, setTitle] = React.useState(editPortfolio ? editPortfolio.title : 'Mon nouveau portfolio');
  const [selectedId, setSelectedId] = React.useState(editPortfolio && editPortfolio.templateId ? editPortfolio.templateId : 't1');
  const [hint, setHint] = React.useState(null);
  const unlockedCount = T.filter(t => window.isUnlocked(t, plan)).length;
  const limit = window.PLAN_LIMITS[plan];
  const selected = T.find(t => t.id === selectedId) || T[0];

  const pick = (t) => {
    if (window.isUnlocked(t, plan)) { setSelectedId(t.id); setHint(null); }
    else { setHint(t); }
  };

  return (
    <ModalShell
      icon={isEdit ? 'edit' : 'plus'}
      title={isEdit ? 'Modifier le portfolio' : 'Créer un portfolio'}
      subtitle={isEdit ? 'Mettez à jour le nom et le template.' : 'Choisissez un nom et un template.'}
      size="lg" onClose={onClose}
      footer={<React.Fragment>
        <div className="flex items-center gap-2.5 min-w-0 mr-auto">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selected.primary }}></span>
          <span className="text-sm text-muted truncate hidden sm:block">Template : <span className="font-semibold text-ink">{selected.name}</span></span>
        </div>
        <button onClick={onClose} className="h-10 px-4 rounded-[10px] border border-line text-sm font-medium text-ink hover:bg-zinc-50 transition-colors">Annuler</button>
        <button onClick={() => onCreate ? onCreate(selected, title) : (onClose(), go('portfolio'))} className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white transition-colors flex items-center gap-1.5" style={{ background: 'var(--accent)' }}>
          <Icon name="check" size={16} /> {isEdit ? 'Enregistrer' : 'Créer le portfolio'}
        </button>
      </React.Fragment>}>
      <div className="space-y-6">
          {/* Name + slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Titre du portfolio</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line outline-none text-sm text-ink focus:border-ink/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Adresse</label>
              <div className="mt-1.5 h-11 px-3.5 rounded-xl border border-line bg-zinc-50 flex items-center text-sm text-muted">
                portefolia.tech/<span className="text-ink font-medium ml-0.5">{slugify(title)}</span>
              </div>
            </div>
          </div>

          {/* Template gallery header */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Choisissez un template</h3>
                <p className="text-xs text-muted mt-0.5">Sélectionnez le design de votre portfolio.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>
                <Icon name="sparkles" size={12} /> {unlockedCount} / {T.length} débloqués · {plan}
              </span>
            </div>

            {/* Locked hint */}
            {hint && (
              <div className="mb-4 rounded-xl border p-3.5 flex items-center gap-3" style={{ borderColor: '#FCD9B6', background: '#FFF7ED' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FED7AA', color: '#B45309' }}><Icon name="lock" size={15} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#9A3412' }}>« {hint.name} » nécessite la formule {window.TIER_META[hint.tier].plan}</p>
                  <p className="text-xs" style={{ color: '#B45309' }}>Passez à un plan supérieur pour débloquer ce template et bien d'autres.</p>
                </div>
                <button onClick={() => { onClose(); go('formules'); }} className="h-9 px-3.5 rounded-[10px] text-sm font-semibold text-white shrink-0" style={{ background: '#EA580C' }}>Voir les formules</button>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-5">
              {T.map(t => (
                <TemplateThumb key={t.id} tpl={t} selected={selectedId === t.id} locked={!window.isUnlocked(t, plan)} onClick={() => pick(t)} />
              ))}
            </div>
          </div>
      </div>
    </ModalShell>
  );
}
Object.assign(window, { TemplateThumb, CreatePortfolioModal });
