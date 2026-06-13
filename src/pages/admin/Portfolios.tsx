import { useEffect, useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
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
  Trash2,
  Edit,
  MoreVertical,
  RefreshCw,
  Download,
  BarChart3,
  Shield,
  AlertCircle,
  Plus,
  Sparkles,
  Zap,
  Users,
  CreditCard,
  Link,
  Database,
  TrendingDown,
  Activity,
  PieChart,
  LineChart,
  DownloadCloud,
  FileText,
  ChevronDown,
  ChevronUp,
  Box,
  Monitor,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Star,
  Award,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface Portfolio {
  id: string;
  title: string;
  titre?: string;
  slug: string;
  bio?: string;
  is_public: boolean;
  est_public?: number;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  views_count?: number;
  visit_count_30d?: number;
  total_visits?: number;
  custom_domain?: string;
  domain_status?: string;
  status?: string;
  plan_name?: string;
  plan_type?: string;
  domain_name?: string;
  owner: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
    plan_name?: string;
    plan_type?: string;
  };
}

interface Stats {
  total: number;
  public: number;
  private: number;
  deleted: number;
  totalViews: number;
  avgViews: number;
  byPlan: Record<string, number>;
  byDomain: Record<string, number>;
  byUser: Record<string, { count: number; name: string }>;
  growth30d: number;
  topPerforming: Portfolio[];
}

interface FilterOptions {
  users: Array<{ id: string; name: string; email: string }>;
  plans: Array<{ name: string; value: string }>;
  domains: Array<{ name: string; value: string }>;
}

export default function AdminPortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    public: 0,
    private: 0,
    deleted: 0,
    totalViews: 0,
    avgViews: 0,
    byPlan: {},
    byDomain: {},
    byUser: {},
    growth30d: 0,
    topPerforming: [],
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    users: [],
    plans: [],
    domains: [],
  });
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());
  const [showAdvancedStats, setShowAdvancedStats] = useState(true);
  const [statsPeriod, setStatsPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { toast } = useToast();

  // Helper functions
  const getTitle = (p: Portfolio) => {
    return p.title || p.titre || "Sans titre";
  };

  const getSlug = (p: Portfolio) => {
    return p.slug?.trim() || '';
  };

  const hasValidSlug = (p: Portfolio) => {
    return !!p.slug && p.slug.trim() !== '';
  };

  const getPlanName = (p: Portfolio) => {
    return p.plan_name || p.owner?.plan_name || "Gratuit";
  };

  const getDomainName = (p: Portfolio) => {
    if (p.custom_domain) return p.custom_domain;
    if (p.domain_name) return p.domain_name;
    return "default";
  };

  const isPublic = (p: Portfolio) => {
    return p.is_public === true || (p.is_public as any) === 1 || p.est_public === 1;
  };

  const getStatus = (p: Portfolio) => {
    if (p.deleted_at) return "deleted";
    if (isPublic(p)) return "published";
    return "draft";
  };

  const loadPortfolios = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    try {
      const [portfoliosRes, statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/portfolios?limit=1000&include=owner,stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/portfolios/stats?period=${statsPeriod}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/users?limit=1000&role=user`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (portfoliosRes.ok) {
        const json = await portfoliosRes.json();
        setPortfolios(json.portfolios || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          total: statsData.total || 0,
          public: statsData.public || 0,
          private: statsData.private || 0,
          deleted: statsData.deleted || 0,
          totalViews: statsData.totalViews || 0,
          avgViews: statsData.avgViews || 0,
          byPlan: statsData.byPlan || {},
          byDomain: statsData.byDomain || {},
          byUser: statsData.byUser || {},
          growth30d: statsData.growth30d || 0,
          topPerforming: statsData.topPerforming || [],
        });
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = (usersData.users || []).map((user: any) => ({
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          email: user.email,
        }));

        // Extract unique plans and domains from portfolios
        const plans = new Set<string>();
        const domains = new Set<string>();

        portfolios.forEach(p => {
          const plan = getPlanName(p);
          const domain = getDomainName(p);
          if (plan) plans.add(plan);
          if (domain) domains.add(domain);
        });

        setFilterOptions({
          users: [{ id: "all", name: "Tous les utilisateurs", email: "" }, ...users],
          plans: [{ name: "Tous les plans", value: "all" }, ...Array.from(plans).map(p => ({ name: p, value: p }))],
          domains: [{ name: "Tous les domaines", value: "all" }, ...Array.from(domains).map(d => ({ name: d, value: d }))],
        });
      }

    } catch (err) {
      console.error('Erreur chargement portfolios', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les portfolios',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, [statsPeriod]);

  const filteredPortfolios = useMemo(() => {
    let filtered = [...portfolios];

    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const title = getTitle(p).toLowerCase();
        const slug = getSlug(p).toLowerCase();
        const bio = p.bio?.toLowerCase() || '';
        const ownerName = `${p.owner?.first_name || ''} ${p.owner?.last_name || ''}`.toLowerCase();
        const ownerEmail = p.owner?.email?.toLowerCase() || '';
        const domain = getDomainName(p).toLowerCase();

        return (
          title.includes(searchLower) ||
          slug.includes(searchLower) ||
          bio.includes(searchLower) ||
          ownerName.includes(searchLower) ||
          ownerEmail.includes(searchLower) ||
          domain.includes(searchLower)
        );
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => getStatus(p) === statusFilter);
    }

    // Filter by visibility
    if (visibilityFilter !== "all") {
      filtered = filtered.filter((p) =>
        visibilityFilter === "public" ? isPublic(p) : !isPublic(p)
      );
    }

    // Filter by user
    if (userFilter !== "all") {
      filtered = filtered.filter((p) => p.owner?.id === userFilter);
    }

    // Filter by plan
    if (planFilter !== "all") {
      filtered = filtered.filter((p) => getPlanName(p) === planFilter);
    }

    // Filter by domain
    if (domainFilter !== "all") {
      filtered = filtered.filter((p) => getDomainName(p) === domainFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "views":
          return (b.views_count || 0) - (a.views_count || 0);
        case "owner":
          {
            const an = `${a.owner?.first_name || ''} ${a.owner?.last_name || ''}`.trim();
            const bn = `${b.owner?.first_name || ''} ${b.owner?.last_name || ''}`.trim();
            return an.localeCompare(bn);
          }
        case "plan":
          {
            const pa = getPlanName(a) || '';
            const pb = getPlanName(b) || '';
            return pa.localeCompare(pb);
          }
        case "title":
          return getTitle(a).localeCompare(getTitle(b));
        case "visits":
          return (b.visit_count_30d || 0) - (a.visit_count_30d || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [portfolios, searchTerm, statusFilter, visibilityFilter, userFilter, planFilter, domainFilter, sortBy]);

  // Prepare chart data
  const planChartData = useMemo(() => {
    return Object.entries(stats.byPlan || {}).map(([name, value]) => ({
      name,
      value,
      color: getPlanColor(name),
    }));
  }, [stats.byPlan]);

  const domainChartData = useMemo(() => {
    return Object.entries(stats.byDomain || {}).slice(0, 10).map(([name, value], index) => ({
      name: name === "default" ? "Domaine par défaut" : name,
      value,
      color: getDomainColor(index),
    }));
  }, [stats.byDomain]);

  const userChartData = useMemo(() => {
    return Object.values(stats.byUser || {})
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((user, index) => ({
        name: user.name.split(' ')[0] || user.name.substring(0, 10),
        portfolios: user.count,
        fullName: user.name,
        color: getUserColor(index),
      }));
  }, [stats.byUser]);

  const visitsTrendData = useMemo(() => {
    // Mock data - replace with actual API data
    return [
      { date: "1 Oct", visites: 45 },
      { date: "2 Oct", visites: 52 },
      { date: "3 Oct", visites: 48 },
      { date: "4 Oct", visites: 61 },
      { date: "5 Oct", visites: 55 },
      { date: "6 Oct", visites: 67 },
      { date: "7 Oct", visites: 72 },
    ];
  }, []);

  const handleDelete = async (portfolio: Portfolio) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/portfolios/${portfolio.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Delete failed');

      toast({
        title: '✅ Portfolio supprimé',
        description: 'Le portfolio a été supprimé avec succès'
      });

      setDeleteDialogOpen(false);
      setSelectedPortfolio(null);
      loadPortfolios();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le portfolio',
        variant: 'destructive'
      });
    }
  };

  const handleToggleVisibility = async (portfolio: Portfolio) => {
    try {
      const token = localStorage.getItem('token');
      const newVisibility = !isPublic(portfolio);

      const res = await fetch(`${API_BASE}/api/admin/portfolios/${portfolio.id}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: newVisibility }),
      });

      if (!res.ok) throw new Error('Update failed');

      toast({
        title: newVisibility ? '✅ Portfolio publié' : '🔒 Portfolio masqué',
        description: newVisibility
          ? 'Le portfolio est maintenant public'
          : 'Le portfolio est maintenant privé'
      });

      loadPortfolios();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la visibilité',
        variant: 'destructive'
      });
    }
  };

  const copyLink = (portfolio: Portfolio) => {
    if (!hasValidSlug(portfolio) && !portfolio.custom_domain) {
      toast({
        title: 'Slug manquant',
        description: 'Ce portfolio n\'a pas encore de slug. Demandez au propriétaire de le configurer.',
        variant: 'destructive',
      });
      return;
    }
    const slug = getSlug(portfolio);
    const link = portfolio.custom_domain
      ? `https://${portfolio.custom_domain}`
      : `${window.location.origin}/portfolio/${slug}`;

    navigator.clipboard.writeText(link);

    toast({
      title: '✅ Lien copié',
      description: `Lien copié : /portfolio/${slug}`
    });
  };

  const openPortfolioLink = (portfolio: Portfolio) => {
    if (!hasValidSlug(portfolio) && !portfolio.custom_domain) {
      toast({
        title: 'Slug manquant',
        description: 'Ce portfolio n\'a pas encore de slug configuré.',
        variant: 'destructive',
      });
      return;
    }
    const slug = getSlug(portfolio);
    const link = portfolio.custom_domain
      ? `https://${portfolio.custom_domain}`
      : `${window.location.origin}/portfolio/${slug}`;
    window.open(link, "_blank");
  };

  const toggleExpandPortfolio = (portfolioId: string) => {
    const newExpanded = new Set(expandedPortfolios);
    if (newExpanded.has(portfolioId)) {
      newExpanded.delete(portfolioId);
    } else {
      newExpanded.add(portfolioId);
    }
    setExpandedPortfolios(newExpanded);
  };

  const exportPortfolios = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/portfolios/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolios-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: `Les portfolios ont été exportés en ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (portfolio: Portfolio) => {
    const status = getStatus(portfolio);

    switch (status) {
      case 'published':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            <Globe className="h-3 w-3 mr-1" />
            Public
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Lock className="h-3 w-3 mr-1" />
            Privé
          </Badge>
        );
      case 'deleted':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Inconnu
          </Badge>
        );
    }
  };

  const getPlanBadge = (portfolio: Portfolio) => {
    const plan = getPlanName(portfolio);
    const colors: Record<string, string> = {
      'Premium': 'bg-purple-100 text-purple-800 border-purple-200',
      'Pro': 'bg-blue-100 text-blue-800 border-blue-200',
      'Business': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Enterprise': 'bg-red-100 text-red-800 border-red-200',
      'Gratuit': 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <Badge variant="outline" className={`text-xs ${colors[plan] || 'bg-gray-100 text-gray-800'}`}>
        {plan === 'Gratuit' ? 'Free' : plan}
      </Badge>
    );
  };

  const getPlanColor = (planName: string) => {
    const colors: Record<string, string> = {
      'Premium': '#8b5cf6',
      'Pro': '#3b82f6',
      'Business': '#6366f1',
      'Enterprise': '#ef4444',
      'Gratuit': '#6b7280',
    };
    return colors[planName] || '#6b7280';
  };

  const getDomainColor = (index: number) => {
    const colors = [
      '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];
    return colors[index % colors.length];
  };

  const getUserColor = (index: number) => {
    const colors = [
      '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
      '#ec4899', '#14b8a6', '#f97316'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">


      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header & Nav */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              <span className="hover:text-blue-600 transition-colors cursor-pointer">Admin</span>
              <span className="text-gray-200">/</span>
              <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">Portfolios</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              Gestion des Portfolios
              <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="h-12 rounded-2xl border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-100 font-bold px-6 transition-all">
                  <DownloadCloud className="h-5 w-5 mr-3 text-blue-500" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-2xl p-2 min-w-[200px]">
                <DropdownMenuLabel className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Formats disponibles</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportPortfolios('csv')} className="rounded-xl py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-600 font-bold">
                  <FileText className="mr-3 h-4 w-4" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPortfolios('json')} className="rounded-xl py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-600 font-bold">
                  <Database className="mr-3 h-4 w-4" /> Export JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="lg"
              onClick={loadPortfolios}
              className="h-12 w-12 rounded-2xl border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-100 flex items-center justify-center p-0 transition-all font-bold"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <div className="h-10 w-[1px] bg-gray-100 mx-2 hidden sm:block" />

            <Button
              size="lg"
              className="h-12 rounded-2xl font-black px-8 shadow-2xl shadow-blue-100 transition-all hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-700 border-none group"
            >
              <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform" />
              Nouveau Portfolio
            </Button>
          </div>
        </motion.div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total portfolios',
              value: stats.total,
              sub: `${stats.deleted} supprimés`,
              icon: <Globe className="h-5 w-5" />,
              color: 'blue',
              stroke: '#3b82f6',
              data: [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 18 }, { v: 25 }, { v: Math.max(stats.total, 1) }],
            },
            {
              label: 'Publics',
              value: stats.public,
              sub: stats.total > 0 ? `${((stats.public / stats.total) * 100).toFixed(0)}% du total` : '0%',
              icon: <CheckCircle className="h-5 w-5" />,
              color: 'emerald',
              stroke: '#10b981',
              data: [{ v: 5 }, { v: 8 }, { v: 7 }, { v: 12 }, { v: 10 }, { v: 14 }, { v: Math.max(stats.public, 1) }],
            },
            {
              label: 'Vues totales',
              value: stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews,
              sub: `moy. ${stats.avgViews} / portfolio`,
              icon: <Eye className="h-5 w-5" />,
              color: 'violet',
              stroke: '#8b5cf6',
              data: [{ v: 20 }, { v: 25 }, { v: 35 }, { v: 30 }, { v: 45 }, { v: 50 }, { v: 40 }],
            },
            {
              label: 'Croissance 30j',
              value: `${stats.growth30d >= 0 ? '+' : ''}${stats.growth30d}%`,
              sub: stats.growth30d >= 0 ? 'en hausse' : 'en baisse',
              icon: stats.growth30d >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
              color: stats.growth30d >= 0 ? 'emerald' : 'red',
              stroke: stats.growth30d >= 0 ? '#10b981' : '#ef4444',
              data: [{ v: 10 }, { v: 8 }, { v: 12 }, { v: 15 }, { v: 14 }, { v: 18 }, { v: 22 }],
            },
          ].map((kpi, i) => {
            const palette: Record<string, { bg: string; icon: string; ring: string; text: string }> = {
              blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100',    text: 'text-blue-700' },
              emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', text: 'text-emerald-700' },
              violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'ring-violet-100',  text: 'text-violet-700' },
              red:     { bg: 'bg-red-50',     icon: 'text-red-600',     ring: 'ring-red-100',     text: 'text-red-700' },
            };
            const p = palette[kpi.color] || palette.blue;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-10 w-10 rounded-xl ${p.bg} ${p.icon} flex items-center justify-center ring-1 ${p.ring}`}>
                      {kpi.icon}
                    </div>
                    <span className={`text-xs font-semibold ${p.text} ${p.bg} px-2 py-0.5 rounded-full`}>{kpi.sub}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tight">{kpi.value}</p>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpi.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Area type="monotone" dataKey="v" stroke={kpi.stroke} fill={kpi.stroke} fillOpacity={0.08} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Plans donut */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-violet-500" /> Distribution par plans
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400 mt-0.5">Répartition des abonnements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={planChartData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                        {planChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} formatter={(value) => [`${value} portfolios`, '']} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tendance visites */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" /> Tendance des visites
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400 mt-0.5">Évolution globale sur 7 jours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visitsTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                      <Area type="monotone" dataKey="visites" stroke="#f97316" strokeWidth={2.5} fill="url(#gradVisits)" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top domaines */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-gray-50">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" /> Top domaines
                </CardTitle>
                <CardDescription className="text-xs text-gray-400 mt-0.5">Domaines personnalisés les plus utilisés</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainChartData} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-35} textAnchor="end" height={50} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                      <Bar dataKey="value" name="Portfolios" radius={[5, 5, 0, 0]}>
                        {domainChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top utilisateurs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-gray-50">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" /> Top créateurs
                </CardTitle>
                <CardDescription className="text-xs text-gray-400 mt-0.5">Utilisateurs avec le plus de portfolios</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userChartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={72} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} formatter={(value) => [`${value} portfolios`, '']} />
                      <Bar dataKey="portfolios" name="Portfolios" radius={[0, 5, 5, 0]}>
                        {userChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Performing Portfolios */}
        {stats.topPerforming.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
            <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" /> Portfolios les plus performants
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400 mt-0.5">Top 5 par nombre de vues</CardDescription>
                  </div>
                  <div className="flex -space-x-2">
                    {stats.topPerforming.slice(0, 5).map((p) => (
                      <Avatar key={p.id} className="h-8 w-8 border-2 border-white shadow-sm">
                        <AvatarImage src={p.profile_image_url} />
                        <AvatarFallback className="bg-blue-500 text-white font-bold text-xs">{getTitle(p)[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {stats.topPerforming.slice(0, 5).map((portfolio, index) => (
                    <button
                      key={portfolio.id}
                      className="group flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md transition-all text-left"
                      onClick={() => { setSelectedPortfolio(portfolio); setDetailsOpen(true); }}
                    >
                      <div className="relative mb-3">
                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                          <AvatarImage src={portfolio.profile_image_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                            {getTitle(portfolio)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 text-center line-clamp-1 group-hover:text-blue-600 transition-colors w-full">{getTitle(portfolio)}</p>
                      <p className="text-[10px] text-gray-400 text-center mb-3">{portfolio.owner?.first_name} {portfolio.owner?.last_name?.substring(0, 1)}.</p>
                      <div className="flex items-center gap-3 w-full justify-center">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-blue-400" />
                          <span className="text-xs font-bold text-gray-700">{portfolio.views_count || 0}</span>
                        </div>
                        <div className="h-3 w-px bg-gray-200" />
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-orange-400" />
                          <span className="text-xs font-bold text-orange-600">{portfolio.visit_count_30d || 0}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mb-8"
        >
          <Card className="border-none shadow-3xl shadow-gray-100 rounded-[2.5rem] overflow-hidden bg-white">
            <CardContent className="p-8">
              <div className="flex flex-col gap-8">
                {/* Search & Period */}
                <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
                  <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Rechercher par titre, propriétaire, domaine..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-16 h-16 rounded-[1.25rem] border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-50 text-base font-bold transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-[1.5rem] border border-gray-100">
                    {['7d', '30d', '90d', 'all'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setStatsPeriod(period as any)}
                        className={`h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${statsPeriod === period
                          ? 'bg-white text-blue-600 shadow-lg shadow-blue-50 ring-1 ring-blue-100'
                          : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        {period === '7d' ? 'Semaine' : period === '30d' ? 'Mois' : period === '90d' ? 'Trimestre' : 'Tout'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Filters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all" className="rounded-xl font-bold">Tous</SelectItem>
                        <SelectItem value="published" className="rounded-xl font-bold">Publiés</SelectItem>
                        <SelectItem value="draft" className="rounded-xl font-bold">Brouillons</SelectItem>
                        <SelectItem value="deleted" className="rounded-xl font-bold">Supprimés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Visibilité</Label>
                    <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white">
                        <SelectValue placeholder="Visibilité" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all" className="rounded-xl font-bold">Toute</SelectItem>
                        <SelectItem value="public" className="rounded-xl font-bold">Publics</SelectItem>
                        <SelectItem value="private" className="rounded-xl font-bold">Privés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Utilisateur</Label>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white">
                        <SelectValue placeholder="Utilisateur" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        {filterOptions.users.map(user => (
                          <SelectItem key={user.id} value={user.id} className="rounded-xl font-bold">
                            {user.name.split(' ')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan</Label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        {filterOptions.plans.map(plan => (
                          <SelectItem key={plan.value} value={plan.value} className="rounded-xl font-bold">
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Domaine</Label>
                    <Select value={domainFilter} onValueChange={setDomainFilter}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white">
                        <SelectValue placeholder="Domaine" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        {filterOptions.domains.map(domain => (
                          <SelectItem key={domain.value} value={domain.value} className="rounded-xl font-bold text-[10px]">
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tri</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white text-blue-600">
                        <SelectValue placeholder="Trier par" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="newest" className="rounded-xl font-bold">Récent</SelectItem>
                        <SelectItem value="views" className="rounded-xl font-bold">Vues</SelectItem>
                        <SelectItem value="visits" className="rounded-xl font-bold">Visites 30j</SelectItem>
                        <SelectItem value="owner" className="rounded-xl font-bold">Propriétaire</SelectItem>
                        <SelectItem value="title" className="rounded-xl font-bold">Titre (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-gray-100 rounded-[1.25rem]">
                      <button
                        onClick={() => setViewMode("list")}
                        className={`h-11 px-6 rounded-[1rem] flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === "list" ? "bg-white text-blue-600 shadow-sm font-black" : "text-gray-400 hover:text-gray-600"
                          }`}
                      >
                        <Users className="h-4 w-4" /> Liste
                      </button>
                      <button
                        onClick={() => setViewMode("cards")}
                        className={`h-11 px-6 rounded-[1rem] flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === "cards" ? "bg-white text-blue-600 shadow-sm font-black" : "text-gray-400 hover:text-gray-600"
                          }`}
                      >
                        <Star className="h-4 w-4" /> Cartes
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setVisibilityFilter('all');
                        setUserFilter('all');
                        setPlanFilter('all');
                        setDomainFilter('all');
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolios List/Grid */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 font-black text-sm">
                {filteredPortfolios.length}
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Portfolios</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {filteredPortfolios.filter(p => isPublic(p)).length} publics · {filteredPortfolios.filter(p => !isPublic(p) && !p.deleted_at).length} privés
                  {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length > 0 && (
                    <span className="text-amber-500 ml-2">· {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length} sans slug</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">
                    {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length} slug(s) manquant(s)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Live Sync</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[320px] w-full rounded-[2.5rem]" />
                ))}
              </div>
            ) : filteredPortfolios.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100"
              >
                <div className="h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Aucun Résultat</h3>
                <p className="text-gray-400 font-medium max-w-xs text-center text-sm">Nous n'avons trouvé aucun portfolio correspondant à vos critères de recherche.</p>
                <Button
                  variant="outline"
                  className="mt-8 h-12 rounded-2xl font-black px-8 border-gray-100"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setVisibilityFilter('all');
                    setUserFilter('all');
                    setPlanFilter('all');
                    setDomainFilter('all');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-3" />
                  Réinitialiser
                </Button>
              </motion.div>
            ) : viewMode === "cards" ? (
              <motion.div
                key="cards-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredPortfolios.map((portfolio, idx) => {
                  const bannerColors = [
                    'from-blue-500 to-indigo-600',
                    'from-violet-500 to-purple-700',
                    'from-emerald-500 to-teal-600',
                    'from-orange-400 to-rose-500',
                    'from-cyan-500 to-blue-600',
                    'from-pink-500 to-fuchsia-600',
                  ];
                  const bannerGradient = bannerColors[idx % bannerColors.length];

                  return (
                    <motion.div
                      key={portfolio.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.35 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      {/* ── Bannière colorée ── */}
                      <div className={`relative h-28 bg-gradient-to-br ${bannerGradient} flex-shrink-0`}>
                        {/* Cercles décoratifs */}
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                        <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full bg-white/10" />

                        {/* Badges en haut à droite */}
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                          {getStatusBadge(portfolio)}
                          {getPlanBadge(portfolio)}
                        </div>

                        {/* Avatar chevauchant la bannière */}
                        <div className="absolute -bottom-9 left-5">
                          <div className="p-1 bg-white rounded-2xl shadow-lg">
                            <Avatar className="h-16 w-16 rounded-xl">
                              <AvatarImage src={portfolio.profile_image_url} className="object-cover" />
                              <AvatarFallback className={`bg-gradient-to-br ${bannerGradient} text-white font-black text-xl rounded-xl`}>
                                {getTitle(portfolio)[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      </div>

                      {/* ── Contenu principal ── */}
                      <div className="pt-12 px-5 pb-4 flex flex-col flex-1">
                        {/* Titre + propriétaire */}
                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {getTitle(portfolio)}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 mb-3">
                          <User className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-500 truncate">
                            {portfolio.owner?.first_name} {portfolio.owner?.last_name}
                          </span>
                          <span className="text-gray-300 mx-0.5">·</span>
                          <span className="text-xs text-gray-400 truncate">{portfolio.owner?.email}</span>
                        </div>

                        {/* Slug */}
                        {hasValidSlug(portfolio) ? (
                          <button
                            onClick={() => openPortfolioLink(portfolio)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg text-[11px] font-semibold text-blue-600 transition-colors w-fit mb-4 truncate max-w-full"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            /portfolio/{portfolio.slug}
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-600 w-fit mb-4">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Slug manquant
                          </div>
                        )}

                        {/* Métriques */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="flex flex-col items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <Eye className="h-3.5 w-3.5 text-blue-400 mb-1" />
                            <span className="text-sm font-black text-gray-800 leading-none">{portfolio.views_count || 0}</span>
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Vues</span>
                          </div>
                          <div className="flex flex-col items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <Activity className="h-3.5 w-3.5 text-orange-400 mb-1" />
                            <span className="text-sm font-black text-orange-600 leading-none">{portfolio.visit_count_30d || 0}</span>
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">30 jours</span>
                          </div>
                          <div className="flex flex-col items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <Calendar className="h-3.5 w-3.5 text-purple-400 mb-1" />
                            <span className="text-[11px] font-bold text-gray-700 leading-none text-center">
                              {portfolio.created_at ? format(new Date(portfolio.created_at), "dd/MM/yy") : "—"}
                            </span>
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Créé</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                          <Button
                            size="sm"
                            className="flex-1 h-9 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white border-none text-xs transition-all"
                            onClick={() => { setSelectedPortfolio(portfolio); setDetailsOpen(true); }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Détails
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 w-9 rounded-xl border-gray-200 hover:bg-gray-50 p-0 flex items-center justify-center">
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl p-1.5 min-w-[200px]">
                              <DropdownMenuItem
                                onClick={() => openPortfolioLink(portfolio)}
                                disabled={!hasValidSlug(portfolio) && !portfolio.custom_domain}
                                className="rounded-lg py-2 cursor-pointer focus:bg-blue-50 focus:text-blue-600 text-sm font-medium disabled:opacity-40"
                              >
                                <ExternalLink className="mr-2.5 h-4 w-4" /> Ouvrir le site
                                {!hasValidSlug(portfolio) && !portfolio.custom_domain && (
                                  <span className="ml-auto text-[10px] text-amber-500">Sans slug</span>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => copyLink(portfolio)}
                                disabled={!hasValidSlug(portfolio) && !portfolio.custom_domain}
                                className="rounded-lg py-2 cursor-pointer focus:bg-blue-50 focus:text-blue-600 text-sm font-medium disabled:opacity-40"
                              >
                                <Copy className="mr-2.5 h-4 w-4" /> Copier le lien
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleVisibility(portfolio)}
                                className="rounded-lg py-2 cursor-pointer focus:bg-blue-50 focus:text-blue-600 text-sm font-medium"
                              >
                                {isPublic(portfolio)
                                  ? <><Lock className="mr-2.5 h-4 w-4" /> Rendre privé</>
                                  : <><Globe className="mr-2.5 h-4 w-4 text-emerald-500" /> Publier</>
                                }
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                className="rounded-lg py-2 cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500 text-sm font-medium"
                                onClick={() => { setSelectedPortfolio(portfolio); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="mr-2.5 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {filteredPortfolios.map((portfolio, idx) => (
                  <motion.div
                    key={portfolio.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.025 }}
                    className="group bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200"
                  >
                    {/* Ligne principale */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Avatar */}
                      <Avatar className="h-11 w-11 rounded-xl border border-gray-100 shrink-0">
                        <AvatarImage src={portfolio.profile_image_url} className="object-cover" />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base">
                          {getTitle(portfolio)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Nom + badges */}
                      <div className="min-w-0 w-48 shrink-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {getTitle(portfolio)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getStatusBadge(portfolio)}
                          {getPlanBadge(portfolio)}
                        </div>
                      </div>

                      {/* Propriétaire */}
                      <div className="hidden sm:flex flex-col min-w-0 w-44 shrink-0">
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {portfolio.owner?.first_name} {portfolio.owner?.last_name}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate">{portfolio.owner?.email}</span>
                      </div>

                      {/* Slug */}
                      <div className="hidden md:block min-w-0 w-44 shrink-0">
                        {hasValidSlug(portfolio) || portfolio.custom_domain ? (
                          <button
                            onClick={() => openPortfolioLink(portfolio)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded-md truncate max-w-full transition-colors"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {portfolio.custom_domain || `/${portfolio.slug}`}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> Slug manquant
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="hidden lg:block w-24 shrink-0">
                        <span className="text-xs text-gray-500">
                          {portfolio.created_at ? format(new Date(portfolio.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                        </span>
                      </div>

                      {/* Métriques */}
                      <div className="hidden lg:flex items-center gap-3 ml-auto shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                          <Eye className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-bold text-gray-700">{portfolio.views_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg">
                          <Activity className="h-3.5 w-3.5 text-orange-400" />
                          <span className="text-xs font-bold text-orange-600">{portfolio.visit_count_30d || 0}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100"
                          onClick={() => toggleExpandPortfolio(portfolio.id)}
                        >
                          {expandedPortfolios.has(portfolio.id)
                            ? <ChevronUp className="h-4 w-4 text-gray-500" />
                            : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-none text-xs"
                          onClick={() => { setSelectedPortfolio(portfolio); setDetailsOpen(true); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Détails
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-gray-200 hover:bg-gray-50">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl p-1.5 min-w-[200px]">
                            <DropdownMenuItem
                              onClick={() => openPortfolioLink(portfolio)}
                              disabled={!hasValidSlug(portfolio) && !portfolio.custom_domain}
                              className="rounded-lg py-2 text-sm font-medium cursor-pointer focus:bg-blue-50 focus:text-blue-600 disabled:opacity-40"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir le site
                              {!hasValidSlug(portfolio) && !portfolio.custom_domain && (
                                <span className="ml-auto text-[10px] text-amber-500">Sans slug</span>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyLink(portfolio)}
                              disabled={!hasValidSlug(portfolio) && !portfolio.custom_domain}
                              className="rounded-lg py-2 text-sm font-medium cursor-pointer focus:bg-blue-50 focus:text-blue-600 disabled:opacity-40"
                            >
                              <Copy className="mr-2 h-4 w-4" /> Copier l'URL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleVisibility(portfolio)}
                              className="rounded-lg py-2 text-sm font-medium cursor-pointer focus:bg-blue-50 focus:text-blue-600"
                            >
                              {isPublic(portfolio)
                                ? <><Lock className="mr-2 h-4 w-4" /> Rendre privé</>
                                : <><Globe className="mr-2 h-4 w-4 text-emerald-500" /> Publier</>}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              className="rounded-lg py-2 text-sm font-medium cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500"
                              onClick={() => { setSelectedPortfolio(portfolio); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedPortfolios.has(portfolio.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-gray-50 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Bio */}
                            <div className="sm:col-span-2">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3">
                                {portfolio.bio || "Aucune description fournie."}
                              </p>
                            </div>
                            {/* Meta + URL */}
                            <div className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">ID</p>
                                  <p className="font-mono text-[11px] font-bold text-gray-700">{portfolio.id.substring(0, 10)}…</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Vues tot.</p>
                                  <p className="text-sm font-bold text-gray-800">{portfolio.views_count || 0}</p>
                                </div>
                              </div>
                              {hasValidSlug(portfolio) ? (
                                <button
                                  onClick={() => openPortfolioLink(portfolio)}
                                  className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors text-left w-full"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  <span className="font-mono text-xs font-semibold text-blue-700 truncate">/portfolio/{portfolio.slug}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                  <span className="text-xs font-semibold text-amber-700">Aucune URL publique</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>


      {/* Portfolio Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-[3rem] shadow-4xl">
          {selectedPortfolio && (
            <div className="flex flex-col h-full bg-white">
              {/* Header with Background */}
              <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-900 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                <div className="absolute -bottom-12 left-10 p-2 bg-white rounded-[2.5rem] shadow-2xl">
                  <Avatar className="h-32 w-32 border-4 border-white rounded-[2rem]">
                    <AvatarImage src={selectedPortfolio.profile_image_url} />
                    <AvatarFallback className="bg-gray-100 text-gray-400 text-3xl font-black">
                      {getTitle(selectedPortfolio)[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Button
                  variant="ghost"
                  className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-none p-0"
                  onClick={() => setDetailsOpen(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>

              <div className="pt-24 pb-10 px-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-gray-900 tracking-tight">{getTitle(selectedPortfolio)}</h2>
                      {getStatusBadge(selectedPortfolio)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        {selectedPortfolio.owner?.first_name} {selectedPortfolio.owner?.last_name}
                        <span className="text-xs text-gray-400 font-medium">({selectedPortfolio.owner?.email})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasValidSlug(selectedPortfolio) ? (
                          <>
                            <Link className="h-4 w-4 text-purple-500" />
                            <span className="font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
                              /portfolio/{selectedPortfolio.slug}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                              Slug manquant
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        Créé le {selectedPortfolio.created_at ? format(new Date(selectedPortfolio.created_at), "dd MMMM yyyy", { locale: fr }) : "—"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Bio / Description</h4>
                      <p className="text-gray-600 leading-relaxed font-medium">
                        {selectedPortfolio.bio || "Aucune description fournie."}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div className="text-3xl font-black mb-1">{selectedPortfolio.views_count || 0}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Vues Totales</div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50">
                      <div className="space-y-3">
                        {!hasValidSlug(selectedPortfolio) && !selectedPortfolio.custom_domain && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-[11px] font-bold text-amber-700">Aucun slug configuré — lien indisponible</p>
                          </div>
                        )}
                        {hasValidSlug(selectedPortfolio) && (
                          <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">URL publique</p>
                            <p className="text-[11px] font-mono font-bold text-blue-600 truncate">/portfolio/{selectedPortfolio.slug}</p>
                          </div>
                        )}
                        <Button
                          className="w-full h-14 rounded-2xl font-black bg-gray-900 hover:bg-blue-600 transition-all border-none disabled:opacity-50"
                          disabled={!hasValidSlug(selectedPortfolio) && !selectedPortfolio.custom_domain}
                          onClick={() => openPortfolioLink(selectedPortfolio)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Voir le site
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full h-14 rounded-2xl font-black border-gray-100 hover:bg-gray-50 transition-all disabled:opacity-50"
                          disabled={!hasValidSlug(selectedPortfolio) && !selectedPortfolio.custom_domain}
                          onClick={() => copyLink(selectedPortfolio)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copier l'URL
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[3rem] p-10 border-none shadow-4xl max-w-md">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-6">
            <div className="h-24 w-24 rounded-[2rem] bg-red-50 flex items-center justify-center text-red-600 animate-bounce">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-3xl font-black text-gray-900 tracking-tight">Suppression</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500 font-medium px-4">
                Êtes-vous sûr de vouloir supprimer <span className="text-gray-900 font-bold">"{selectedPortfolio ? getTitle(selectedPortfolio) : ""}"</span> ? Cette action est irréversible.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-4 mt-8">
            <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-black border-gray-100 hover:bg-gray-50 transition-all m-0 shadow-lg shadow-gray-50">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-14 rounded-2xl font-black bg-red-600 hover:bg-red-700 transition-all m-0 border-none shadow-xl shadow-red-100"
              onClick={() => selectedPortfolio && handleDelete(selectedPortfolio)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}