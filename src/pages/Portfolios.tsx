import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from "@/utils/authUtils";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus, Eye, Edit, Trash2, BarChart3, Globe, Lock,
  Users, TrendingUp, Briefcase, Sparkles, ExternalLink, Copy,
  Crown, Zap, Star, ArrowRight, FolderOpen, Search,
  Trophy, Clock, Activity,
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { DeletePortfolioModal } from "@/components/portfolio/DeletePortfolioModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

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

const PLAN_META: Record<PlanType, { label: string; icon: React.ReactNode; limit: number; color: string; bg: string }> = {
  free: { label: "Gratuit", icon: <Star className="w-3.5 h-3.5" />, limit: 1, color: "text-gray-600", bg: "bg-gray-100" },
  starter: { label: "Starter", icon: <Zap className="w-3.5 h-3.5" />, limit: 5, color: "text-blue-700", bg: "bg-blue-100" },
  pro: { label: "Pro", icon: <Sparkles className="w-3.5 h-3.5" />, limit: 20, color: "text-purple-700", bg: "bg-purple-100" },
  business: { label: "Business", icon: <Crown className="w-3.5 h-3.5" />, limit: Infinity, color: "text-amber-700", bg: "bg-amber-100" },
};

// ─── Skeleton de chargement ───────────────────────────────────────────────────
function PageSkeleton({ profile, onSignOut }: { profile: any; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={onSignOut} profile={profile} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Carte portfolio ──────────────────────────────────────────────────────────
function PortfolioCard({
  portfolio,
  isTop,
  showAnalytics,
  onCopyLink,
  onView,
  onAnalytics,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  isTop: boolean;
  showAnalytics: boolean;
  onCopyLink: () => void;
  onView: () => void;
  onAnalytics: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = portfolio.theme_color || "#28A745";
  const initials = portfolio.title
    ? portfolio.title.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "P";

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Bandeau couleur + avatar */}
      <div
        className="relative h-28 flex items-end px-5 pb-0"
        style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}48 100%)` }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full opacity-10" style={{ background: accent }} />
        <div className="absolute right-10 top-3 w-14 h-14 rounded-full opacity-8" style={{ background: accent }} />

        {/* Badge public/privé */}
        <div className="absolute top-3 right-4">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            portfolio.is_public ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
          }`}>
            {portfolio.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Privé</>}
          </span>
        </div>

        {/* Badge top performer */}
        {isTop && (
          <div className="absolute top-3 left-4">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              <Trophy className="w-3 h-3" /> Top
            </span>
          </div>
        )}

        {/* Avatar chevauchant le contenu */}
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          {portfolio.profile_image_url ? (
            <img
              src={portfolio.profile_image_url}
              alt={portfolio.title}
              className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-lg font-bold text-white"
              style={{ background: accent }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-5 pt-10 pb-4 space-y-2.5">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">
            {portfolio.title}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">/{portfolio.slug}</p>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {portfolio.bio || <span className="italic text-gray-300">Aucune description</span>}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-700">{(portfolio.views_count ?? 0).toLocaleString("fr-FR")}</span>
            <span>vues</span>
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {portfolio.created_at && !isNaN(new Date(portfolio.created_at).getTime())
              ? format(new Date(portfolio.created_at), "d MMM yyyy", { locale: fr })
              : "—"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-1 bg-gray-50/50">
        <div className="flex items-center gap-1">
          <ActionBtn title="Copier le lien" onClick={onCopyLink}>
            <Copy className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn title="Voir en ligne" onClick={onView}>
            <ExternalLink className="w-3.5 h-3.5" />
          </ActionBtn>
          {showAnalytics && (
            <ActionBtn title="Statistiques" onClick={onAnalytics}>
              <BarChart3 className="w-3.5 h-3.5" />
            </ActionBtn>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ActionBtn title="Modifier" onClick={onEdit} className="text-gray-600 hover:text-blue-600 hover:bg-blue-50">
            <Edit className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn title="Supprimer" onClick={onDelete} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  className = "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Stat card – style Dashboard KPI ─────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  iconBg,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
      <div className={`${iconBg} p-2.5 rounded-lg shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Portfolios() {
  const [profile, setProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [planType, setPlanType] = useState<PlanType>("free");
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState(false);

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views" | "title">("newest");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const plan = PLAN_META[planType];
  const portfolioLimit = plan.limit;
  const isAtLimit = portfolioLimit !== Infinity && portfolios.length >= portfolioLimit;

  const handleSignOut = async () => {
    await signOut();
  };

  // Stats
  const stats = useMemo(() => ({
    total: portfolios.length,
    publicCount: portfolios.filter((p) => p.is_public).length,
    totalViews: portfolios.reduce((a, p) => a + (p.views_count || 0), 0),
    totalContacts: portfolios.reduce((a, p) => a + (p.contacts_count || 0), 0),
  }), [portfolios]);

  const topPortfolioId = useMemo(() => {
    if (portfolios.length === 0) return null;
    return portfolios.reduce((best, p) =>
      (p.views_count || 0) > (best.views_count || 0) ? p : best
    ).id;
  }, [portfolios]);

  // Filtrage et tri des portfolios
  const filteredAndSortedPortfolios = useMemo(() => {
    let filtered = [...portfolios];

    // Filtre par recherche textuelle
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const title = (p.title || "").toLowerCase();
        const slug = (p.slug || "").toLowerCase();
        const bio = (p.bio || "").toLowerCase();
        return title.includes(search) || slug.includes(search) || bio.includes(search);
      });
    }

    // Filtre par visibilité
    if (visibilityFilter !== "all") {
      filtered = filtered.filter((p) =>
        visibilityFilter === "public" ? p.is_public : !p.is_public
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "views":
          return (b.views_count || 0) - (a.views_count || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [portfolios, searchTerm, visibilityFilter, sortBy]);

  // Vérif token expiré
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" });
      navigate("/auth");
    }
  }, [navigate, toast]);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/auth"); return; }
      try {
        const [profileRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (!profileRes.ok) throw new Error("Profil non chargé");
        const profileJson = await profileRes.json();
        setProfile(profileJson.user);

        if (plansRes?.ok) {
          const pj = await plansRes.json();
          const plans = pj.plans || [];
          if (plans.length > 0) {
            const slug = String(plans[0].slug || "").toLowerCase();
            if (slug.includes("business")) setPlanType("business");
            else if (slug.includes("pro") || slug.includes("professionnel") || slug.includes("professional")) setPlanType("pro");
            else if (slug.includes("starter") || slug.includes("standard")) setPlanType("starter");
            else setPlanType("free");
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

  // Polling vues
  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => loadPortfolios().catch(() => { }), 10_000);
    return () => clearInterval(id);
  }, [loading]);

  const loadPortfolios = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/auth"); return; }
    const res = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json();
    const mapped = (json.portfolios || []).map((p: any) => ({
      ...p,
      slug: p.slug || p.url_slug || p.url || "",
      title: p.title || p.titre || p.nom || "",
      profile_image_url: p.profile_image_url || p.photo || p.avatar || "",
      created_at: p.date_creation || p.created_at || null,
      is_public: p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true),
    }));
    setPortfolios(mapped);
  };

  const handleDelete = (portfolio: Portfolio) => setDeleteTarget(portfolio);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  const copyPortfolioLink = (portfolio: Portfolio) => {
    const slug = (portfolio as any).slug || portfolio.id;
    const link = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Lien copié !", description: link });
  };

  const openEdit = async (portfolio: Portfolio) => {
    setLoadingEdit(portfolio.id);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${portfolio.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = res.ok ? await res.json() : null;
      setEditingPortfolio(json?.portfolio || portfolio);
    } catch {
      setEditingPortfolio(portfolio);
    } finally {
      setLoadingEdit(null);
      setShowPortfolioForm(true);
    }
  };

  const openCreate = () => {
    if (isAtLimit) {
      toast({
        title: "Limite atteinte",
        description: `Le plan ${plan.label} permet ${portfolioLimit} portfolio${portfolioLimit > 1 ? "s" : ""} maximum.`,
        variant: "destructive",
      });
      return;
    }
    setEditingPortfolio(null);
    setShowPortfolioForm(true);
  };

  if (loading) return <PageSkeleton profile={profile} onSignOut={handleSignOut} />;

  const usagePercent = portfolioLimit === Infinity ? 0 : Math.min((portfolios.length / portfolioLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DeletePortfolioModal
        open={!!deleteTarget}
        portfolioTitle={deleteTarget?.title || ''}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">

        {/* ── En-tête ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mes Portfolios</h1>
              <Badge className={`${plan.bg} ${plan.color} border-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1`}>
                {plan.icon} {plan.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Créez, gérez et partagez vos portfolios professionnels
            </p>
          </div>
          <Button
            onClick={openCreate}
            disabled={isAtLimit}
            className="bg-[#28A745] hover:bg-green-600 text-white h-10 px-5 font-semibold shadow-sm shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau portfolio
          </Button>
        </div>

        {/* ── Barre d'utilisation du plan ── */}
        {portfolioLimit !== Infinity && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {portfolios.length} / {portfolioLimit} portfolios utilisés
                </span>
                {isAtLimit ? (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Limite atteinte</span>
                ) : (
                  <span className="text-xs text-gray-400">{portfolioLimit - portfolios.length} restant{portfolioLimit - portfolios.length > 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usagePercent}%`,
                    background: usagePercent >= 100 ? "#ef4444" : usagePercent >= 80 ? "#f59e0b" : "#28A745",
                  }}
                />
              </div>
            </div>
            {isAtLimit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/upgrade")}
                className="text-[#28A745] border-[#28A745] hover:bg-green-50 shrink-0 font-semibold text-xs gap-1.5"
              >
                Upgrader <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* ── Barre de filtres ── */}
        {portfolios.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par titre, slug ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récent</SelectItem>
                  <SelectItem value="oldest">Plus ancien</SelectItem>
                  <SelectItem value="views">Plus de vues</SelectItem>
                  <SelectItem value="title">Titre (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ── Stats KPI ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Briefcase className="w-4 h-4 text-indigo-600" />}
            label="Portfolios"
            value={stats.total}
            iconBg="bg-indigo-50"
            sub={`/ ${portfolioLimit === Infinity ? "∞" : portfolioLimit} max`}
          />
          <StatCard
            icon={<Globe className="w-4 h-4 text-emerald-600" />}
            label="Publics"
            value={stats.publicCount}
            iconBg="bg-emerald-50"
            sub="portfolios visibles"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
            label="Vues totales"
            value={stats.totalViews.toLocaleString("fr-FR")}
            iconBg="bg-blue-50"
            sub="sur tous vos portfolios"
          />
          <StatCard
            icon={<Users className="w-4 h-4 text-purple-600" />}
            label="Contacts"
            value={planType === "free" ? "—" : stats.totalContacts.toLocaleString("fr-FR")}
            iconBg="bg-purple-50"
            sub={planType === "free" ? "plan payant requis" : "contacts collectés"}
          />
        </div>

        {/* ── Liste / Empty state ── */}
        {portfolios.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 px-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-6 shadow-sm">
              <FolderOpen className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun portfolio pour le moment</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
              Créez votre premier portfolio et commencez à construire votre présence professionnelle en ligne.
            </p>
            <Button
              onClick={openCreate}
              disabled={isAtLimit}
              className="bg-[#28A745] hover:bg-green-600 text-white font-semibold px-8 h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier portfolio
            </Button>
          </div>
        ) : filteredAndSortedPortfolios.length === 0 && portfolios.length > 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 px-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6 shadow-sm">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun portfolio trouvé</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
              Aucun portfolio ne correspond à votre recherche. Essayez de modifier vos filtres.
            </p>
            <Button
              onClick={() => { setSearchTerm(""); setVisibilityFilter("all"); setSortBy("newest"); }}
              variant="outline"
              className="font-semibold"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <>
            {/* Compteur de résultats */}
            {(searchTerm || visibilityFilter !== "all") && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4 text-gray-400" />
                <span>
                  <span className="font-semibold text-gray-700">{filteredAndSortedPortfolios.length}</span>
                  {" "}portfolio{filteredAndSortedPortfolios.length !== 1 ? "s" : ""} trouvé{filteredAndSortedPortfolios.length !== 1 ? "s" : ""}
                  {" "}sur <span className="font-semibold text-gray-700">{portfolios.length}</span>
                </span>
              </div>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredAndSortedPortfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                isTop={portfolio.id === topPortfolioId && (portfolio.views_count || 0) > 0 && portfolios.length > 1}
                showAnalytics={planType !== "free"}
                onCopyLink={() => copyPortfolioLink(portfolio)}
                onView={() => window.open(`/portfolio/${portfolio.slug}`, "_blank")}
                onAnalytics={() => navigate(`/dashboard/analytics/${portfolio.id}`)}
                onEdit={() => openEdit(portfolio)}
                onDelete={() => handleDelete(portfolio)}
              />
            ))}

            {/* Carte "Ajouter" si pas à la limite */}
            {!isAtLimit && (
              <button
                type="button"
                onClick={openCreate}
                className="group rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 py-14 px-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 group-hover:text-green-700 transition-colors">
                    Nouveau portfolio
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {portfolioLimit !== Infinity
                      ? `${portfolioLimit - portfolios.length} emplacement${portfolioLimit - portfolios.length > 1 ? "s" : ""} disponible${portfolioLimit - portfolios.length > 1 ? "s" : ""}`
                      : "Illimité"}
                  </p>
                </div>
              </button>
            )}
          </div>
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              portfolio={editingPortfolio || undefined}
              onClose={() => {
                setShowPortfolioForm(false);
                setEditingPortfolio(null);
              }}
              onSuccess={() => {
                setShowPortfolioForm(false);
                setEditingPortfolio(null);
                loadPortfolios();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
