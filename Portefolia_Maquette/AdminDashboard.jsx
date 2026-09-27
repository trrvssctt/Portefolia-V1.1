// AdminDashboard.jsx — admin home. window.AdminDashboardScreen
const ALERT_PAL = {
  CRITIQUE: { c: '#C62828', bg: '#FEECEC', label: 'Critique' },
  ATTENTION: { c: '#B45309', bg: '#FEF3E2', label: 'Attention' },
  INFO: { c: '#1565C0', bg: '#E8F1FD', label: 'Info' },
};

function FinCard({ accent, label, value, sub1, sub2, variation, cta, onCta }) {
  return (
    <div className="bg-white p-5 flex flex-col gap-3" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)', borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start justify-between">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + '1F', color: accent }}><Icon name={cta && cta.icon || 'dollar'} size={19} /></span>
        {variation != null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: variation >= 0 ? '#2E7D32' : '#C62828', background: (variation >= 0 ? '#2E7D32' : '#C62828') + '18' }}>
            {variation >= 0 ? '▲' : '▼'} {Math.abs(variation)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
        <p className="text-2xl font-extrabold mt-0.5" style={{ color: accent }}>{value}</p>
        {sub1 && <p className="text-xs text-zinc-500 mt-1">{sub1}</p>}
        {sub2 && <p className="text-xs text-zinc-500">{sub2}</p>}
      </div>
      {cta && <button onClick={onCta} className="mt-auto text-[11px] font-bold px-3 py-1 rounded-lg self-start transition-opacity hover:opacity-80" style={{ background: accent + '18', color: accent }}>{cta.label} →</button>}
    </div>
  );
}

function PlatCard({ k }) {
  return (
    <div className="bg-white p-5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center"><Icon name={k.icon} size={17} /></span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ color: '#2E7D32', background: '#2E7D3215' }}>{k.delta}</span>
      </div>
      <p className="text-[26px] font-extrabold text-ink leading-none tabular-nums">{typeof k.value === 'number' ? k.value.toLocaleString('fr-FR') : k.value}</p>
      <p className="text-sm text-zinc-500 mt-1.5">{k.label}</p>
    </div>
  );
}

function RevenueBars({ series, months }) {
  const max = Math.max(...series);
  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-52">
      {series.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full rounded-t-md transition-all duration-500 relative" style={{ height: (v / max * 100) + '%', background: i === series.length - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 30%, #fff)' }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{(v / 1000).toFixed(1)}M</span>
          </div>
          <span className="text-[10px] text-zinc-400">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDashboardScreen({ go }) {
  const A = window.ADMIN;
  const f = A.kpiFin;
  const statusDot = { ok: '#2E7D32', warn: '#B45309', down: '#C62828' };

  return (
    <AdminShell active="admin" go={go}>
      <AdminHeader icon="grid" title="Tableau de bord" subtitle="Vue d'ensemble en temps réel · 13 juin 2026"
        actions={<button className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"><Icon name="download" size={15} /> Rapport</button>} />
      <AdminBody>
        {/* Alertes */}
        <div className="bg-white overflow-hidden" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-line">
            <Icon name="alert" size={16} style={{ color: '#B45309' }} />
            <span className="text-sm font-bold text-ink flex-1">Actions requises</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3E2', color: '#B45309' }}>{A.alertes.filter(a => a.niveau !== 'INFO').length} urgentes</span>
          </div>
          <div className="divide-y divide-line">
            {A.alertes.map((a, i) => {
              const p = ALERT_PAL[a.niveau];
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide" style={{ color: p.c, background: p.bg }}>{p.label}</span>
                  <div className="flex-1 min-w-0"><p className="text-[13px] font-bold text-ink leading-tight">{a.message}</p><p className="text-[11px] text-zinc-400 mt-0.5">{a.detail}</p></div>
                  <button onClick={() => go(a.to)} className="shrink-0 text-[12px] font-bold hover:underline whitespace-nowrap" style={{ color: p.c }}>{a.action} →</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPI financiers */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400 mb-3">Indicateurs financiers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <FinCard accent="#2E7D32" label="MRR" value={window.fmtF(f.mrr.valeur)} sub1={`${f.mrr.abonnes} abonnés actifs`} sub2={`ARPU : ${window.fmtFull(f.mrr.arpu)}`} variation={f.ca_mois.variation} cta={{ label: 'Voir finance', icon: 'trending' }} onCta={() => go('admin-finance')} />
            <FinCard accent="#B45309" label="Pipeline en attente" value={window.fmtF(f.pipeline.total)} sub1={`${f.pipeline.nb} paiements à valider`} cta={{ label: 'Valider', icon: 'clock' }} onCta={() => go('admin-wave')} />
            <FinCard accent="#1565C0" label="CA ce mois" value={window.fmtF(f.ca_mois.total)} sub1="Paiements validés uniquement" variation={f.ca_mois.variation} cta={{ icon: 'banknote' }} />
            <FinCard accent="#C62828" label="Churn" value={f.churn.taux.toFixed(1) + '%'} sub1={`${f.churn.perdus} comptes perdus ce mois`} cta={{ icon: 'flag' }} />
          </div>
        </div>

        {/* KPI plateforme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {A.kpiPlat.map(k => <PlatCard key={k.label} k={k} />)}
        </div>

        {/* Revenue chart + system health */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-7">
              <div><h3 className="font-bold text-ink">Revenus mensuels</h3><p className="text-xs text-zinc-400 mt-0.5">12 derniers mois · F CFA</p></div>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }}></span> CA validé</span>
            </div>
            <RevenueBars series={A.revenueSeries} months={A.revenueMonths} />
          </div>
          <div className="bg-white p-6" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-bold text-ink mb-4">Santé système</h3>
            <div className="space-y-3">
              {A.sante.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot[s.status] }}></span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink">{s.label}</p><p className="text-xs text-zinc-400">{s.sub}</p></div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: statusDot[s.status] }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white p-6" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-ink">Activité récente</h3>
            <button className="text-xs font-bold hover:underline" style={{ color: 'var(--accent)' }}>Tout voir</button>
          </div>
          <div className="space-y-1">
            {A.activite.map((a, i) => {
              const tone = { ok: '#2E7D32', info: '#1565C0', danger: '#C62828' }[a.tone];
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone + '14', color: tone }}><Icon name={a.icon} size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink"><span className="font-semibold">{a.what}</span> <span className="text-zinc-400">· {a.who}</span></p>
                    <p className="text-xs text-zinc-400 truncate">{a.detail}</p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">{a.when}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AdminBody>
    </AdminShell>
  );
}
window.AdminDashboardScreen = AdminDashboardScreen;
