import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  Download,
  RefreshCw,
  BarChart3,
  CreditCard,
  UserPlus,
  Globe,
  Smartphone,
  Target,
  Filter,
  Clock,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface MonthlyVisit {
  month: string;
  visits: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

interface PlatformStats {
  web: number;
  mobile: number;
  desktop: number;
}

interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

export default function AdminStats() {
  const [visits, setVisits] = useState<MonthlyVisit[]>([]);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({ web: 0, mobile: 0, desktop: 0 });
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("12months");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Cross-controller stats
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalPortfolios, setTotalPortfolios] = useState<number>(0);
  const [totalCommandes, setTotalCommandes] = useState<number>(0);
  const [totalPaiements, setTotalPaiements] = useState<number>(0);
  const [totalPaiementsAmount, setTotalPaiementsAmount] = useState<number>(0);
  const [avgPaiement, setAvgPaiement] = useState<number>(0);
  const [revenuePerUser, setRevenuePerUser] = useState<number>(0);

  const loadStats = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    try {
      const fetchWithAuth = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch((e) => {
        console.warn('fetch failed', url, e);
        return { ok: false, status: 0, headers: new Headers(), text: async () => '' } as any;
      });

      const safeJson = async (res: Response | any) => {
        if (!res || !res.ok) return {};
        try {
          const ct = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
          if (!ct.includes('application/json')) return {};
          return await res.json();
        } catch (e) {
          console.warn('safeJson parse error', e);
          return {};
        }
      };

      const [vRes, rRes, pRes, pdRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/admin/visits/monthly?range=${timeRange}`),
        fetchWithAuth(`${API_BASE}/api/admin/revenue/monthly?range=${timeRange}`),
        fetchWithAuth(`${API_BASE}/api/admin/stats/platform`),
        fetchWithAuth(`${API_BASE}/api/admin/stats/plans-distribution`),
      ]);

      const vJson = await safeJson(vRes);
      const rJson = await safeJson(rRes);
      const pJson = await safeJson(pRes);
      const pdJson = await safeJson(pdRes);

      setVisits(vJson.visits || []);
      setRevenue(rJson.revenue || []);
      setPlatformStats(pJson.stats || { web: 0, mobile: 0, desktop: 0 });
      setPlanDistribution(pdJson.distribution || []);

      // --- Fetch cross-controller stats (with graceful fallbacks) ---
      const hdrs = { headers: { Authorization: `Bearer ${token}` } };

      async function fetchStatsOrCount(statsPath: string, listPath: string) {
        try {
          const res = await fetch(`${API_BASE}${statsPath}`, hdrs);
          if (res.ok) {
            const json = await res.json();
            if (typeof json.total === 'number') return json.total;
            if (typeof json.count === 'number') return json.count;
            if (Array.isArray(json.users)) return json.users.length;
            if (Array.isArray(json.paiements)) return json.paiements.length;
            if (Array.isArray(json.items)) return json.items.length;
            return 0;
          }
        } catch (e) {
          // ignore and fallback to list
        }

        // fallback: fetch list and count items if possible
        try {
          const res2 = await fetch(`${API_BASE}${listPath}`, hdrs);
          if (!res2.ok) return 0;
          const j2 = await res2.json();
          if (Array.isArray(j2.users)) return j2.users.length;
          if (Array.isArray(j2.paiements)) return j2.paiements.length;
          if (Array.isArray(j2.items)) return j2.items.length;
          if (Array.isArray(j2.commandes)) return j2.commandes.length;
          if (typeof j2.total === 'number') return j2.total;
          if (typeof j2.count === 'number') return j2.count;
          return 0;
        } catch (e) {
          return 0;
        }
      }

      const [uCount, pCount, cCount] = await Promise.all([
        fetchStatsOrCount('/api/admin/stats/users', '/api/admin/users?limit=1'),
        fetchStatsOrCount('/api/admin/stats/portfolios', '/api/admin/portfolios?limit=1'),
        fetchStatsOrCount('/api/admin/stats/commandes', '/api/admin/commandes?limit=1'),
      ]);

      setTotalUsers(uCount || 0);
      setTotalPortfolios(pCount || 0);
      setTotalCommandes(cCount || 0);

      // For paiements we also want total amount and avg
      let paiementsCount = 0;
      let paiementsAmount = 0;
      try {
        const resP = await fetch(`${API_BASE}/api/admin/paiements?limit=1000`, hdrs);
        if (resP.ok) {
          const jp = await resP.json();
          const items = jp.paiements || jp.items || jp || [];
          const arr = Array.isArray(items) ? items : [];
          paiementsCount = arr.length;
          paiementsAmount = arr.reduce((acc: number, it: any) => acc + (Number(it.montant || it.montant_total || it.amount || 0) || 0), 0);
        }
      } catch (e) {
        try {
          const r = await fetch(`${API_BASE}/api/admin/stats/paiements`, hdrs);
          if (r.ok) {
            const j = await r.json();
            paiementsCount = j.count || j.total || 0;
            paiementsAmount = j.totalRevenue || j.total_amount || 0;
          }
        } catch (e2) {
          // ignore
        }
      }

      setTotalPaiements(paiementsCount);
      setTotalPaiementsAmount(paiementsAmount || 0);
      setAvgPaiement(paiementsCount > 0 ? Math.round((paiementsAmount || 0) / paiementsCount) : 0);
      setRevenuePerUser((uCount && uCount > 0) ? Math.round((paiementsAmount || 0) / (uCount || 1)) : 0);
    } catch (err) {
      console.error("Erreur chargement stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    const onOrdersUpdated = () => loadStats();
    window.addEventListener('ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', onOrdersUpdated);
  }, [timeRange]);

  const totalVisits = visits.reduce((a, b) => a + (Number(b?.visits) || 0), 0);
  const totalRevenue = revenue.reduce((a, b) => a + (Number(b?.revenue) || 0), 0);
  const totalOrders = revenue.reduce((a, b) => a + (Number(b?.orders) || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const lastMonthVisits = Number(visits[visits.length - 1]?.visits || 0);
  const prevMonthVisits = Number(visits[visits.length - 2]?.visits || 0);
  const visitGrowth = prevMonthVisits === 0 ? (lastMonthVisits === 0 ? 0 : 100) : Math.round(((lastMonthVisits - prevMonthVisits) / prevMonthVisits) * 100);

  const lastMonthRevenue = Number(revenue[revenue.length - 1]?.revenue || 0);
  const prevMonthRevenue = Number(revenue[revenue.length - 2]?.revenue || 0);
  const revenueGrowth = prevMonthRevenue === 0 ? (lastMonthRevenue === 0 ? 0 : 100) : Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100);

  const conversionRate = totalVisits > 0 ? ((totalOrders / totalVisits) * 100).toFixed(2) : "0";

  const formattedData = visits.map((v, i) => ({
    month: format(new Date(v.month), "MMM yyyy", { locale: fr }),
    visits: v.visits,
    revenue: revenue[i]?.revenue || 0,
    orders: revenue[i]?.orders || 0,
  }));

  const platformData = [
    { name: 'Web', value: platformStats.web, color: '#3b82f6' },
    { name: 'Mobile', value: platformStats.mobile, color: '#10b981' },
    { name: 'Desktop', value: platformStats.desktop, color: '#8b5cf6' },
  ];

  const exportStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/stats/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistiques-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">

        <main className="max-w-[1600px] mx-auto px-6 py-12 lg:px-12 space-y-16">
          <Skeleton className="h-20 w-3/4 rounded-[2rem]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-[2.5rem]" />
            ))}
          </div>
          <Skeleton className="h-[500px] rounded-[3rem]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">


      <main className="max-w-[1600px] mx-auto px-6 py-12 lg:px-12 space-y-16">
        {/* ── EXECUTIVE HEADER ── */}
        <div className="relative p-12 rounded-[3.5rem] bg-gray-900 overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute -top-24 -right-24 h-96 w-96 bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Live Intelligence Stream</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                Executive <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Analytics</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white/5 p-3 rounded-[2.5rem] border border-white/10 backdrop-blur-xl transition-all">
              <div className="w-56">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-0 text-gray-900 font-black shadow-none transition-all focus:ring-4 focus:ring-blue-500/20 outline-none">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-2xl border-none outline-none">
                    <SelectItem value="7days" className="font-bold">7 Derniers Jours</SelectItem>
                    <SelectItem value="30days" className="font-bold">30 Derniers Jours</SelectItem>
                    <SelectItem value="3months" className="font-bold">Trimestre Fiscal</SelectItem>
                    <SelectItem value="6months" className="font-bold">Semestre</SelectItem>
                    <SelectItem value="12months" className="font-bold">Analyse Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex h-14 bg-white/5 rounded-2xl p-1 gap-1 border border-white/10">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={loadStats}
                  disabled={refreshing}
                  className="h-full w-12 rounded-xl bg-transparent text-white/60 hover:text-white hover:bg-white/10 transition-all border-0 shadow-none outline-none"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <div className="w-[1px] bg-white/10 my-2" />
                <Button
                  variant="secondary"
                  onClick={exportStats}
                  className="h-full px-6 rounded-xl bg-transparent text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border-0 shadow-none outline-none"
                >
                  <Download className="h-4 w-4 mr-3" /> Exporter Intelligence
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── PRIMARY CORE METRICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Utilisateurs Actifs', value: totalUsers.toLocaleString(), sub: 'Expansion Sociale', icon: Users, bg: 'bg-blue-50', text: 'text-blue-600' },
            { label: 'Projets Portefolia', value: totalPortfolios.toLocaleString(), sub: 'Infrastructures Clés', icon: Globe, bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Volume Transactionnel', value: `${totalPaiementsAmount.toLocaleString()} F`, sub: `${totalPaiements} Flux Capturés`, icon: DollarSign, bg: 'bg-purple-50', text: 'text-purple-600' },
            { label: 'Rendement Moyen / Unité', value: `${avgPaiement.toLocaleString()} F`, sub: `ARPU: ${revenuePerUser.toLocaleString()} F`, icon: CreditCard, bg: 'bg-orange-50', text: 'text-orange-600' }
          ].map((stat, idx) => (
            <Card key={idx} className="relative group overflow-hidden rounded-[2.5rem] bg-white border border-gray-100 p-10 shadow-xl shadow-gray-200/40 transition-all duration-500 hover:shadow-gray-300/60 hover:-translate-y-2">
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className={`h-16 w-16 rounded-2xl ${stat.bg} ${stat.text} flex items-center justify-center transition-transform duration-500 group-hover:scale-110`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                  <p className="text-xs font-bold text-gray-400 mt-2">{stat.sub}</p>
                </div>
              </div>
              <stat.icon className="absolute bottom-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-all translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 h-32 w-32" />
            </Card>
          ))}
        </div>

        {/* ── PERFORMANCE INSIGHTS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Exposition Globale', value: totalVisits.toLocaleString(), growth: visitGrowth, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50/50' },
            { label: 'Croissance Valorielle', value: `${totalRevenue.toLocaleString()} F`, growth: revenueGrowth, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
            { label: "Volume d'Acquisition", value: totalOrders.toLocaleString(), sub: `Unit: ${avgOrderValue.toLocaleString()} F`, icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-50/50' },
            { label: 'Indice de Conversion', value: `${conversionRate} %`, sub: `Ratio v/c: 1:${Math.round(totalVisits / (totalOrders || 1))}`, icon: Target, color: 'text-orange-500', bg: 'bg-orange-50/50' }
          ].map((stat, idx) => (
            <Card key={idx} className="rounded-[2.5rem] bg-gray-50/50 border-gray-100 p-8 hover:bg-white hover:shadow-xl transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className={`h-12 w-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center transition-all group-hover:rotate-6`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                {stat.growth !== undefined && (
                  <Badge variant="secondary" className={`rounded-lg px-3 py-1 font-black shadow-none border-0 ${stat.growth > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {stat.growth > 0 ? '+' : ''}{stat.growth}%
                  </Badge>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">{stat.sub || 'Métrique Stabilisée'}</p>
            </Card>
          ))}
        </div>

        {/* ── MULTI-DIMENSIONAL ANALYSIS ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-12">
          <TabsList className="inline-flex h-20 bg-gray-50/80 p-2 rounded-[2rem] border border-gray-100">
            <TabsTrigger value="overview" className="px-10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-blue-600 transition-all">
              Visualisation Flux
            </TabsTrigger>
            <TabsTrigger value="revenue" className="px-10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-emerald-600 transition-all">
              Métrique Revenus
            </TabsTrigger>
            <TabsTrigger value="audience" className="px-10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-purple-600 transition-all">
              Indice Audience
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12 focus-visible:outline-none">
            <div className="grid lg:grid-cols-2 gap-12">
              <Card className="rounded-[3rem] border-gray-100 p-12 shadow-xl shadow-gray-200/50 bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Activity className="h-5 w-5" />
                    </div>
                    Récurrence des Visites
                  </h3>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                      <Area type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorVisits)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="rounded-[3rem] border-gray-100 p-12 shadow-xl shadow-gray-200/50 bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    Progression Monétaire
                  </h3>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 900 }}
                        formatter={(val: number) => [`${val.toLocaleString()} F`, 'Flux']}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
              <Card className="rounded-[3rem] p-10 bg-gray-900 text-white overflow-hidden border-0">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-8">Source Plateforme</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={platformData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '1.5rem', background: '#111', border: 'none', color: '#fff', fontWeight: 900 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 mt-8">
                  {platformData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 px-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-xs font-bold text-gray-400">{p.name}</span>
                      </div>
                      <span className="text-sm font-black">{p.value}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-2 rounded-[3rem] p-12 bg-white border-gray-100 shadow-xl shadow-gray-200/50">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-10">Journal d'Intelligence Récent</h4>
                <div className="space-y-8">
                  {revenue.slice(-4).reverse().map((item, index) => (
                    <div key={index} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                          <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{item.orders} Acquisition{item.orders !== 1 ? 's' : ''} Cible{item.orders !== 1 ? 's' : ''}</p>
                          <p className="text-xs font-bold text-gray-400 mt-1">{format(new Date(item.month), 'MMMM yyyy', { locale: fr })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">+{item.revenue.toLocaleString()} F</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Impact Cash</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-12 h-16 rounded-[1.5rem] border-gray-100 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50">
                  Analyse Profonde
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-12 focus-visible:outline-none">
            <Card className="rounded-[3.5rem] p-12 bg-white border-gray-100 shadow-2xl shadow-gray-200/50">
              <h3 className="text-xl font-black text-gray-900 mb-12">Trajectoire de Valorisation Monétaire</h3>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 10 }} />
                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-12 focus-visible:outline-none">
            <div className="grid lg:grid-cols-2 gap-12">
              <Card className="rounded-[3rem] p-12 bg-white border-gray-100 shadow-xl shadow-gray-200/50">
                <h3 className="text-xl font-black text-gray-900 mb-10">Densité d'Acquisition Audience</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                      <Area type="monotone" dataKey="visits" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="rounded-[3rem] p-12 bg-gray-900 text-white border-0">
                <h3 className="text-xl font-black mb-10">KPI Stratégiques Audience</h3>
                <div className="space-y-10">
                  {[
                    { label: 'Taux de Rétention', val: '84%', color: 'bg-blue-500' },
                    { label: 'Indice de Conversion', val: conversionRate + '%', color: 'bg-emerald-500' },
                    { label: 'Revenu par Tête', val: revenuePerUser + ' F', color: 'bg-purple-500' },
                    { label: 'Accélération Portfolio', val: '+22%', color: 'bg-orange-500' }
                  ].map((m, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                        <span className="text-gray-400">{m.label}</span>
                        <span className="text-white">{m.val}</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${m.color} transition-all duration-1000`} style={{ width: m.val.includes('%') ? m.val : '60%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── INSIGHT FOOTER BAR ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Engagement Moyen / Session', val: '4m 32s', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Vues de Page / Visite', val: '3.8', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Acquisitions Requis', val: '+' + Math.round(totalVisits * 0.05), icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-50' }
          ].map((w, i) => (
            <Card key={i} className="rounded-[2.5rem] p-10 bg-gray-50/50 border-gray-100 hover:bg-white hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-6">
                <div className={`h-14 w-14 rounded-2xl ${w.bg} ${w.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <w.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{w.label}</p>
                  <p className="text-2xl font-black text-gray-900">{w.val}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

    </div>
  );
}