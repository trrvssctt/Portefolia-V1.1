import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Users, Briefcase, CreditCard,
  TrendingUp, ShoppingCart, AlertCircle,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Banknote, CalendarDays, Zap,
  UserPlus, Smartphone,
  Activity, ArrowRight, History, Sparkles,
  ChevronRight, Clock3
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3000';

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

const fmt = (n: number, currency = true) => {
  const s = Math.round(n).toLocaleString('fr-FR');
  return currency ? `${s} F` : s;
};

const GrowthBadge = ({ value, label = "période passée" }: { value: number, label?: string }) => {
  if (value === 0) return <span className="text-[10px] text-gray-400 font-medium">vs {label}</span>;
  const up = value > 0;
  return (
    <div className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[11px] font-bold ${up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
      }`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </div>
  );
};

// Sparkline 40px
const Sparkline = ({ data, color }: { data: any[], color: string }) => {
  if (!data || data.length === 0) return null;
  const safeId = color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={color}
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#grad-${safeId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MainRevenueChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return (
    <div className="h-64 flex items-center justify-center text-gray-400 text-sm italic">
      Données de revenus insuffisantes pour afficher le graphique
    </div>
  );

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A5D6A7" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#A5D6A7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="" vertical={false} stroke="#F0F0F0" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9E9E9E', fontFamily: 'Inter, sans-serif' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9E9E9E', fontFamily: 'Inter, sans-serif' }}
            tickFormatter={(val) => `${val / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              padding: '10px 14px',
              fontFamily: 'Inter, sans-serif',
            }}
            formatter={(value: number) => [`${Math.round(value).toLocaleString('fr-FR')} FCFA`, 'Revenu']}
            labelStyle={{ fontWeight: 600, color: '#1A1A2E', marginBottom: '4px', fontSize: '12px' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2E7D32"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const PIE_COLORS = ['#2E7D32', '#43A047', '#66BB6A', '#A5D6A7', '#C8E6C9', '#1565C0'];

const PlanDistributionChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text
        x={x}
        y={y}
        fill="#1A1A2E"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
      >
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="users_count"
            nameKey="name"
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [value + ' clients', name]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: '11px', color: '#5C5C5C', fontFamily: 'Inter, sans-serif' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Time-travel helpers ──────────────────────────────────────────────────────
type Granularity = 'day' | 'month' | 'quarter' | 'year';

function buildHistDateRange(granularity: Granularity, histDate: string): { from: string; to: string } | null {
  if (!histDate) return null;
  if (granularity === 'day') {
    return { from: `${histDate} 00:00:00`, to: `${histDate} 23:59:59` };
  }
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
  if (granularity === 'year') {
    return { from: `${histDate}-01-01 00:00:00`, to: `${histDate}-12-31 23:59:59` };
  }
  return null;
}

function formatHistLabel(granularity: Granularity, histDate: string): string {
  if (!histDate) return '';
  if (granularity === 'day') {
    return new Date(histDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (granularity === 'month') {
    const [yr, mo] = histDate.split('-').map(Number);
    return new Date(yr, mo-1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  if (granularity === 'quarter') {
    const [yr, q] = histDate.split('-Q');
    return `T${q} ${yr}`;
  }
  return histDate;
}

// ── Main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentPaiements, setRecentPaiements] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [range, setRange] = useState('month');
  const [wavePending, setWavePending] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);

  // Time-travel state
  const [ttMode, setTtMode] = useState<'live' | 'history'>('live');
  const [ttGranularity, setTtGranularity] = useState<Granularity>('month');
  const [ttDate, setTtDate] = useState<string>('');
  const [ttQYear, setTtQYear] = useState<string>(String(new Date().getFullYear() - 1));
  const [ttQNum, setTtQNum] = useState<string>('1');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2019 }, (_, i) => String(currentYear - 1 - i));

  const effectiveHistDate = ttGranularity === 'quarter' ? `${ttQYear}-Q${ttQNum}` : ttDate;

  const load = useCallback(async (opts: { range?: string; mode?: 'live'|'history'; date?: string; granularity?: Granularity } = {}) => {
    const selRange = opts.range ?? range;
    const selMode = opts.mode ?? ttMode;
    const selDate = opts.date ?? effectiveHistDate;
    const selGranularity = opts.granularity ?? ttGranularity;

    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' };
      if (token) headers.Authorization = `Bearer ${token}`;

      let statsUrl: string;
      let usersUrl: string;
      let paiementsUrl: string;

      if (selMode === 'history' && selDate) {
        statsUrl = `${API_BASE}/api/admin/dashboard/stats?mode=history&date=${encodeURIComponent(selDate)}&granularity=${selGranularity}`;
        const dateRange = buildHistDateRange(selGranularity, selDate);
        const rq = dateRange ? `&from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}` : '';
        usersUrl = `${API_BASE}/api/admin/users?limit=5${rq}`;
        paiementsUrl = `${API_BASE}/api/admin/paiements?limit=6${rq}`;
      } else {
        statsUrl = `${API_BASE}/api/admin/dashboard/stats?range=${selRange}`;
        usersUrl = `${API_BASE}/api/admin/users?limit=5&sort=created_at:desc`;
        paiementsUrl = `${API_BASE}/api/admin/paiements?limit=6`;
      }

      const [statsRes, usersRes, paiementsRes, plansRes] = await Promise.all([
        fetch(statsUrl, { headers }),
        fetch(usersUrl, { headers }),
        fetch(paiementsUrl, { headers }),
        fetch(`${API_BASE}/api/admin/stats/plans-distribution`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) { const d = await usersRes.json(); setRecentUsers(d.users || d.data || []); }
      if (paiementsRes.ok) { const d = await paiementsRes.json(); setRecentPaiements(d.paiements || d.data || []); }
      if (plansRes.ok) { const d = await plansRes.json(); setPlanDistribution(d.distribution || []); }

      // Fetch real-time badges
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, ttMode, effectiveHistDate, ttGranularity]);

  useEffect(() => { load(); }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusColor: Record<string, string> = {
    confirmed: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-emerald-100 text-emerald-700',
    'Réussi': 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  const rangeLabels: Record<string, string> = {
    today: "hier",
    week: "semaine passée",
    month: "mois passé",
    year: "année passée",
  };

  const isHistoricalView = ttMode === 'history' && !!effectiveHistDate;
  const histLabel = isHistoricalView ? formatHistLabel(ttGranularity, effectiveHistDate) : '';

  const applyTimeTravel = () => {
    if (!effectiveHistDate) {
      toast({ title: 'Sélectionnez une date', description: 'Veuillez choisir une période avant de continuer.', variant: 'destructive' });
      return;
    }
    load({ mode: 'history', date: effectiveHistDate, granularity: ttGranularity });
  };

  const switchToLive = () => {
    setTtMode('live');
    load({ mode: 'live', range });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd]">


      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Top Bar & Stats Header ── */}
        <section className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                <span className="bg-blue-50 px-2 py-0.5 rounded-md">Panneau de Contrôle</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-400">Vue Globale</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight text-gray-900">
                Tableau de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Bord</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                {isHistoricalView ? (
                  <>
                    <Clock3 className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-violet-600 font-semibold">Données historiques</span>
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                    <span>{histLabel}</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Système opérationnel · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {ttMode === 'live' && (
                <div className="w-44">
                  <Select value={range} onValueChange={(val) => { setRange(val); load({ range: val, mode: 'live' }); }}>
                    <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-white shadow-xl shadow-gray-100/50 font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        <SelectValue placeholder="Période" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      <SelectItem value="today" className="font-medium">Aujourd'hui</SelectItem>
                      <SelectItem value="week" className="font-medium">Cette Semaine</SelectItem>
                      <SelectItem value="month" className="font-medium">Ce Mois</SelectItem>
                      <SelectItem value="year" className="font-medium">Cette Année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="outline"
                className="h-12 rounded-2xl border-gray-100 bg-white shadow-xl shadow-gray-100/50 hover:bg-gray-50 transition-all px-5 font-bold text-gray-700"
                onClick={() => load()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Sync...' : 'Actualiser'}
              </Button>

              <Button
                className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 transition-all px-7 font-black border-none active:scale-95"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Rapports
              </Button>
            </div>
          </motion.div>

          {/* ── TIME TRAVEL BAR ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className={`relative overflow-hidden rounded-[1.75rem] border transition-all duration-500 ${
              isHistoricalView
                ? 'bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 border-violet-200 shadow-lg shadow-violet-100/40'
                : 'bg-white border-gray-100 shadow-sm'
            }`}>
              {/* Decorative orbs when in history mode */}
              {isHistoricalView && (
                <>
                  <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 bg-violet-200/30 rounded-full blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-200/30 rounded-full blur-3xl" />
                </>
              )}

              <div className="relative flex flex-col md:flex-row md:items-center gap-4 p-4">
                {/* Mode toggle pills */}
                <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-2xl shrink-0">
                  <button
                    onClick={switchToLive}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      ttMode === 'live'
                        ? 'bg-white text-gray-800 shadow-md shadow-gray-200/60'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    Live
                  </button>
                  <button
                    onClick={() => setTtMode('history')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      ttMode === 'history'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-300/40'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    Retour dans le temps
                  </button>
                </div>

                {/* History controls — only shown in history mode */}
                <AnimatePresence>
                  {ttMode === 'history' && (
                    <motion.div
                      key="history-controls"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-3 overflow-hidden"
                    >
                      {/* Granularity selector */}
                      <div className="flex items-center gap-1 p-1 bg-white/70 rounded-xl border border-violet-100 shrink-0">
                        {(['day','month','quarter','year'] as Granularity[]).map((g) => {
                          const labels: Record<Granularity, string> = { day: 'Jour', month: 'Mois', quarter: 'Trimestre', year: 'Année' };
                          return (
                            <button
                              key={g}
                              onClick={() => { setTtGranularity(g); setTtDate(''); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                ttGranularity === g
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                                  : 'text-gray-500 hover:text-violet-700 hover:bg-violet-50'
                              }`}
                            >
                              {labels[g]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Date input — adapts to granularity */}
                      <div className="flex items-center gap-2 flex-1">
                        {ttGranularity === 'day' && (
                          <input
                            type="date"
                            value={ttDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => setTtDate(e.target.value)}
                            className="h-10 px-4 rounded-xl border border-violet-200 bg-white/80 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
                          />
                        )}
                        {ttGranularity === 'month' && (
                          <input
                            type="month"
                            value={ttDate}
                            max={`${currentYear}-${String(new Date().getMonth() + 1).padStart(2,'0')}`}
                            onChange={e => setTtDate(e.target.value)}
                            className="h-10 px-4 rounded-xl border border-violet-200 bg-white/80 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
                          />
                        )}
                        {ttGranularity === 'quarter' && (
                          <div className="flex items-center gap-2">
                            <Select value={ttQNum} onValueChange={setTtQNum}>
                              <SelectTrigger className="h-10 w-28 rounded-xl border-violet-200 bg-white/80 font-bold text-gray-700 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-xl">
                                {['1','2','3','4'].map(q => (
                                  <SelectItem key={q} value={q} className="font-medium">T{q}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={ttQYear} onValueChange={setTtQYear}>
                              <SelectTrigger className="h-10 w-24 rounded-xl border-violet-200 bg-white/80 font-bold text-gray-700 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-xl">
                                {yearOptions.map(y => (
                                  <SelectItem key={y} value={y} className="font-medium">{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {ttGranularity === 'year' && (
                          <Select value={ttDate || yearOptions[0]} onValueChange={setTtDate}>
                            <SelectTrigger className="h-10 w-28 rounded-xl border-violet-200 bg-white/80 font-bold text-gray-700 text-sm">
                              <SelectValue placeholder="Année" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              {yearOptions.map(y => (
                                <SelectItem key={y} value={y} className="font-medium">{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <Button
                          onClick={applyTimeTravel}
                          disabled={refreshing || !effectiveHistDate}
                          className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-black shadow-lg shadow-violet-300/40 border-none active:scale-95 transition-all"
                        >
                          {refreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (
                            <><History className="h-3.5 w-3.5 mr-1.5" />Voyager</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Active historical snapshot banner */}
              <AnimatePresence>
                {isHistoricalView && (
                  <motion.div
                    key="hist-banner"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-violet-100 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 text-white">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <Clock3 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Instantané du</span>
                      <span className="text-sm font-black">{histLabel}</span>
                    </div>
                    <button
                      onClick={switchToLive}
                      className="text-[11px] font-black text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Retour au Live →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── ALERTES ACTIVES ── */}
          <AnimatePresence>
            {!loading && (wavePending > 0 || expiringSoon > 0 || (stats && (stats.pending_upgrades > 0 || stats.failed_payments_month > 0))) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: '#FFF8E1', borderLeft: '4px solid #F9A825' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-4 w-4 text-[#F9A825]" />
                    <span className="text-sm font-bold text-[#1A1A2E]">Alertes actives</span>
                  </div>
                  <div className="space-y-3">
                    {wavePending > 0 && (
                      <div className="flex items-center justify-between gap-4 bg-white/70 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Banknote className="h-4 w-4 text-[#F9A825] shrink-0" />
                          <span className="text-sm text-[#1A1A2E]">
                            <strong>{wavePending}</strong> paiement{wavePending > 1 ? 's' : ''} Wave en attente de validation
                          </span>
                        </div>
                        <Link
                          to="/admin/wave-validation"
                          className="text-xs font-bold text-[#2E7D32] hover:underline whitespace-nowrap flex items-center gap-1"
                        >
                          Valider <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                    {expiringSoon > 0 && (
                      <div className="flex items-center justify-between gap-4 bg-white/70 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <CalendarDays className="h-4 w-4 text-[#F9A825] shrink-0" />
                          <span className="text-sm text-[#1A1A2E]">
                            <strong>{expiringSoon}</strong> abonnement{expiringSoon > 1 ? 's' : ''} expirent dans 5 jours
                          </span>
                        </div>
                        <Link
                          to="/admin/users?filter=expired"
                          className="text-xs font-bold text-[#2E7D32] hover:underline whitespace-nowrap flex items-center gap-1"
                        >
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                    {stats && stats.pending_upgrades > 0 && (
                      <div className="flex items-center justify-between gap-4 bg-white/70 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <TrendingUp className="h-4 w-4 text-[#F9A825] shrink-0" />
                          <span className="text-sm text-[#1A1A2E]">
                            <strong>{stats.pending_upgrades}</strong> upgrade{stats.pending_upgrades > 1 ? 's' : ''} en attente d'approbation
                          </span>
                        </div>
                        <Link
                          to="/admin/upgrades"
                          className="text-xs font-bold text-[#2E7D32] hover:underline whitespace-nowrap flex items-center gap-1"
                        >
                          Gérer <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                    {stats && stats.failed_payments_month > 0 && (
                      <div className="flex items-center justify-between gap-4 bg-white/70 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm text-[#1A1A2E]">
                            <strong>{stats.failed_payments_month}</strong> paiement{stats.failed_payments_month > 1 ? 's' : ''} échoué{stats.failed_payments_month > 1 ? 's' : ''} ce mois
                          </span>
                        </div>
                        <Link
                          to="/admin/paiements"
                          className="text-xs font-bold text-[#2E7D32] hover:underline whitespace-nowrap flex items-center gap-1"
                        >
                          Voir <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Revenus',
              value: stats?.month_revenue ?? 0,
              growth: stats?.revenue_growth ?? 0,
              icon: Banknote,
              color: '#2E7D32',
              isCurrency: true,
              data: stats?.monthly_revenue || [],
            },
            {
              label: 'Inscriptions',
              value: stats?.users_this_month ?? 0,
              growth: stats?.user_growth ?? 0,
              icon: UserPlus,
              color: '#1565C0',
              isCurrency: false,
              data: [
                { revenue: stats?.users_last_month ?? 0 },
                { revenue: stats?.users_this_month ?? 0 }
              ],
            },
            {
              label: 'Conversions',
              value: stats?.commandes_this_month ?? 0,
              growth: stats?.order_growth ?? 0,
              icon: ShoppingCart,
              color: '#E65100',
              isCurrency: false,
              data: [
                { revenue: stats?.commandes_last_month ?? 0 },
                { revenue: stats?.commandes_this_month ?? 0 }
              ],
            },
            {
              label: 'Engagement',
              value: stats?.total_portfolios ?? 0,
              growth: 0,
              icon: Activity,
              color: '#7B1FA2',
              isCurrency: false,
              data: [{ revenue: 10 }, { revenue: 15 }, { revenue: 12 }, { revenue: 18 }],
            },
          ].map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * idx }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ borderLeft: `4px solid ${kpi.color}` }}
            >
              <div className="p-5 space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${kpi.color}26`, color: kpi.color }}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <GrowthBadge value={kpi.growth} label={isHistoricalView ? 'période précédente' : (rangeLabels[range] ?? 'période passée')} />
                </div>

                {/* Value + label */}
                <div>
                  <p className="text-sm text-[#5C5C5C] mb-0.5" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>{kpi.label}</p>
                  {loading ? <Skeleton className="h-9 w-28 rounded" /> : (
                    <p className="text-[#1A1A2E] leading-none" style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      {fmt(kpi.value, kpi.isCurrency)}
                    </p>
                  )}
                </div>

                {/* Sparkline */}
                <Sparkline data={kpi.data} color={kpi.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── MAIN CHARTS SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Evolution */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Évolution des revenus</h3>
                <p className="text-sm text-gray-500">
                  {isHistoricalView ? `Instantané — ${histLabel}` : `Flux de trésorerie (${rangeLabels[range] ?? range})`}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                  <Activity className="h-3 w-3" /> Revenu (F)
                </span>
              </div>
            </div>
            {loading ? <Skeleton className="h-72 w-full" /> : (
              <MainRevenueChart data={stats?.monthly_revenue || []} />
            )}
          </Card>

          {/* Plan Distribution */}
          <Card className="border-0 shadow-sm bg-white p-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Distribution par pack</h3>
              <p className="text-sm text-gray-500">Popularité des offres SaaS</p>
            </div>
            {loading ? <Skeleton className="h-72 w-full" /> : (
              <PlanDistributionChart data={planDistribution} />
            )}
          </Card>
        </div>

        {/* ── ACTIVITY FEED SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <Card className={`border-0 shadow-sm bg-white overflow-hidden transition-all duration-500 ${isHistoricalView ? 'ring-1 ring-violet-200' : ''}`}>
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                {isHistoricalView ? `Transactions — ${histLabel}` : 'Dernières transactions'}
              </h3>
              <Link to="/admin/paiements" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                Voir tout <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Client / Email</th>
                    <th className="px-6 py-3 font-semibold">Montant</th>
                    <th className="px-6 py-3 font-semibold text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                    ))
                  ) : recentPaiements.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">Aucune transaction</td></tr>
                  ) : (
                    recentPaiements.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                              {p.user_email?.[0].toUpperCase() || 'P'}
                            </div>
                            <div className="max-w-[150px]">
                              <p className="text-sm font-semibold text-gray-800 truncate">{p.user_email || p.email || `#${p.id}`}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(p.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                          {fmt(Number(p.montant || 0))}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge variant="outline" className={`rounded-full border-0 px-2 py-0.5 text-[10px] capitalize ${statusColor[p.statut] || 'bg-gray-100 text-gray-600'
                            }`}>
                            {p.statut}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent Users */}
          <Card className={`border-0 shadow-sm bg-white overflow-hidden transition-all duration-500 ${isHistoricalView ? 'ring-1 ring-violet-200' : ''}`}>
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {isHistoricalView ? `Inscrits — ${histLabel}` : 'Nouveaux inscrits'}
              </h3>
              <Link to="/admin/users" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                Gérer utilisateurs <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Utilisateur</th>
                    <th className="px-6 py-3 font-semibold">Plan</th>
                    <th className="px-6 py-3 font-semibold text-right">Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={3} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                    ))
                  ) : recentUsers.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">Aucun nouvel utilisateur</td></tr>
                  ) : (
                    recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {u.first_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{u.first_name || u.prenom} {u.last_name || u.nom}</p>
                              <p className="text-[10px] text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.plan_name ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold tracking-tight">
                              {u.plan_name}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] text-gray-500 font-medium">
                          {formatDate(u.created_at).split(' ')[0]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── QUICK NAVIGATION SECTION ── */}
        <div className="pt-4">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">Actions Rapides</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Utilisateurs', icon: Users, to: '/admin/users', bg: 'bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 text-blue-700' },
              { label: 'Portfolios', icon: Briefcase, to: '/admin/portfolios', bg: 'bg-white hover:bg-violet-50 border border-gray-100 hover:border-violet-200 text-violet-700' },
              { label: 'Commandes', icon: ShoppingCart, to: '/admin/commandes', bg: 'bg-white hover:bg-orange-50 border border-gray-100 hover:border-orange-200 text-orange-700' },
              { label: 'Paiements', icon: Banknote, to: '/admin/paiements', bg: 'bg-white hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 text-emerald-700' },
              { label: 'Analytique', icon: TrendingUp, to: '/admin/stats', bg: 'bg-white hover:bg-teal-50 border border-gray-100 hover:border-teal-200 text-teal-700' },
              { label: 'Paramètres', icon: Smartphone, to: '/admin/settings', bg: 'bg-white hover:bg-gray-50 border border-gray-100 text-gray-700' },
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + (idx * 0.05) }}
                whileHover={{ y: -6 }}
              >
                <Link to={item.to} className="group/nav flex flex-col items-center gap-4 p-8 bg-white rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-100/20 transition-all duration-300">
                  <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 shadow-xl shadow-gray-100 group-hover/nav:shadow-${item.color}-100 bg-${item.color}-50 text-${item.color}-600 group-hover/nav:scale-110`}>
                    <item.icon className="h-8 w-8 stroke-[1.5]" />
                  </div>
                  <span className="text-xs font-black text-gray-700 tracking-tight">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
};

export default AdminDashboard;
