import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from '@/utils/authUtils';
import {
  User, Plus, Eye, BarChart, CreditCard, Lock, ArrowRight,
  Globe, TrendingUp, Star, Zap, Sparkles, Crown, FolderOpen, Search,
  FileText, CheckCircle, Clock, LogIn
} from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from '@/contexts/PlanContext';
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types de plan et leurs limites ──────────────────────────────────────────
type PlanType = 'free' | 'starter' | 'pro' | 'business';

const PLAN_META: Record<PlanType, {
  label: string;
  limit: number;
  icon: React.ReactNode;
  textColor: string;
  bgColor: string;
}> = {
  free: { label: 'Gratuit', limit: 1, icon: <Star className="w-3.5 h-3.5" />, textColor: 'text-gray-600', bgColor: 'bg-gray-100' },
  starter: { label: 'Starter', limit: 5, icon: <Zap className="w-3.5 h-3.5" />, textColor: 'text-blue-700', bgColor: 'bg-blue-100' },
  pro: { label: 'Pro', limit: 20, icon: <Sparkles className="w-3.5 h-3.5" />, textColor: 'text-purple-700', bgColor: 'bg-purple-100' },
  business: { label: 'Business', limit: Infinity, icon: <Crown className="w-3.5 h-3.5" />, textColor: 'text-amber-700', bgColor: 'bg-amber-100' },
};

function getPlanType(plan: any): PlanType {
  if (!plan) return 'free';
  const slug = String(plan.slug || '').toLowerCase();
  if (slug.includes('business')) return 'business';
  if (slug.includes('pro') || slug.includes('professionnel') || slug.includes('professional')) return 'pro';
  if (slug.includes('starter') || slug.includes('standard')) return 'starter';
  return 'free';
}

// ─── Barre de progression du quota ───────────────────────────────────────────
function PlanUsageBar({
  used,
  limit,
  planLabel,
  onUpgrade,
}: {
  used: number;
  limit: number;
  planLabel: string;
  onUpgrade: () => void;
}) {
  if (limit === Infinity) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
        </div>
        <span className="shrink-0 text-xs font-medium text-amber-600">Illimité</span>
      </div>
    );
  }

  const pct = Math.min((used / limit) * 100, 100);
  const isAtLimit = used >= limit;
  const barColor = isAtLimit ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#28A745]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          <strong className="text-gray-800">{used}</strong> / {limit} portfolios ({planLabel})
        </span>
        {isAtLimit ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="text-[#28A745] font-semibold hover:underline flex items-center gap-1"
          >
            Upgrader <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-gray-400">{limit - used} restant{limit - used > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Bouton création avec état limite ────────────────────────────────────────
function NewPortfolioButton({
  isAtLimit,
  planLabel,
  used,
  limit,
  onClick,
  onUpgrade,
}: {
  isAtLimit: boolean;
  planLabel: string;
  used: number;
  limit: number;
  onClick: () => void;
  onUpgrade: () => void;
}) {
  if (isAtLimit) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={onUpgrade}
          className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <Lock className="w-4 h-4" />
          Limite {planLabel} atteinte
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-gray-400">{used}/{limit === Infinity ? '∞' : limit} portfolios</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={onClick} className="bg-[#28A745] hover:bg-green-600 text-white font-semibold">
        <Plus className="w-4 h-4 mr-2" />
        Nouveau Portfolio
      </Button>
      <span className="text-xs text-gray-400">
        {limit === Infinity ? 'Illimité' : `${used}/${limit} utilisés`}
      </span>
    </div>
  );
}

// ─── Page Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const { isFreePlan: ctxIsFree, loading: planLoading, currentPlan } = usePlan();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading, signOut } = useAuth();
  const [abonnements, setAbonnements] = useState<any[]>([]);
  const [activites, setActivites] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const ACTIVITY_PREVIEW = 4;

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'views'>('newest');

  // Dérivation du type de plan et des limites
  const planType = useMemo(() => getPlanType(currentPlan), [currentPlan]);
  const planMeta = PLAN_META[planType];
  const portfolioLimit = planMeta.limit;
  const isAtLimit = portfolioLimit !== Infinity && portfolios.length >= portfolioLimit;

  // Filtrage et tri des portfolios
  const filteredAndSortedPortfolios = useMemo(() => {
    let filtered = [...portfolios];

    // Filtre par recherche textuelle
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const title = (p.titre || p.title || p.nom || '').toLowerCase();
        const slug = (p.url_slug || p.slug || '').toLowerCase();
        const description = (p.description || p.bio || '').toLowerCase();
        return title.includes(search) || slug.includes(search) || description.includes(search);
      });
    }

    // Filtre par visibilité
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const isPublic = p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true);
        return visibilityFilter === 'public' ? isPublic : !isPublic;
      });
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_creation || b.created_at || 0).getTime() - new Date(a.date_creation || a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.date_creation || a.created_at || 0).getTime() - new Date(b.date_creation || b.created_at || 0).getTime();
        case 'views':
          return (b.views_count || 0) - (a.views_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [portfolios, searchTerm, visibilityFilter, sortBy]);

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
    } catch (err: any) {
      toast({ title: 'Erreur', description: 'Impossible de démarrer le paiement', variant: 'destructive' });
    }
  };

  const loadAbonnements = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/abonnements/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await res.json();
      const rows = json.abonnements || [];
      const enriched = await Promise.all(rows.map(async (a: any) => {
        const item = { ...a };
        try {
          if (item.metadata && typeof item.metadata === 'string') item.metadata = JSON.parse(item.metadata);
        } catch { /* ignore */ }
        if (item.plan_id) {
          try {
            const pres = await fetch(`${API_BASE}/api/plans/${item.plan_id}`);
            if (pres.ok) {
              const pjson = await pres.json();
              item.plan = pjson.plan || null;
            }
          } catch { /* ignore */ }
        }
        return item;
      }));
      setAbonnements(enriched || []);
    } catch (e) {
      console.warn('Could not load abonnements', e);
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
    } catch (e) {
      console.warn('Could not load activity', e);
    } finally {
      setLoadingActivity(false);
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
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      loadPortfolios();
      loadAbonnements();
      loadActivity();
    }
  }, [user, loading, navigate]);

  // Redirect Business plan users to their dedicated interface
  useEffect(() => {
    if (planLoading) return;
    const role = ((profile as any)?.role || '').toString().toLowerCase();
    if (role === 'business_admin') { navigate('/business/dashboard', { replace: true }); return; }
    if (role === 'business_member') { navigate('/business/member', { replace: true }); return; }
    if (!planLoading && currentPlan && getPlanType(currentPlan) === 'business') {
      navigate('/business/dashboard', { replace: true });
    }
  }, [planLoading, currentPlan, profile, navigate]);

  const loadPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPortfolios(json.portfolios || []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les portfolios", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast({ title: "Erreur", description: "Impossible de se déconnecter", variant: "destructive" });
    }
  };

  const openCreate = () => {
    if (isAtLimit) {
      toast({
        title: 'Limite atteinte',
        description: `Le plan ${planMeta.label} permet ${portfolioLimit} portfolio${portfolioLimit > 1 ? 's' : ''} maximum. Upgradez pour continuer.`,
        variant: 'destructive',
      });
      return;
    }
    setShowPortfolioForm(true);
  };

  const handlePortfolioCreated = () => {
    setShowPortfolioForm(false);
    if (user) {
      loadPortfolios();
      loadActivity();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#28A745] rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Chargement de votre dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const paymentDue = currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
    (profile && profile.is_active === false) ||
    (currentPlan.next_payment_date && new Date(currentPlan.next_payment_date) <= new Date())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Bienvenue ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Bonjour {profile?.prenom || profile?.nom || 'Utilisateur'} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Gérez vos portfolios et suivez vos performances.
            </p>
          </div>
          {!planLoading && (
            <Badge className={`${planMeta.bgColor} ${planMeta.textColor} border-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold self-start sm:self-auto`}>
              {planMeta.icon}
              Formule {planMeta.label}
            </Badge>
          )}
        </div>

        {/* ── KPIs rapides ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Portfolios',
              value: portfolios.length,
              icon: <FolderOpen className="w-4 h-4" />,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              sub: `/ ${portfolioLimit === Infinity ? '∞' : portfolioLimit} max`,
            },
            {
              label: 'Vues totales',
              value: portfolios.reduce((s, p) => s + (p.views_count || 0), 0),
              icon: <TrendingUp className="w-4 h-4" />,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              sub: 'sur tous vos portfolios',
            },
            {
              label: 'Activités',
              value: activites.length,
              icon: <Clock className="w-4 h-4" />,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
              sub: 'actions récentes',
            },
            {
              label: 'Publics',
              value: portfolios.filter(p => p.is_public !== undefined ? p.is_public : p.est_public !== undefined ? p.est_public : true).length,
              icon: <Globe className="w-4 h-4" />,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              sub: 'portfolios visibles',
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={`${kpi.bg} ${kpi.color} p-2 rounded-lg shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Alerte paiement requis ── */}
        {paymentDue && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-red-800 text-sm">Paiement requis</p>
              <p className="text-red-600 text-xs mt-0.5">
                Votre abonnement requiert un paiement pour continuer à utiliser toutes les fonctionnalités.
              </p>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0" onClick={handlePayNow}>
              Payer maintenant — {(Number(currentPlan.price_cents || 0) / 100).toLocaleString('fr-FR')} {currentPlan.currency || 'F CFA'}
            </Button>
          </div>
        )}

        {/* ── Contenu principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ── Colonne portfolios ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* En-tête section portfolios */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Mes Portfolios</h2>
                {!planLoading && (
                  <div className="mt-2 w-full sm:w-72">
                    <PlanUsageBar
                      used={portfolios.length}
                      limit={portfolioLimit}
                      planLabel={planMeta.label}
                      onUpgrade={() => navigate('/upgrade')}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <NewPortfolioButton
                  isAtLimit={isAtLimit}
                  planLabel={planMeta.label}
                  used={portfolios.length}
                  limit={portfolioLimit}
                  onClick={openCreate}
                  onUpgrade={() => navigate('/upgrade')}
                />
              </div>
            </div>

            {/* ── Bannière upgrade quand limite atteinte ── */}
            {isAtLimit && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 rounded-lg shrink-0 mt-0.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      Limite du plan {planMeta.label} atteinte
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      {planType === 'free' && 'Le plan Gratuit inclut 1 portfolio. Passez au Starter pour en créer 5.'}
                      {planType === 'starter' && 'Le plan Starter inclut 5 portfolios. Passez au Pro pour en créer 20.'}
                      {planType === 'pro' && 'Le plan Pro inclut 20 portfolios. Passez au Business pour un accès illimité.'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/upgrade')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0 gap-1.5"
                >
                  Voir les formules <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* ── Barre de filtres ── */}
            {portfolios.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-1 gap-2 w-full sm:max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher un portfolio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as any)}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Visibilité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Privé</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Plus récent</SelectItem>
                      <SelectItem value="oldest">Plus ancien</SelectItem>
                      <SelectItem value="views">Plus de vues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── Liste portfolios ── */}
            {filteredAndSortedPortfolios.length === 0 && portfolios.length > 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 px-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Aucun portfolio trouvé</h3>
                <p className="text-gray-500 text-sm mb-5">
                  Aucun portfolio ne correspond à votre recherche. Essayez de modifier vos filtres.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchTerm(''); setVisibilityFilter('all'); setSortBy('newest'); }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : portfolios.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 px-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Aucun portfolio pour le moment</h3>
                <p className="text-gray-500 text-sm mb-5 max-w-xs mx-auto">
                  Créez votre premier portfolio pour partager votre profil professionnel.
                </p>
                <Button
                  onClick={openCreate}
                  disabled={isAtLimit}
                  className="bg-[#28A745] hover:bg-green-600 text-white font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer mon premier portfolio
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedPortfolios.map((portfolio) => {
                  const accent = portfolio.theme_color || '#28A745';
                  const isPublic = portfolio.is_public !== undefined
                    ? portfolio.is_public
                    : portfolio.est_public !== undefined
                      ? portfolio.est_public
                      : true;
                  const title = portfolio.titre || portfolio.title || portfolio.nom || 'Sans titre';
                  const slug = portfolio.url_slug || portfolio.slug || portfolio.id;
                  const description = portfolio.description || portfolio.bio || '';
                  const dateRaw = portfolio.date_creation || portfolio.created_at;

                  return (
                    <div
                      key={portfolio.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4"
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: `linear-gradient(135deg, ${accent}99, ${accent})` }}
                      >
                        {title.charAt(0).toUpperCase()}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{title}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {isPublic ? 'Public' : 'Privé'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{description || 'Aucune description'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="font-mono">/{slug}</span>
                          {dateRaw && !isNaN(new Date(dateRaw).getTime()) && (
                            <span>· {format(new Date(dateRaw), 'dd/MM/yyyy')}</span>
                          )}
                          {portfolio.views_count > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {portfolio.views_count} vues
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => window.open(`/portfolio/${slug}`, '_blank')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Voir</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => navigate('/dashboard/portfolios')}
                        >
                          <BarChart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Gérer</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Lien vers la page complète */}
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/portfolios')}
                  className="w-full text-center text-sm text-[#28A745] hover:text-green-700 font-medium py-2 hover:underline flex items-center justify-center gap-1.5"
                >
                  Voir tous mes portfolios <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Actions rapides — grille compacte 2 colonnes */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Portfolios',   icon: <FolderOpen className="w-4 h-4" />, path: '/dashboard/portfolios', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                    { label: 'Paiements',    icon: <CreditCard className="w-4 h-4" />,  path: '/dashboard/paiements',  color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                    { label: 'Mon profil',   icon: <User className="w-4 h-4" />,        path: '/dashboard/profile',    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
                    { label: 'Carte NFC',    icon: <CreditCard className="w-4 h-4" />,  path: '/dashboard/nfc-cards',  color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
                    { label: 'Formules',     icon: <Sparkles className="w-4 h-4" />,    path: '/upgrade',              color: 'text-pink-600 bg-pink-50 hover:bg-pink-100' },
                    { label: 'Analytics',    icon: <BarChart className="w-4 h-4" />,    path: portfolios.length > 0 ? `/dashboard/analytics/${portfolios[0]?.id}` : '/upgrade', color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
                  ].map(({ label, icon, path, color }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors ${color}`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Formule actuelle — compact */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700">Formule actuelle</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {planLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-1.5 bg-gray-100 rounded-full animate-pulse mt-3" />
                  </div>
                ) : currentPlan ? (
                  <div className="space-y-3">
                    {/* Plan badge + prix */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{currentPlan.name}</p>
                        <p className="text-xs text-gray-500">
                          {Number(currentPlan.price_cents || 0) > 0
                            ? `${(Number(currentPlan.price_cents || 0) / 100).toLocaleString('fr-FR')} ${currentPlan.currency || 'F CFA'}`
                            : 'Gratuit'}
                        </p>
                      </div>
                      <Badge className={`${planMeta.bgColor} ${planMeta.textColor} border-0 text-xs flex items-center gap-1 shrink-0`}>
                        {planMeta.icon} {planMeta.label}
                      </Badge>
                    </div>

                    {/* Quota portfolios */}
                    <PlanUsageBar
                      used={portfolios.length}
                      limit={portfolioLimit}
                      planLabel={planMeta.label}
                      onUpgrade={() => navigate('/upgrade')}
                    />

                    {/* Prochain renouvellement */}
                    {Number(currentPlan.price_cents || 0) > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-amber-800 min-w-0">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          {(currentPlan.next_billing_date || currentPlan.end_date) ? (
                            <span className="truncate">
                              Renouvellement : <strong>{format(new Date(currentPlan.next_billing_date || currentPlan.end_date), 'dd MMM yyyy', { locale: fr })}</strong>
                            </span>
                          ) : (
                            <span className="truncate">Abonnement payant actif</span>
                          )}
                        </div>
                        <button
                          onClick={() => navigate('/reabonnement')}
                          className="text-[11px] text-emerald-600 font-semibold hover:underline shrink-0"
                        >
                          Renouveler →
                        </button>
                      </div>
                    )}

                    {/* Abonnements — limités à 2, scroll si plus */}
                    {abonnements.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Abonnements</p>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                          {abonnements.map((a) => (
                            <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 bg-white text-xs">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-800 truncate">{a.plan?.name || 'Abonnement'}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  a.statut === 'active' ? 'bg-green-100 text-green-700' :
                                  a.statut === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {a.statut || 'pending'}
                                </span>
                              </div>
                              {a.montant > 0 && (
                                <p className="text-gray-500 shrink-0 ml-2">{Number(a.montant).toLocaleString('fr-FR')} {a.currency || 'F CFA'}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-400">Aucune formule active</p>
                    <button onClick={() => navigate('/upgrade')} className="text-xs text-[#28A745] font-medium hover:underline mt-1">
                      Voir les formules →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activité récente — timeline avec pagination */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Activité récente</CardTitle>
                {activites.length > ACTIVITY_PREVIEW && (
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                    {activites.length}
                  </span>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {loadingActivity ? (
                  /* Skeleton amélioré */
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                        <div className="flex-1 space-y-1.5 pt-0.5">
                          <div className="h-3 bg-gray-100 rounded w-3/4" />
                          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                          <div className="h-2 bg-gray-100 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activites.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Aucune activité</p>
                    <p className="text-xs text-gray-300 mt-0.5">Vos actions apparaîtront ici</p>
                  </div>
                ) : (
                  <>
                    {/* Timeline */}
                    <div
                      className={`relative space-y-0 transition-all duration-300 ${
                        showAllActivities && activites.length > ACTIVITY_PREVIEW
                          ? 'max-h-80 overflow-y-auto pr-1'
                          : ''
                      }`}
                    >
                      {/* Ligne verticale */}
                      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100" />

                      {(showAllActivities ? activites : activites.slice(0, ACTIVITY_PREVIEW)).map((activity: any, index: number) => {
                        const Icon = activity.icon === 'folder' ? FolderOpen
                          : activity.icon === 'credit-card' ? CreditCard
                          : activity.icon === 'log-in' ? LogIn
                          : Clock;

                        const dotColor =
                          activity.activity_type === 'portfolio_created' ? 'bg-emerald-500' :
                          activity.activity_type === 'payment_made' ? 'bg-blue-500' : 'bg-gray-400';

                        const iconBg =
                          activity.activity_type === 'portfolio_created' ? 'bg-emerald-50 text-emerald-600' :
                          activity.activity_type === 'payment_made' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-500';

                        return (
                          <div
                            key={`${activity.activity_type}-${activity.entity_id}-${index}`}
                            className="relative flex items-start gap-3 py-2.5 pl-1"
                          >
                            {/* Dot sur la timeline */}
                            <div className={`w-[7px] h-[7px] rounded-full ${dotColor} mt-2.5 shrink-0 relative z-10 ml-[12px]`} />

                            {/* Icône + contenu */}
                            <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                                {activity.title || 'Activité'}
                              </p>
                              {activity.description && (
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  {activity.description}
                                </p>
                              )}
                              {activity.created_at && (
                                <p className="text-[10px] text-gray-300 mt-0.5">
                                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fr })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Toggle voir plus / moins */}
                    {activites.length > ACTIVITY_PREVIEW && (
                      <button
                        onClick={() => setShowAllActivities(v => !v)}
                        className="w-full mt-2 text-center text-xs text-[#28A745] hover:text-green-700 font-medium py-1.5 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {showAllActivities
                          ? <>Réduire <CheckCircle className="w-3 h-3" /></>
                          : <>Voir les {activites.length - ACTIVITY_PREVIEW} autres <ArrowRight className="w-3 h-3" /></>
                        }
                      </button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Modal création portfolio ── */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              onClose={() => setShowPortfolioForm(false)}
              onSuccess={handlePortfolioCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
