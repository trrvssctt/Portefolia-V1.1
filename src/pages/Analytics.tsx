import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Eye, Users, Clock, MapPin, MousePointerClick,
  FileText, Download, Sparkles, Zap,
  Lock, Play,
  Trophy, Flame, Activity, CheckCircle2,
  Crown, TrendingUp, TrendingDown, ArrowUpRight,
  BarChart2, Globe, Layers, Monitor, Smartphone, Tablet,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
} from 'recharts';
import confetti from 'canvas-confetti';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { WorldMap } from '@/components/analytics/WorldMap';
import { HeatmapGrid } from '@/components/analytics/HeatmapGrid';
import { SessionReplayPlayer } from '@/components/analytics/SessionReplayPlayer';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const periods = [
  { value: '24h', label: '24 heures' },
  { value: '7d',  label: '7 jours'   },
  { value: '30d', label: '30 jours'  },
  { value: '90d', label: '90 jours'  },
  { value: 'all', label: 'Tout'      },
];

const SOURCE_COLORS: Record<string, string> = {
  Direct:    '#28A745',
  Google:    '#4285F4',
  LinkedIn:  '#0A66C2',
  Instagram: '#E1306C',
  TikTok:    '#010101',
  WhatsApp:  '#25D366',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectPlanTier(slug: string) {
  const s = slug.toLowerCase();
  const isBusiness = ['business', 'premium', 'enterprise', 'illimit'].some(p => s.includes(p));
  const isPro      = !isBusiness && ['pro', 'professionnel', 'professional', 'advanced', 'avance'].some(p => s.includes(p));
  const isStarter  = !isBusiness && !isPro && ['starter', 'standard', 'basic', 'basique', 'depart', 'debut', 'start'].some(p => s.includes(p));
  const isFree     = !isBusiness && !isPro && !isStarter;
  return { isFree, isStarter, isPro, isBusiness };
}

function calculatePerformanceScore(d: any): number {
  const visitsBonus  = Math.min((d?.total_visits || 0) / 500, 1) * 25;
  const timeBonus    = Math.min((d?.avg_time_seconds || 0) / 180, 1) * 20;
  const bounceBonus  = Math.max(0, (100 - (d?.bounce_rate || 100)) / 100) * 15;
  const engageBonus  = ((d?.engagement_rate || 0) / 100) * 10;
  return Math.min(100, Math.round(30 + visitsBonus + timeBonus + bounceBonus + engageBonus));
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Score annulaire ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const label =
    score >= 90 ? 'Exceptionnel' :
    score >= 75 ? 'Excellent'    :
    score >= 55 ? 'Très bon'     : 'En progression';
  const color =
    score >= 90 ? '#f59e0b' :
    score >= 75 ? '#28A745' :
    score >= 55 ? '#3b82f6' : '#6b7280';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="2.8"
            strokeDasharray={`${score}, 100`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] text-white/40">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-white/60">{label}</span>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  trend?: 'up' | 'down' | null;
}

function KpiCard({ icon: Icon, label, value, sub, accent, trend }: KpiProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5 hover:border-white/20 transition-all duration-300 group">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: `${accent}22` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      <p className="text-xs text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Locked feature ────────────────────────────────────────────────────────────

function LockedFeature({ icon: Icon, title, description, planLabel, planGradient }: {
  icon: React.ElementType; title: string; description: string; planLabel: string; planGradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-12 text-center">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: planGradient }} />
      </div>
      <div className="relative space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10">
          <Icon className="h-7 w-7 text-white/30" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 text-sm text-white/50">
          <Lock className="h-3.5 w-3.5" />
          Plan <span className="font-semibold text-white/80">{planLabel}</span> requis
        </div>
        <div>
          <Button
            size="sm"
            className="mt-2 text-white font-semibold"
            style={{ background: planGradient }}
            onClick={() => window.location.href = '/upgrade'}
          >
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            Passer à {planLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#07070f]">
      <div className="max-w-7xl mx-auto px-6 py-24 space-y-8 animate-pulse">
        <div className="h-8 w-48 mx-auto rounded-full bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />)}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl bg-white/[0.04]" />
          <div className="h-48 rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

// ── Upsell page (plan gratuit) ────────────────────────────────────────────────

const UPSELL_PLANS = [
  {
    key: 'starter', label: 'Starter', icon: Zap,
    gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'border-blue-500/30', glow: '#3b82f6',
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés'],
    locked: ['Heatmaps', 'Session Replay', 'Géolocalisation'],
    cta: 'Passer à Starter',
  },
  {
    key: 'pro', label: 'Pro', icon: Sparkles, popular: true,
    gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', border: 'border-purple-500/60', glow: '#8b5cf6',
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés', 'Heatmaps', 'Session Replay'],
    locked: ['Géolocalisation'],
    cta: 'Passer à Pro',
  },
  {
    key: 'business', label: 'Business', icon: Crown,
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'border-amber-500/50', glow: '#f59e0b',
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés', 'Heatmaps', 'Session Replay', 'Géolocalisation'],
    locked: [],
    cta: 'Passer à Business',
  },
];

function UpsellPage({ profile }: { profile: any }) {
  return (
    <div className="min-h-screen bg-[#07070f]">
      <DashboardNav onSignOut={() => {}} profile={profile} />
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center text-white">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-8">
          <BarChart2 className="h-4 w-4" />
          Analytics avancées
        </div>
        <h1 className="text-5xl font-black mb-5 leading-tight">
          Débloquez la puissance de
          <span className="block bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            vos données
          </span>
        </h1>
        <p className="text-lg text-white/40 max-w-xl mx-auto mb-14">
          Comprenez chaque visiteur, chaque clic, chaque session. Données 100% réelles.
        </p>
        <div className="grid md:grid-cols-3 gap-5 text-left">
          {UPSELL_PLANS.map(plan => (
            <div key={plan.key} className={`relative overflow-hidden rounded-2xl border ${plan.border} bg-white/[0.03] p-6 flex flex-col gap-4 hover:bg-white/[0.06] transition-all`}>
              {plan.popular && (
                <span className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: plan.gradient }}>Populaire</span>
              )}
              <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-3xl opacity-15" style={{ background: plan.glow }} />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.glow}22` }}>
                  <plan.icon className="h-5 w-5" style={{ color: plan.glow }} />
                </div>
                <span className="text-lg font-bold text-white">{plan.label}</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: plan.glow }} />
                    {f}
                  </li>
                ))}
                {plan.locked.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/25">
                    <Lock className="h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-auto w-full font-semibold text-white" style={{ background: plan.gradient }} onClick={() => window.location.href = '/upgrade'}>
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, iconColor, badge, children }: {
  icon: React.ElementType; title: string; iconColor: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
        <h2 className="font-semibold">{title}</h2>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Analytics component ──────────────────────────────────────────────────

export default function Analytics() {
  // ── ALL hooks before any conditional return ──
  const { portfolioId: paramId } = useParams<{ portfolioId: string }>();
  const { user, profile, signOut } = useAuth();
  const { currentPlan, isFreePlan, loading: planLoading } = usePlan();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [period, setPeriod]       = useState('30d');
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [score, setScore]         = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>(paramId || '');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const planSlug = currentPlan?.slug?.toString().toLowerCase() || '';
  const slugTier = detectPlanTier(planSlug);

  // isFreePlan du PlanContext = source de vérité (basé sur price_cents ET slug 'gratuit')
  // Si l'utilisateur a un plan payant mais dont le slug ne correspond à aucun tier connu,
  // on lui accorde au minimum les features "starter" plutôt que de l'exclure.
  const isFree     = isFreePlan || !currentPlan;
  const paidButUnknownTier = !isFree && !slugTier.isStarter && !slugTier.isPro && !slugTier.isBusiness;
  const isBusiness = !isFree && slugTier.isBusiness;
  const isPro      = !isFree && !isBusiness && slugTier.isPro;
  const isStarter  = !isFree && !isBusiness && !isPro && (slugTier.isStarter || paidButUnknownTier);

  const canAccessHeatmaps = isPro || isBusiness;
  const canAccessSessions = isPro || isBusiness;
  const canAccessGeo      = isBusiness;
  const canAccessSEO      = isBusiness;
  const hasLiveUpdates    = isBusiness;
  const planLabel = isBusiness ? 'Business' : isPro ? 'Pro' : isStarter ? currentPlan?.name || 'Starter' : 'Gratuit';
  const planGradient = isBusiness
    ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
    : isPro
      ? 'linear-gradient(135deg,#8b5cf6,#ec4899)'
      : 'linear-gradient(135deg,#3b82f6,#06b6d4)';

  // Fetch portfolio list for selector
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        const list = json.portfolios || [];
        setPortfolios(list);
        if (!selectedId && list.length > 0) setSelectedId(String(list[0].id));
      })
      .catch(() => {});
  }, [user]);

  // Fetch analytics data with polling
  const fetchData = useCallback(async () => {
    if (!selectedId || isFree) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/analytics?period=${period}&portfolio_id=${selectedId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      const s = calculatePerformanceScore(json);
      setScore(s);
      if (s >= 95) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#28A745', '#FFD700', '#ec4899'] });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [period, selectedId, isFree, toast]);

  useEffect(() => {
    if (!selectedId || isFree || planLoading) return;
    fetchData();
    // polling interval selon le plan
    const ms = hasLiveUpdates ? 8000 : isStarter ? 30000 : 20000;
    const id = setInterval(fetchData, ms);
    return () => clearInterval(id);
  }, [fetchData, isFree, planLoading, hasLiveUpdates, isStarter]);

  // ── Conditional renders AFTER all hooks ──
  if (planLoading) return <LoadingSkeleton />;
  if (isFree)      return <UpsellPage profile={profile} />;

  // ── KPIs (champs corrigés depuis la vraie API) ──
  const kpis: KpiProps[] = [
    { icon: Eye,               label: 'En direct',          value: data?.live_visitors  ?? '—', accent: '#ec4899', trend: (data?.live_visitors ?? 0) > 0 ? 'up' : null },
    { icon: Users,             label: 'Visiteurs uniques',  value: data?.total_visitors ?? '—', accent: '#3b82f6', trend: 'up' },
    { icon: Eye,               label: 'Vues totales',       value: data?.total_visits   ?? '—', accent: '#06b6d4' },
    { icon: Clock,             label: 'Temps moyen',        value: data ? fmtDuration(data.avg_time_seconds || 0) : '—', accent: '#10b981' },
    { icon: MousePointerClick, label: 'Clics trackés',      value: data?.total_clicks   ?? '—', accent: '#8b5cf6' },
    { icon: Trophy,            label: 'Score perf.',        value: data ? `${score}/100` : '—', accent: '#f59e0b' },
  ];

  const tabs = [
    { value: 'live',     label: 'En direct',  icon: Activity,        locked: false },
    { value: 'traffic',  label: 'Trafic',     icon: BarChart2,       locked: false },
    { value: 'heatmaps', label: 'Heatmaps',   icon: Layers,          locked: !canAccessHeatmaps },
    { value: 'sessions', label: 'Sessions',   icon: Play,            locked: !canAccessSessions },
    { value: 'seo',      label: 'SEO',        icon: Globe,           locked: !canAccessSEO },
  ];

  const selectedPortfolio = portfolios.find(p => String(p.id) === selectedId);

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white mb-3" style={{ background: planGradient }}>
              {isBusiness ? <Crown className="h-3.5 w-3.5" /> : isPro ? <Sparkles className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              Analytics {planLabel}
              {hasLiveUpdates && <Flame className="h-3.5 w-3.5 animate-pulse" />}
            </div>
            <h1 className="text-3xl font-black tracking-tight">Tableau de bord Analytics</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-white/40">Données réelles • Mis à jour{lastUpdated ? ` il y a ${formatDistanceToNowStrict(lastUpdated, { locale: fr })}` : ''}</p>
              {loading && <RefreshCw className="h-3.5 w-3.5 text-white/30 animate-spin" />}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
            {/* Portfolio selector */}
            {portfolios.length > 1 && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full sm:w-52 h-9 bg-white/[0.06] border-white/10 text-white text-sm">
                  <SelectValue placeholder="Choisir un portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.titre || p.title || p.nom || `Portfolio #${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Period selector */}
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="flex-1 sm:w-36 h-9 bg-white/[0.06] border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-9 border-white/10 bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white shrink-0" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1.5">Actualiser</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Live banner */}
        {hasLiveUpdates && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-sm text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Données en direct — actualisation automatique toutes les 8s
          </div>
        )}

        {/* Portfolio info banner */}
        {selectedPortfolio && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm">
            <span className="text-white/60">Portfolio analysé :</span>
            <span className="font-semibold text-white">
              {selectedPortfolio.titre || selectedPortfolio.title || selectedPortfolio.nom || `#${selectedId}`}
              <span className="ml-2 text-white/30 font-mono text-xs">/{selectedPortfolio.url_slug || selectedPortfolio.slug || ''}</span>
            </span>
            <button
              onClick={() => window.open(`/portfolio/${selectedPortfolio.url_slug || selectedPortfolio.slug || selectedId}`, '_blank')}
              className="text-xs text-white/40 hover:text-white/70 underline"
            >
              Voir le portfolio
            </button>
          </div>
        )}

        {/* ── Score + KPIs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-center">
          <div className="col-span-2 sm:col-span-1 flex justify-center py-2">
            {data ? <ScoreRing score={score} /> : (
              <div className="w-28 h-28 rounded-full bg-white/[0.04] animate-pulse" />
            )}
          </div>
          {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex gap-1 bg-white/[0.04] border border-white/[0.07] p-1 rounded-xl h-auto">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value} value={tab.value}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white/50 data-[state=active]:text-white data-[state=active]:bg-white/10 transition-all"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.locked && <Lock className="h-3 w-3 opacity-40" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── EN DIRECT ──────────────────────────────────────────────────── */}
          <TabsContent value="live" className="space-y-5 mt-0">
            {/* Visiteurs récents */}
            <SectionCard icon={Activity} title="Visiteurs récents" iconColor="#10b981"
              badge={
                <span className="flex items-center gap-2 text-xs text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {data?.live_visitors ?? 0} actif{(data?.live_visitors ?? 0) !== 1 ? 's' : ''} (2 dernières min)
                </span>
              }
            >
              {!data ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />)}
                </div>
              ) : data.live_sessions?.length ? (
                <div className="space-y-2">
                  {data.live_sessions.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{s.country || 'Inconnu'}</p>
                          <p className="text-xs text-white/40">{s.device}</p>
                        </div>
                      </div>
                      <span className="text-xs text-white/30">{s.time_ago}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-white/25 text-sm">
                  Aucun visiteur enregistré
                </div>
              )}
            </SectionCard>

            {/* Métriques d'engagement */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Taux de rebond',   value: `${data?.bounce_rate ?? '—'}%`,       color: '#ef4444', desc: 'Sessions page unique' },
                { label: 'Taux d\'engagement', value: `${data?.engagement_rate ?? '—'}%`, color: '#28A745', desc: 'Sessions > 30s' },
                { label: 'Total vues',         value: data?.total_visits ?? '—',           color: '#3b82f6', desc: 'Sur la période' },
                { label: 'Pays principal',     value: data?.top_country || '—',            color: '#f59e0b', desc: 'Source géo n°1' },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                  <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-white/60 mt-1 font-medium">{m.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{m.desc}</p>
                </div>
              ))}
            </div>

            {/* Géolocalisation */}
            {canAccessGeo ? (
              <SectionCard icon={MapPin} title="Géolocalisation des visiteurs" iconColor="#f59e0b"
                badge={<Badge className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/20">Business</Badge>}
              >
                <WorldMap data={data?.countries || []} />
              </SectionCard>
            ) : (
              <LockedFeature
                icon={MapPin} title="Géolocalisation des visiteurs"
                description="Visualisez d'où viennent vos visiteurs sur une carte mondiale interactive."
                planLabel="Business" planGradient="linear-gradient(135deg,#f59e0b,#ef4444)"
              />
            )}
          </TabsContent>

          {/* ── TRAFIC ─────────────────────────────────────────────────────── */}
          <TabsContent value="traffic" className="space-y-5 mt-0">

            {/* Évolution des visites */}
            <SectionCard icon={BarChart2} title="Évolution des visites" iconColor="#3b82f6">
              {!data || !data.visits_over_time?.length ? (
                <div className="flex items-center justify-center h-64 text-white/25 text-sm">
                  Aucune donnée sur la période sélectionnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.visits_over_time} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#28A745" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#28A745" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} tickFormatter={v => {
                      try { return format(new Date(v), period === '24h' ? 'HH:mm' : 'dd/MM'); } catch { return v; }
                    }} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                    />
                    <Area type="monotone" dataKey="visites" name="Vues" stroke="#28A745" fill="url(#visitGrad)" strokeWidth={2.5} dot={false} />
                    {data.visits_over_time[0]?.uniques !== undefined && (
                      <Area type="monotone" dataKey="uniques" name="Visiteurs uniques" stroke="#3b82f6" fill="url(#uniqueGrad)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* Sources de trafic + Appareils */}
            <div className="grid md:grid-cols-2 gap-5">

              {/* Sources */}
              <SectionCard icon={Globe} title="Sources de trafic" iconColor="#06b6d4">
                {!data?.traffic_sources?.length ? (
                  <p className="text-sm text-white/30 text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const total = data.traffic_sources.reduce((a: number, s: any) => a + (Number(s.value) || 0), 0) || 1;
                      return data.traffic_sources
                        .sort((a: any, b: any) => b.value - a.value)
                        .slice(0, 8)
                        .map((src: any) => {
                          const pct = Math.round((src.value / total) * 100);
                          const color = SOURCE_COLORS[src.name] || '#6b7280';
                          return (
                            <div key={src.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">{src.name}</span>
                                <span className="text-white/50">{src.value} <span className="text-white/30">({pct}%)</span></span>
                              </div>
                              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                )}
              </SectionCard>

              {/* Appareils */}
              <SectionCard icon={Monitor} title="Répartition des appareils" iconColor="#8b5cf6">
                <div className="space-y-4">
                  {[
                    { label: 'Desktop',   value: data?.device_desktop ?? 0, icon: Monitor,    color: '#3b82f6' },
                    { label: 'Mobile',    value: data?.device_mobile  ?? 0, icon: Smartphone,  color: '#28A745' },
                    { label: 'Tablette',  value: data?.device_tablet  ?? 0, icon: Tablet,      color: '#8b5cf6' },
                  ].map(d => (
                    <div key={d.label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <d.icon className="h-4 w-4" style={{ color: d.color }} />
                          <span className="text-white/70">{d.label}</span>
                        </div>
                        <span className="font-semibold text-white">{d.value}%</span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}

                  {/* Géo top pays */}
                  {data?.countries?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <p className="text-xs font-medium text-white/50 mb-3 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Top pays
                      </p>
                      <div className="space-y-2">
                        {data.countries.slice(0, 5).map((c: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-white/60">{c.country}</span>
                            <span className="text-white/40">{c.count} visite{c.count > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ── HEATMAPS ───────────────────────────────────────────────────── */}
          <TabsContent value="heatmaps" className="mt-0">
            {canAccessHeatmaps ? (
              <SectionCard icon={Layers} title="Heatmap de clics" iconColor="#a855f7"
                badge={<Badge className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/20">Pro</Badge>}
              >
                {data?.heatmap?.length ? (
                  <HeatmapGrid data={data.heatmap} />
                ) : (
                  <div className="text-center py-12 text-white/25 text-sm">
                    <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    Aucun clic tracké sur la période.
                    <p className="text-xs mt-1 text-white/20">Les clics sont enregistrés automatiquement sur votre portfolio public.</p>
                  </div>
                )}
              </SectionCard>
            ) : (
              <LockedFeature
                icon={MousePointerClick} title="Heatmaps de clics"
                description="Visualisez les zones les plus cliquées de votre portfolio et optimisez votre mise en page selon le comportement réel des visiteurs."
                planLabel="Pro" planGradient="linear-gradient(135deg,#8b5cf6,#ec4899)"
              />
            )}
          </TabsContent>

          {/* ── SESSIONS ───────────────────────────────────────────────────── */}
          <TabsContent value="sessions" className="mt-0">
            {canAccessSessions ? (
              <SectionCard icon={Play} title="Sessions enregistrées" iconColor="#ec4899"
                badge={<Badge className="text-xs bg-pink-500/15 text-pink-400 border-pink-500/20">Pro</Badge>}
              >
                {data?.sessions?.length ? (
                  <SessionReplayPlayer sessions={data.sessions} />
                ) : (
                  <div className="text-center py-12 text-white/25 text-sm">
                    <Play className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    Aucune session enregistrée sur la période.
                  </div>
                )}
              </SectionCard>
            ) : (
              <LockedFeature
                icon={Play} title="Session Replay"
                description="Rejouez les sessions de vos visiteurs pour comprendre leur parcours et détecter les points de friction."
                planLabel="Pro" planGradient="linear-gradient(135deg,#8b5cf6,#ec4899)"
              />
            )}
          </TabsContent>

          {/* ── SEO ────────────────────────────────────────────────────────── */}
          <TabsContent value="seo" className="mt-0">
            {canAccessSEO ? (
              <SectionCard icon={Globe} title="Analyse SEO" iconColor="#f59e0b"
                badge={<Badge className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/20">Business</Badge>}
              >
                <div className="text-center py-10 text-white/30 text-sm space-y-2">
                  <Globe className="h-10 w-10 mx-auto opacity-30" />
                  <p>L'analyse SEO nécessite une connexion Google Search Console.</p>
                  <p className="text-xs text-white/20">Fonctionnalité en cours de déploiement.</p>
                </div>
              </SectionCard>
            ) : (
              <LockedFeature
                icon={Globe} title="Analyse SEO & Mots-clés Google"
                description="Suivez vos positions Google et analysez les mots-clés qui génèrent du trafic organique."
                planLabel="Business" planGradient="linear-gradient(135deg,#f59e0b,#ef4444)"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
