// Business.jsx — Business Dashboard, Members (+invite), Join page.
// window.BusinessDashboardScreen, window.BusinessMembersScreen, window.BusinessJoinScreen
const BIZ_STATUS = {
  active: { label: 'Actif', tint: 'var(--accent-tint)', color: 'var(--accent-600)', dot: 'var(--accent)' },
  pending: { label: 'En attente', tint: '#FEF3E2', color: '#B45309', dot: '#F59E0B' },
  suspended: { label: 'Suspendu', tint: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

function BizHero({ title, subtitle, chips }) {
  return (
    <div className="relative overflow-hidden" style={{ background: 'var(--biz-nav)' }}>
      <div className="absolute inset-0 opacity-[0.16] pointer-events-none"
        style={{ background: 'radial-gradient(50% 120% at 85% 0%, var(--accent), transparent 60%)' }}></div>
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-9 flex flex-col sm:flex-row sm:items-center gap-5">
        <span className="w-14 h-14 rounded-2xl bg-white/12 flex items-center justify-center text-white shrink-0">
          <Icon name="building" size={26} stroke={1.8} />
        </span>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h1>
          <p className="text-white/55 text-sm mt-1">{subtitle}</p>
        </div>
        {chips && (
          <div className="flex flex-wrap gap-2">
            {chips.map(c => (
              <span key={c.label} className="flex items-center gap-1.5 bg-white/12 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }}></span>{c.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BizStat({ label, value, sub, icon, progress }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 text-ink/60"><Icon name={icon} size={16} /></span>
      </div>
      <p className="text-[26px] font-semibold text-ink leading-none tabular-nums">{value}</p>
      <p className="text-xs text-muted mt-1.5">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: progress + '%', background: 'var(--accent)' }}></div>
        </div>
      )}
    </div>
  );
}

function BusinessDashboardScreen({ go }) {
  const b = window.DATA.business;
  const actions = [
    { icon: 'plus', title: 'Créer un portfolio', desc: 'Nouveau portfolio Business avec styles avancés', to: 'business' },
    { icon: 'userplus', title: 'Gérer les membres', desc: 'Inviter, suspendre ou retirer des agents', to: 'business-members' },
    { icon: 'palette', title: 'Personnalisation', desc: 'Logo, couleurs et police de votre marque', to: 'business' },
  ];
  return (
    <div className="min-h-screen bg-white">
      <BusinessTopNav active="business" go={go} />
      <BizHero title="Sahel Studio" subtitle={`Bonjour ${b.admin} — bienvenue sur votre tableau de bord`}
        chips={[{ label: 'Compte actif', dot: 'var(--accent)' }]} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-8" style={{ background: 'var(--canvas)' }}>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BizStat label="Membres actifs" value={b.kpis.members} sub="sur 50 max" icon="user" />
          <BizStat label="Invitations en attente" value={b.kpis.pending} sub="à accepter" icon="clock" />
          <BizStat label="Portfolios créés" value={b.kpis.portfolios} sub="par vos agents" icon="folder" />
          <BizStat label="Capacité utilisée" value={b.kpis.capacity + '%'} sub={`${b.kpis.members} / 50 membres`} icon="trending" progress={b.kpis.capacity} />
        </div>

        {/* Renewal strip */}
        <div className="bg-white rounded-2xl border border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="calendar" size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted font-semibold">Abonnement Business</p>
            <p className="font-semibold text-ink text-sm">{b.plan.name} · renouvellement {b.plan.renew}</p>
          </div>
          <button className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white transition-colors flex items-center gap-1.5 shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="refresh" size={14} /> Renouveler
          </button>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted mb-3">Actions rapides</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {actions.map(a => (
              <button key={a.title} onClick={() => go(a.to)} className="group bg-white rounded-2xl border border-line p-5 text-left hover:border-ink/20 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-all flex items-center gap-4">
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'var(--ink-nav)' }}><Icon name={a.icon} size={19} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{a.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{a.desc}</p>
                </div>
                <Icon name="arrow" size={16} className="text-muted/50 group-hover:text-ink/60 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Portfolios + recent members */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted mb-3">Portfolios Business</p>
            <div className="bg-white rounded-2xl border border-line divide-y divide-line">
              {b.portfolios.map(p => (
                <div key={p.slug} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--ink-nav)' }}>{p.title[0]}</span>
                    <div className="min-w-0"><p className="text-sm font-medium text-ink truncate">{p.title}</p><p className="text-xs text-muted">/{p.slug}</p></div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${p.public ? '' : 'bg-zinc-100 text-muted'}`}
                    style={p.public ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : undefined}>
                    <Icon name={p.public ? 'globe' : 'lock'} size={11} /> {p.public ? 'Public' : 'Privé'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Membres récents</p>
              <button onClick={() => go('business-members')} className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent-600)' }}>Voir tous →</button>
            </div>
            <div className="bg-white rounded-2xl border border-line divide-y divide-line">
              {b.members.slice(0, 4).map(m => {
                const s = BIZ_STATUS[m.status];
                return (
                  <div key={m.email} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: m.status === 'suspended' ? '#A1A1AA' : 'var(--ink-nav)' }}>
                        {(m.name === 'invité' ? m.email[0] : m.name[0]).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{m.name === 'invité' ? m.email : m.name}</p>
                        <p className="text-xs text-muted truncate">{m.role}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: s.tint, color: s.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }}></span>{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessMembersScreen({ go, openModal }) {
  const b = window.DATA.business;
  const [tab, setTab] = React.useState('all');
  const counts = {
    all: b.members.length,
    active: b.members.filter(m => m.status === 'active').length,
    pending: b.members.filter(m => m.status === 'pending').length,
    suspended: b.members.filter(m => m.status === 'suspended').length,
  };
  const tabs = [['all', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['suspended', 'Suspendus']];
  const list = tab === 'all' ? b.members : b.members.filter(m => m.status === tab);
  const cap = Math.round(counts.active / 50 * 100);

  return (
    <div className="min-h-screen bg-white">
      <BusinessTopNav active="business-members" go={go} />
      <BizHero title="Gestion des membres" subtitle="Invitez et gérez les agents de Sahel Studio"
        chips={[
          { label: `${counts.active} actifs`, dot: 'var(--accent)' },
          { label: `${counts.pending} en attente`, dot: '#F59E0B' },
        ]} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-6" style={{ background: 'var(--canvas)' }}>
        {/* Capacity */}
        <div className="bg-white rounded-2xl border border-line p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-ink/80"><Icon name="user" size={15} /> Capacité de l'espace</span>
            <span className="text-sm font-semibold text-ink">{counts.active} <span className="text-muted font-normal">/ 50 membres</span></span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: cap + '%', background: 'var(--accent)' }}></div>
          </div>
          <p className="text-xs text-muted mt-1.5">{50 - counts.active} places disponibles</p>
        </div>

        {/* Invite form */}
        <div className="bg-white rounded-2xl border border-line p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}><Icon name="userplus" size={17} /></span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Inviter un collaborateur</h2>
              <p className="text-xs text-muted">Il recevra un email avec un lien pour rejoindre votre espace.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="mail" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input placeholder="collaborateur@entreprise.com" className="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-line outline-none text-sm text-ink placeholder:text-muted focus:border-ink/30" />
            </div>
            <input placeholder="Poste (optionnel)" className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-line outline-none text-sm text-ink placeholder:text-muted focus:border-ink/30" />
            <button onClick={() => openModal('invite')} className="h-11 px-5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="send" size={15} /> Inviter
            </button>
          </div>
          <p className="text-xs text-muted mt-2.5 flex items-center gap-1.5">
            <Icon name="eye" size={13} /> Astuce : utilisez le bouton « Inviter » pour ouvrir le formulaire d'invitation détaillé.
          </p>
        </div>

        {/* List + filters */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-ink shrink-0">Membres <span className="text-muted font-normal">({list.length})</span></h2>
            <div className="flex-1 flex flex-wrap gap-1.5 sm:justify-end">
              {tabs.map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === k ? 'text-white' : 'bg-white border border-line text-ink/70 hover:bg-zinc-50'}`}
                  style={tab === k ? { background: 'var(--ink-nav)' } : undefined}>
                  {label} <span className={tab === k ? 'text-white/60' : 'text-muted'}>{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {list.map(m => {
              const s = BIZ_STATUS[m.status];
              const name = m.name === 'invité' ? m.email : m.name;
              const pct = Math.round(m.portfolios / m.limit * 100);
              return (
                <div key={m.email} className="bg-white rounded-2xl border border-line p-4 flex items-center gap-4">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: m.status === 'suspended' ? '#A1A1AA' : 'var(--ink-nav)' }}>
                    {name[0].toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-ink truncate">{name}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: s.tint, color: s.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }}></span>{s.label}
                      </span>
                      <span className="text-xs text-muted">· {m.role}</span>
                    </div>
                    {m.status !== 'pending' ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Icon name="folder" size={13} className="text-muted shrink-0" />
                        <div className="w-28 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent)' }}></div>
                        </div>
                        <span className="text-xs text-muted">{m.portfolios}/{m.limit} portfolios</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted flex items-center gap-1 mt-0.5"><Icon name="mail" size={12} /> {m.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.status === 'active' && <button onClick={() => openModal('confirm', { title: 'Suspendre ce membre ?', message: `${name} perdra l'accès à l'espace Sahel Studio jusqu'à réactivation. Ses portfolios restent conservés.`, confirmLabel: 'Suspendre', icon: 'pause', tone: 'accent' })} title="Suspendre" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-zinc-100 transition-colors"><Icon name="pause" size={15} /></button>}
                    {m.status === 'suspended' && <button title="Réactiver" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-zinc-100 transition-colors"><Icon name="play" size={15} /></button>}
                    <button onClick={() => openModal('confirm', { title: 'Retirer ce membre ?', message: `${name} sera retiré de l'espace Sahel Studio. Cette action libère une place dans votre formule.`, confirmLabel: 'Retirer', icon: 'trash', tone: 'danger' })} title="Retirer" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-red-600 hover:bg-zinc-100 transition-colors"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessJoinScreen({ go }) {
  const checks = ['8 caractères minimum', 'Une majuscule', 'Un chiffre'];
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--canvas)' }}>
      {/* Branded hero */}
      <div className="relative overflow-hidden py-14 px-4 shrink-0" style={{ background: 'var(--biz-nav)' }}>
        <div className="absolute inset-0 opacity-[0.16] pointer-events-none" style={{ background: 'radial-gradient(50% 120% at 50% 0%, var(--accent), transparent 60%)' }}></div>
        <div className="relative max-w-md mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/12 text-white/90 rounded-full px-3 py-1 text-xs font-medium mb-5">
            <Icon name="gift" size={13} /> Invitation exclusive
          </span>
          <span className="w-16 h-16 rounded-2xl bg-white/12 flex items-center justify-center text-white mx-auto mb-4">
            <Icon name="building" size={30} stroke={1.8} />
          </span>
          <h1 className="text-2xl font-bold text-white">Sahel Studio</h1>
          <p className="text-white/55 text-sm mt-1">vous invite à rejoindre son espace sur Portefolia</p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-line shadow-[0_12px_40px_rgba(16,24,40,0.10)] overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-line">
              <h2 className="text-lg font-bold text-ink">Créer votre compte</h2>
              <p className="text-sm text-muted mt-1 flex items-center gap-1.5"><Icon name="shield" size={14} /> ibrahima.kane@sahelstudio.sn</p>
            </div>
            <div className="px-7 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">Prénom</label>
                  <input defaultValue="Ibrahima" className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line outline-none text-sm text-ink focus:border-ink/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">Nom</label>
                  <input defaultValue="Kane" className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line outline-none text-sm text-ink focus:border-ink/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Mot de passe</label>
                <div className="relative mt-1.5">
                  <input type="password" defaultValue="Sahel2026" className="w-full h-11 px-3.5 pr-10 rounded-xl border border-line outline-none text-sm text-ink focus:border-ink/30" />
                  <Icon name="eye" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                </div>
                <div className="space-y-1 mt-2.5">
                  {checks.map(c => (
                    <div key={c} className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <Icon name="check" size={9} className="text-white" stroke={3.5} />
                      </span>
                      <span className="text-xs" style={{ color: 'var(--accent-600)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => go('business')} className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--ink-nav)' }}>
                Rejoindre Sahel Studio <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="px-7 pb-6">
              <p className="text-xs text-center text-muted">En rejoignant, vous acceptez les <span className="underline cursor-pointer">conditions d'utilisation</span> de Portefolia.</p>
            </div>
          </div>
          <p className="text-xs text-center text-muted mt-5">Propulsé par <strong className="text-ink/70">Portefolia</strong> — Plateforme de portfolios professionnels</p>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { BusinessDashboardScreen, BusinessMembersScreen, BusinessJoinScreen });
