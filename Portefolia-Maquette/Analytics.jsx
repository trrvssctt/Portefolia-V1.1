// Analytics.jsx — analytics dashboard. window.AnalyticsScreen
function BarChart({ series }) {
  const max = Math.max(...series);
  const labels = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12'];
  return (
    <div className="flex items-end gap-2 h-48">
      {series.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="w-full rounded-t-md transition-all duration-500 relative"
            style={{ height: (v / max * 100) + '%', background: i === series.length - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 28%, #fff)' }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-ink opacity-0 group-hover:opacity-100 transition-opacity">{v}</span>
          </div>
          <span className="text-[10px] text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function AKpi({ k }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-5">
      <p className="text-sm text-muted">{k.label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-[26px] font-semibold text-ink leading-none tracking-tight tabular-nums">{k.value}</p>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
          style={k.up ? { background: 'var(--accent-tint)', color: 'var(--accent-600)' } : { background: '#FEE2E2', color: '#B91C1C' }}>
          <Icon name={k.up ? 'arrowup' : 'trending'} size={12} className={k.up ? '' : 'rotate-180'} /> {k.delta}
        </span>
      </div>
    </div>
  );
}

function AnalyticsScreen({ go }) {
  const a = window.DATA.analytics;
  const [range, setRange] = React.useState('90 jours');

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      <UserNav active="analytics" go={go} />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-ink tracking-tight">Analytics</h1>
            <p className="text-muted text-sm mt-1">Suivez la performance de vos portfolios et cartes NFC.</p>
          </div>
          <div className="flex items-center gap-2">
            {['30 jours', '90 jours', '12 mois'].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`h-9 px-3.5 rounded-[10px] text-sm font-medium transition-colors ${range === r ? 'text-white' : 'border border-line text-ink/70 hover:bg-zinc-50'}`}
                style={range === r ? { background: 'var(--ink-nav)' } : undefined}>{r}</button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {a.kpis.map(k => <AKpi key={k.label} k={k} />)}
        </div>

        {/* Chart + sources */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-line p-6">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h3 className="font-semibold text-ink">Vues du profil</h3>
                <p className="text-xs text-muted mt-0.5">Évolution sur 12 semaines</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }}></span> Vues</span>
            </div>
            <BarChart series={a.series} />
          </div>
          <div className="bg-white rounded-2xl border border-line p-6">
            <h3 className="font-semibold text-ink mb-5">Sources de trafic</h3>
            <div className="space-y-4">
              {a.sources.map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-ink/80">{s.label}</span>
                    <span className="font-semibold text-ink tabular-nums">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: s.pct + '%', background: 'var(--accent)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Countries + top portfolios */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-line p-6">
            <h3 className="font-semibold text-ink mb-5">Audience par pays</h3>
            <div className="space-y-3.5">
              {a.countries.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{c.flag}</span>
                  <span className="text-sm text-ink/80 w-28 shrink-0">{c.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: c.pct + '%', background: 'var(--accent)' }}></div>
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums w-10 text-right">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-line p-6">
            <h3 className="font-semibold text-ink mb-5">Portfolios les plus vus</h3>
            <div className="space-y-4">
              {a.topPortfolios.map((p, i) => (
                <div key={p.title} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--accent-tint)', color: 'var(--accent-600)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm text-ink/80 truncate">{p.title}</span>
                      <span className="text-sm font-semibold text-ink tabular-nums shrink-0">{p.views.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: p.pct + '%', background: 'var(--accent)' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.AnalyticsScreen = AnalyticsScreen;
