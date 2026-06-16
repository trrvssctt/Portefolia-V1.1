import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Users, Eye, DollarSign, ShoppingCart, Activity,
  ArrowUpRight, ArrowDownRight, Download, RefreshCw, BarChart3,
  CreditCard, UserPlus, Globe, Smartphone, Target, Clock,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthlyVisit   { month: string; visits: number; }
interface MonthlyRevenue { month: string; revenue: number; orders: number; }
interface PlatformStats  { web: number; mobile: number; desktop: number; }
interface PlanDistribution { name: string; value: number; color: string; }

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminStats() {
  const [visits, setVisits]                   = useState<MonthlyVisit[]>([]);
  const [revenue, setRevenue]                 = useState<MonthlyRevenue[]>([]);
  const [platformStats, setPlatformStats]     = useState<PlatformStats>({ web: 0, mobile: 0, desktop: 0 });
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [timeRange, setTimeRange]             = useState('12months');
  const [activeTab, setActiveTab]             = useState('overview');

  // Cross-controller stats
  const [totalUsers, setTotalUsers]                   = useState(0);
  const [totalPortfolios, setTotalPortfolios]         = useState(0);
  const [totalCommandes, setTotalCommandes]           = useState(0);
  const [totalPaiements, setTotalPaiements]           = useState(0);
  const [totalPaiementsAmount, setTotalPaiementsAmount] = useState(0);
  const [avgPaiement, setAvgPaiement]                 = useState(0);
  const [revenuePerUser, setRevenuePerUser]           = useState(0);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadStats = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    try {
      const fetchWithAuth = (url: string) =>
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch((e) => {
          console.warn('fetch failed', url, e);
          return { ok: false, status: 0, headers: new Headers(), text: async () => '' } as any;
        });

      const safeJson = async (res: Response | any) => {
        if (!res || !res.ok) return {};
        try {
          const ct = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
          if (!ct.includes('application/json')) return {};
          return await res.json();
        } catch (e) { console.warn('safeJson parse error', e); return {}; }
      };

      const [vRes, rRes, pRes, pdRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/visits/monthly?range=${timeRange}`),
        fetchWithAuth(`${API_BASE}/api/admin/revenue/monthly?range=${timeRange}`),
        fetchWithAuth(`${API_BASE}/api/admin/stats/platform`),
        fetchWithAuth(`${API_BASE}/api/admin/stats/plans-distribution`),
      ]);

      const vJson  = await safeJson(vRes);
      const rJson  = await safeJson(rRes);
      const pJson  = await safeJson(pRes);
      const pdJson = await safeJson(pdRes);

      setVisits(vJson.visits || []);
      setRevenue(rJson.revenue || []);
      setPlatformStats(pJson.stats || { web: 0, mobile: 0, desktop: 0 });
      setPlanDistribution(pdJson.distribution || []);

      const hdrs = { headers: { Authorization: `Bearer ${token}` } };

      async function fetchStatsOrCount(statsPath: string, listPath: string) {
        try {
          const res = await fetch(`${API_BASE}${statsPath}`, hdrs);
          if (res.ok) {
            const json = await res.json();
            if (typeof json.total === 'number') return json.total;
            if (typeof json.count === 'number') return json.count;
            if (Array.isArray(json.users)) return json.users.length;
            if (Array.isArray(json.paiements)) return json.paiements.length;
            if (Array.isArray(json.items)) return json.items.length;
            return 0;
          }
        } catch (e) { /* ignore and fallback */ }
        try {
          const res2 = await fetch(`${API_BASE}${listPath}`, hdrs);
          if (!res2.ok) return 0;
          const j2 = await res2.json();
          if (Array.isArray(j2.users)) return j2.users.length;
          if (Array.isArray(j2.paiements)) return j2.paiements.length;
          if (Array.isArray(j2.items)) return j2.items.length;
          if (Array.isArray(j2.commandes)) return j2.commandes.length;
          if (typeof j2.total === 'number') return j2.total;
          if (typeof j2.count === 'number') return j2.count;
          return 0;
        } catch (e) { return 0; }
      }

      const [uCount, pCount, cCount] = await Promise.all([
        fetchStatsOrCount('/api/admin/stats/users',      '/api/admin/users?limit=1'),
        fetchStatsOrCount('/api/admin/stats/portfolios', '/api/admin/portfolios?limit=1'),
        fetchStatsOrCount('/api/admin/stats/commandes',  '/api/admin/commandes?limit=1'),
      ]);

      setTotalUsers(uCount || 0);
      setTotalPortfolios(pCount || 0);
      setTotalCommandes(cCount || 0);

      let paiementsCount = 0, paiementsAmount = 0;
      try {
        const resP = await fetch(`${API_BASE}/api/admin/paiements?limit=1000`, hdrs);
        if (resP.ok) {
          const jp = await resP.json();
          const items = jp.paiements || jp.items || jp || [];
          const arr = Array.isArray(items) ? items : [];
          paiementsCount  = arr.length;
          paiementsAmount = arr.reduce((acc: number, it: any) => acc + (Number(it.montant || it.montant_total || it.amount || 0) || 0), 0);
        }
      } catch (e) {
        try {
          const r = await fetch(`${API_BASE}/api/admin/stats/paiements`, hdrs);
          if (r.ok) {
            const j = await r.json();
            paiementsCount  = j.count || j.total || 0;
            paiementsAmount = j.totalRevenue || j.total_amount || 0;
          }
        } catch (e2) { /* ignore */ }
      }

      setTotalPaiements(paiementsCount);
      setTotalPaiementsAmount(paiementsAmount || 0);
      setAvgPaiement(paiementsCount > 0 ? Math.round((paiementsAmount || 0) / paiementsCount) : 0);
      setRevenuePerUser((uCount && uCount > 0) ? Math.round((paiementsAmount || 0) / (uCount || 1)) : 0);
    } catch (err) {
      console.error('Erreur chargement stats', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    loadStats();
    const onOrdersUpdated = () => loadStats();
    window.addEventListener('ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', onOrdersUpdated);
  }, [timeRange]);

  // ── Computed ──────────────────────────────────────────────────────────────────
  const totalVisits    = visits.reduce((a, b) => a + (Number(b?.visits) || 0), 0);
  const totalRevenue   = revenue.reduce((a, b) => a + (Number(b?.revenue) || 0), 0);
  const totalOrders    = revenue.reduce((a, b) => a + (Number(b?.orders) || 0), 0);
  const avgOrderValue  = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const lastMonthVisits  = Number(visits[visits.length - 1]?.visits || 0);
  const prevMonthVisits  = Number(visits[visits.length - 2]?.visits || 0);
  const visitGrowth      = prevMonthVisits === 0 ? (lastMonthVisits === 0 ? 0 : 100) : Math.round(((lastMonthVisits - prevMonthVisits) / prevMonthVisits) * 100);

  const lastMonthRevenue = Number(revenue[revenue.length - 1]?.revenue || 0);
  const prevMonthRevenue = Number(revenue[revenue.length - 2]?.revenue || 0);
  const revenueGrowth    = prevMonthRevenue === 0 ? (lastMonthRevenue === 0 ? 0 : 100) : Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);

  const conversionRate = totalVisits > 0 ? ((totalOrders / totalVisits) * 100).toFixed(2) : '0';

  const formattedData = visits.map((v, i) => ({
    month:   format(new Date(v.month), 'MMM yyyy', { locale: fr }),
    visits:  v.visits,
    revenue: revenue[i]?.revenue || 0,
    orders:  revenue[i]?.orders  || 0,
  }));

  const platformData = [
    { name: 'Web',     value: platformStats.web,     color: '#2E7D32' },
    { name: 'Mobile',  value: platformStats.mobile,  color: '#1565C0' },
    { name: 'Desktop', value: platformStats.desktop, color: '#6D28D9' },
  ];

  const exportStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/stats/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `statistiques-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e) { console.error('Export error:', e); }
  };

  const CHART_TOOLTIP = {
    contentStyle: { borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 },
  };

  const ANALYSIS_TABS = [
    ['overview', 'Vue d\'ensemble'],
    ['revenue',  'Revenus'],
    ['audience', 'Audience'],
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
        <div className="h-32 w-full animate-pulse" style={{ background: ADMIN_GRAD, opacity: 0.7 }} />
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" style={CARD_STYLE} />)}
          </div>
          <div className="h-80 bg-white rounded-xl animate-pulse" style={CARD_STYLE} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <BarChart3 size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Statistiques</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {totalUsers.toLocaleString('fr-FR')} utilisateurs · {totalVisits.toLocaleString('fr-FR')} visites · {totalPaiementsAmount.toLocaleString('fr-FR')} F CFA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white/15 hover:bg-white/20 text-white text-sm font-medium outline-none border border-white/20">
              <option value="7days"    className="text-[#18181B]">7 derniers jours</option>
              <option value="30days"   className="text-[#18181B]">30 derniers jours</option>
              <option value="3months"  className="text-[#18181B]">Trimestre</option>
              <option value="6months"  className="text-[#18181B]">Semestre</option>
              <option value="12months" className="text-[#18181B]">12 mois</option>
            </select>
            <button onClick={exportStats}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <Download size={15} /> Exporter
            </button>
            <button onClick={loadStats}
              className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-7">

        {/* ── Row 1 KPIs: Platform ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Utilisateurs',   value: totalUsers.toLocaleString('fr-FR'),              icon: Users,    c: '#1565C0', bg: '#E8F1FD', sub: 'Comptes actifs' },
            { label: 'Portfolios',     value: totalPortfolios.toLocaleString('fr-FR'),          icon: Globe,    c: '#2E7D32', bg: '#EAF5EB', sub: 'Projets créés' },
            { label: 'CA encaissé',    value: `${totalPaiementsAmount.toLocaleString('fr-FR')} F`, icon: DollarSign, c: '#6D28D9', bg: '#EDE9FE', sub: `${totalPaiements} paiements` },
            { label: 'Panier moyen',   value: `${avgPaiement.toLocaleString('fr-FR')} F`,      icon: CreditCard, c: '#B45309', bg: '#FEF3E2', sub: `ARPU: ${revenuePerUser.toLocaleString('fr-FR')} F` },
          ].map(({ label, value, icon: Icon, c, bg, sub }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5 mb-2">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#18181B] leading-none tabular-nums truncate">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{label}</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Row 2 KPIs: Performance ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Visites totales', value: totalVisits.toLocaleString('fr-FR'), growth: visitGrowth,  icon: Eye,         c: '#1565C0', bg: '#E8F1FD' },
            { label: 'Revenue',         value: `${totalRevenue.toLocaleString('fr-FR')} F`, growth: revenueGrowth, icon: TrendingUp, c: '#2E7D32', bg: '#EAF5EB' },
            { label: 'Commandes',       value: totalOrders.toLocaleString('fr-FR'),  sub: `Moy: ${avgOrderValue.toLocaleString('fr-FR')} F`, icon: ShoppingCart, c: '#6D28D9', bg: '#EDE9FE' },
            { label: 'Conversion',      value: `${conversionRate}%`, sub: `1 conv. / ${Math.round(totalVisits / (totalOrders || 1))} visites`, icon: Target, c: '#B45309', bg: '#FEF3E2' },
          ].map(({ label, value, growth, sub, icon: Icon, c, bg }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: c }}>
                  <Icon size={16} />
                </span>
                {growth !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={growth >= 0 ? { background: '#EAF5EB', color: '#2E7D32' } : { background: '#FEECEC', color: '#C62828' }}>
                    {growth >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {growth > 0 ? '+' : ''}{growth}%
                  </span>
                )}
              </div>
              <p className="text-xl font-extrabold text-[#18181B] tabular-nums">{value}</p>
              <p className="text-xs text-zinc-400 mt-1">{sub ?? label}</p>
            </div>
          ))}
        </div>

        {/* ── Analysis tabs ─────────────────────────────────────────────────────── */}
        <div className="bg-white overflow-hidden" style={CARD_STYLE}>
          {/* Tab bar */}
          <div className="flex items-center gap-2 px-5 pt-5 border-b border-[#E7E7EA] pb-0">
            {ANALYSIS_TABS.map(([k, label]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === k
                    ? 'border-[#2E7D32] text-[#2E7D32]'
                    : 'border-transparent text-zinc-500 hover:text-[#18181B]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">

            {/* ── Vue d'ensemble ── */}
            {activeTab === 'overview' && (
              <>
                <div className="grid lg:grid-cols-2 gap-5">
                  {/* Visits Area Chart */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#E8F1FD', color: '#1565C0' }}>
                        <Activity size={14} />
                      </span>
                      <p className="text-sm font-bold text-[#18181B]">Visites mensuelles</p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                          <defs>
                            <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#2E7D32" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                          <Tooltip {...CHART_TOOLTIP} />
                          <Area type="monotone" dataKey="visits" stroke="#2E7D32" strokeWidth={2.5} fillOpacity={1} fill="url(#gradVisits)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Revenue Bar Chart */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                        <DollarSign size={14} />
                      </span>
                      <p className="text-sm font-bold text-[#18181B]">Revenue mensuel</p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formattedData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                          <Tooltip {...CHART_TOOLTIP} formatter={(val: number) => [`${val.toLocaleString('fr-FR')} F`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#2E7D32" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Platform donut */}
                  <div className="rounded-xl p-5 space-y-4" style={{ background: '#1B5E20' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Source plateforme</p>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={platformData} cx="50%" cy="50%" innerRadius={48} outerRadius={65} paddingAngle={8} dataKey="value">
                            {platformData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 10, background: '#18181B', border: 'none', color: '#fff', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {platformData.map(p => (
                        <div key={p.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            <span className="text-xs text-white/60">{p.name}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{p.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent journal */}
                  <div className="lg:col-span-2 rounded-xl border border-[#E7E7EA] p-5 space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Journal récent</p>
                    <div className="space-y-3">
                      {revenue.slice(-4).reverse().map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-[#E7E7EA] last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                              <UserPlus size={13} />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-[#18181B]">{item.orders} acquisition{item.orders !== 1 ? 's' : ''}</p>
                              <p className="text-xs text-zinc-400">{format(new Date(item.month), 'MMMM yyyy', { locale: fr })}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums" style={{ color: '#2E7D32' }}>
                            +{item.revenue.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Revenus tab ── */}
            {activeTab === 'revenue' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                    <TrendingUp size={14} />
                  </span>
                  <p className="text-sm font-bold text-[#18181B]">Trajectoire du revenue</p>
                </div>
                <div className="h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Line type="monotone" dataKey="revenue" stroke="#2E7D32" strokeWidth={3}
                        dot={{ r: 5, fill: '#2E7D32', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="orders" stroke="#1565C0" strokeWidth={2}
                        strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue summary strip */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Revenue total',   value: `${totalRevenue.toLocaleString('fr-FR')} F`, c: '#2E7D32' },
                    { label: 'Commandes total', value: totalOrders.toLocaleString('fr-FR'),          c: '#1565C0' },
                    { label: 'Valeur moyenne',  value: `${avgOrderValue.toLocaleString('fr-FR')} F`, c: '#6D28D9' },
                  ].map(({ label, value, c }) => (
                    <div key={label} className="rounded-xl border border-[#E7E7EA] p-3 text-center">
                      <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wide">{label}</p>
                      <p className="text-lg font-extrabold mt-1 tabular-nums" style={{ color: c }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Audience tab ── */}
            {activeTab === 'audience' && (
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                      <Users size={14} />
                    </span>
                    <p className="text-sm font-bold text-[#18181B]">Densité d'acquisition audience</p>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formattedData}>
                        <defs>
                          <linearGradient id="gradAudience" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6D28D9" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6D28D9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1A1AA' }} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Area type="monotone" dataKey="visits" stroke="#6D28D9" strokeWidth={2.5} fillOpacity={1} fill="url(#gradAudience)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl p-5 space-y-5" style={{ background: '#1B5E20' }}>
                  <p className="text-sm font-bold text-white">KPI Audience</p>
                  {[
                    { label: 'Taux de rétention',   val: '84%',                    pct: 84 },
                    { label: 'Taux de conversion',  val: `${conversionRate}%`,     pct: parseFloat(conversionRate) },
                    { label: 'Revenu par tête',     val: `${revenuePerUser.toLocaleString('fr-FR')} F`, pct: Math.min(100, (revenuePerUser / 10000) * 100) },
                    { label: 'Accélération Portfolio', val: '+22%',                pct: 22 },
                  ].map((m, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white/60">{m.label}</span>
                        <span className="text-white">{m.val}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white/70 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, m.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Insight footer ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Engagement moy. / session', val: '4m 32s', icon: Clock,    c: '#1565C0', bg: '#E8F1FD' },
            { label: 'Pages vues / visite',       val: '3.8',    icon: Activity, c: '#2E7D32', bg: '#EAF5EB' },
            { label: 'Acquisitions potentielles', val: `+${Math.round(totalVisits * 0.05)}`, icon: UserPlus, c: '#6D28D9', bg: '#EDE9FE' },
          ].map(({ label, val, icon: Icon, c, bg }) => (
            <div key={label} className="bg-white p-5 flex items-center gap-4" style={CARD_STYLE}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: c }}>
                <Icon size={18} />
              </span>
              <div>
                <p className="text-xl font-extrabold text-[#18181B] tabular-nums">{val}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
