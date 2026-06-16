import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from "@/utils/authUtils";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Eye, Edit, Trash2, BarChart2, Globe, Lock,
  Users, TrendingUp, Sparkles, ExternalLink, Share2,
  Crown, Zap, Star, ArrowRight, FolderOpen, Search,
  Clock, ChevronDown,
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { DeletePortfolioModal } from "@/components/portfolio/DeletePortfolioModal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Portfolio {
  id: string;
  title: string;
  slug: string;
  bio?: string;
  is_public: boolean;
  profile_image_url?: string;
  theme_color?: string;
  created_at: string;
  views_count?: number;
  contacts_count?: number;
}

type PlanType = "free" | "starter" | "pro" | "business";

const PLAN_META: Record<PlanType, { label: string; icon: React.ReactNode; limit: number }> = {
  free:     { label: "Gratuit",  icon: <Star     size={12} />, limit: 1        },
  starter:  { label: "Starter",  icon: <Zap      size={12} />, limit: 5        },
  pro:      { label: "Pro",      icon: <Sparkles size={12} />, limit: 20       },
  business: { label: "Business", icon: <Crown    size={12} />, limit: Infinity },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function PFStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] p-4 flex items-center gap-3.5">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-[#18181B]/60">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-[#18181B] leading-none tabular-nums">{value}</p>
        <p className="text-xs text-[#71717A] mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Portfolio card ───────────────────────────────────────────────────────────
function PFCard({
  portfolio,
  isTop,
  showAnalytics,
  onShare,
  onView,
  onAnalytics,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  isTop: boolean;
  showAnalytics: boolean;
  onShare: () => void;
  onView: () => void;
  onAnalytics: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent  = portfolio.theme_color || '#2E7D32';
  const initial = portfolio.title.charAt(0).toUpperCase();
  const hasAccent = !!portfolio.theme_color;

  return (
    <div className="group bg-white rounded-2xl border border-[#E7E7EA] overflow-hidden flex flex-col hover:shadow-[0_10px_36px_rgba(16,24,40,0.09)] transition-shadow duration-300">

      {/* Banner */}
      <div
        className="relative h-24"
        style={{
          background: hasAccent
            ? `linear-gradient(135deg, #E8F5E9, color-mix(in srgb, ${accent} 30%, #fff))`
            : 'linear-gradient(135deg,#F4F4F5,#E4E4E7)',
        }}
      >
        {/* Badges top-right */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {isTop && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-[#18181B]">
              <Star size={11} className="text-amber-500" /> Top
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-[#71717A]">
            <Globe size={11} /> {portfolio.is_public ? 'Public' : 'Privé'}
          </span>
        </div>

        {/* Avatar chevauchant */}
        <div
          className="absolute -bottom-6 left-5 w-14 h-14 rounded-2xl border-[3px] border-white flex items-center justify-center text-white text-xl font-bold shadow-sm"
          style={{
            background: hasAccent
              ? `linear-gradient(140deg, ${accent}, #1B5E20)`
              : 'linear-gradient(140deg,#52525B,#27272A)',
          }}
        >
          {portfolio.profile_image_url ? (
            <img src={portfolio.profile_image_url} alt={portfolio.title} className="w-full h-full object-cover rounded-xl" />
          ) : initial}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-9 pb-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-[#18181B] text-[15px] leading-tight line-clamp-1">{portfolio.title}</h3>
        <p className="text-xs font-mono text-[#71717A]/80 mt-0.5">/{portfolio.slug}</p>
        <p className="text-sm text-[#18181B]/60 mt-2 line-clamp-2 leading-relaxed flex-1">
          {portfolio.bio || <span className="italic text-[#71717A]/50">Aucune description</span>}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-[#71717A]">
          <span className="flex items-center gap-1.5">
            <Eye size={13} />
            <strong className="text-[#18181B]/80 font-semibold">{(portfolio.views_count ?? 0).toLocaleString('fr-FR')}</strong> vues
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {portfolio.created_at && !isNaN(new Date(portfolio.created_at).getTime())
              ? format(new Date(portfolio.created_at), 'd MMM yyyy', { locale: fr })
              : '—'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-[#E7E7EA] px-3 py-2.5 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-0.5">
          <button onClick={onShare} title="Copier le lien" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-white transition-colors">
            <Share2 size={15} />
          </button>
          <button onClick={onView} title="Voir en ligne" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-white transition-colors">
            <ExternalLink size={15} />
          </button>
          {showAnalytics && (
            <button onClick={onAnalytics} title="Statistiques" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-white transition-colors">
              <BarChart2 size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} title="Modifier" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-white transition-colors">
            <Edit size={15} />
          </button>
          <button onClick={onDelete} title="Supprimer" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-red-600 hover:bg-white transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Portfolios() {
  const [profile,           setProfile]           = useState<any>(null);
  const [portfolios,        setPortfolios]         = useState<Portfolio[]>([]);
  const [loading,           setLoading]            = useState(true);
  const [showPortfolioForm, setShowPortfolioForm]  = useState(false);
  const [editingPortfolio,  setEditingPortfolio]   = useState<Portfolio | null>(null);
  const [planType,          setPlanType]           = useState<PlanType>("free");
  const [loadingEdit,       setLoadingEdit]        = useState<string | null>(null);
  const [deleteTarget,      setDeleteTarget]       = useState<Portfolio | null>(null);
  const [deleting,          setDeleting]           = useState(false);

  const [searchTerm,       setSearchTerm]       = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy,           setSortBy]           = useState<"newest" | "oldest" | "views" | "title">("newest");

  const navigate   = useNavigate();
  const { toast }  = useToast();
  const { signOut } = useAuth();

  const plan           = PLAN_META[planType];
  const portfolioLimit = plan.limit;
  const isAtLimit      = portfolioLimit !== Infinity && portfolios.length >= portfolioLimit;

  const handleSignOut = async () => { await signOut(); };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:         portfolios.length,
    publicCount:   portfolios.filter(p => p.is_public).length,
    totalViews:    portfolios.reduce((a, p) => a + (p.views_count    || 0), 0),
    totalContacts: portfolios.reduce((a, p) => a + (p.contacts_count || 0), 0),
  }), [portfolios]);

  const topPortfolioId = useMemo(() => {
    if (portfolios.length === 0) return null;
    return portfolios.reduce((best, p) => (p.views_count || 0) > (best.views_count || 0) ? p : best).id;
  }, [portfolios]);

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...portfolios];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.slug  || '').toLowerCase().includes(q) ||
        (p.bio   || '').toLowerCase().includes(q)
      );
    }
    if (visibilityFilter !== 'all')
      list = list.filter(p => visibilityFilter === 'public' ? p.is_public : !p.is_public);
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      if (sortBy === 'views')  return (b.views_count || 0) - (a.views_count || 0);
      return (a.title || '').localeCompare(b.title || '');
    });
    return list;
  }, [portfolios, searchTerm, visibilityFilter, sortBy]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" });
      navigate("/auth");
    }
  }, [navigate, toast]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/auth"); return; }
      try {
        const [profileRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (!profileRes.ok) throw new Error();
        const profileJson = await profileRes.json();
        setProfile(profileJson.user);
        if (plansRes?.ok) {
          const pj = await plansRes.json();
          const plans = pj.plans || [];
          if (plans.length > 0) {
            const slug = String(plans[0].slug || '').toLowerCase();
            if (slug.includes('business')) setPlanType('business');
            else if (slug.includes('pro') || slug.includes('professionnel') || slug.includes('professional')) setPlanType('pro');
            else if (slug.includes('starter') || slug.includes('standard')) setPlanType('starter');
            else setPlanType('free');
          }
        }
        await loadPortfolios();
      } catch {
        toast({ title: "Erreur", description: "Impossible de charger vos données", variant: "destructive" });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate, toast]);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => loadPortfolios().catch(() => {}), 10_000);
    return () => clearInterval(id);
  }, [loading]);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const loadPortfolios = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/auth"); return; }
    const res = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json();
    const mapped = (json.portfolios || []).map((p: any) => ({
      ...p,
      slug:              p.slug || p.url_slug || p.url || "",
      title:             p.title || p.titre || p.nom || "",
      profile_image_url: p.profile_image_url || p.photo || p.avatar || "",
      created_at:        p.date_creation || p.created_at || null,
      is_public:         p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true),
    }));
    setPortfolios(mapped);
  };

  const handleDelete   = (p: Portfolio) => setDeleteTarget(p);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${deleteTarget.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: "Portfolio supprimé" });
      setDeleteTarget(null);
      loadPortfolios();
    } catch {
      toast({ title: "Erreur", description: "Suppression impossible", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const copyPortfolioLink = (p: Portfolio) => {
    const link = `${window.location.origin}/portfolio/${p.slug || p.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Lien copié !", description: link });
  };

  const openEdit = async (p: Portfolio) => {
    setLoadingEdit(p.id);
    const token = localStorage.getItem("token");
    try {
      const res  = await fetch(`${API_BASE}/api/portfolios/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = res.ok ? await res.json() : null;
      setEditingPortfolio(json?.portfolio || p);
    } catch {
      setEditingPortfolio(p);
    } finally {
      setLoadingEdit(null);
      setShowPortfolioForm(true);
    }
  };

  const openCreate = () => {
    if (isAtLimit) {
      toast({ title: "Limite atteinte", description: `Le plan ${plan.label} permet ${portfolioLimit} portfolio${portfolioLimit > 1 ? "s" : ""} maximum.`, variant: "destructive" });
      return;
    }
    setEditingPortfolio(null);
    setShowPortfolioForm(true);
  };

  // ── Usage percent ──────────────────────────────────────────────────────────
  const usagePct = portfolioLimit === Infinity ? 0 : Math.min((portfolios.length / portfolioLimit) * 100, 100);
  const barColor  = usagePct >= 100 ? '#EF4444' : usagePct >= 80 ? '#F59E0B' : '#2E7D32';

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
        <DashboardNav onSignOut={handleSignOut} profile={profile} />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-8 w-52 bg-white rounded-xl animate-pulse" />
              <div className="h-4 w-80 bg-white rounded-xl animate-pulse" />
            </div>
            <div className="h-10 w-40 bg-white rounded-[10px] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-72 bg-white rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DeletePortfolioModal
        open={!!deleteTarget}
        portfolioTitle={deleteTarget?.title || ''}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">Mes portfolios</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E7E7EA] text-xs font-semibold text-[#18181B] bg-white">
                <span className="text-[#1B5E20]">{plan.icon}</span> {plan.label}
              </span>
            </div>
            <p className="text-[#71717A] text-sm">Créez, gérez et partagez vos portfolios professionnels.</p>
          </div>
          <button
            onClick={openCreate}
            disabled={isAtLimit}
            className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white shrink-0 transition-colors disabled:opacity-50"
            style={{ background: '#2E7D32' }}
          >
            <Plus size={16} /> Nouveau portfolio
          </button>
        </div>

        {/* ── Barre d'utilisation ── */}
        {portfolioLimit !== Infinity && (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] px-5 py-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-[#18181B]/80">
                {portfolios.length} / {portfolioLimit} portfolios utilisés
              </span>
              {isAtLimit ? (
                <button
                  onClick={() => navigate('/upgrade')}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: '#1B5E20' }}
                >
                  Upgrader <ArrowRight size={12} />
                </button>
              ) : (
                <span className="text-xs text-[#71717A]">{portfolioLimit - portfolios.length} restant{portfolioLimit - portfolios.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePct}%`, background: barColor }} />
            </div>
          </div>
        )}

        {/* ── Stats KPI ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PFStat icon={<FolderOpen size={18} />} label="Portfolios"          value={stats.total} />
          <PFStat icon={<Globe      size={18} />} label="Publics"             value={stats.publicCount} />
          <PFStat icon={<TrendingUp size={18} />} label="Vues totales"        value={stats.totalViews.toLocaleString('fr-FR')} />
          <PFStat icon={<Users      size={18} />} label="Contacts collectés"  value={planType === 'free' ? '—' : stats.totalContacts.toLocaleString('fr-FR')} />
        </div>

        {/* ── Barre de filtres ── */}
        {portfolios.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-2.5 flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                placeholder="Rechercher par titre, slug ou description…"
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
                <option value="title">Titre (A-Z)</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
            </div>
          </div>
        )}

        {/* ── Grille portfolios ── */}
        {portfolios.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E7E7EA] rounded-2xl py-20 px-6 text-center">
            <span className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <FolderOpen size={28} />
            </span>
            <h3 className="text-lg font-semibold text-[#18181B] mb-2">Aucun portfolio pour le moment</h3>
            <p className="text-[#71717A] text-sm max-w-sm mx-auto mb-7 leading-relaxed">
              Créez votre premier portfolio et commencez à construire votre présence professionnelle en ligne.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[10px] text-sm font-semibold text-white"
              style={{ background: '#2E7D32' }}
            >
              <Plus size={16} /> Créer mon premier portfolio
            </button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#E7E7EA] rounded-2xl py-20 px-6 text-center">
            <span className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-[#71717A]" />
            </span>
            <h3 className="text-base font-semibold text-[#18181B] mb-1">Aucun portfolio trouvé</h3>
            <p className="text-[#71717A] text-sm mb-5">Modifiez vos filtres pour affiner la recherche.</p>
            <button
              onClick={() => { setSearchTerm(''); setVisibilityFilter('all'); setSortBy('newest'); }}
              className="h-9 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>

        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(p => (
              <PFCard
                key={p.id}
                portfolio={p}
                isTop={p.id === topPortfolioId && (p.views_count || 0) > 0 && portfolios.length > 1}
                showAnalytics={planType !== 'free'}
                onShare={()     => copyPortfolioLink(p)}
                onView={()      => window.open(`/portfolio/${p.slug}`, '_blank')}
                onAnalytics={() => navigate(`/dashboard/analytics/${p.id}`)}
                onEdit={()      => openEdit(p)}
                onDelete={()    => handleDelete(p)}
              />
            ))}

            {/* Carte "Ajouter" */}
            {!isAtLimit && (
              <button
                type="button"
                onClick={openCreate}
                className="group rounded-2xl border-2 border-dashed border-[#E7E7EA] hover:border-[#2E7D32] flex flex-col items-center justify-center gap-3 py-12 px-6 text-center transition-colors min-h-[260px]"
              >
                <span className="w-12 h-12 rounded-xl bg-zinc-100 group-hover:bg-[#E8F5E9] flex items-center justify-center transition-colors">
                  <Plus size={22} className="text-[#71717A] group-hover:text-[#1B5E20]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#18181B]/70">Nouveau portfolio</p>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    {portfolioLimit !== Infinity
                      ? `${portfolioLimit - portfolios.length} emplacement${portfolioLimit - portfolios.length > 1 ? 's' : ''} disponible${portfolioLimit - portfolios.length > 1 ? 's' : ''}`
                      : 'Illimité'}
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal création / édition ── */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              portfolio={editingPortfolio || undefined}
              onClose={() => { setShowPortfolioForm(false); setEditingPortfolio(null); }}
              onSuccess={() => { setShowPortfolioForm(false); setEditingPortfolio(null); loadPortfolios(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
