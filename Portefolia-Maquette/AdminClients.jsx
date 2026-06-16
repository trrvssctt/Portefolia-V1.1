// AdminClients.jsx — clients list + 360 drawer. window.AdminClientsScreen
const CLIENT_STATUS = {
  active: { label: 'Actif', c: '#2E7D32', bg: '#EAF5EB' },
  pending: { label: 'En attente', c: '#B45309', bg: '#FEF3E2' },
  expired: { label: 'Expiré', c: '#C62828', bg: '#FEECEC' },
  suspended: { label: 'Suspendu', c: '#52525B', bg: '#F4F4F5' },
};
const PLAN_BADGE = {
  Gratuit: { c: '#52525B', bg: '#F4F4F5' },
  Starter: { c: '#1565C0', bg: '#E8F1FD' },
  Pro: { c: '#2E7D32', bg: '#EAF5EB' },
  Business: { c: '#7C3AED', bg: '#F3EEFF' },
};

function StatusPill({ status }) {
  const s = CLIENT_STATUS[status];
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.c, background: s.bg }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }}></span>{s.label}</span>;
}
function PlanPill({ plan }) {
  const p = PLAN_BADGE[plan];
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ color: p.c, background: p.bg }}>{plan}</span>;
}

function Client360({ client, go, onClose }) {
  const c = client;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm modal-overlay"></div>
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col modal-card" style={{ animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative overflow-hidden shrink-0" style={{ background: 'var(--admin-grad)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"><Icon name="x" size={18} /></button>
          <div className="px-6 pt-7 pb-6 flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white text-2xl font-bold shrink-0">{c.name[0]}</span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{c.name}</h2>
              <p className="text-white/70 text-sm truncate">{c.email}</p>
              <div className="flex items-center gap-2 mt-2"><PlanPill plan={c.plan} /><StatusPill status={c.status} /></div>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[['Portfolios', c.portfolios], ['Cartes NFC', c.nfc], ['Revenu', window.fmtF(c.revenue)]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-line p-3 text-center"><p className="text-lg font-extrabold text-ink tabular-nums leading-none">{v}</p><p className="text-[11px] text-zinc-400 mt-1">{l}</p></div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Coordonnées</p>
            <div className="space-y-2.5">
              {[['mail', c.email], ['phone', c.phone], ['pin', c.location], ['calendar', 'Inscrit le ' + c.joined]].map(([ic, val]) => (
                <div key={ic} className="flex items-center gap-3 text-sm"><Icon name={ic} size={15} className="text-zinc-400 shrink-0" /><span className="text-ink">{val}</span></div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Abonnement</p>
            <div className="rounded-xl border border-line p-4 flex items-center justify-between">
              <div><p className="text-sm font-bold text-ink">Formule {c.plan}</p><p className="text-xs text-zinc-400 mt-0.5">{c.status === 'active' ? 'Renouvellement automatique' : c.status === 'expired' ? 'Expiré — à relancer' : 'En attente de paiement'}</p></div>
              <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}><Icon name="sparkles" size={17} /></span>
            </div>
          </div>
        </div>
        {/* Footer actions */}
        <div className="border-t border-line p-4 flex items-center gap-2 shrink-0">
          <button onClick={() => go('portfolio')} className="flex-1 h-10 rounded-lg border border-line text-sm font-medium text-ink hover:bg-zinc-50 flex items-center justify-center gap-1.5"><Icon name="eye" size={15} /> Portfolios</button>
          <button className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: 'var(--accent)' }}><Icon name="message" size={15} /> Contacter</button>
          <button className="w-10 h-10 rounded-lg border border-line flex items-center justify-center text-zinc-500 hover:text-red-600 hover:border-red-200"><Icon name="ban" size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function AdminClientsScreen({ go }) {
  const A = window.ADMIN;
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(null);
  const tabs = [['all', 'Tous'], ['active', 'Actifs'], ['pending', 'En attente'], ['expired', 'Expirés'], ['suspended', 'Suspendus']];
  const counts = { all: A.clients.length };
  ['active', 'pending', 'expired', 'suspended'].forEach(s => counts[s] = A.clients.filter(c => c.status === s).length);
  const list = filter === 'all' ? A.clients : A.clients.filter(c => c.status === filter);
  const totalRev = A.clients.reduce((s, c) => s + c.revenue, 0);

  return (
    <AdminShell active="admin-clients" go={go}>
      <AdminHeader icon="user" title="Clients" subtitle={`${A.clients.length} comptes · ${window.fmtF(totalRev)} de revenu cumulé`}
        actions={<button className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"><Icon name="download" size={15} /> Exporter</button>} />
      <AdminBody>
        {/* Toolbar */}
        <div className="bg-white p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input placeholder="Rechercher par nom, email…" className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 border border-transparent focus:border-line outline-none text-sm" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${filter === k ? 'text-white' : 'border border-line text-zinc-500 hover:bg-zinc-50'}`} style={filter === k ? { background: 'var(--ink-nav)' } : undefined}>
                {label} <span className={filter === k ? 'text-white/60' : 'text-zinc-400'}>{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white overflow-hidden" style={{ borderRadius: 12, boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-line">
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-3">Formule</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-center">Portfolios</th>
                  <th className="py-3 px-3 text-right">Revenu</th>
                  <th className="py-3 px-3">Inscrit</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(c => (
                  <tr key={c.id} onClick={() => setSel(c)} className="border-b border-line last:border-0 hover:bg-zinc-50/70 transition-colors cursor-pointer">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--ink-nav)' }}>{c.name[0]}</span>
                        <div className="min-w-0"><p className="font-semibold text-ink truncate">{c.name}</p><p className="text-xs text-zinc-400 truncate">{c.email}</p></div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><PlanPill plan={c.plan} /></td>
                    <td className="py-3 px-3"><StatusPill status={c.status} /></td>
                    <td className="py-3 px-3 text-center tabular-nums text-zinc-600">{c.portfolios}</td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums text-ink">{c.revenue ? window.fmtF(c.revenue) : '—'}</td>
                    <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">{c.joined}</td>
                    <td className="py-3 px-5 text-right"><Icon name="arrow" size={16} className="text-zinc-300 inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminBody>
      {sel && <Client360 client={sel} go={go} onClose={() => setSel(null)} />}
    </AdminShell>
  );
}
window.AdminClientsScreen = AdminClientsScreen;
