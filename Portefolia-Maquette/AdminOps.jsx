// AdminOps.jsx — Wave validation, Finance, Paiements, Team, generic module.
const PAY_STATUS = {
  validated: { label: 'Validé', c: '#2E7D32', bg: '#EAF5EB' },
  pending: { label: 'En attente', c: '#B45309', bg: '#FEF3E2' },
  rejected: { label: 'Rejeté', c: '#C62828', bg: '#FEECEC' },
};

// ── Wave validation queue ──────────────────────────────────────
function AdminWaveScreen({ go }) {
  const A = window.ADMIN;
  const [done, setDone] = React.useState({}); // id -> 'ok'|'no'
  const queue = A.waveQueue;
  const remaining = queue.filter(q => !done[q.id]);
  const total = remaining.reduce((s, q) => s + q.amount, 0);

  return (
    <AdminShell active="admin-wave" go={go}>
      <AdminHeader icon="waves" title="Validation Wave" subtitle="Confirmez les paiements mobile money reçus" badge={remaining.length + ' en attente'} />
      <AdminBody>
        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[['Montant en attente', window.fmtF(total), 'banknote', '#B45309'], ['Paiements à valider', remaining.length, 'clock', '#1565C0'], ['Validés aujourd\'hui', Object.values(done).filter(v => v === 'ok').length, 'checkcircle', '#2E7D32']].map(([l, v, ic, c]) => (
            <div key={l} className="bg-white p-4 flex items-center gap-3.5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c + '18', color: c }}><Icon name={ic} size={18} /></span>
              <div><p className="text-xl font-extrabold text-ink leading-none tabular-nums">{v}</p><p className="text-xs text-zinc-400 mt-1">{l}</p></div>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div className="space-y-3">
          {queue.map(q => {
            const st = done[q.id];
            return (
              <div key={q.id} className="bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)', opacity: st ? 0.6 : 1 }}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(140deg,#1DC1F2,#0A9FCC)' }}><Icon name="waves" size={20} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{q.client}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>{q.motif}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-x-3"><span className="font-mono">{q.ref}</span><span>{q.phone}</span><span>{q.date}</span></p>
                </div>
                <div className="text-right shrink-0"><p className="text-lg font-extrabold text-ink leading-none tabular-nums">{window.fmtFull(q.amount)}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  {st === 'ok' ? <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#2E7D32' }}><Icon name="checkcircle" size={16} /> Validé</span>
                    : st === 'no' ? <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#C62828' }}><Icon name="xcircle" size={16} /> Rejeté</span>
                    : <React.Fragment>
                        <button onClick={() => setDone(d => ({ ...d, [q.id]: 'no' }))} className="h-9 px-3 rounded-lg border border-line text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-red-600 flex items-center gap-1.5"><Icon name="x" size={15} /> Rejeter</button>
                        <button onClick={() => setDone(d => ({ ...d, [q.id]: 'ok' }))} className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: 'var(--accent)' }}><Icon name="check" size={15} /> Valider</button>
                      </React.Fragment>}
                </div>
              </div>
            );
          })}
        </div>
      </AdminBody>
    </AdminShell>
  );
}

// ── Finance ────────────────────────────────────────────────────
function AdminFinanceScreen({ go }) {
  const A = window.ADMIN;
  const f = A.kpiFin;
  const max = Math.max(...A.revenueSeries);
  const fluxColors = ['#2E7D32', '#1565C0', '#B45309'];
  return (
    <AdminShell active="admin-finance" go={go}>
      <AdminHeader icon="dollar" title="Finance" subtitle="Revenus, flux et performance d'abonnement"
        actions={<button className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"><Icon name="download" size={15} /> Export comptable</button>} />
      <AdminBody>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[['MRR', window.fmtF(f.mrr.valeur), '+' + f.ca_mois.variation + '%', '#2E7D32'], ['CA ce mois', window.fmtF(f.ca_mois.total), '+' + f.ca_mois.variation + '%', '#1565C0'], ['ARPU', window.fmtFull(f.mrr.arpu), null, '#7C3AED'], ['Churn', f.churn.taux + '%', '-0.4pt', '#C62828']].map(([l, v, d, c]) => (
            <div key={l} className="bg-white p-5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
              <p className="text-xs text-zinc-400 font-medium">{l}</p>
              <p className="text-[22px] font-extrabold mt-1.5 leading-none" style={{ color: c }}>{v}</p>
              {d && <p className="text-xs font-bold mt-2" style={{ color: c }}>{d} vs mois dernier</p>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-bold text-ink mb-1">Évolution du chiffre d'affaires</h3>
            <p className="text-xs text-zinc-400 mb-6">12 derniers mois · F CFA</p>
            <div className="flex items-end gap-2 h-56">
              {A.revenueSeries.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full rounded-t-md transition-all duration-500 relative" style={{ height: (v / max * 100) + '%', background: i === A.revenueSeries.length - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 28%, #fff)' }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ink opacity-0 group-hover:opacity-100 whitespace-nowrap">{(v / 1000).toFixed(1)}M</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">{A.revenueMonths[i]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Revenue by flux */}
          <div className="bg-white p-6" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
            <h3 className="font-bold text-ink mb-5">Revenus par flux</h3>
            <div className="space-y-5">
              {A.revenueByFlux.map((fx, i) => (
                <div key={fx.label}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: fluxColors[i] + '18', color: fluxColors[i] }}><Icon name={fx.icon} size={14} /></span>
                    <span className="text-sm font-medium text-ink flex-1">{fx.label}</span>
                    <span className="text-sm font-bold tabular-nums text-ink">{window.fmtF(fx.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: fx.pct + '%', background: fluxColors[i] }}></div></div>
                  <p className="text-[11px] text-zinc-400 mt-1">{fx.pct}% du chiffre d'affaires</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminBody>
    </AdminShell>
  );
}

// ── Paiements history ──────────────────────────────────────────
function AdminPaiementsScreen({ go }) {
  const A = window.ADMIN;
  const [filter, setFilter] = React.useState('all');
  const tabs = [['all', 'Tous'], ['validated', 'Validés'], ['pending', 'En attente'], ['rejected', 'Rejetés']];
  const list = filter === 'all' ? A.paiements : A.paiements.filter(p => p.status === filter);
  const validated = A.paiements.filter(p => p.status === 'validated').reduce((s, p) => s + p.amount, 0);

  return (
    <AdminShell active="admin-paiements" go={go}>
      <AdminHeader icon="banknote" title="Paiements" subtitle={`${window.fmtF(validated)} encaissés · ${A.paiements.length} transactions`}
        actions={<button className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"><Icon name="download" size={15} /> Exporter</button>} />
      <AdminBody>
        <div className="bg-white p-2.5 flex items-center gap-1.5 overflow-x-auto" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3.5 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter === k ? 'text-white' : 'border border-line text-zinc-500 hover:bg-zinc-50'}`} style={filter === k ? { background: 'var(--ink-nav)' } : undefined}>{label}</button>
          ))}
        </div>
        <div className="bg-white overflow-hidden" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead><tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-line">
                <th className="py-3 px-5">Référence</th><th className="py-3 px-3">Client</th><th className="py-3 px-3">Motif</th><th className="py-3 px-3">Méthode</th><th className="py-3 px-3 text-right">Montant</th><th className="py-3 px-3">Statut</th><th className="py-3 px-5">Date</th>
              </tr></thead>
              <tbody>
                {list.map(p => {
                  const s = PAY_STATUS[p.status];
                  return (
                    <tr key={p.id} className="border-b border-line last:border-0 hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-5 font-mono text-xs text-zinc-500">{p.id}</td>
                      <td className="py-3 px-3 font-semibold text-ink whitespace-nowrap">{p.client}</td>
                      <td className="py-3 px-3 text-zinc-600 whitespace-nowrap">{p.motif}</td>
                      <td className="py-3 px-3 text-zinc-600">{p.method}</td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums text-ink whitespace-nowrap">{window.fmtFull(p.amount)}</td>
                      <td className="py-3 px-3"><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: s.c, background: s.bg }}>{s.label}</span></td>
                      <td className="py-3 px-5 text-zinc-500 whitespace-nowrap">{p.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AdminBody>
    </AdminShell>
  );
}

// ── Admin team ─────────────────────────────────────────────────
function AdminTeamScreen({ go }) {
  const A = window.ADMIN;
  return (
    <AdminShell active="admin-team" go={go}>
      <AdminHeader icon="usercog" title="Administrateurs" subtitle="Gérez l'équipe et les rôles d'accès"
        actions={<button className="h-10 px-4 rounded-lg bg-white text-sm font-semibold flex items-center gap-1.5 transition-colors" style={{ color: '#1B5E20' }}><Icon name="userplus" size={15} /> Ajouter</button>} />
      <AdminBody>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(A.roles).map(([k, r]) => {
            const n = A.team.filter(t => t.role === k).length;
            return (
              <div key={k} className="bg-white p-5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={{ color: r.color, background: r.tint }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }}></span>{r.label}</span>
                <p className="text-2xl font-extrabold text-ink mt-3 leading-none">{n}</p>
                <p className="text-xs text-zinc-400 mt-1">administrateur{n > 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>
        <div className="bg-white overflow-hidden" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-3 border-b border-line"><h3 className="font-bold text-ink text-sm">Membres de l'équipe</h3></div>
          <div className="divide-y divide-line">
            {A.team.map(t => {
              const r = A.roles[t.role];
              return (
                <div key={t.email} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--ink-nav)' }}>
                    {t.name[0]}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: t.active ? '#2E7D32' : '#A1A1AA' }}></span>
                  </span>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-ink truncate">{t.name}</p><p className="text-xs text-zinc-400 truncate">{t.email}</p></div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0" style={{ color: r.color, background: r.tint }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }}></span>{r.label}</span>
                  <span className="text-xs text-zinc-400 shrink-0 w-20 text-right hidden sm:block">{t.last}</span>
                  <button className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-ink hover:bg-zinc-100 shrink-0"><Icon name="more" size={16} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </AdminBody>
    </AdminShell>
  );
}

// ── Generic module (Portfolios, Factures, Formules, Upgrades, Stats, Blog, Pages) ──
const MODULE_META = {
  'admin-portfolios': { icon: 'brief', title: 'Portfolios', sub: 'Tous les portfolios de la plateforme', stat: ['2 156 portfolios', '1 842 publics', '314 privés'] },
  'admin-factures': { icon: 'receipt', title: 'Factures', sub: 'Génération et suivi des factures', stat: ['981 factures émises', '4,8 M F encaissés', '12 impayées'] },
  'admin-formules': { icon: 'card', title: 'Formules', sub: 'Gestion des plans et tarifs', stat: ['4 formules actives', 'Gratuit · Starter · Pro · Business', '25 templates'] },
  'admin-upgrades': { icon: 'trending', title: 'Upgrades', sub: 'Demandes de changement de formule', stat: ['4 en attente', '38 ce mois', '+18% conversion'] },
  'admin-stats': { icon: 'bar', title: 'Statistiques', sub: 'Analytique avancée de la plateforme', stat: ['1 248 utilisateurs', '4 820 vues/jour', '87% activation'] },
  'admin-blog': { icon: 'book', title: 'Blog', sub: 'Articles et actualités', stat: ['42 articles publiés', '6 brouillons', '12,4 k lectures'] },
  'admin-pages': { icon: 'file', title: 'Pages', sub: 'Pages statiques du site', stat: ['9 pages', 'CGU · Confidentialité · FAQ', '2 modifiées récemment'] },
};
function AdminModuleScreen({ go, screen }) {
  const m = MODULE_META[screen] || { icon: 'grid', title: 'Module', sub: '', stat: [] };
  return (
    <AdminShell active={screen} go={go}>
      <AdminHeader icon={m.icon} title={m.title} subtitle={m.sub} />
      <AdminBody>
        <div className="grid sm:grid-cols-3 gap-4">
          {m.stat.map((s, i) => (
            <div key={i} className="bg-white p-5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Icon name={m.icon} size={17} /></span>
              <p className="text-sm font-semibold text-ink">{s}</p>
            </div>
          ))}
        </div>
        <div className="bg-white p-10 text-center" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <span className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Icon name={m.icon} size={28} /></span>
          <h3 className="text-lg font-bold text-ink">Module {m.title}</h3>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-md mx-auto">Cette interface suit la même charte que les écrans détaillés (Dashboard, Clients, Wave, Finance, Paiements, Admins). Dites-moi lequel détailler ensuite.</p>
        </div>
      </AdminBody>
    </AdminShell>
  );
}

Object.assign(window, { AdminWaveScreen, AdminFinanceScreen, AdminPaiementsScreen, AdminTeamScreen, AdminModuleScreen });
