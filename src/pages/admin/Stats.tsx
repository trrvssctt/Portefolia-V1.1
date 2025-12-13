import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  ShoppingCart,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

interface MonthlyVisit {
  month: string;
  visits: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export default function AdminStats() {
  const [visits, setVisits] = useState<MonthlyVisit[]>([]);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const [vRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/visits/monthly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/admin/revenue/monthly`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const vJson = await vRes.json();
      const rJson = await rRes.json();

      setVisits(vJson.visits || []);
      setRevenue(rJson.revenue || []);
    } catch (err) {
      console.error("Erreur chargement stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onOrdersUpdated = () => load();
    window.addEventListener('ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', onOrdersUpdated);
  }, []);

  // Calculs des KPIs
  const totalVisits = visits.reduce((a, b) => a + b.visits, 0);
  const totalRevenue = revenue.reduce((a, b) => a + b.revenue, 0);
  const totalOrders = revenue.reduce((a, b) => a + b.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const lastMonthVisits = visits[visits.length - 1]?.visits || 0;
  const prevMonthVisits = visits[visits.length - 2]?.visits || 0;
  const visitGrowth = prevMonthVisits === 0 ? 100 : Math.round(((lastMonthVisits - prevMonthVisits) / prevMonthVisits) * 100);

  const lastMonthRevenue = revenue[revenue.length - 1]?.revenue || 0;
  const prevMonthRevenue = revenue[revenue.length - 2]?.revenue || 0;
  const revenueGrowth = prevMonthRevenue === 0 ? 100 : Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);

  // Formatage des mois en français
  const formattedData = visits.map((v, i) => ({
    month: format(new Date(v.month), "MMM yyyy", { locale: fr }),
    visits: v.visits,
    revenue: revenue[i]?.revenue || 0,
    orders: revenue[i]?.orders || 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-10 w-40" /></CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
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
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-10 w-10 text-[#28A745]" />
            Statistiques & Analytics
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Suivi en temps réel de la croissance de votre plateforme
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90 text-base">Visites totales</CardTitle>
                <Eye className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalVisits.toLocaleString()}</div>
              <div className="flex items-center mt-2 text-white/80 text-sm">
                {visitGrowth > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +{visitGrowth}%
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    {visitGrowth}%
                  </>
                )}
                <span className="ml-1">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90 text-base">Revenu total</CardTitle>
                <DollarSign className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalRevenue.toLocaleString()} F CFA</div>
              <div className="flex items-center mt-2 text-white/80 text-sm">
                {revenueGrowth > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +{revenueGrowth}%
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    {revenueGrowth}%
                  </>
                )}
                <span className="ml-1">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90 text-base">Commandes</CardTitle>
                <ShoppingCart className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOrders}</div>
              <p className="text-white/80 text-sm mt-2">Panier moyen: {avgOrderValue.toLocaleString()} F CFA</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/90 text-base">Ce mois-ci</CardTitle>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastMonthVisits.toLocaleString()} visites</div>
              <p className="text-white/80 text-sm mt-2">
                {lastMonthRevenue.toLocaleString()} F CFA de revenu
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visites mensuelles */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/5">
              <CardTitle className="text-2xl flex items-center gap-3">
                <TrendingUp className="h-7 w-7 text-blue-600" />
                Évolution des visites (12 mois)
              </CardTitle>
              <CardDescription>
                Nombre de vues sur les portfolios publics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e0e0e0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      fill="url(#visitsGradient)"
                      fillOpacity={0.3}
                    />
                    <defs>
                      <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenu mensuel */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-600/5">
              <CardTitle className="text-2xl flex items-center gap-3">
                <DollarSign className="h-7 w-7 text-green-600" />
                Revenu mensuel (12 mois)
              </CardTitle>
              <CardDescription>
                Revenu généré par les ventes de cartes NFC
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => `${value.toLocaleString()} F CFA`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e0e0e0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={5}
                      dot={{ fill: "#10b981", r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mini stats rapides */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux de conversion</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalVisits > 0 ? ((totalOrders / totalVisits) * 100).toFixed(2) : 0}%
                  </p>
                </div>
                <div className="bg-blue-100 p-4 rounded-full">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Commandes ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {revenue[revenue.length - 1]?.orders || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-4 rounded-full">
                  <ShoppingCart className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Croissance annuelle</p>
                  <p className="text-2xl font-bold text-[#28A745]">
                    +{Math.round((totalRevenue / 500000) * 100)}%
                  </p>
                </div>
                <div className="bg-emerald-100 p-4 rounded-full">
                  <Activity className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AdminFooter />
    </div>
  );
}