import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search, Eye, Globe, Lock, User, TrendingUp, ExternalLink,
  Copy, Trash2, RefreshCw, Download, BarChart3, AlertTriangle, TrendingDown,
  Activity, FileText, Database, ChevronDown, ChevronUp, X, Briefcase,
  LayoutGrid, PieChart, Users, Mail,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

const PLAN_BADGE: Record<string, { c: string; bg: string }> = {
  Gratuit:  { c: '#52525B', bg: '#F4F4F5' },
  Starter:  { c: '#1565C0', bg: '#E8F1FD' },
  Pro:      { c: '#2E7D32', bg: '#EAF5EB' },
  Business: { c: '#7C3AED', bg: '#F3EEFF' },
};

const getPlanBadgeStyle = (plan: string) => PLAN_BADGE[plan] || { c: '#52525B', bg: '#F4F4F5' };

const CHART_COLORS = ['#2E7D32', '#1565C0', '#B45309', '#7C3AED', '#C62828', '#0891b2'];

// ── Pill components ────────────────────────────────────────────────────────────
function PlanPill({ plan }: { plan: string }) {
  const { c, bg } = getPlanBadgeStyle(plan);
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ color: c, background: bg }}>{plan}</span>;
}

function StatusPill({ status }: { status: string }) {
  const MAP: Record<string, { c: string; bg: string; label: string }> = {
    published: { c: '#2E7D32', bg: '#EAF5EB', label: 'Public' },
    draft:     { c: '#B45309', bg: '#FEF3E2', label: 'Privé' },
    deleted:   { c: '#C62828', bg: '#FEECEC', label: 'Supprimé' },
  };
  const s = MAP[status] || MAP.draft;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.c, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.c }} />{s.label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminPortfolios() {
  const [portfolios, setPortfolios]           = useState<Portfolio[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [searchTerm, setSearchTerm]           = useState("");
  const [statusFilter, setStatusFilter]       = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [userFilter, setUserFilter]           = useState<string>("all");
  const [planFilter, setPlanFilter]           = useState<string>("all");
  const [domainFilter, setDomainFilter]       = useState<string>("all");
  const [sortBy, setSortBy]                   = useState<string>("newest");
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [detailsOpen, setDetailsOpen]         = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode]               = useState<"list" | "cards">("list");
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());
  const [statsPeriod, setStatsPeriod]         = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [exportOpen, setExportOpen]           = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0, public: 0, private: 0, deleted: 0,
    totalViews: 0, avgViews: 0, byPlan: {}, byDomain: {}, byUser: {}, growth30d: 0, topPerforming: [],
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ users: [], plans: [], domains: [] });

  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  // ── Helpers ────────────────────────────────────────────────────────────────────
  const getTitle = (p: Portfolio) => p.title || p.titre || "Sans titre";
  const getSlug  = (p: Portfolio) => p.slug?.trim() || '';
  const hasValidSlug = (p: Portfolio) => !!p.slug && p.slug.trim() !== '';
  const getPlanName  = (p: Portfolio) => p.plan_name || p.owner?.plan_name || "Gratuit";
  const getDomainName = (p: Portfolio) => p.custom_domain || p.domain_name || "default";
  const isPublic = (p: Portfolio) => p.is_public === true || (p.is_public as any) === 1 || p.est_public === 1;
  const getStatus = (p: Portfolio): string => {
    if (p.deleted_at) return "deleted";
    if (isPublic(p)) return "published";
    return "draft";
  };

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadPortfolios = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    try {
      const [portfoliosRes, statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/portfolios?limit=1000&include=owner,stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/portfolios/stats?period=${statsPeriod}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/users?limit=1000&role=user`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (portfoliosRes.ok) {
        const json = await portfoliosRes.json();
        setPortfolios(json.portfolios || []);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          total: s.total || 0, public: s.public || 0, private: s.private || 0,
          deleted: s.deleted || 0, totalViews: s.totalViews || 0, avgViews: s.avgViews || 0,
          byPlan: s.byPlan || {}, byDomain: s.byDomain || {}, byUser: s.byUser || {},
          growth30d: s.growth30d || 0, topPerforming: s.topPerforming || [],
        });
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = (usersData.users || []).map((u: any) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          email: u.email,
        }));
        const plans = new Set<string>();
        const domains = new Set<string>();
        portfolios.forEach(p => { if (getPlanName(p)) plans.add(getPlanName(p)); if (getDomainName(p)) domains.add(getDomainName(p)); });
        setFilterOptions({
          users: [{ id: "all", name: "Tous les utilisateurs", email: "" }, ...users],
          plans: [{ name: "Tous les plans", value: "all" }, ...Array.from(plans).map(p => ({ name: p, value: p }))],
          domains: [{ name: "Tous les domaines", value: "all" }, ...Array.from(domains).map(d => ({ name: d, value: d }))],
        });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les portfolios', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPortfolios(); }, [statsPeriod]);

  // ── Filtered list ──────────────────────────────────────────────────────────────
  const filteredPortfolios = useMemo(() => {
    let list = [...portfolios];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        getTitle(p).toLowerCase().includes(q) ||
        getSlug(p).toLowerCase().includes(q) ||
        (p.bio || '').toLowerCase().includes(q) ||
        `${p.owner?.first_name || ''} ${p.owner?.last_name || ''}`.toLowerCase().includes(q) ||
        (p.owner?.email || '').toLowerCase().includes(q) ||
        getDomainName(p).toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all")     list = list.filter(p => getStatus(p) === statusFilter);
    if (visibilityFilter !== "all") list = list.filter(p => visibilityFilter === "public" ? isPublic(p) : !isPublic(p));
    if (userFilter !== "all")       list = list.filter(p => p.owner?.id === userFilter);
    if (planFilter !== "all")       list = list.filter(p => getPlanName(p) === planFilter);
    if (domainFilter !== "all")     list = list.filter(p => getDomainName(p) === domainFilter);
    list.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest": return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "views":  return (b.views_count || 0) - (a.views_count || 0);
        case "visits": return (b.visit_count_30d || 0) - (a.visit_count_30d || 0);
        case "owner":  return `${a.owner?.first_name || ''} ${a.owner?.last_name || ''}`.localeCompare(`${b.owner?.first_name || ''} ${b.owner?.last_name || ''}`);
        case "title":  return getTitle(a).localeCompare(getTitle(b));
        default: return 0;
      }
    });
    return list;
  }, [portfolios, searchTerm, statusFilter, visibilityFilter, userFilter, planFilter, domainFilter, sortBy]);

  // ── Chart data ─────────────────────────────────────────────────────────────────
  const planChartData = useMemo(() =>
    Object.entries(stats.byPlan || {}).map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [stats.byPlan]);

  const domainChartData = useMemo(() =>
    Object.entries(stats.byDomain || {}).slice(0, 8).map(([name, value], i) => ({
      name: name === "default" ? "Défaut" : name.replace(/^https?:\/\//, '').substring(0, 20),
      value, fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [stats.byDomain]);

  const userChartData = useMemo(() =>
    Object.values(stats.byUser || {}).sort((a, b) => b.count - a.count).slice(0, 6).map((u, i) => ({
      name: u.name.split(' ')[0] || u.name.substring(0, 12),
      portfolios: u.count, fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [stats.byUser]);

  const visitsTrendData = useMemo(() => [
    { date: "J-6", visites: 45 }, { date: "J-5", visites: 52 }, { date: "J-4", visites: 48 },
    { date: "J-3", visites: 61 }, { date: "J-2", visites: 55 }, { date: "J-1", visites: 67 }, { date: "Auj.", visites: 72 },
  ], []);

  // ── Actions ────────────────────────────────────────────────────────────────────
  const handleDelete = async (portfolio: Portfolio) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/portfolios/${portfolio.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Portfolio supprimé' });
      setDeleteDialogOpen(false);
      setSelectedPortfolio(null);
      loadPortfolios();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le portfolio', variant: 'destructive' });
    }
  };

  const handleToggleVisibility = async (portfolio: Portfolio) => {
    try {
      const token = localStorage.getItem('token');
      const newVisibility = !isPublic(portfolio);
      const res = await fetch(`${API_BASE}/api/admin/portfolios/${portfolio.id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_public: newVisibility }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast({ title: newVisibility ? 'Portfolio publié' : 'Portfolio masqué' });
      loadPortfolios();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de modifier la visibilité', variant: 'destructive' });
    }
  };

  const copyLink = (portfolio: Portfolio) => {
    if (!hasValidSlug(portfolio) && !portfolio.custom_domain) {
      toast({ title: 'Slug manquant', description: "Ce portfolio n'a pas de slug configuré.", variant: 'destructive' });
      return;
    }
    const link = portfolio.custom_domain
      ? `https://${portfolio.custom_domain}`
      : `${window.location.origin}/portfolio/${getSlug(portfolio)}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Lien copié' });
  };

  const openPortfolioLink = (portfolio: Portfolio) => {
    if (!hasValidSlug(portfolio) && !portfolio.custom_domain) {
      toast({ title: 'Slug manquant', variant: 'destructive' });
      return;
    }
    const link = portfolio.custom_domain
      ? `https://${portfolio.custom_domain}`
      : `${window.location.origin}/portfolio/${getSlug(portfolio)}`;
    window.open(link, "_blank");
  };

  const toggleExpandPortfolio = (id: string) => {
    const next = new Set(expandedPortfolios);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedPortfolios(next);
  };

  const exportPortfolios = async (fmt: 'csv' | 'json') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/portfolios/export?format=${fmt}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `portfolios-${new Date().toISOString().split('T')[0]}.${fmt}`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      toast({ title: `Export ${fmt.toUpperCase()} réussi` });
    } catch {
      toast({ title: "Erreur d'export", variant: "destructive" });
    }
  };

  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setVisibilityFilter('all');
    setUserFilter('all'); setPlanFilter('all'); setDomainFilter('all');
  };

  // ── KPI cards data ─────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total portfolios', value: stats.total,  sub: `${stats.deleted} supprimés`,   icon: Briefcase,    delta: null },
    { label: 'Publics',          value: stats.public,  sub: stats.total > 0 ? `${((stats.public / stats.total) * 100).toFixed(0)}% du total` : '0%', icon: Globe, delta: null },
    { label: 'Vues totales',     value: stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews, sub: `moy. ${stats.avgViews}/portfolio`, icon: Eye, delta: null },
    { label: 'Croissance 30j',   value: `${stats.growth30d >= 0 ? '+' : ''}${stats.growth30d}%`, sub: stats.growth30d >= 0 ? 'en hausse' : 'en baisse', icon: stats.growth30d >= 0 ? TrendingUp : TrendingDown, delta: stats.growth30d },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <Briefcase size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Portfolios</h1>
              <p className="text-white/65 text-sm mt-0.5">{portfolios.length} portfolios · {stats.public} publics · {stats.private} privés</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen(o => !o)}
                className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
                <Download size={15} /> Exporter
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl overflow-hidden z-50"
                  style={CARD_STYLE}>
                  <button onClick={() => { exportPortfolios('csv'); setExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#18181B] hover:bg-zinc-50 transition-colors">
                    <FileText size={14} className="text-zinc-400" /> Export CSV
                  </button>
                  <button onClick={() => { exportPortfolios('json'); setExportOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#18181B] hover:bg-zinc-50 transition-colors border-t border-[#E7E7EA]">
                    <Database size={14} className="text-zinc-400" /> Export JSON
                  </button>
                </div>
              )}
            </div>
            <button onClick={loadPortfolios}
              className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
              title="Rafraîchir">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-7">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, sub, icon: Icon, delta }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center">
                  <Icon size={17} />
                </span>
                {delta !== null && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                    style={{ color: delta >= 0 ? '#2E7D32' : '#C62828', background: delta >= 0 ? '#2E7D3215' : '#C628280F' }}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                  </span>
                )}
              </div>
              <p className="text-[26px] font-extrabold text-[#18181B] leading-none tabular-nums">{value}</p>
              <p className="text-sm text-zinc-500 mt-1.5">{label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Distribution par plan */}
          <div className="bg-white p-6" style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center"><PieChart size={16} /></span>
              <div>
                <h3 className="font-bold text-[#18181B] text-sm">Distribution par plan</h3>
                <p className="text-xs text-zinc-400">Répartition des abonnements</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={planChartData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                    {planChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} formatter={(v) => [`${v} portfolios`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tendance des visites */}
          <div className="bg-white p-6" style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center"><Activity size={16} /></span>
              <div>
                <h3 className="font-bold text-[#18181B] text-sm">Tendance des visites</h3>
                <p className="text-xs text-zinc-400">7 derniers jours</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitsTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="visites" stroke="#2E7D32" strokeWidth={2} fill="url(#gradV)" dot={{ r: 3, fill: '#2E7D32', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top domaines */}
          {domainChartData.length > 0 && (
            <div className="bg-white p-6" style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center"><BarChart3 size={16} /></span>
                <div>
                  <h3 className="font-bold text-[#18181B] text-sm">Top domaines</h3>
                  <p className="text-xs text-zinc-400">Domaines personnalisés</p>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainChartData} margin={{ top: 4, right: 4, left: -20, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: '#F8F8F8' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} />
                    <Bar dataKey="value" name="Portfolios" radius={[4, 4, 0, 0]}>
                      {domainChartData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top créateurs */}
          {userChartData.length > 0 && (
            <div className="bg-white p-6" style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center"><Users size={16} /></span>
                <div>
                  <h3 className="font-bold text-[#18181B] text-sm">Top créateurs</h3>
                  <p className="text-xs text-zinc-400">Utilisateurs les plus actifs</p>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userChartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={68} axisLine={false} tickLine={false} tick={{ fill: '#3F3F46', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: '#F8F8F8' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} formatter={(v) => [`${v} portfolios`, '']} />
                    <Bar dataKey="portfolios" name="Portfolios" radius={[0, 4, 4, 0]}>
                      {userChartData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ── Filter toolbar ──────────────────────────────────────────────────────── */}
        <div className="bg-white p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3" style={CARD_STYLE}>
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              placeholder="Rechercher par titre, propriétaire, domaine…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B]"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {([['all', 'Tous'], ['published', 'Publics'], ['draft', 'Privés'], ['deleted', 'Supprimés']] as [string, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`px-3 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === k ? 'text-white' : 'border border-[#E7E7EA] text-zinc-500 hover:bg-zinc-50'}`}
                style={statusFilter === k ? { background: '#1B5E20' } : undefined}>
                {label}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
              {filterOptions.plans.map(p => <option key={p.value} value={p.value}>{p.name}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
              <option value="newest">Récent</option>
              <option value="oldest">Ancien</option>
              <option value="views">Vues</option>
              <option value="visits">Visites 30j</option>
              <option value="owner">Propriétaire</option>
              <option value="title">Titre A-Z</option>
            </select>
            <select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value as any)}
              className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
              <option value="all">Tout</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center h-9 rounded-lg bg-zinc-100 overflow-hidden ml-1">
              <button onClick={() => setViewMode('list')}
                className={`px-3 h-full text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-white text-[#18181B] shadow-sm' : 'text-zinc-500'}`}>
                Liste
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`px-3 h-full text-xs font-semibold transition-colors ${viewMode === 'cards' ? 'bg-white text-[#18181B] shadow-sm' : 'text-zinc-500'}`}>
                Cartes
              </button>
            </div>

            {(searchTerm || statusFilter !== 'all' || planFilter !== 'all') && (
              <button onClick={resetFilters} className="h-9 px-3 rounded-lg text-xs font-semibold text-zinc-400 hover:text-red-500 transition-colors">
                Réinit.
              </button>
            )}
          </div>
        </div>

        {/* ── Count strip ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1B5E20' }}>
              {filteredPortfolios.length}
            </span>
            <div>
              <p className="text-sm font-bold text-[#18181B]">Portfolios</p>
              <p className="text-xs text-zinc-400">
                {filteredPortfolios.filter(p => isPublic(p)).length} publics · {filteredPortfolios.filter(p => !isPublic(p) && !p.deleted_at).length} privés
                {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length > 0 && (
                  <span className="text-amber-500 ml-1">· {filteredPortfolios.filter(p => !hasValidSlug(p) && !p.custom_domain).length} sans slug</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Loading skeleton ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#E7E7EA] last:border-0">
                <div className="w-9 h-9 rounded-full bg-zinc-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-zinc-100 rounded w-40 animate-pulse" />
                  <div className="h-2.5 bg-zinc-100 rounded w-56 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <Search size={24} />
            </span>
            <h3 className="font-bold text-[#18181B]">Aucun résultat</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">Aucun portfolio ne correspond à vos filtres.</p>
            <button onClick={resetFilters} className="mt-5 h-9 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: '#2E7D32' }}>
              Réinitialiser
            </button>
          </div>

        ) : viewMode === 'cards' ? (
          /* ── Cards view ── */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPortfolios.map(p => (
              <div key={p.id} className="bg-white overflow-hidden" style={CARD_STYLE}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                        style={{ background: 'linear-gradient(140deg, #1B5E20, #2E7D32)' }}>
                        {getTitle(p)[0]?.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18181B] truncate">{getTitle(p)}</p>
                        <p className="text-xs text-zinc-400 truncate">{p.owner?.first_name} {p.owner?.last_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusPill status={getStatus(p) as any} />
                      <PlanPill plan={getPlanName(p)} />
                    </div>
                  </div>

                  {hasValidSlug(p) || p.custom_domain ? (
                    <button onClick={() => openPortfolioLink(p)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md truncate max-w-full mb-4"
                      style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                      <ExternalLink size={11} /> {p.custom_domain || `/portfolio/${p.slug}`}
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md mb-4"
                      style={{ background: '#FEF3E2', color: '#B45309' }}>
                      <AlertTriangle size={11} /> Slug manquant
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Vues', p.views_count || 0, '#1565C0'], ['30j', p.visit_count_30d || 0, '#B45309'], ['Date', p.created_at ? format(new Date(p.created_at), 'dd/MM/yy') : '—', '#52525B']].map(([l, v, c]) => (
                      <div key={String(l)} className="rounded-lg border border-[#E7E7EA] py-2">
                        <p className="text-sm font-bold tabular-nums" style={{ color: String(c) }}>{v}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#E7E7EA] p-3 flex items-center gap-2">
                  <button onClick={() => { setSelectedPortfolio(p); setDetailsOpen(true); }}
                    className="flex-1 h-9 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                    style={{ background: '#2E7D32' }}>
                    <Eye size={13} /> Détails
                  </button>
                  <button onClick={() => handleToggleVisibility(p)}
                    className="h-9 px-3 rounded-lg border border-[#E7E7EA] text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                    title={isPublic(p) ? 'Rendre privé' : 'Publier'}>
                    {isPublic(p) ? <Lock size={13} /> : <Globe size={13} />}
                  </button>
                  <button onClick={() => { setSelectedPortfolio(p); setDeleteDialogOpen(true); }}
                    className="h-9 px-3 rounded-lg border border-[#E7E7EA] text-xs font-medium text-zinc-400 hover:text-red-600 hover:border-red-200 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        ) : (
          /* ── List / table view ── */
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">Portfolio</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">Propriétaire</th>
                    <th className="py-3 px-3 text-center">Vues</th>
                    <th className="py-3 px-3">Créé</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPortfolios.map(p => (
                    <Fragment key={p.id}>
                      <tr
                        className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50/70 transition-colors cursor-pointer"
                        onClick={() => { setSelectedPortfolio(p); setDetailsOpen(true); }}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: '#1B5E20' }}>
                              {getTitle(p)[0]?.toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#18181B] truncate max-w-[180px]">{getTitle(p)}</p>
                              {hasValidSlug(p) || p.custom_domain ? (
                                <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px] block">
                                  {p.custom_domain || `/portfolio/${p.slug}`}
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-500 flex items-center gap-0.5">
                                  <AlertTriangle size={10} /> Sans slug
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3"><PlanPill plan={getPlanName(p)} /></td>
                        <td className="py-3 px-3"><StatusPill status={getStatus(p) as any} /></td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-[#18181B] whitespace-nowrap">{p.owner?.first_name} {p.owner?.last_name}</p>
                          <p className="text-xs text-zinc-400 truncate max-w-[140px]">{p.owner?.email}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold tabular-nums text-[#18181B]">{p.views_count || 0}</span>
                            {(p.visit_count_30d || 0) > 0 && (
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#FEF3E2', color: '#B45309' }}>
                                +{p.visit_count_30d}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                          {p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </td>
                        <td className="py-3 px-5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => toggleExpandPortfolio(p.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                              {expandedPortfolios.has(p.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button onClick={() => copyLink(p)}
                              disabled={!hasValidSlug(p) && !p.custom_domain}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-30">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => openPortfolioLink(p)}
                              disabled={!hasValidSlug(p) && !p.custom_domain}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-30">
                              <ExternalLink size={14} />
                            </button>
                            <button onClick={() => handleToggleVisibility(p)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                              title={isPublic(p) ? 'Rendre privé' : 'Publier'}>
                              {isPublic(p) ? <Lock size={14} /> : <Globe size={14} className="text-[#2E7D32]" />}
                            </button>
                            <button onClick={() => { setSelectedPortfolio(p); setDeleteDialogOpen(true); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row */}
                      {expandedPortfolios.has(p.id) && (
                        <tr key={`${p.id}-expanded`} className="bg-zinc-50/50 border-b border-[#E7E7EA]">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid sm:grid-cols-3 gap-4">
                              <div className="sm:col-span-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Description</p>
                                <p className="text-sm text-zinc-600 bg-white border border-[#E7E7EA] rounded-xl p-3 leading-relaxed">
                                  {p.bio || 'Aucune description.'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-white border border-[#E7E7EA] rounded-xl p-3">
                                    <p className="text-[9px] font-bold uppercase text-zinc-400 mb-0.5">ID</p>
                                    <p className="font-mono text-[11px] font-bold text-zinc-600">{p.id.substring(0, 10)}…</p>
                                  </div>
                                  <div className="bg-white border border-[#E7E7EA] rounded-xl p-3">
                                    <p className="text-[9px] font-bold uppercase text-zinc-400 mb-0.5">Vues tot.</p>
                                    <p className="text-sm font-bold text-[#18181B]">{p.views_count || 0}</p>
                                  </div>
                                </div>
                                {hasValidSlug(p) && (
                                  <button onClick={() => openPortfolioLink(p)}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl w-full transition-colors"
                                    style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                                    <ExternalLink size={13} />
                                    <span className="font-mono text-xs font-semibold truncate">/portfolio/{p.slug}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Details drawer (slide-in right) ─────────────────────────────────────── */}
      {detailsOpen && selectedPortfolio && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setDetailsOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

            {/* Drawer header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: ADMIN_GRAD }}>
              <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <button onClick={() => setDetailsOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
              <div className="relative px-6 pt-7 pb-6 flex items-center gap-4">
                <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {getTitle(selectedPortfolio)[0]?.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{getTitle(selectedPortfolio)}</h2>
                  <p className="text-white/70 text-sm truncate">{selectedPortfolio.owner?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PlanPill plan={getPlanName(selectedPortfolio)} />
                    <StatusPill status={getStatus(selectedPortfolio) as any} />
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[['Vues', selectedPortfolio.views_count || 0], ['30 jours', selectedPortfolio.visit_count_30d || 0], ['Créé', selectedPortfolio.created_at ? format(new Date(selectedPortfolio.created_at), 'dd/MM/yy') : '—']].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl border border-[#E7E7EA] p-3 text-center">
                    <p className="text-lg font-extrabold text-[#18181B] tabular-nums leading-none">{v}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">{l}</p>
                  </div>
                ))}
              </div>

              {/* Propriétaire */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Propriétaire</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={15} className="text-zinc-400 shrink-0" />
                    <span className="text-[#18181B]">{selectedPortfolio.owner?.first_name} {selectedPortfolio.owner?.last_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={15} className="text-zinc-400 shrink-0" />
                    <span className="text-[#18181B] break-all">{selectedPortfolio.owner?.email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">URL</p>
                {hasValidSlug(selectedPortfolio) || selectedPortfolio.custom_domain ? (
                  <div className="rounded-xl border border-[#E7E7EA] p-3 font-mono text-sm text-[#1B5E20] break-all"
                    style={{ background: '#E8F5E9' }}>
                    {selectedPortfolio.custom_domain
                      ? `https://${selectedPortfolio.custom_domain}`
                      : `${window.location.origin}/portfolio/${selectedPortfolio.slug}`}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#E7E7EA] p-3 flex items-center gap-2 text-sm"
                    style={{ background: '#FEF3E2', color: '#B45309' }}>
                    <AlertTriangle size={14} /> Aucun slug configuré
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedPortfolio.bio && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Description</p>
                  <p className="text-sm text-zinc-600 leading-relaxed">{selectedPortfolio.bio}</p>
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-[#E7E7EA] p-4 flex items-center gap-2 shrink-0">
              <button onClick={() => openPortfolioLink(selectedPortfolio)}
                disabled={!hasValidSlug(selectedPortfolio) && !selectedPortfolio.custom_domain}
                className="flex-1 h-10 rounded-lg border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors">
                <ExternalLink size={14} /> Voir
              </button>
              <button onClick={() => copyLink(selectedPortfolio)}
                disabled={!hasValidSlug(selectedPortfolio) && !selectedPortfolio.custom_domain}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-40"
                style={{ background: '#2E7D32' }}>
                <Copy size={14} /> Copier
              </button>
              <button onClick={() => { setDeleteDialogOpen(true); }}
                className="w-10 h-10 rounded-lg border border-[#E7E7EA] flex items-center justify-center text-zinc-400 hover:text-red-600 hover:border-red-200 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ───────────────────────────────────────────────────────── */}
      {deleteDialogOpen && selectedPortfolio && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setDeleteDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <span className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ background: '#FEECEC', color: '#C62828' }}>
              <Trash2 size={24} />
            </span>
            <h3 className="text-lg font-bold text-[#18181B]">Supprimer ce portfolio ?</h3>
            <p className="text-sm text-zinc-500 mt-2 mb-6">
              <span className="font-semibold text-[#18181B]">"{getTitle(selectedPortfolio)}"</span> sera définitivement supprimé. Cette action est irréversible.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 h-11 rounded-xl border border-[#E7E7EA] text-sm font-semibold text-[#18181B] hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(selectedPortfolio)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#C62828' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
