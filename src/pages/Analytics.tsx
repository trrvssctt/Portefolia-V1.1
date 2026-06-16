import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp, TrendingDown, ArrowUpRight, Globe, MapPin,
  Layers, Monitor, Smartphone, Tablet, Play, Lock,
  Zap, Sparkles, Crown, CheckCircle2, BarChart2,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { WorldMap } from '@/components/analytics/WorldMap';
import { HeatmapGrid } from '@/components/analytics/HeatmapGrid';
import { SessionReplayPlayer } from '@/components/analytics/SessionReplayPlayer';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const periods = [
  { value: '24h', label: '24 heures' },
  { value: '7d',  label: '7 jours'   },
  { value: '30d', label: '30 jours'  },
  { value: '90d', label: '90 jours'  },
  { value: 'all', label: 'Tout'      },
];

const PERIOD_BTNS = [
  { label: '30 jours', value: '30d' },
  { label: '90 jours', value: '90d' },
  { label: '12 mois',  value: 'all' },
];

const COUNTRY_FLAGS: Record<string, string> = {
  'France': '🇫🇷', 'Sénégal': '🇸🇳', 'Senegal': '🇸🇳',
  "Côte d'Ivoire": '🇨🇮', 'Maroc': '🇲🇦', 'Morocco': '🇲🇦',
  'Cameroun': '🇨🇲', 'Cameroon': '🇨🇲', 'Mali': '🇲🇱',
  'Guinée': '🇬🇳', 'Guinea': '🇬🇳', 'United States': '🇺🇸',
  'États-Unis': '🇺🇸', 'Belgique': '🇧🇪', 'Belgium': '🇧🇪',
  'Canada': '🇨🇦', 'Tunisie': '🇹🇳', 'Tunisia': '🇹🇳',
  'Algérie': '🇩🇿', 'Algeria': '🇩🇿', 'Gabon': '🇬🇦',
  'Congo': '🇨🇬', 'Togo': '🇹🇬', 'Bénin': '🇧🇯',
  'Burkina Faso': '🇧🇫', 'Niger': '🇳🇪', 'Mauritanie': '🇲🇷',
};
function getFlag(country: string) { return COUNTRY_FLAGS[country] || '🌍'; }

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

const UPSELL_PLANS = [
  {
    key: 'starter', label: 'Starter', icon: Zap,
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés'],
    locked: ['Heatmaps', 'Session Replay', 'Géolocalisation'],
    cta: 'Passer à Starter',
  },
  {
    key: 'pro', label: 'Pro', icon: Sparkles, popular: true,
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés', 'Heatmaps', 'Session Replay'],
    locked: ['Géolocalisation'],
    cta: 'Passer à Pro',
  },
  {
    key: 'business', label: 'Business', icon: Crown,
    features: ['Stats de visites', 'Sources de trafic', 'Appareils utilisés', 'Heatmaps', 'Session Replay', 'Géolocalisation'],
    locked: [],
    cta: 'Passer à Business',
  },
];

// ── Presentation components ───────────────────────────────────────────────────

function SimpleBarChart({ data }: { data?: Array<{ date: string; visites: number }> }) {
  if (!data?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-[#71717A] text-sm">
        Aucune donnée sur la période
      </div>
    );
  }
  const pts = data.slice(-12);
  const max = Math.max(...pts.map(d => d.visites || 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-48">
      {pts.map((d, i) => {
        const pct = ((d.visites || 0) / max) * 100;
        const isLast = i === pts.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div
              className="w-full rounded-t-md transition-all duration-500 relative"
              style={{ height: `${Math.max(pct, 3)}%`, background: isLast ? '#2E7D32' : 'rgba(46,125,50,0.22)' }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#18181B] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {d.visites}
              </span>
            </div>
            <span className="text-[10px] text-[#71717A]">
              {(() => { try { return format(new Date(d.date), 'dd/MM'); } catch { return ''; } })()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AKpi({ label, value, delta, up }: { label: string; value: string | number; delta?: string; up?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
      <p className="text-sm text-[#71717A]">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-[26px] font-semibold text-[#18181B] leading-none tracking-tight tabular-nums">{value}</p>
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
            style={up !== false ? { background: '#E8F5E9', color: '#1B5E20' } : { background: '#FEE2E2', color: '#B91C1C' }}
          >
            {up !== false ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function LockedSection({ icon: Icon, title, description, planLabel }: {
  icon: React.ElementType; title: string; description: string; planLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-[#71717A]" />
      </div>
      <h3 className="font-semibold text-[#18181B] mb-1">{title}</h3>
      <p className="text-sm text-[#71717A] max-w-sm mx-auto mb-4 leading-relaxed">{description}</p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E7E7EA] text-xs text-[#71717A] mb-4">
        <Lock className="w-3.5 h-3.5" /> Plan <span className="font-semibold text-[#18181B] ml-0.5">{planLabel}</span> requis
      </div>
      <br />
      <button
        onClick={() => window.location.href = '/upgrade'}
        className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white inline-flex items-center gap-1.5"
        style={{ background: '#2E7D32' }}
      >
        <ArrowUpRight className="w-4 h-4" /> Passer à {planLabel}
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <div className="h-16 bg-white border-b border-[#E7E7EA]" />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 space-y-7 animate-pulse">
        <div className="h-9 w-44 rounded-xl bg-zinc-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-100" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-zinc-100" />
          <div className="h-64 rounded-2xl bg-zinc-100" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-52 rounded-2xl bg-zinc-100" />
          <div className="h-52 rounded-2xl bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

function UpsellPage({ profile }: { profile: any }) {
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DashboardNav onSignOut={() => {}} profile={profile} />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">Analytics</h1>
          <p className="text-[#71717A] text-sm mt-1">Suivez la performance de vos portfolios et cartes NFC.</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
            <BarChart2 className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-[#18181B]">Analytics indisponibles sur le plan Gratuit</h2>
            <p className="text-sm text-[#71717A] mt-0.5">Passez à une formule payante pour accéder aux statistiques détaillées de vos portfolios.</p>
          </div>
          <button
            onClick={() => window.location.href = '/upgrade'}
            className="h-10 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0"
            style={{ background: '#2E7D32' }}
          >
            Voir les formules
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {UPSELL_PLANS.map(plan => {
            const PlanIcon = plan.icon;
            return (
              <div
                key={plan.key}
                className={`bg-white rounded-2xl border p-6 flex flex-col gap-4 ${plan.popular ? 'border-[#2E7D32]' : 'border-[#E7E7EA]'}`}
              >
                {plan.popular && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white self-start" style={{ background: '#2E7D32' }}>
                    Populaire
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <PlanIcon className="w-5 h-5 text-[#18181B]/60" />
                  </div>
                  <span className="text-base font-bold text-[#18181B]">{plan.label}</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#18181B]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E7D32]" /> {f}
                    </li>
                  ))}
                  {plan.locked.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#71717A]/50">
                      <Lock className="w-4 h-4 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => window.location.href = '/upgrade'}
                  className="w-full h-10 rounded-[10px] text-sm font-semibold text-white"
                  style={{ background: '#2E7D32' }}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
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

  const [period, setPeriod]           = useState('30d');
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [score, setScore]             = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab]     = useState('live');
  const [portfolios, setPortfolios]   = useState<any[]>([]);
  const [selectedId, setSelectedId]   = useState<string>(paramId || '');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  void isExporting; void setIsExporting; void activeTab; void setActiveTab;

  const planSlug = currentPlan?.slug?.toString().toLowerCase() || '';
  const slugTier = detectPlanTier(planSlug);

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

  // Fetch portfolio list
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

  // Fetch analytics with polling
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
    const ms = hasLiveUpdates ? 8000 : isStarter ? 30000 : 20000;
    const id = setInterval(fetchData, ms);
    return () => clearInterval(id);
  }, [fetchData, isFree, planLoading, hasLiveUpdates, isStarter]);

  // ── Conditional renders AFTER all hooks ──
  if (planLoading) return <LoadingSkeleton />;
  if (isFree)      return <UpsellPage profile={profile} />;

  // ── Derived display data ──
  const sourcesWithPct = (() => {
    if (!data?.traffic_sources?.length) return [];
    const total = data.traffic_sources.reduce((a: number, s: any) => a + (Number(s.value) || 0), 0) || 1;
    return data.traffic_sources
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 6)
      .map((s: any) => ({ label: s.name, pct: Math.round((s.value / total) * 100) }));
  })();

  const countriesWithPct = (() => {
    if (!data?.countries?.length) return [];
    const total = data.countries.reduce((a: number, c: any) => a + (Number(c.count) || 0), 0) || 1;
    return data.countries
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.country, flag: getFlag(c.country),
        pct: Math.round((c.count / total) * 100),
      }));
  })();

  const selectedPortfolio = portfolios.find(p => String(p.id) === selectedId);

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">Analytics</h1>
            <p className="text-[#71717A] text-sm mt-1">
              Suivez la performance de vos portfolios et cartes NFC.
              {lastUpdated && (
                <span className="ml-2 text-[#71717A]/60">
                  · Mis à jour {formatDistanceToNowStrict(lastUpdated, { locale: fr, addSuffix: true })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period toggle buttons */}
            {PERIOD_BTNS.map(btn => (
              <button
                key={btn.value}
                onClick={() => setPeriod(btn.value)}
                className={`h-9 px-3.5 rounded-[10px] text-sm font-medium transition-colors ${period === btn.value ? 'text-white' : 'border border-[#E7E7EA] text-[#18181B]/70 hover:bg-zinc-50'}`}
                style={period === btn.value ? { background: '#1B5E20' } : undefined}
              >
                {btn.label}
              </button>
            ))}
            {/* Portfolio selector */}
            {portfolios.length > 1 && (
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="h-9 pl-3 pr-8 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 appearance-none bg-white outline-none hover:bg-zinc-50 transition-colors cursor-pointer max-w-[180px]"
                >
                  {portfolios.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.titre || p.title || p.nom || `Portfolio #${p.id}`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#71717A]" />
              </div>
            )}
            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-9 w-9 rounded-[10px] border border-[#E7E7EA] flex items-center justify-center text-[#71717A] hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Portfolio banner */}
        {selectedPortfolio && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 rounded-xl bg-white border border-[#E7E7EA] text-sm">
            <span className="text-[#71717A]">Portfolio analysé :</span>
            <span className="font-semibold text-[#18181B]">
              {selectedPortfolio.titre || selectedPortfolio.title || selectedPortfolio.nom || `#${selectedId}`}
              <span className="ml-2 text-[#71717A]/50 font-mono text-xs">/{selectedPortfolio.url_slug || selectedPortfolio.slug || ''}</span>
            </span>
            <button
              onClick={() => window.open(`/portfolio/${selectedPortfolio.url_slug || selectedPortfolio.slug || selectedId}`, '_blank')}
              className="text-xs text-[#71717A] hover:text-[#18181B] underline"
            >
              Voir le portfolio
            </button>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AKpi label="Vues totales"      value={data?.total_visits   ?? '—'} up={true} delta={data ? '+' : undefined} />
          <AKpi label="Visiteurs uniques" value={data?.total_visitors ?? '—'} up={true} delta={data ? '+' : undefined} />
          <AKpi label="Temps moyen"       value={data ? fmtDuration(data.avg_time_seconds || 0) : '—'} />
          <AKpi label="Score perf."       value={data ? `${score}/100` : '—'} up={score >= 55} delta={data ? `${score}` : undefined} />
        </div>

        {/* ── Chart + Sources ── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h3 className="font-semibold text-[#18181B]">Vues du profil</h3>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {selectedPortfolio ? selectedPortfolio.titre || selectedPortfolio.title || `Portfolio #${selectedId}` : 'Évolution sur la période'}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-[#71717A]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#2E7D32' }} />
                Vues
              </span>
            </div>
            <SimpleBarChart data={data?.visits_over_time} />
          </div>

          {/* Traffic sources */}
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Sources de trafic</h3>
            {sourcesWithPct.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-sm text-[#71717A]">
                Aucune donnée
              </div>
            ) : (
              <div className="space-y-4">
                {sourcesWithPct.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-[#18181B]/80">{s.label}</span>
                      <span className="font-semibold text-[#18181B] tabular-nums">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: '#2E7D32' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Countries + Devices ── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Countries */}
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Audience par pays</h3>
            {countriesWithPct.length === 0 ? (
              <div className="flex items-center justify-center h-28 text-sm text-[#71717A]">Aucune donnée géographique</div>
            ) : (
              <div className="space-y-3.5">
                {countriesWithPct.map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{c.flag}</span>
                    <span className="text-sm text-[#18181B]/80 w-28 shrink-0 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: '#2E7D32' }} />
                    </div>
                    <span className="text-sm font-semibold text-[#18181B] tabular-nums w-10 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Devices */}
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Répartition des appareils</h3>
            <div className="space-y-4">
              {[
                { label: 'Desktop',  value: data?.device_desktop ?? 0, icon: Monitor,    color: '#3b82f6' },
                { label: 'Mobile',   value: data?.device_mobile  ?? 0, icon: Smartphone, color: '#2E7D32' },
                { label: 'Tablette', value: data?.device_tablet  ?? 0, icon: Tablet,     color: '#8b5cf6' },
              ].map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <d.icon className="w-4 h-4" style={{ color: d.color }} />
                      <span className="text-[#18181B]/80">{d.label}</span>
                    </div>
                    <span className="font-semibold text-[#18181B] tabular-nums">{d.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Géolocalisation (Business) ── */}
        {canAccessGeo ? (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Géolocalisation des visiteurs</h3>
            <WorldMap data={data?.countries || []} />
          </div>
        ) : null}

        {/* ── Heatmaps (Pro+) ── */}
        {canAccessHeatmaps ? (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Heatmap de clics</h3>
            {data?.heatmap?.length ? (
              <HeatmapGrid data={data.heatmap} />
            ) : (
              <div className="text-center py-10 text-sm text-[#71717A]">Aucun clic tracké sur la période.</div>
            )}
          </div>
        ) : (
          <LockedSection
            icon={Layers}
            title="Heatmaps de clics"
            description="Visualisez les zones les plus cliquées de votre portfolio et optimisez votre mise en page."
            planLabel="Pro"
          />
        )}

        {/* ── Session Replay (Pro+) ── */}
        {canAccessSessions ? (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Sessions enregistrées</h3>
            {data?.sessions?.length ? (
              <SessionReplayPlayer sessions={data.sessions} />
            ) : (
              <div className="text-center py-10 text-sm text-[#71717A]">Aucune session enregistrée sur la période.</div>
            )}
          </div>
        ) : (
          <LockedSection
            icon={Play}
            title="Session Replay"
            description="Rejouez les sessions de vos visiteurs pour comprendre leur parcours et détecter les points de friction."
            planLabel="Pro"
          />
        )}

        {/* ── SEO (Business) ── */}
        {canAccessSEO ? (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
            <h3 className="font-semibold text-[#18181B] mb-5">Analyse SEO</h3>
            <div className="text-center py-10 text-sm text-[#71717A] space-y-1">
              <Globe className="w-10 h-10 mx-auto text-[#71717A]/30 mb-3" />
              <p>L'analyse SEO nécessite une connexion Google Search Console.</p>
              <p className="text-xs text-[#71717A]/50">Fonctionnalité en cours de déploiement.</p>
            </div>
          </div>
        ) : (
          <LockedSection
            icon={Globe}
            title="Analyse SEO & Mots-clés Google"
            description="Suivez vos positions Google et analysez les mots-clés qui génèrent du trafic organique."
            planLabel="Business"
          />
        )}

      </div>
    </div>
  );
}
