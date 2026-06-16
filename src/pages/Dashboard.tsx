import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from '@/utils/authUtils';
import {
  Plus, Eye, BarChart2, CreditCard, Lock, ArrowRight,
  Globe, TrendingUp, Sparkles, FolderOpen, Search,
  Clock, LogIn, Wifi, User, Star, Zap, Crown, ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from '@/contexts/PlanContext';

// ─── Plan meta ────────────────────────────────────────────────────────────────
type PlanType = 'free' | 'starter' | 'pro' | 'business';

const PLAN_META: Record<PlanType, { label: string; limit: number; icon: React.ReactNode }> = {
  free:     { label: 'Gratuit',  limit: 1,        icon: <Star     size={14} /> },
  starter:  { label: 'Starter',  limit: 5,        icon: <Zap      size={14} /> },
  pro:      { label: 'Pro',      limit: 20,       icon: <Sparkles size={14} /> },
  business: { label: 'Business', limit: Infinity, icon: <Crown    size={14} /> },
};

function getPlanType(plan: any): PlanType {
  if (!plan) return 'free';
  const slug = String(plan.slug || '').toLowerCase();
  if (slug.includes('business')) return 'business';
  if (slug.includes('pro') || slug.includes('professionnel') || slug.includes('professional')) return 'pro';
  if (slug.includes('starter') || slug.includes('standard')) return 'starter';
  return 'free';
}

// ─── Plan usage bar ───────────────────────────────────────────────────────────
function PlanUsage({ used, limit }: { used: number; limit: number }) {
  if (limit === Infinity) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[#71717A]"><strong className="text-[#18181B] font-semibold">{used}</strong> portfolios</span>
          <span className="text-[#71717A]">Illimité</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full w-full rounded-full" style={{ background: '#2E7D32', opacity: 0.4 }} />
        </div>
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const isAtLimit = used >= limit;
  const barBg = isAtLimit ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#2E7D32';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-[#71717A]">
          <strong className="text-[#18181B] font-semibold">{used}</strong> / {limit} portfolios
        </span>
        <span className="text-[#71717A]">{limit - used} restant{limit - used > 1 ? 's' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barBg }} />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [portfolios, setPortfolios]           = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const { loading: planLoading, currentPlan } = usePlan();
  const navigate                              = useNavigate();
  const { toast }                             = useToast();
  const { user, profile, loading, signOut }   = useAuth();
  const [activites, setActivites]             = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [searchTerm, setSearchTerm]               = useState('');
  const [visibilityFilter, setVisibilityFilter]   = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy]                       = useState<'newest' | 'oldest' | 'views'>('newest');

  const planType      = useMemo(() => getPlanType(currentPlan), [currentPlan]);
  const planMeta      = PLAN_META[planType];
  const portfolioLimit = planMeta.limit;
  const isAtLimit     = portfolioLimit !== Infinity && portfolios.length >= portfolioLimit;

  const filtered = useMemo(() => {
    let list = [...portfolios];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => {
        const t = (p.titre || p.title || p.nom || '').toLowerCase();
        const s = (p.url_slug || p.slug || '').toLowerCase();
        const d = (p.description || p.bio || '').toLowerCase();
        return t.includes(q) || s.includes(q) || d.includes(q);
      });
    }
    if (visibilityFilter !== 'all') {
      list = list.filter(p => {
        const pub = p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true);
        return visibilityFilter === 'public' ? pub : !pub;
      });
    }
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date_creation || b.created_at || 0).getTime() - new Date(a.date_creation || a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.date_creation || a.created_at || 0).getTime() - new Date(b.date_creation || b.created_at || 0).getTime();
      return (b.views_count || 0) - (a.views_count || 0);
    });
    return list;
  }, [portfolios, searchTerm, visibilityFilter, sortBy]);

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const loadPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPortfolios(json.portfolios || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les portfolios", variant: "destructive" });
    }
  };

  const loadActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setLoadingActivity(true);
      const res = await fetch(`${API_BASE}/api/users/me/activity`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await res.json();
      setActivites(json.activities || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingActivity(false);
    }
  };

  const handlePayNow = async () => {
    if (!currentPlan) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: currentPlan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      const url = json.checkout_url || (json.checkout && `${window.location.origin}/checkout?token=${json.checkout.token}`);
      if (url) window.location.href = url;
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de démarrer le paiement', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (!loading && !user) { navigate('/auth'); return; }
    if (user) { loadPortfolios(); loadActivity(); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (planLoading) return;
    const role = ((profile as any)?.role || '').toString().toLowerCase();
    if (role === 'business_admin') { navigate('/business/dashboard', { replace: true }); return; }
    if (role === 'business_member') { navigate('/business/member', { replace: true }); return; }
    if (currentPlan && getPlanType(currentPlan) === 'business') navigate('/business/dashboard', { replace: true });
  }, [planLoading, currentPlan, profile, navigate]);

  const handleSignOut = async () => {
    try { await signOut(); } catch {
      toast({ title: "Erreur", description: "Impossible de se déconnecter", variant: "destructive" });
    }
  };

  const openCreate = () => {
    if (isAtLimit) {
      toast({ title: 'Limite atteinte', description: `Le plan ${planMeta.label} permet ${portfolioLimit} portfolio${portfolioLimit > 1 ? 's' : ''} maximum.`, variant: 'destructive' });
      return;
    }
    setShowPortfolioForm(true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8F8' }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-lg animate-pulse mx-auto mb-4" style={{ background: '#2E7D32' }} />
          <p className="text-[#71717A] text-sm">Chargement de votre dashboard…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const paymentDue = currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
    (profile && (profile as any).is_active === false) ||
    (currentPlan.next_payment_date && new Date(currentPlan.next_payment_date) <= new Date())
  );

  const totalViews = portfolios.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
  const totalPublic = portfolios.filter((p: any) => p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true)).length;

  // ── KPI data ───────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Portfolios',        value: portfolios.length,                                   sub: `sur ${portfolioLimit === Infinity ? '∞' : portfolioLimit} maximum`, icon: FolderOpen, primary: true  },
    { label: 'Vues totales',      value: totalViews.toLocaleString('fr-FR'),                  sub: 'sur tous vos portfolios',                                           icon: TrendingUp,  primary: false },
    { label: 'Portfolios publics',value: totalPublic,                                          sub: 'visibles en ligne',                                                 icon: Globe,       primary: false },
    { label: 'Activités',         value: activites.length,                                     sub: 'ce mois-ci',                                                        icon: Clock,       primary: false },
  ];

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quickActions = [
    { label: 'Nouveau portfolio', icon: Plus,     primary: true,  action: openCreate },
    { label: 'Cartes NFC',        icon: Wifi,     primary: false, action: () => navigate('/dashboard/nfc-cards') },
    { label: 'Mon profil',        icon: User,     primary: false, action: () => navigate('/dashboard/profile') },
    { label: 'Analytics',         icon: BarChart2,primary: false, action: () => navigate(portfolios.length > 0 ? `/dashboard/analytics/${portfolios[0]?.id}` : '/upgrade') },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-8">

        {/* ── Welcome ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">
              Bonjour, {profile?.prenom || profile?.nom || 'Utilisateur'}
            </h1>
            <p className="text-[#71717A] text-sm mt-1">Voici l'état de vos portfolios aujourd'hui.</p>
          </div>
          {!planLoading && (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full border border-[#E7E7EA] text-sm font-semibold text-[#18181B] bg-white">
              <span className="text-[#1B5E20]">{planMeta.icon}</span>
              Formule {planMeta.label}
            </span>
          )}
        </div>

        {/* ── Alerte paiement ── */}
        {paymentDue && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-red-800 text-sm">Paiement requis</p>
              <p className="text-red-600 text-xs mt-0.5">Votre abonnement requiert un paiement pour continuer.</p>
            </div>
            <button
              onClick={handlePayNow}
              className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shrink-0"
            >
              Payer maintenant — {Number(currentPlan.price_cents || 0).toLocaleString('fr-FR')} F CFA
            </button>
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={k.primary
                      ? { background: '#E8F5E9', color: '#1B5E20' }
                      : { background: '#F4F4F5', color: 'rgba(24,24,27,0.6)' }
                    }
                  >
                    <Icon size={17} />
                  </span>
                </div>
                <p className="text-[28px] leading-none font-semibold text-[#18181B] tracking-tight tabular-nums">{k.value}</p>
                <p className="text-sm font-medium text-[#18181B]/80 mt-2">{k.label}</p>
                <p className="text-xs text-[#71717A] mt-0.5">{k.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Colonne portfolios ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* En-tête */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#18181B]">Mes portfolios</h2>
                {!planLoading && (
                  <div className="mt-2.5 w-64 max-w-full">
                    <PlanUsage used={portfolios.length} limit={portfolioLimit} />
                  </div>
                )}
              </div>
              <button
                onClick={openCreate}
                disabled={isAtLimit}
                className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0 transition-colors disabled:opacity-50"
                style={{ background: '#2E7D32' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nouveau</span>
              </button>
            </div>

            {/* Bannière limite atteinte */}
            {isAtLimit && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Lock size={16} className="text-amber-600" />
                  </span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Limite du plan {planMeta.label} atteinte</p>
                    <p className="text-amber-700 text-xs mt-0.5">Upgradez pour créer davantage de portfolios.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0"
                  style={{ background: '#2E7D32' }}
                >
                  Voir les formules <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Barre de filtres */}
            {portfolios.length > 0 && (
              <div className="flex items-center gap-2.5 bg-white border border-[#E7E7EA] rounded-2xl p-2.5">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    placeholder="Rechercher un portfolio…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B] placeholder:text-[#71717A]"
                  />
                </div>
                <div className="relative">
                  <select
                    value={visibilityFilter}
                    onChange={e => setVisibilityFilter(e.target.value as any)}
                    className="h-9 pl-3 pr-7 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 bg-white hover:bg-zinc-50 transition-colors appearance-none cursor-pointer outline-none"
                  >
                    <option value="all">Visibilité</option>
                    <option value="public">Public</option>
                    <option value="private">Privé</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
                </div>
                <div className="relative hidden sm:block">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="h-9 pl-3 pr-7 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 bg-white hover:bg-zinc-50 transition-colors appearance-none cursor-pointer outline-none"
                  >
                    <option value="newest">Plus récent</option>
                    <option value="oldest">Plus ancien</option>
                    <option value="views">Plus de vues</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
                </div>
              </div>
            )}

            {/* Liste portfolios */}
            {filtered.length === 0 && portfolios.length > 0 ? (
              <div className="bg-white border border-dashed border-[#E7E7EA] rounded-2xl py-16 px-6 text-center">
                <span className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-[#71717A]" />
                </span>
                <h3 className="text-base font-semibold text-[#18181B] mb-1">Aucun portfolio trouvé</h3>
                <p className="text-[#71717A] text-sm mb-5">Modifiez vos filtres pour affiner la recherche.</p>
                <button
                  onClick={() => { setSearchTerm(''); setVisibilityFilter('all'); setSortBy('newest'); }}
                  className="h-9 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                >
                  Réinitialiser
                </button>
              </div>
            ) : portfolios.length === 0 ? (
              <div className="bg-white border border-dashed border-[#E7E7EA] rounded-2xl py-16 px-6 text-center">
                <span
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#E8F5E9', color: '#1B5E20' }}
                >
                  <FolderOpen size={24} />
                </span>
                <h3 className="text-base font-semibold text-[#18181B] mb-1">Aucun portfolio pour le moment</h3>
                <p className="text-[#71717A] text-sm mb-5 max-w-xs mx-auto">
                  Créez votre premier portfolio pour partager votre profil professionnel.
                </p>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white mx-auto"
                  style={{ background: '#2E7D32' }}
                >
                  <Plus size={16} /> Créer mon premier portfolio
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p: any) => {
                  const accent  = p.theme_color || '#2E7D32';
                  const isPublic = p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true);
                  const title   = p.titre || p.title || p.nom || 'Sans titre';
                  const slug    = p.url_slug || p.slug || p.id;
                  const desc    = p.description || p.bio || '';
                  const dateRaw = p.date_creation || p.created_at;

                  return (
                    <div
                      key={p.id}
                      className="group bg-white border border-[#E7E7EA] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#18181B]/15 transition-colors"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ background: `linear-gradient(140deg, ${accent}, ${accent}CC)` }}
                      >
                        {title.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-[#18181B] text-[15px] truncate">{title}</h3>
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={isPublic
                              ? { background: '#E8F5E9', color: '#1B5E20' }
                              : { background: '#F4F4F5', color: '#71717A' }
                            }
                          >
                            <Globe size={11} />
                            {isPublic ? 'Public' : 'Privé'}
                          </span>
                        </div>
                        <p className="text-sm text-[#71717A] truncate">{desc || 'Aucune description'}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-[#71717A]">
                          <span className="font-mono text-[#18181B]/50">/{slug}</span>
                          {dateRaw && !isNaN(new Date(dateRaw).getTime()) && (
                            <span>· {format(new Date(dateRaw), 'dd/MM/yyyy')}</span>
                          )}
                          {p.views_count > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={12} /> {p.views_count.toLocaleString('fr-FR')} vues
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => window.open(`/portfolio/${slug}`, '_blank')}
                          className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                        >
                          <Eye size={15} /> <span className="hidden sm:inline">Voir</span>
                        </button>
                        <button
                          onClick={() => navigate('/dashboard/portfolios')}
                          className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                        >
                          <BarChart2 size={15} /> <span className="hidden sm:inline">Éditer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => navigate('/dashboard/portfolios')}
                  className="w-full text-center text-sm font-medium py-2 hover:underline flex items-center justify-center gap-1.5"
                  style={{ color: '#1B5E20' }}
                >
                  Voir tous mes portfolios <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">

            {/* Actions rapides */}
            <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
              <h3 className="text-sm font-semibold text-[#18181B] mb-3.5">Actions rapides</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map(q => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={q.action}
                      className={`flex items-center gap-2.5 h-12 px-3 rounded-xl text-sm font-medium transition-colors text-left ${!q.primary ? 'border border-[#E7E7EA] text-[#18181B] hover:bg-zinc-50' : 'text-white'}`}
                      style={q.primary ? { background: '#1B5E20' } : undefined}
                    >
                      <Icon size={16} className={q.primary ? '' : 'text-[#71717A]'} />
                      <span className="leading-tight">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formule actuelle */}
            <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
              <h3 className="text-sm font-semibold text-[#18181B] mb-3.5">Formule actuelle</h3>
              {planLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 bg-zinc-100 rounded-xl" />
                  <div className="h-3 bg-zinc-100 rounded w-3/4" />
                  <div className="h-1.5 bg-zinc-100 rounded-full" />
                </div>
              ) : currentPlan ? (
                <>
                  {/* Plan inner block */}
                  <div
                    className="flex items-center justify-between rounded-xl p-3.5 mb-3.5"
                    style={{ background: '#E8F5E9' }}
                  >
                    <div>
                      <p className="text-sm font-bold text-[#18181B]">{currentPlan.name}</p>
                      <p className="text-xs text-[#18181B]/60 mt-0.5">
                        {Number(currentPlan.price_cents || 0) > 0
                          ? `${Number(currentPlan.price_cents || 0).toLocaleString('fr-FR')} F CFA / mois`
                          : 'Gratuit'}
                      </p>
                    </div>
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: '#2E7D32' }}
                    >
                      <Sparkles size={17} />
                    </span>
                  </div>

                  <PlanUsage used={portfolios.length} limit={portfolioLimit} />

                  <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-[#E7E7EA] text-xs">
                    <span className="flex items-center gap-1.5 text-[#71717A]">
                      <Clock size={14} />
                      {(currentPlan.next_billing_date || currentPlan.end_date)
                        ? `Renouvellement ${format(new Date(currentPlan.next_billing_date || currentPlan.end_date), 'dd MMM yyyy', { locale: fr })}`
                        : 'Abonnement actif'}
                    </span>
                    <button
                      onClick={() => navigate('/upgrade')}
                      className="font-semibold hover:underline"
                      style={{ color: '#1B5E20' }}
                    >
                      Gérer
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-[#71717A]">Aucune formule active</p>
                  <button onClick={() => navigate('/upgrade')} className="text-xs font-medium hover:underline mt-1" style={{ color: '#1B5E20' }}>
                    Voir les formules →
                  </button>
                </div>
              )}
            </div>

            {/* Activité récente */}
            <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
              <h3 className="text-sm font-semibold text-[#18181B] mb-3.5">Activité récente</h3>
              {loadingActivity ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <div className="h-3 bg-zinc-100 rounded w-3/4" />
                        <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activites.length === 0 ? (
                <div className="text-center py-6">
                  <span className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-2">
                    <Clock size={18} className="text-[#71717A]" />
                  </span>
                  <p className="text-sm text-[#71717A]">Aucune activité récente</p>
                </div>
              ) : (
                <div className="relative space-y-1">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#E7E7EA]" />
                  {activites.slice(0, 5).map((a: any, i: number) => {
                    const Icon = a.icon === 'folder' ? FolderOpen
                      : a.icon === 'credit-card' ? CreditCard
                      : a.icon === 'log-in' ? LogIn
                      : Clock;
                    return (
                      <div key={`${a.activity_type}-${a.entity_id}-${i}`} className="relative flex items-start gap-3 py-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-zinc-100 text-[#18181B]/55">
                          <Icon size={15} />
                        </span>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-[13px] font-semibold text-[#18181B] leading-tight">{a.title || 'Activité'}</p>
                          {a.description && <p className="text-xs text-[#71717A] truncate mt-0.5">{a.description}</p>}
                          {a.created_at && (
                            <p className="text-[11px] text-[#71717A]/70 mt-0.5">
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal création portfolio ── */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              onClose={() => setShowPortfolioForm(false)}
              onSuccess={() => { setShowPortfolioForm(false); if (user) { loadPortfolios(); loadActivity(); } }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
