import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Share2,
  BarChart3,
  Copy,
  Globe,
  Lock,
  Users,
  EyeIcon,
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

interface Portfolio {
  id: string;
  title: string;
  slug: string;
  bio?: string;
  is_public: boolean;
  profile_image_url?: string;
  created_at: string;
  views_count?: number;
  contacts_count?: number;
}

export default function Portfolios() {
  const [profile, setProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [isStarterPlan, setIsStarterPlan] = useState(false);
  const [isProPlan, setIsProPlan] = useState(false);
  const [isBusinessPlan, setIsBusinessPlan] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Stats calculées
  const stats = useMemo(() => {
    const publicCount = portfolios.filter((p) => p.is_public).length;
    const totalViews = portfolios.reduce((acc, p) => acc + (p.views_count || 0), 0);
    const totalContacts = portfolios.reduce((acc, p) => acc + (p.contacts_count || 0), 0);

    return { total: portfolios.length, publicCount, totalViews, totalContacts };
  }, [portfolios]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/auth");
        return;
      }

      try {
        const profileRes = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) throw new Error("Profil non chargé");
        const profileJson = await profileRes.json();
        setProfile(profileJson.user);

        // also fetch user's plans to detect free plan
        try {
          const plansRes = await fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (plansRes.ok) {
            const pj = await plansRes.json();
            const plans = pj.plans || [];
            if (plans.length > 0) {
              const latest = plans[0];
              const slug = latest.slug ? String(latest.slug).toLowerCase() : '';
              const free = Number(latest.price_cents || 0) === 0 || slug === 'gratuit';
              const starter = slug === 'starter';
              const pro = slug === 'professionnel' || slug === 'pro' || slug === 'professional';
              const business = slug === 'business';
              setIsFreePlan(!!free);
              setIsStarterPlan(!!starter);
              setIsProPlan(!!pro);
              setIsBusinessPlan(!!business);
            }
          }
        } catch (err) {
          // ignore plan fetch errors
        }

        await loadPortfolios();
      } catch (err) {
        toast({
          title: "Erreur de connexion",
          description: "Impossible de charger vos données",
          variant: "destructive",
        });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    init();
    // start polling portfolios to keep views_count up-to-date in (near) real-time
    const pollInterval = setInterval(() => {
      loadPortfolios().catch(() => {});
    }, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [navigate, toast]);

  // Poll portfolios periodically to reflect near real-time metrics (views)
  useEffect(() => {
    let pollId: any = null;
    // start polling after initial load
    if (!loading) {
      pollId = setInterval(() => {
        loadPortfolios();
      }, 5000); // every 5 seconds
    }

    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [loading]);

  const loadPortfolios = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement portfolios");
      const json = await res.json();
      // Map server rows to frontend-friendly shape (ensure `slug` exists and some aliases)
      const mapped = (json.portfolios || []).map((p: any) => ({
        ...p,
        slug: p.slug || p.url_slug || p.url || '',
        title: p.title || p.titre || p.nom || '',
        profile_image_url: p.profile_image_url || p.photo || p.avatar || '',
        created_at: p.date_creation || p.created_at || p.date_creation || null,
        is_public: p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true),
      }));
      setPortfolios(mapped);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de charger vos portfolios",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce portfolio ?")) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Suppression échouée");

      toast({ title: "Supprimé !", description: "Portfolio supprimé avec succès" });
      loadPortfolios();
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le portfolio",
        variant: "destructive",
      });
    }
  };

  const copyLink = (slug: string) => {
    const link = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Lien copié !", description: link });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav onSignOut={handleSignOut} profile={profile} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-20" /></CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-lg" />
                      <div>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-72" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="w-9 h-9 rounded-md" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Portfolios</h1>
            <p className="text-gray-600 mt-2">
              Créez, gérez et partagez vos portfolios professionnels
            </p>
          </div>
          <Button
            onClick={() => {
              // If user is on free, starter, or professionnel plan and already reached the limit, block creation
              // Business plan has no portfolio creation limits
              if (!isBusinessPlan && ((isFreePlan && portfolios.length >= 1) || (isStarterPlan && portfolios.length >= 5) || (isProPlan && portfolios.length >= 20))) {
                const msg = isProPlan
                  ? 'Votre formule Professionnel limite la création à 20 portfolios. Veuillez upgrader pour en créer davantage.'
                  : isStarterPlan
                    ? 'Votre formule Starter limite la création à 5 portfolios. Veuillez upgrader pour en créer davantage.'
                    : 'Votre formule gratuite limite la création à 1 portfolio. Veuillez upgrader pour en créer davantage.';
                toast({ title: 'Limite atteinte', description: msg, variant: 'destructive' });
                return;
              }
              setEditingPortfolio(null);
              setShowPortfolioForm(true);
            }}
            className="bg-[#28A745] hover:bg-green-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Portfolio
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Publics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.publicCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <EyeIcon className="h-4 w-4" />
                Vues totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalViews}</p>
            </CardContent>
          </Card>

          {!isFreePlan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Liste des portfolios */}
        {portfolios.length === 0 ? (
          <Card className="text-center py-20 border-dashed">
            <CardContent>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Aucun portfolio créé
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                Commencez dès maintenant à construire votre présence professionnelle en ligne.
              </p>
              <Button
                onClick={() => {
                  // Business plan has no portfolio creation limits
                  if (!isBusinessPlan && ((isFreePlan && portfolios.length >= 1) || (isStarterPlan && portfolios.length >= 5) || (isProPlan && portfolios.length >= 20))) {
                      const msg = isProPlan
                        ? 'Votre formule Professionnel limite la création à 20 portfolios. Veuillez upgrader pour en créer davantage.'
                        : isStarterPlan
                          ? 'Votre formule Starter limite la création à 5 portfolios. Veuillez upgrader pour en créer davantage.'
                          : 'Votre formule gratuite limite la création à 1 portfolio. Veuillez upgrader pour en créer davantage.';
                      toast({ title: 'Limite atteinte', description: msg, variant: 'destructive' });
                      return;
                    }
                  setShowPortfolioForm(true);
                }}
                className="bg-[#28A745] hover:bg-green-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer mon premier portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {portfolios.map((portfolio) => (
              <Card
                key={portfolio.id}
                className="hover:shadow-xl transition-all duration-300 border"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-5 flex-1">
                      {portfolio.profile_image_url ? (
                        <img
                          src={portfolio.profile_image_url}
                          alt={portfolio.title}
                          className="w-20 h-20 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
                          <Users className="h-10 w-10 text-gray-500" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {portfolio.title}
                          </h3>
                          <Badge
                            variant={portfolio.is_public ? "default" : "secondary"}
                            className={
                              portfolio.is_public
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {portfolio.is_public ? (
                              <>
                                <Globe className="w-3 h-3 mr-1" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 mr-1" />
                                Privé
                              </>
                            )}
                          </Badge>
                        </div>

                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {portfolio.bio || "Aucune description"}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span>
                            Créé le {
                              portfolio.created_at && !isNaN(new Date(portfolio.created_at).getTime())
                                ? format(new Date(portfolio.created_at), "dd MMMM yyyy", { locale: fr })
                                : 'Date inconnue'
                            }
                          </span>
                          <span>•</span>
                          <span className="font-mono text-gray-700">
                            /{portfolio.slug}
                          </span>
                          {portfolio.views_count > 0 && (
                            <>
                              <span>•</span>
                              <span>{portfolio.views_count} vues</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyLink(portfolio.slug)}
                        title="Copier le lien"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`/portfolio/${portfolio.slug}`, "_blank")}
                        title="Voir le portfolio"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isFreePlan && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/dashboard/analytics/${portfolio.id}`)}
                          title="Statistiques"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          // Fetch full portfolio with relations before opening the form
                          const token = localStorage.getItem("token");
                          try {
                            const res = await fetch(`${API_BASE}/api/portfolios/${portfolio.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) throw new Error('Impossible de charger le portfolio');
                            const json = await res.json();
                            setEditingPortfolio(json.portfolio || portfolio);
                          } catch (err) {
                            toast({ title: 'Erreur', description: 'Impossible de charger le portfolio pour édition', variant: 'destructive' });
                            setEditingPortfolio(portfolio);
                          } finally {
                            setShowPortfolioForm(true);
                          }
                        }}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(portfolio.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulaire */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
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
                toast({ title: "Succès", description: "Portfolio sauvegardé !" });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}