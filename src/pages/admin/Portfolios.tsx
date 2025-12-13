import { useEffect, useState, useMemo } from "react";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  Eye,
  Globe,
  Lock,
  User,
  Calendar,
  TrendingUp,
  Filter,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

interface Portfolio {
  id: string;
  title: string;
  slug: string;
  bio?: string;
  is_public: boolean;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  views_count?: number;
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
  };
}

export default function AdminPortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Helpers to normalize fields coming from different DB shapes


  function getTitle(p: any) {
    return p?.title ?? p?.titre ?? p?.name ?? p?.["portfolio_title"] ?? null;
  }

  function getSlug(p: any) {
    return p?.slug ?? p?.url_slug ?? p?.lien_portfolio ?? p?.["urlSlug"] ?? null;
  }

  function getOwnerDisplay(p: any) {
    const owner = p?.user ?? p?.utilisateur ?? p?.owner ?? p?.["creator"] ?? null;
    if (!owner) return null;
    return owner.first_name ? `${owner.first_name} ${owner.last_name ?? ""}`.trim() : owner.email ?? owner.nom ?? null;
  }

  const isPortfolioPublic = (p: any) => {
    if (p?.deleted_at) return false;
    const v = p?.is_public;
    if (v === true || v === 1) return true;
    if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
    return Boolean(v);
  };

  useEffect(() => {
    const fetchPortfolios = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/api/admin/portfolios?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setPortfolios(json.portfolios || []);
      } catch (err) {
        console.error("Erreur chargement portfolios");
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolios();
  }, []);

  const filteredPortfolios = useMemo(() => {
    return portfolios.filter((p) => {
      const search = searchTerm.toLowerCase();
      return (
        (p.title ?? "").toLowerCase().includes(search) ||
        (p.slug ?? "").toLowerCase().includes(search) ||
        (p.owner?.email ?? "").toLowerCase().includes(search) ||
        `${p.owner?.first_name ?? ""} ${p.owner?.last_name ?? ""}`.toLowerCase().includes(search)
      );
    });
  }, [portfolios, searchTerm]);

  const totalViews = portfolios.reduce((acc, p) => acc + (p.views_count || 0), 0);
  const publicCount = portfolios.filter(p => p.is_public).length;

  const copyLink = (p: any) => {
    const s = getSlug(p) ?? (typeof p === "string" ? p : "");
    if (!s) return;
    const link = `${window.location.origin}/portfolio/${s}`;
    navigator.clipboard.writeText(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-80 mb-8" />
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <AdminFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header avec stats */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Globe className="h-10 w-10 text-[#28A745]" />
                Tous les Portfolios
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {portfolios.length} portfolios créés • {publicCount} publics • {totalViews.toLocaleString()} vues totales
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Taux de visibilité</p>
                <p className="text-2xl font-bold text-[#28A745]">
                  {portfolios.length > 0 ? Math.round((publicCount / portfolios.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="mb-8 border shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Rechercher un portfolio, slug ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tableau des portfolios */}
        <Card className="border-0 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#28A745]/5 to-emerald-500/5 border-b">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Filter className="h-6 w-6" />
              Liste complète ({filteredPortfolios.length})
            </CardTitle>
            <CardDescription>
              Tous les portfolios de la plateforme
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {filteredPortfolios.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Globe className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg">
                  {searchTerm ? "Aucun portfolio ne correspond à votre recherche" : "Aucun portfolio créé pour le moment"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead>Vues</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPortfolios.map((portfolio) => (
                    <TableRow
                      key={portfolio.id}
                      className="hover:bg-gray-50/70 transition-all duration-200"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-4">
                          {portfolio.profile_image_url ? (
                            <img
                              src={portfolio.profile_image_url}
                              alt={getTitle(portfolio) ?? "Portfolio"}
                              className="w-12 h-12 rounded-lg object-cover ring-2 ring-white shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-[#28A745] to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                              {(getTitle(portfolio)?.[0] ?? "?").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">
                              {getTitle(portfolio) ?? '—'}
                            </div>
                            <div className="text-sm font-mono text-gray-500">
                              /{getSlug(portfolio) ?? '—'}
                            </div>
                            {portfolio.updated_at && (
                              <div className="text-xs text-gray-400 mt-1">Dernière MAJ: {new Date(portfolio.updated_at).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={portfolio.owner?.profile_image_url} />
                            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                              {((portfolio.owner?.first_name?.[0] ?? '') + (portfolio.owner?.last_name?.[0] ?? '')).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {portfolio.owner?.first_name ?? portfolio.owner?.email ?? 'Utilisateur'} {portfolio.owner?.last_name ?? ''}
                            </p>
                            <p className="text-xs text-gray-500">{portfolio.owner?.email ?? '—'}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          {portfolio.deleted_at ? (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              Supprimé
                            </Badge>
                          ) : (
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
                                  <Globe className="h-3 w-3 mr-1" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Privé
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">
                            {(portfolio.views_count || 0).toLocaleString()}
                          </span>
                          {(portfolio.views_count || 0) > 50 && (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {portfolio.created_at ? format(new Date(portfolio.created_at), "dd MMM yyyy", { locale: fr }) : '—'}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyLink(portfolio)}
                            title="Copier le lien"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const s = getSlug(portfolio) ?? portfolio.slug ?? "";
                              if (!s) return;
                              window.open(`/portfolio/${s}`, "_blank");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminFooter />
    </div>
  );
}