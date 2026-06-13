import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Eye, Users, Zap, TrendingDown, Clock, MousePointer,
  Globe, Smartphone, Monitor, Tablet, RefreshCw, ChevronDown, ChevronUp,
  Trophy, FolderOpen, Star, ArrowUpRight, ArrowDownRight,
  Layers, Play, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeatmapGrid } from '@/components/analytics/HeatmapGrid';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const SOURCE_COLORS: Record<string, string> = {
  Direct: '#6366f1', LinkedIn: '#0077b5', Google: '#ea4335',
  Facebook: '#1877f2', Instagram: '#e4405f', 'Twitter/X': '#111827', GitHub: '#374151',
};
const SOURCE_ICONS: Record<string, string> = {
  Direct: '⬤', LinkedIn: 'in', Google: 'G', Facebook: 'f',
  Instagram: '✦', 'Twitter/X': 'X', GitHub: '⌥',
};

const formatNum = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const formatTime = (s: number) => {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

// ── Performance ring ────────────────────────────────────────────────────────
const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const r = 36, c = 2 * Math.PI * r;
  const offset = c - (Math.min(score, 100) / 100) * c;
  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Bon' : score >= 35 ? 'Moyen' : 'Faible';
  const labelColor = score >= 75 ? '#16a34a' : score >= 55 ? '#2563eb' : score >= 35 ? '#d97706' : '#dc2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width="88" height="88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span className="text-xl font-bold text-gray-800">{score}</span>
          <span className="text-[10px] text-gray-400 mt-0.5">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color: labelColor }}>{label}</span>
    </div>
  );
};

// ── Heatmap activité jour × heure ───────────────────────────────────────────
const ActivityHeatmap = ({ data, color }: { data: any[]; color: string }) => {
  const grid: Record<string, number> = {};
  let maxCount = 1;
  data.forEach(d => {
    const k = `${d.day_of_week}-${d.hour_of_day}`;
    grid[k] = Number(d.count);
    if (Number(d.count) > maxCount) maxCount = Number(d.count);
  });
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex mb-1 ml-10">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-[10px] text-gray-400 text-center flex-1">
              {h % 6 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {DAYS_FR.map((day, d) => (
          <div key={d} className="flex items-center mb-[3px]">
            <div className="text-[11px] text-gray-400 w-10 shrink-0">{day}</div>
            <div className="flex flex-1 gap-[2px]">
              {Array.from({ length: 24 }).map((_, h) => {
                const cnt = grid[`${d}-${h}`] || 0;
                const intensity = cnt / maxCount;
                return (
                  <div key={h}
                    title={`${day} ${h}h : ${cnt} visite${cnt > 1 ? 's' : ''}`}
                    className="flex-1 rounded-[2px] cursor-default"
                    style={{
                      height: 18,
                      backgroundColor: cnt > 0 ? `${color}${toHex(0.15 + intensity * 0.85)}` : '#f3f4f6',
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[11px] text-gray-400">Moins</span>
          {[0.2, 0.4, 0.6, 0.8, 1].map(i => (
            <div key={i} className="rounded-[2px]"
              style={{ width: 14, height: 14, backgroundColor: `${color}${toHex(0.15 + i * 0.85)}` }} />
          ))}
          <span className="text-[11px] text-gray-400">Plus</span>
        </div>
      </div>
    </div>
  );
};

// ── Badge comparaison ───────────────────────────────────────────────────────
const DeltaBadge = ({ pct }: { pct: number }) => {
  const pos = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${pos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {pos ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {pos ? '+' : ''}{pct}%
    </span>
  );
};

// ── Tooltip chart ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-0.5">{label}</p>
      <p className="text-gray-600">
        <span className="font-semibold" style={{ color: payload[0]?.color }}>{formatNum(payload[0]?.value)}</span> vues
      </p>
    </div>
  );
};

// ── Composant principal ─────────────────────────────────────────────────────
export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const { account, isBusinessAdmin } = useBusiness();
  const { signOut } = useAuth();

  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [eventsOpen, setEventsOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const primaryColor = account?.primary_color || '#6366f1';

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/business/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Erreur');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh live visitors toutes les 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchData(true);
    }, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  // Gap-filling des vues journalières
  const filledDailyViews = useMemo(() => {
    if (!data?.daily_views) return [];
    const today = new Date();
    return Array.from({ length: period }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (period - 1 - i));
      const ds = d.toISOString().slice(0, 10);
      const found = data.daily_views.find((v: any) => v.date === ds);
      return {
        date: ds,
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        count: found ? Number(found.count) : 0,
      };
    });
  }, [data?.daily_views, period]);

  const totalReferrers = useMemo(
    () => (data?.referrers || []).reduce((s: number, r: any) => s + Number(r.count), 0),
    [data?.referrers],
  );

  const filteredPortfolios = useMemo(() => {
    if (!data?.portfolios) return [];
    if (memberFilter === 'all') return data.portfolios;
    return data.portfolios.filter((p: any) => String(p.utilisateur_id) === memberFilter);
  }, [data?.portfolios, memberFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BusinessNav onSignOut={handleSignOut} />
        <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: primaryColor }} />
          <p className="text-gray-500 text-sm">Chargement des analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BusinessNav onSignOut={handleSignOut} />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => fetchData()}
            className="px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: primaryColor }}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    performance_score = 0,
    live_visitors = 0,
    unique_visitors = 0,
    bounce_rate = 0,
    engagement_rate = 0,
    avg_time_seconds = 0,
    period_comparison = 0,
    devices = { mobile: 0, tablet: 0, desktop: 0 },
    countries = [],
    referrers = [],
    heatmap = [],
    member_stats = [],
    click_heatmap = [],
    total_clicks = 0,
    top_interactions = [],
    project_views = [],
    recent_sessions = [],
    ai_insights = '',
  } = data;

  const hasEvents = total_clicks > 0 || top_interactions?.length > 0 || project_views?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessNav onSignOut={handleSignOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* ── En-tête ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" style={{ color: primaryColor }} />
              Analytics Business
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isBusinessAdmin
                ? `${summary.total_members ?? 0} membre${(summary.total_members ?? 0) > 1 ? 's' : ''} · ${summary.total_portfolios} portfolio${summary.total_portfolios !== 1 ? 's' : ''} · ${summary.public_portfolios} publics`
                : `${summary.total_portfolios} portfolio${summary.total_portfolios !== 1 ? 's' : ''} · ${summary.public_portfolios} public${summary.public_portfolios !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: live_visitors > 0 ? '#22c55e' : '#d1d5db' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: live_visitors > 0 ? '#22c55e' : '#d1d5db' }} />
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {live_visitors > 0 ? `${live_visitors} en direct` : 'Aucun en direct'}
              </span>
            </div>

            {/* Sélecteur de période */}
            <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {[7, 30, 90].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={period === p ? { backgroundColor: primaryColor } : {}}>
                  {p}j
                </button>
              ))}
            </div>

            <button onClick={() => fetchData(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Score */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col items-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-2 font-medium">Score</p>
            <ScoreRing score={performance_score} color={primaryColor} />
          </div>

          {/* Vues période */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Vues ({period}j)</p>
              <Eye size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatNum(summary.views_period)}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <DeltaBadge pct={period_comparison} />
              <span className="text-[11px] text-gray-400">vs préc.</span>
            </div>
          </div>

          {/* Visiteurs uniques */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Visiteurs uniques</p>
              <Users size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatNum(unique_visitors)}</p>
            <p className="text-[11px] text-gray-400 mt-1">IP distinctes</p>
          </div>

          {/* En direct */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">En direct</p>
              <Zap size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold"
              style={{ color: live_visitors > 0 ? '#22c55e' : '#9ca3af' }}>
              {live_visitors}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">dernières 2 min</p>
          </div>

          {/* Taux de rebond */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Taux rebond</p>
              <TrendingDown size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold"
              style={{ color: bounce_rate < 40 ? '#16a34a' : bounce_rate > 70 ? '#dc2626' : '#d97706' }}>
              {bounce_rate}%
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {bounce_rate < 40 ? 'Excellent' : bounce_rate > 70 ? 'À améliorer' : 'Correct'}
            </p>
          </div>

          {/* Temps moyen */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">Temps moyen</p>
              <Clock size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatTime(avg_time_seconds)}</p>
            <p className="text-[11px] text-gray-400 mt-1">par session</p>
          </div>
        </div>

        {/* ── Courbe vues + Sources de trafic ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Vues au fil du temps</h3>
                <p className="text-xs text-gray-400 mt-0.5">{period} derniers jours</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Total période</p>
                <p className="font-bold text-gray-800">{formatNum(summary.views_period)}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={filledDailyViews} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bizAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                  interval={Math.floor(period / 7)} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke={primaryColor} strokeWidth={2}
                  fill="url(#bizAreaGrad)" dot={false} activeDot={{ r: 4, fill: primaryColor }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">Sources de trafic</h3>
            {referrers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {referrers.map((r: any, i: number) => {
                  const pct = totalReferrers > 0 ? Math.round((Number(r.count) / totalReferrers) * 100) : 0;
                  const col = SOURCE_COLORS[r.referer] || primaryColor;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold w-5 text-center" style={{ color: col }}>
                            {SOURCE_ICONS[r.referer] || '•'}
                          </span>
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{r.referer}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{formatNum(Number(r.count))}</span>
                          <span className="text-xs font-semibold text-gray-700 w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Appareils + Pays ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">Appareils</h3>
            <div className="flex h-3 rounded-full overflow-hidden mb-4">
              {devices.mobile > 0 && <div style={{ width: `${devices.mobile}%`, backgroundColor: primaryColor }} title={`Mobile ${devices.mobile}%`} />}
              {devices.tablet > 0 && <div style={{ width: `${devices.tablet}%`, backgroundColor: `${primaryColor}88` }} title={`Tablette ${devices.tablet}%`} />}
              {devices.desktop > 0 && <div style={{ width: `${devices.desktop}%`, backgroundColor: '#e5e7eb' }} title={`Desktop ${devices.desktop}%`} />}
            </div>
            <div className="space-y-2.5">
              {([
                { icon: Smartphone, label: 'Mobile', pct: devices.mobile, color: primaryColor },
                { icon: Monitor, label: 'Desktop', pct: devices.desktop, color: '#9ca3af' },
                { icon: Tablet, label: 'Tablette', pct: devices.tablet, color: `${primaryColor}88` },
              ] as const).map(({ icon: Icon, label, pct, color }: any) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color }} />
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-9 text-right">{pct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">Engagement</p>
                <p className="font-bold"
                  style={{ color: engagement_rate > 60 ? '#16a34a' : engagement_rate > 30 ? primaryColor : '#d97706' }}>
                  {engagement_rate}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total vues</p>
                <p className="font-bold text-gray-800">{formatNum(summary.total_views)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={14} style={{ color: primaryColor }} />
              <h3 className="font-semibold text-gray-800 text-sm">Pays visiteurs</h3>
            </div>
            {countries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée de géolocalisation</p>
            ) : (
              <div className="space-y-2">
                {countries.map((c: any, i: number) => {
                  const total = countries.reduce((s: number, r: any) => s + Number(r.count), 0);
                  const pct = total > 0 ? Math.round((Number(c.count) / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-4 shrink-0 text-center">{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{c.country}</span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: primaryColor, opacity: Math.max(0.3, 1 - i * 0.08) }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right shrink-0">{formatNum(Number(c.count))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Heatmap activité (jour × heure) ──────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Activité par jour et heure</h3>
              <p className="text-xs text-gray-400 mt-0.5">90 derniers jours — identifiez les meilleurs moments de partage</p>
            </div>
          </div>
          {heatmap.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Aucune donnée d'activité disponible</div>
          ) : (
            <ActivityHeatmap data={heatmap} color={primaryColor} />
          )}
        </div>

        {/* ── Interactions détaillées ───────────────────────────────────────── */}
        {hasEvents && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setEventsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <MousePointer size={16} style={{ color: primaryColor }} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Interactions détaillées</p>
                  <p className="text-xs text-gray-400">
                    {total_clicks} clics · {top_interactions?.length || 0} éléments · {project_views?.length || 0} projets vus
                  </p>
                </div>
              </div>
              {eventsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {eventsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-gray-100">
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MousePointer size={13} style={{ color: primaryColor }} />
                        <h4 className="text-sm font-semibold text-gray-700">Zones cliquées</h4>
                        <span className="text-xs text-gray-400 ml-auto">{total_clicks} clics</span>
                      </div>
                      {click_heatmap.length > 0 ? (
                        <HeatmapGrid data={click_heatmap} />
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400">Aucun clic enregistré</div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={13} style={{ color: primaryColor }} />
                        <h4 className="text-sm font-semibold text-gray-700">Éléments cliqués</h4>
                      </div>
                      {top_interactions?.length > 0 ? (
                        <div className="space-y-2.5">
                          {top_interactions.map((item: any, i: number) => {
                            const maxInt = Number(top_interactions[0]?.count) || 1;
                            const pct = Math.round((Number(item.count) / maxInt) * 100);
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600 truncate max-w-[150px]">{item.name}</span>
                                  <span className="font-semibold text-gray-700">{item.count}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Aucune interaction</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers size={13} style={{ color: primaryColor }} />
                        <h4 className="text-sm font-semibold text-gray-700">Projets vus</h4>
                      </div>
                      {project_views?.length > 0 ? (
                        <div className="space-y-2">
                          {project_views.map((pv: any, i: number) => (
                            <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">
                                  {pv.title || `Projet #${pv.project_id}`}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">{pv.portfolio_title}</p>
                              </div>
                              <span className="text-xs font-bold text-gray-600 shrink-0">{pv.views}×</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Aucune vue de projet</p>
                      )}
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Classement membres (admin) ────────────────────────────────────── */}
        {isBusinessAdmin && member_stats.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} style={{ color: primaryColor }} />
              <h3 className="font-semibold text-gray-800 text-sm">Classement des membres</h3>
              <span className="text-xs text-gray-400 ml-1">vues totales sur toute la période</span>
            </div>
            <div className="space-y-1.5">
              {member_stats.map((m: any, i: number) => {
                const maxViews = member_stats[0]?.views_total || 1;
                const pct = Math.round((m.views_total / maxViews) * 100);
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={m.user_id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-lg w-6 text-center shrink-0">{medals[i] || `${i + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {m.name}
                          {m.is_admin && (
                            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                              Admin
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{m.poste}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: i === 0 ? primaryColor : `${primaryColor}70` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 shrink-0">{formatNum(m.views_total)}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">({formatNum(m.views_period)} période)</span>
                        <FolderOpen size={11} className="text-gray-300 shrink-0" />
                        <span className="text-[11px] text-gray-500 shrink-0">{m.portfolio_count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Portfolios ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} style={{ color: primaryColor }} />
              <h3 className="font-semibold text-gray-800 text-sm">Portfolios</h3>
              <span className="text-xs text-gray-400">({filteredPortfolios.length})</span>
            </div>
            {isBusinessAdmin && member_stats.length > 1 && (
              <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none">
                <option value="all">Tous les membres</option>
                {member_stats.map((m: any) => (
                  <option key={m.user_id} value={String(m.user_id)}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
          {filteredPortfolios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun portfolio</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Portfolio</th>
                    {isBusinessAdmin && <th className="text-left pb-2 font-medium hidden sm:table-cell">Membre</th>}
                    <th className="text-right pb-2 font-medium">Total</th>
                    <th className="text-right pb-2 font-medium">{period}j</th>
                    <th className="text-right pb-2 font-medium">Auj.</th>
                    <th className="text-right pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPortfolios.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.est_public ? '#22c55e' : '#d1d5db' }} />
                          <a href={`/portfolio/${p.url_slug}`} target="_blank" rel="noopener noreferrer"
                            className="font-medium hover:underline truncate max-w-[160px] inline-flex items-center gap-1"
                            style={{ color: primaryColor }}>
                            {p.titre}
                            <ArrowUpRight size={10} className="opacity-50 shrink-0" />
                          </a>
                        </div>
                      </td>
                      {isBusinessAdmin && (
                        <td className="py-2.5 pr-3 hidden sm:table-cell">
                          <span className="text-gray-500 text-xs truncate max-w-[100px] block">{p.owner_name || '—'}</span>
                        </td>
                      )}
                      <td className="py-2.5 text-right font-semibold text-gray-700">{formatNum(Number(p.views_total))}</td>
                      <td className="py-2.5 text-right text-gray-600">{formatNum(Number(p.views_period))}</td>
                      <td className="py-2.5 text-right text-gray-500">{formatNum(Number(p.views_today))}</td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.est_public ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.est_public ? 'Public' : 'Privé'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sessions récentes ─────────────────────────────────────────────── */}
        {recent_sessions?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setSessionsOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Play size={15} style={{ color: primaryColor }} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Sessions récentes</p>
                  <p className="text-xs text-gray-400">{recent_sessions.length} dernières sessions enregistrées</p>
                </div>
              </div>
              {sessionsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {sessionsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-gray-100">
                  <div className="p-5 overflow-x-auto">
                    <table className="w-full text-xs min-w-[480px]">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left pb-2 font-medium">IP</th>
                          <th className="text-left pb-2 font-medium">Appareil</th>
                          <th className="text-left pb-2 font-medium">Pays</th>
                          <th className="text-right pb-2 font-medium">Pages</th>
                          <th className="text-right pb-2 font-medium">Durée</th>
                          <th className="text-right pb-2 font-medium">Début</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recent_sessions.map((s: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2 font-mono text-gray-600">{s.ip}</td>
                            <td className="py-2 text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                {s.device === 'Mobile' ? <Smartphone size={11} /> : s.device === 'Tablet' ? <Tablet size={11} /> : <Monitor size={11} />}
                                {s.device}
                              </span>
                            </td>
                            <td className="py-2 text-gray-600">{s.country}</td>
                            <td className="py-2 text-right text-gray-600">{s.pages}</td>
                            <td className="py-2 text-right text-gray-600">{formatTime(s.duration_seconds)}</td>
                            <td className="py-2 text-right text-gray-400">
                              {new Date(s.started_at).toLocaleString('fr-FR', {
                                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Analyse IA ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => setAiOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
                ✦
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Analyse & Recommandations IA</p>
                <p className="text-xs text-gray-400">Insights personnalisés basés sur vos données réelles</p>
              </div>
            </div>
            {aiOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          <AnimatePresence>
            {aiOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-gray-100">
                <div className="p-5 space-y-3">
                  {ai_insights.split('\n\n').map((insight: string, i: number) => {
                    const emoji = insight.match(/^(📈|📉|📊|⚡|✅|⏱️|📅|⏰|📱|🖥️|🏆|🔒|🖱️|🔗|📌)/)?.[0] || '';
                    const text = insight.replace(/^(📈|📉|📊|⚡|✅|⏱️|📅|⏰|📱|🖥️|🏆|🔒|🖱️|🔗|📌)\s*/, '');
                    return (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        {emoji && <span className="text-base shrink-0">{emoji}</span>}
                        <p className="text-sm text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                          }} />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
