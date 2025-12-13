import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

interface Order {
  id: string;
  profiles: { first_name: string; last_name: string; email: string };
  portfolios?: { title: string };
  card_uid?: string;
  ordered_at: string;
  montant_total: number;
  statut: string;
  is_validated?: boolean;
  rejected_at?: string | null;
  activated_at?: string | null;
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPortfolios: 0,
    totalNfcCards: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    validatedRevenue: 0,
    growthRate: 0,
  });
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);
  const [users, setUsers] = useState<any[]>([]);
  const [portfoliosList, setPortfoliosList] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = profile?.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/auth");
    } else if (user && isAdmin) {
      loadAdminData();
    }
    // listen for orders updates coming from Commandes page
    const onOrdersUpdated = () => {
      if (user && isAdmin) loadAdminData();
    };
    window.addEventListener('ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', onOrdersUpdated);
  }, [user, profile, authLoading, navigate]);

  const loadAdminData = async () => {
    const token = localStorage.getItem("token");
    try {
      const [usersRes, portfoliosRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/portfolios?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/commandes?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!usersRes.ok || !portfoliosRes.ok || !ordersRes.ok) throw new Error("Erreur de chargement");

      const [usersJson, portfoliosJson, ordersJson] = await Promise.all([
        usersRes.json(),
        portfoliosRes.json(),
        ordersRes.json(),
      ]);

      const allUsers = usersJson.users || [];
      const allPortfolios = portfoliosJson.portfolios || [];
      const allOrders: Order[] = ordersJson.commandes || [];

      // Calculs avancés
      const totalNfc = allOrders.length;
      const pending = allOrders.filter(o => !o.is_validated && !o.rejected_at).length;
      const validatedRev = allOrders
        .filter(o => o.is_validated)
        .reduce((acc, o) => acc + Number(o.montant_total || 0), 0);
      const totalRev = allOrders.reduce((acc, o) => acc + Number(o.montant_total || 0), 0);

      setUsers(allUsers);
      setPortfoliosList(allPortfolios);
      setOrders(allOrders);
      setStats({
        totalUsers: allUsers.length,
        totalPortfolios: allPortfolios.length,
        totalNfcCards: totalNfc,
        pendingOrders: pending,
        totalRevenue: totalRev,
        validatedRevenue: validatedRev,
        growthRate: allUsers.length > 50 ? 24 : 68, // Simulation
      });
      setPendingUsersCount(allUsers.filter((u: any) => (u.verified === false || u.verified === 0 || u.verified === '0')).length);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  function safeFormatDate(dateStr?: string, fmt = "dd MMM yyyy") {
    try {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return format(d, fmt, { locale: fr });
    } catch (e) {
      return "—";
    }
  }

  function resolvePortfolioTitle(order: any) {
    const p = order.portfolio ?? order.portfolios?.[0] ?? null;
    if (p) return p.title ?? p.titre ?? p.name ?? p.label ?? null;
    const possibleSlug = order.lien_portfolio ?? order.portfolio?.slug ?? order.portfolio_slug ?? null;
    if (possibleSlug && portfoliosList.length) {
      const s = possibleSlug?.toString();
      const found = portfoliosList.find((pf: any) => (pf.slug?.toString() === s) || (pf.url_slug?.toString() === s) || (pf.lien_portfolio?.toString() === s) || (pf.id?.toString() === s));
      return found ? (found.title ?? found.titre ?? found.name ?? null) : null;
    }
    return null;
  }

  function resolveClientName(order: any) {
    const u = order.user ?? order.utilisateur ?? order.client ?? order.profiles ?? null;
    if (u) return u.first_name ? `${u.first_name} ${u.last_name ?? ""}`.trim() : u.email ?? u.nom ?? null;
    const orderUserId = order.utilisateur_id ?? order.user_id ?? order.utilisateur?.id ?? order.user?.id ?? null;
    if (orderUserId && users.length) {
      const found = users.find((x: any) => x.id == orderUserId || String(x.id) === String(orderUserId));
      if (found) return found.first_name ? `${found.first_name} ${found.last_name ?? ""}`.trim() : found.email ?? found.nom ?? null;
    }
    return null;
  }

  const validateOrder = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: "Active" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Validée", description: "Commande validée avec succès" });
      loadAdminData();
    } catch {
      toast({ title: "Erreur", description: "Échec de validation", variant: "destructive" });
    }
  };

  const rejectOrder = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: "Annulée" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Rejetée", description: "Commande rejetée" });
      loadAdminData();
    } catch {
      toast({ title: "Erreur", description: "Échec du rejet", variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminNav profile={profile} onSignOut={() => {}} />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-10 w-24" /></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50">
      <AdminNav profile={profile} onSignOut={signOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-[#28A745]" />
            Tableau de bord Administrateur
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Suivi en temps réel des utilisateurs, commandes et revenus
          </p>
        </div>

        {/* Templates Section */}
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Administration des templates</h3>
                  <p className="text-gray-600 mt-1">Accédez à l'espace d'administration des templates pour ajouter, modifier ou supprimer des modèles.</p>
                </div>
                <div>
                  <Button onClick={() => window.open('/templates-gestion/login', '_blank')} className="bg-[#28A745] hover:bg-green-600">
                    Accéder à l'administration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Style Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90">Utilisateurs</CardTitle>
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Number.isFinite(stats.totalUsers) ? stats.totalUsers.toLocaleString() : '—'}</div>
              <p className="text-white/80 text-sm flex items-center mt-2">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                +{Number.isFinite(stats.growthRate) ? stats.growthRate : 0}% ce mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90">Portfolios</CardTitle>
                <Activity className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Number.isFinite(stats.totalPortfolios) ? stats.totalPortfolios.toLocaleString() : '—'}</div>
              <p className="text-white/80 text-sm">Actifs</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90">Commandes NFC</CardTitle>
                <CreditCard className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Number.isFinite(stats.totalNfcCards) ? stats.totalNfcCards.toLocaleString() : '—'}</div>
              <p className="text-white/80 text-sm flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {stats.pendingOrders} en attente
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90">Revenus Validés</CardTitle>
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Number.isFinite(stats.validatedRevenue) ? stats.validatedRevenue.toLocaleString() : '—'} F CFA</div>
              <p className="text-white/80 text-sm">
                Total: {Number.isFinite(stats.totalRevenue) ? stats.totalRevenue.toLocaleString() : '—'} F CFA
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick action for pending user validations */}
        <div className="mb-6">
          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle>Utilisateurs en attente</CardTitle>
              <CardDescription>Comptes en attente de validation par l'administrateur</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{pendingUsersCount}</div>
                <div className="text-sm text-gray-600">utilisateur(s) en attente</div>
              </div>
              <div>
                <Button onClick={() => navigate('/admin/users?pending=true')} className="bg-[#28A745]">Gérer les validations</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs pour organiser */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="orders">Commandes NFC</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Package className="h-6 w-6 text-[#28A745]" />
                  Gestion des Commandes NFC
                </CardTitle>
                <CardDescription>
                  Validez ou rejetez les commandes de cartes NFC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center py-12 text-gray-500">Aucune commande</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-600">
                          <th className="pb-4">Client</th>
                          <th className="pb-4">Portfolio / UID</th>
                          <th className="pb-4">Date</th>
                          <th className="pb-4 text-right">Montant</th>
                          <th className="pb-4">Statut</th>
                          <th className="pb-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map((order) => {
                          const o = order as any;

                          const clientDisplay = resolveClientName(o) ?? '—';
                          const clientEmail = o.profiles?.email ?? o.profile?.email ?? o.user?.email ?? users.find((u: any) => u.id == (o.utilisateur_id ?? o.user_id))?.email ?? '—';

                          const numeroCommande = o.numero_commande ?? o.numeroCommande ?? o.commande?.numero_commande ?? '—';

                          const portfolioTitle = resolvePortfolioTitle(o) ?? '—';
                          const uid = order.card_uid ?? o.card?.uid ?? o.uid ?? null;

                          return (
                            <tr key={order.id} className="border-b hover:bg-gray-50 transition">
                              <td className="py-4">
                                    <div className="font-medium">{clientDisplay}</div>
                                    <div className="text-xs text-gray-500">{clientEmail}</div>
                                  </td>
                              <td className="py-4 text-gray-700">
                                {portfolioTitle || '—'}
                                {uid && <div className="text-xs font-mono text-gray-500">UID: {uid}</div>}
                              </td>
                              <td className="py-4 text-gray-600">
                                {safeFormatDate(order.ordered_at)}
                              </td>
                              <td className="py-4 text-right font-bold text-[#28A745]">
                                {(order.montant_total || 30000).toLocaleString()} F CFA
                              </td>
                              <td className="py-4">
                                <Badge
                                  variant={
                                    order.is_validated ? "default" :
                                    order.rejected_at ? "destructive" :
                                    "secondary"
                                  }
                                  className={
                                    order.is_validated ? "bg-green-100 text-green-800" :
                                    order.rejected_at ? "bg-red-100 text-red-800" :
                                    "bg-orange-100 text-orange-800"
                                  }
                                >
                                  {order.is_validated ? "Validée" : order.rejected_at ? "Rejetée" : "En attente"}
                                </Badge>
                              </td>
                              <td className="py-4">
                                {!order.is_validated && !order.rejected_at && (
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => validateOrder(order.id)} className="bg-green-600 hover:bg-green-700">
                                      <CheckCircle2 className="h-4 w-4 mr-1" /> Valider
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => rejectOrder(order.id)}>
                                      <XCircle className="h-4 w-4 mr-1" /> Rejeter
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Utilisateurs récents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 8).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                      <div>
                        <p className="font-semibold">{u.first_name} {u.last_name}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role}
                        </Badge>
                        <Badge variant={u.is_active ? "default" : "destructive"}>
                          {u.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AdminFooter />
    </div>
  );
}