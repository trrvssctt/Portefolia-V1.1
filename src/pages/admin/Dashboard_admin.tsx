import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Briefcase, CreditCard,
  TrendingUp, ShoppingCart, AlertCircle,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Banknote, CalendarDays, Activity, ArrowRight,
  History, Sparkles, ChevronRight, Clock3,
  BarChart3, Package, UserPlus, Smartphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  total_revenue: number;
  today_revenue: number;
  month_revenue: number;
  last_month_revenue: number;
  year_revenue: number;
  revenue_growth: number;
  monthly_revenue: { month: string; revenue: number }[];
  total_users: number;
  users_this_month: number;
  users_last_month: number;
  user_growth: number;
  total_portfolios: number;
  total_commandes: number;
  commandes_this_month: number;
  commandes_last_month: number;
  order_growth: number;
  commandes_pending: number;
  total_cartes: number;
  cartes_active: number;
  pending_upgrades: number;
  failed_payments_month: number;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = true) => {
  const s = Math.round(n).toLocaleString('fr-FR');
  return currency ? `${s} F` : s;
};

function GrowthBadge({ value, label = 'période passée' }: { value: number; label?: string }) {
  if (value === 0) return <span className="text-[10px] text-zinc-400">vs {label}</span>;
  const up = value > 0;
  return (
    <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[11px] font-bold"
      style={up ? { background: '#EAF5EB', color: '#2E7D32' } : { background: '#FEECEC', color: '#C62828' }}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: any[]; color: string }) {
  if (!data || data.length === 0) return null;
  const safeId = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="revenue" stroke={color} strokeWidth={1.5}
            fillOpacity={1} fill={`url(#grad-${safeId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Revenue chart ────────────────────────────────────────────────────────────
function MainRevenueChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return (
    <div className="h-64 flex items-center justify-center text-zinc-400 text-sm italic">
      Données insuffisantes pour afficher le graphique
    </div>
  );
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#A5D6A7" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#A5D6A7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="" vertical={false} stroke="#F4F4F5" />
          <XAxis dataKey="month" axisLine={false} tickLine={false}
            tick={{ fontSize: 11, fill: '#A1A1AA' }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A1A1AA' }}
            tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: '10px 14px', fontSize: 12 }}
            formatter={(value: number) => [`${Math.round(value).toLocaleString('fr-FR')} FCFA`, 'Revenu']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#2E7D32" strokeWidth={2}
            fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Plan distribution chart ──────────────────────────────────────────────────
const PIE_COLORS = ['#2E7D32', '#43A047', '#66BB6A', '#A5D6A7', '#C8E6C9', '#1565C0'];

function PlanDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    if (percent < 0.05) return null;
    const R = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 1.35;
    const x = cx + r * Math.cos(-midAngle * R);
    const y = cy + r * Math.sin(-midAngle * R);
    return (
      <text x={x} y={y} fill="#18181B" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 600 }}>
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3}
            dataKey="users_count" nameKey="name" labelLine={false} label={renderLabel}>
            {data.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', fontSize: 12 }}
            formatter={(v: number, n: string) => [v + ' clients', n]} />
          <Legend iconType="circle" iconSize={8}
            formatter={(v) => <span style={{ fontSize: 11, color: '#71717A' }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Time-travel helpers ──────────────────────────────────────────────────────
type Granularity = 'day' | 'month' | 'quarter' | 'year';

function buildHistDateRange(granularity: Granularity, histDate: string): { from: string; to: string } | null {
  if (!histDate) return null;
  if (granularity === 'day') return { from: `${histDate} 00:00:00`, to: `${histDate} 23:59:59` };
  if (granularity === 'month') {
    const [yr, mo] = histDate.split('-').map(Number);
    const last = new Date(yr, mo, 0).getDate();
    return { from: `${histDate}-01 00:00:00`, to: `${histDate}-${String(last).padStart(2,'0')} 23:59:59` };
  }
  if (granularity === 'quarter') {
    const [yrStr, qStr] = histDate.split('-Q');
    const yr = parseInt(yrStr), q = parseInt(qStr);
    const sm = (q-1)*3+1, em = q*3;
    const last = new Date(yr, em, 0).getDate();
    return { from: `${yr}-${String(sm).padStart(2,'0')}-01 00:00:00`, to: `${yr}-${String(em).padStart(2,'0')}-${String(last).padStart(2,'0')} 23:59:59` };
  }
  if (granularity === 'year') return { from: `${histDate}-01-01 00:00:00`, to: `${histDate}-12-31 23:59:59` };
  return null;
}

function formatHistLabel(granularity: Granularity, histDate: string): string {
  if (!histDate) return '';
  if (granularity === 'day') return new Date(histDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (granularity === 'month') { const [yr, mo] = histDate.split('-').map(Number); return new Date(yr, mo-1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
  if (granularity === 'quarter') { const [yr, q] = histDate.split('-Q'); return `T${q} ${yr}`; }
  return histDate;
}

// ─── Status colors for paiements ──────────────────────────────────────────────
const statusPill: Record<string, { c: string; bg: string }> = {
  confirmed: { c: '#2E7D32', bg: '#EAF5EB' },
  paid:      { c: '#2E7D32', bg: '#EAF5EB' },
  'Réussi':  { c: '#2E7D32', bg: '#EAF5EB' },
  pending:   { c: '#B45309', bg: '#FEF3E2' },
  failed:    { c: '#C62828', bg: '#FEECEC' },
  cancelled: { c: '#52525B', bg: '#F4F4F5' },
};

// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast }   = useToast();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers]   = useState<any[]>([]);
  const [recentPaiements, setRecentPaiements] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [range, setRange]               = useState('month');
  const [wavePending, setWavePending]   = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);

  // Time-travel state
  const [ttMode, setTtMode]             = useState<'live' | 'history'>('live');
  const [ttGranularity, setTtGranularity] = useState<Granularity>('month');
  const [ttDate, setTtDate]             = useState('');
  const [ttQYear, setTtQYear]           = useState(String(new Date().getFullYear() - 1));
  const [ttQNum, setTtQNum]             = useState('1');

  const currentYear  = new Date().getFullYear();
  const yearOptions  = Array.from({ length: currentYear - 2019 }, (_, i) => String(currentYear - 1 - i));
  const effectiveHistDate = ttGranularity === 'quarter' ? `${ttQYear}-Q${ttQNum}` : ttDate;

  const rangeLabels: Record<string, string> = { today: 'hier', week: 'semaine passée', month: 'mois passé', year: 'année passée' };

  const isHistoricalView = ttMode === 'history' && !!effectiveHistDate;
  const histLabel        = isHistoricalView ? formatHistLabel(ttGranularity, effectiveHistDate) : '';

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = useCallback(async (opts: { range?: string; mode?: 'live'|'history'; date?: string; granularity?: Granularity } = {}) => {
    const selRange       = opts.range       ?? range;
    const selMode        = opts.mode        ?? ttMode;
    const selDate        = opts.date        ?? effectiveHistDate;
    const selGranularity = opts.granularity ?? ttGranularity;

    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' };
      if (token) headers.Authorization = `Bearer ${token}`;

      let statsUrl: string, usersUrl: string, paiementsUrl: string;

      if (selMode === 'history' && selDate) {
        statsUrl = `${API_BASE}/api/admin/dashboard/stats?mode=history&date=${encodeURIComponent(selDate)}&granularity=${selGranularity}`;
        const dateRange = buildHistDateRange(selGranularity, selDate);
        const rq = dateRange ? `&from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}` : '';
        usersUrl     = `${API_BASE}/api/admin/users?limit=5${rq}`;
        paiementsUrl = `${API_BASE}/api/admin/paiements?limit=6${rq}`;
      } else {
        statsUrl     = `${API_BASE}/api/admin/dashboard/stats?range=${selRange}`;
        usersUrl     = `${API_BASE}/api/admin/users?limit=5&sort=created_at:desc`;
        paiementsUrl = `${API_BASE}/api/admin/paiements?limit=6`;
      }

      const [statsRes, usersRes, paiementsRes, plansRes] = await Promise.all([
        fetch(statsUrl, { headers }),
        fetch(usersUrl, { headers }),
        fetch(paiementsUrl, { headers }),
        fetch(`${API_BASE}/api/admin/stats/plans-distribution`, { headers }),
      ]);

      if (statsRes.ok)    setStats(await statsRes.json());
      if (usersRes.ok)    { const d = await usersRes.json(); setRecentUsers(d.users || d.data || []); }
      if (paiementsRes.ok){ const d = await paiementsRes.json(); setRecentPaiements(d.paiements || d.data || []); }
      if (plansRes.ok)    { const d = await plansRes.json(); setPlanDistribution(d.distribution || []); }

      try {
        const badgesRes = await fetch(`${API_BASE}/api/admin/badges`, { headers });
        if (badgesRes.ok) {
          const b = await badgesRes.json();
          setWavePending(b.pending_wave_payments ?? 0);
          setExpiringSoon(b.expiring_soon ?? 0);
        }
      } catch { /* non-bloquant */ }
    } catch {
      toast({ title: 'Erreur de connexion', description: 'Impossible de charger les données', variant: 'destructive' });
    } finally { setLoading(false); setRefreshing(false); }
  }, [range, ttMode, effectiveHistDate, ttGranularity]);

  useEffect(() => { load(); }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const applyTimeTravel = () => {
    if (!effectiveHistDate) {
      toast({ title: 'Sélectionnez une date', description: 'Veuillez choisir une période avant de continuer.', variant: 'destructive' });
      return;
    }
    load({ mode: 'history', date: effectiveHistDate, granularity: ttGranularity });
  };

  const switchToLive = () => { setTtMode('live'); load({ mode: 'live', range }); };

  const hasAlerts = !loading && (wavePending > 0 || expiringSoon > 0 || (stats && (stats.pending_upgrades > 0 || stats.failed_payments_month > 0)));

  const GRAN_LABELS: Record<Granularity, string> = { day: 'Jour', month: 'Mois', quarter: 'Trimestre', year: 'Année' };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: isHistoricalView ? 'linear-gradient(135deg, #374151, #1F2937)' : ADMIN_GRAD, transition: 'background 0.5s' }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <BarChart3 size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Tableau de bord</h1>
              <p className="text-white/65 text-sm mt-0.5 flex items-center gap-1.5">
                {isHistoricalView ? (
                  <>
                    <Clock3 size={12} />
                    <span>Historique ·</span>
                    <span className="font-semibold">{histLabel}</span>
                    <button onClick={switchToLive} className="ml-2 underline hover:no-underline text-white/80 hover:text-white">Retour live →</button>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Opérationnel · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ttMode === 'live' && (
              <select value={range} onChange={e => { setRange(e.target.value); load({ range: e.target.value, mode: 'live' }); }}
                className="h-10 px-3 rounded-lg bg-white/15 hover:bg-white/20 text-white text-sm font-medium outline-none border border-white/20">
                <option value="today"  className="text-[#18181B]">Aujourd'hui</option>
                <option value="week"   className="text-[#18181B]">Cette semaine</option>
                <option value="month"  className="text-[#18181B]">Ce mois</option>
                <option value="year"   className="text-[#18181B]">Cette année</option>
              </select>
            )}
            <button onClick={() => load()} disabled={refreshing}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Sync…' : 'Actualiser'}
            </button>
            <button className="h-10 px-4 rounded-lg bg-white text-[#1B5E20] text-sm font-bold flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <ArrowUpRight size={14} /> Rapport
            </button>
          </div>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-6">

        {/* ── Time-travel bar ───────────────────────────────────────────────────── */}
        <div className="bg-white overflow-hidden" style={CARD_STYLE}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 p-3">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg shrink-0">
              <button onClick={switchToLive}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${ttMode === 'live' ? 'bg-white text-[#18181B] shadow-sm' : 'text-zinc-500 hover:text-[#18181B]'}`}>
                <Sparkles size={12} className="text-[#2E7D32]" /> Live
              </button>
              <button onClick={() => setTtMode('history')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${ttMode === 'history' ? 'bg-[#18181B] text-white shadow-sm' : 'text-zinc-500 hover:text-[#18181B]'}`}>
                <History size={12} /> Historique
              </button>
            </div>

            {/* History controls */}
            {ttMode === 'history' && (
              <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* Granularity pills */}
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg shrink-0">
                  {(['day','month','quarter','year'] as Granularity[]).map(g => (
                    <button key={g} onClick={() => { setTtGranularity(g); setTtDate(''); }}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${ttGranularity === g ? 'bg-[#18181B] text-white' : 'text-zinc-500 hover:text-[#18181B]'}`}>
                      {GRAN_LABELS[g]}
                    </button>
                  ))}
                </div>

                {/* Date picker */}
                <div className="flex items-center gap-2 flex-1">
                  {ttGranularity === 'day' && (
                    <input type="date" value={ttDate} max={new Date().toISOString().split('T')[0]}
                      onChange={e => setTtDate(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#18181B]" />
                  )}
                  {ttGranularity === 'month' && (
                    <input type="month" value={ttDate}
                      max={`${currentYear}-${String(new Date().getMonth()+1).padStart(2,'0')}`}
                      onChange={e => setTtDate(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#18181B]" />
                  )}
                  {ttGranularity === 'quarter' && (
                    <div className="flex items-center gap-2">
                      <select value={ttQNum} onChange={e => setTtQNum(e.target.value)}
                        className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none">
                        {['1','2','3','4'].map(q => <option key={q} value={q}>T{q}</option>)}
                      </select>
                      <select value={ttQYear} onChange={e => setTtQYear(e.target.value)}
                        className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}
                  {ttGranularity === 'year' && (
                    <select value={ttDate || yearOptions[0]} onChange={e => setTtDate(e.target.value)}
                      className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none">
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  )}
                  <button onClick={applyTimeTravel} disabled={refreshing || !effectiveHistDate}
                    className="h-9 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                    style={{ background: '#18181B' }}>
                    {refreshing ? <RefreshCw size={12} className="animate-spin" /> : <><History size={12} /> Voyager</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Historical banner */}
          {isHistoricalView && (
            <div className="border-t border-[#E7E7EA] px-5 py-2.5 flex items-center justify-between"
              style={{ background: '#18181B' }}>
              <div className="flex items-center gap-2 text-white text-xs">
                <Clock3 size={13} className="opacity-70" />
                <span className="font-bold uppercase tracking-widest opacity-60 text-[10px]">Instantané du</span>
                <span className="font-bold">{histLabel}</span>
              </div>
              <button onClick={switchToLive}
                className="text-[11px] font-bold text-white/70 hover:text-white underline underline-offset-2 transition-colors">
                Retour au Live →
              </button>
            </div>
          )}
        </div>

        {/* ── Alertes actives ───────────────────────────────────────────────────── */}
        {hasAlerts && (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#E7E7EA]">
              <AlertCircle size={16} style={{ color: '#B45309' }} />
              <span className="text-sm font-bold text-[#18181B] flex-1">Actions requises</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3E2', color: '#B45309' }}>
                {[wavePending, expiringSoon, stats?.pending_upgrades ?? 0, stats?.failed_payments_month ?? 0].filter(Boolean).length} urgentes
              </span>
            </div>
            <div className="divide-y divide-[#E7E7EA]">
              {wavePending > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide" style={{ color: '#B45309', background: '#FEF3E2' }}>Attention</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#18181B]"><strong>{wavePending}</strong> paiement{wavePending > 1 ? 's' : ''} Wave en attente</p>
                    <p className="text-[11px] text-zinc-400">Validation manuelle requise</p>
                  </div>
                  <Link to="/admin/wave-validation" className="shrink-0 text-[12px] font-bold hover:underline whitespace-nowrap flex items-center gap-1" style={{ color: '#B45309' }}>
                    Valider <ArrowRight size={11} />
                  </Link>
                </div>
              )}
              {expiringSoon > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase" style={{ color: '#B45309', background: '#FEF3E2' }}>Attention</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#18181B]"><strong>{expiringSoon}</strong> abonnement{expiringSoon > 1 ? 's' : ''} expirent dans 5 jours</p>
                  </div>
                  <Link to="/admin/users?filter=expired" className="shrink-0 text-[12px] font-bold hover:underline whitespace-nowrap flex items-center gap-1" style={{ color: '#B45309' }}>
                    Voir <ArrowRight size={11} />
                  </Link>
                </div>
              )}
              {stats && stats.pending_upgrades > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase" style={{ color: '#1565C0', background: '#E8F1FD' }}>Info</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#18181B]"><strong>{stats.pending_upgrades}</strong> upgrade{stats.pending_upgrades > 1 ? 's' : ''} en attente d'approbation</p>
                  </div>
                  <Link to="/admin/upgrades" className="shrink-0 text-[12px] font-bold hover:underline whitespace-nowrap flex items-center gap-1" style={{ color: '#1565C0' }}>
                    Gérer <ArrowRight size={11} />
                  </Link>
                </div>
              )}
              {stats && stats.failed_payments_month > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/60 transition-colors">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase" style={{ color: '#C62828', background: '#FEECEC' }}>Critique</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#18181B]"><strong>{stats.failed_payments_month}</strong> paiement{stats.failed_payments_month > 1 ? 's' : ''} échoué{stats.failed_payments_month > 1 ? 's' : ''} ce mois</p>
                  </div>
                  <Link to="/admin/paiements" className="shrink-0 text-[12px] font-bold hover:underline whitespace-nowrap flex items-center gap-1" style={{ color: '#C62828' }}>
                    Voir <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── KPI financiers ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400 mb-3">Indicateurs financiers</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Revenus',      color: '#2E7D32', value: stats?.month_revenue ?? 0,         growth: stats?.revenue_growth ?? 0, isCurrency: true,  icon: Banknote,     data: stats?.monthly_revenue || [] },
              { label: 'Inscriptions', color: '#1565C0', value: stats?.users_this_month ?? 0,      growth: stats?.user_growth ?? 0,    isCurrency: false, icon: UserPlus,     data: [{ revenue: stats?.users_last_month ?? 0 }, { revenue: stats?.users_this_month ?? 0 }] },
              { label: 'Conversions',  color: '#E65100', value: stats?.commandes_this_month ?? 0,  growth: stats?.order_growth ?? 0,   isCurrency: false, icon: ShoppingCart, data: [{ revenue: stats?.commandes_last_month ?? 0 }, { revenue: stats?.commandes_this_month ?? 0 }] },
              { label: 'Portfolios',   color: '#7B1FA2', value: stats?.total_portfolios ?? 0,      growth: 0,                          isCurrency: false, icon: Activity,     data: [{ revenue: 10 }, { revenue: 15 }, { revenue: 12 }, { revenue: 18 }] },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white overflow-hidden"
                style={{ ...CARD_STYLE, borderLeft: `4px solid ${kpi.color}` }}>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: kpi.color + '1F', color: kpi.color }}>
                      <kpi.icon size={17} />
                    </div>
                    <GrowthBadge value={kpi.growth} label={isHistoricalView ? 'période précédente' : (rangeLabels[range] ?? 'période passée')} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">{kpi.label}</p>
                    {loading
                      ? <div className="h-8 w-24 bg-zinc-100 rounded animate-pulse" />
                      : <p className="text-2xl font-bold text-[#18181B] tabular-nums leading-none">{fmt(kpi.value, kpi.isCurrency)}</p>
                    }
                  </div>
                  <Sparkline data={kpi.data} color={kpi.color} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI plateforme ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Utilisateurs totaux',  value: stats?.total_users ?? 0,       icon: Users,       c: '#1565C0', bg: '#E8F1FD', delta: stats?.user_growth ? `+${stats.user_growth}%` : '—' },
            { label: 'Commandes totales',    value: stats?.total_commandes ?? 0,   icon: ShoppingCart,c: '#B45309', bg: '#FEF3E2', delta: stats?.order_growth ? `+${stats.order_growth}%` : '—' },
            { label: 'Cartes NFC actives',   value: stats?.cartes_active ?? 0,     icon: CreditCard,  c: '#2E7D32', bg: '#EAF5EB', delta: '—' },
            { label: 'Upgrades en attente',  value: stats?.pending_upgrades ?? 0,  icon: TrendingUp,  c: '#6D28D9', bg: '#EDE9FE', delta: '—' },
          ].map(k => (
            <div key={k.label} className="bg-white p-4" style={CARD_STYLE}>
              <div className="flex items-center justify-between mb-2">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg, color: k.c }}>
                  <k.icon size={16} />
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ color: '#2E7D32', background: '#2E7D3215' }}>{k.delta}</span>
              </div>
              {loading
                ? <div className="h-7 w-20 bg-zinc-100 rounded animate-pulse mt-2" />
                : <p className="text-2xl font-extrabold text-[#18181B] leading-none tabular-nums mt-1">{typeof k.value === 'number' ? k.value.toLocaleString('fr-FR') : k.value}</p>
              }
              <p className="text-xs text-zinc-500 mt-1.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ── Revenue chart + Plan distribution ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white p-5" style={CARD_STYLE}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#18181B]">Évolution des revenus</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isHistoricalView ? `Instantané — ${histLabel}` : `Flux de trésorerie (${rangeLabels[range] ?? range})`}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                <Activity size={11} /> Revenu (F)
              </span>
            </div>
            {loading
              ? <div className="h-64 bg-zinc-100 rounded-xl animate-pulse mt-4" />
              : <MainRevenueChart data={stats?.monthly_revenue || []} />
            }
          </div>
          <div className="bg-white p-5" style={CARD_STYLE}>
            <h3 className="text-sm font-bold text-[#18181B]">Distribution par plan</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Popularité des offres</p>
            {loading
              ? <div className="h-64 bg-zinc-100 rounded-xl animate-pulse mt-4" />
              : <PlanDistributionChart data={planDistribution} />
            }
          </div>
        </div>

        {/* ── Activity feed ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent paiements */}
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="px-5 py-4 border-b border-[#E7E7EA] flex items-center justify-between">
              <h3 className="font-bold text-[#18181B] text-sm flex items-center gap-2">
                <CreditCard size={15} style={{ color: '#2E7D32' }} />
                {isHistoricalView ? `Transactions — ${histLabel}` : 'Dernières transactions'}
              </h3>
              <Link to="/admin/paiements" className="text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: '#2E7D32' }}>
                Voir tout <ArrowRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-zinc-400 bg-zinc-50/60">
                    <th className="px-5 py-2.5 font-semibold">Client</th>
                    <th className="px-5 py-2.5 font-semibold">Montant</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7EA]">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-5 py-3"><div className="h-8 bg-zinc-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : recentPaiements.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-zinc-400 text-sm">Aucune transaction</td></tr>
                  ) : (
                    recentPaiements.map(p => {
                      const sp = statusPill[p.statut] ?? { c: '#52525B', bg: '#F4F4F5' };
                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                                {(p.user_email?.[0] || 'P').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[#18181B] truncate max-w-[130px]">{p.user_email || `#${p.id}`}</p>
                                <p className="text-[10px] text-zinc-400">{formatDate(p.created_at)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-bold text-[#18181B] tabular-nums whitespace-nowrap">{fmt(Number(p.montant || 0))}</td>
                          <td className="px-5 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                              style={{ color: sp.c, background: sp.bg }}>
                              {p.statut}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent users */}
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="px-5 py-4 border-b border-[#E7E7EA] flex items-center justify-between">
              <h3 className="font-bold text-[#18181B] text-sm flex items-center gap-2">
                <Users size={15} style={{ color: '#1565C0' }} />
                {isHistoricalView ? `Inscrits — ${histLabel}` : 'Nouveaux inscrits'}
              </h3>
              <Link to="/admin/users" className="text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: '#1565C0' }}>
                Gérer <ArrowRight size={11} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-zinc-400 bg-zinc-50/60">
                    <th className="px-5 py-2.5 font-semibold">Utilisateur</th>
                    <th className="px-5 py-2.5 font-semibold">Plan</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7EA]">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-5 py-3"><div className="h-8 bg-zinc-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : recentUsers.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-zinc-400 text-sm">Aucun nouvel utilisateur</td></tr>
                  ) : (
                    recentUsers.map(u => (
                      <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: '#E8F1FD', color: '#1565C0' }}>
                              {(u.first_name?.[0] || u.prenom?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#18181B]">{u.first_name || u.prenom} {u.last_name || u.nom}</p>
                              <p className="text-[10px] text-zinc-400 truncate max-w-[130px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {u.plan_name
                            ? <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#EDE9FE', color: '#6D28D9' }}>{u.plan_name}</span>
                            : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-[11px] text-zinc-500">
                          {formatDate(u.created_at).split(' ')[0]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Actions rapides ───────────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Actions rapides</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Utilisateurs', icon: Users,       to: '/admin/users',      c: '#1565C0', bg: '#E8F1FD' },
              { label: 'Portfolios',   icon: Briefcase,   to: '/admin/portfolios', c: '#6D28D9', bg: '#EDE9FE' },
              { label: 'Commandes',    icon: ShoppingCart,to: '/admin/commandes',  c: '#B45309', bg: '#FEF3E2' },
              { label: 'Paiements',    icon: Banknote,    to: '/admin/paiements',  c: '#2E7D32', bg: '#EAF5EB' },
              { label: 'Statistiques', icon: TrendingUp,  to: '/admin/stats',      c: '#0D7490', bg: '#E0F2FE' },
              { label: 'Paramètres',   icon: Smartphone,  to: '/admin/settings',   c: '#52525B', bg: '#F4F4F5' },
            ].map(item => (
              <Link key={item.label} to={item.to}
                className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-xl border border-transparent hover:border-[#E7E7EA] hover:shadow-sm transition-all"
                style={CARD_STYLE}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.c }}>
                  <item.icon size={20} strokeWidth={1.8} />
                </div>
                <span className="text-xs font-semibold text-[#18181B] text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
