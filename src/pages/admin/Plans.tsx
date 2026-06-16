import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Package, CheckCircle2, Star, TrendingUp, Users,
  RefreshCw, Download, Eye, MoreVertical, Sparkles, Target, BarChart3,
  AlertCircle, X, ArrowUpRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
  position: number;
  features?: string[];
  created_at: string;
  updated_at: string;
  subscribers_count?: number;
  monthly_revenue?: number;
  billing_interval?: string;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

// ─── Tiny toggle (replaces shadcn Switch) ─────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? '#2E7D32' : '#D4D4D8' }}>
      <span className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '24px' : '4px' }} />
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminPlans() {
  const { toast } = useToast();
  const navigate  = useNavigate();

  // ── Core state ────────────────────────────────────────────────────────────────
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan]   = useState<Plan | null>(null);
  const [filter, setFilter]               = useState('all');
  const [sortBy, setSortBy]               = useState('position');
  const [statsPeriod, setStatsPeriod]     = useState('month');
  const [detailedStats, setDetailedStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats]   = useState(false);
  const [viewMode, setViewMode]           = useState<'grid' | 'list' | 'stats'>('grid');
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────────
  const [name, setName]           = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]         = useState('');
  const [currency, setCurrency]   = useState('F CFA');
  const [isActive, setIsActive]   = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [position, setPosition]   = useState('0');
  const [features, setFeatures]   = useState<string[]>(['']);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  // FCFA/XOF est une devise zero-decimal : price_cents stocke déjà des F CFA, pas de division
  const formatPrice = (plan: Plan) => `${plan.price_cents.toLocaleString('fr-FR')} F CFA`;

  // ── Load ──────────────────────────────────────────────────────────────────────
  async function loadPlans() {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/admin/plans`, { headers });
      if (res.status === 401) { navigate('/admin/sama_connection_page'); return; }
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      toast({ title: 'Erreur de chargement', description: 'Impossible de récupérer les formules', variant: 'destructive', duration: 3000 });
    } finally { setLoading(false); setRefreshing(false); }
  }

  async function loadDetailedStats(period: string) {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/admin/stats/plans-detailed?period=${period}`, { headers });
      if (!res.ok) { const e = await res.json().catch(() => ({})); console.error('Analytics fetch error:', res.status, e); throw new Error(); }
      const data = await res.json();
      setDetailedStats(data.stats || []);
    } catch { console.error('loadDetailedStats failed'); }
    finally { setLoadingStats(false); }
  }

  useEffect(() => { loadPlans(); }, []);
  useEffect(() => { if (detailedStats.length === 0 || refreshing) loadDetailedStats(statsPeriod); }, [statsPeriod, refreshing]);

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const resetForm = () => { setName(''); setDescription(''); setPrice(''); setCurrency('F CFA'); setIsActive(true); setIsPopular(false); setPosition('0'); setFeatures(['']); };

  const openCreateDialog = () => { setSelectedPlan(null); resetForm(); setDialogOpen(true); };

  const openEditDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setPrice(plan.price_cents.toString());
    setCurrency('F CFA');
    setIsActive(plan.is_active);
    setIsPopular(plan.is_popular || false);
    setPosition(plan.position?.toString() || '0');
    setFeatures(plan.features?.length ? plan.features : ['']);
    setDialogOpen(true);
  };

  const addFeatureField    = () => setFeatures([...features, '']);
  const removeFeatureField = (i: number) => { const n = features.filter((_, j) => j !== i); setFeatures(n.length ? n : ['']); };
  const updateFeature      = (i: number, v: string) => { const n = [...features]; n[i] = v; setFeatures(n); };

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const handleSavePlan = async () => {
    const token = localStorage.getItem('token');
    if (!token) { toast({ title: 'Authentification requise', variant: 'destructive' }); navigate('/auth'); return; }
    if (!name || !price) { toast({ title: 'Champs requis', description: 'Nom et prix obligatoires', variant: 'destructive' }); return; }

    const payload: any = {
      name, description,
      price_cents: Math.round(parseFloat(price)), // valeur directe en F CFA (zero-decimal)
      currency: 'XOF',
      is_active: isActive, is_popular: isPopular,
      position: parseInt(position) || 0,
    };
    const filteredFeatures = features.filter(f => f.trim() !== '');
    if (filteredFeatures.length > 0) payload.features = filteredFeatures;

    try {
      const url = selectedPlan ? `${API_BASE}/api/admin/plans/${selectedPlan.id}` : `${API_BASE}/api/admin/plans`;
      const res = await fetch(url, { method: selectedPlan ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); if (res.status === 401) navigate('/auth'); throw new Error(data?.error || 'Erreur serveur'); }
      toast({ title: '✅ Succès', description: selectedPlan ? 'Formule mise à jour' : 'Formule créée' });
      setDialogOpen(false); loadPlans();
    } catch (err: any) { toast({ title: 'Erreur', description: err.message || 'Impossible d\'enregistrer', variant: 'destructive' }); }
  };

  const handleDeletePlan = async (plan: Plan) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/auth');
    try {
      const res = await fetch(`${API_BASE}/api/admin/plans/${plan.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur suppression');
      toast({ title: '✅ Supprimée', description: 'Formule supprimée avec succès' });
      setDeleteDialogOpen(false); setSelectedPlan(null); loadPlans();
    } catch { toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' }); }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/plans/${plan.id}/toggle`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast({ title: plan.is_active ? '✅ Désactivée' : '✅ Activée', description: plan.is_active ? 'La formule a été désactivée' : 'La formule a été activée' });
      loadPlans();
    } catch { toast({ title: 'Erreur', description: 'Impossible de modifier le statut', variant: 'destructive' }); }
  };

  const exportPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/plans/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `plans-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
      toast({ title: 'Export réussi', description: 'Liste des plans téléchargée' });
    } catch { toast({ title: 'Erreur d\'export', description: 'Impossible d\'exporter', variant: 'destructive' }); }
  };

  // ── Filtered + sorted ─────────────────────────────────────────────────────────
  const filteredAndSortedPlans = useMemo(() => {
    let list = [...plans];
    if (filter === 'active')   list = list.filter(p => p.is_active);
    if (filter === 'inactive') list = list.filter(p => !p.is_active);
    if (filter === 'popular')  list = list.filter(p => p.is_popular);
    list.sort((a, b) => {
      if (sortBy === 'position')    return a.position - b.position;
      if (sortBy === 'price_asc')   return a.price_cents - b.price_cents;
      if (sortBy === 'price_desc')  return b.price_cents - a.price_cents;
      if (sortBy === 'name')        return a.name.localeCompare(b.name);
      if (sortBy === 'subscribers') return (b.subscribers_count || 0) - (a.subscribers_count || 0);
      return a.position - b.position;
    });
    return list;
  }, [plans, filter, sortBy]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => p.is_active).length;
    const popular = plans.filter(p => p.is_popular).length;
    const totalRevenue = plans.reduce((s, p) => s + (p.monthly_revenue || 0), 0);
    const totalSubscribers = plans.reduce((s, p) => s + (p.subscribers_count || 0), 0);
    return { total, active, popular, totalRevenue, totalSubscribers, formattedRevenue: totalRevenue.toLocaleString('fr-FR') };
  }, [plans]);

  const VIEW_TABS = [['grid', 'Grille'], ['list', 'Liste'], ['stats', 'Analyse']] as const;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}
      onClick={() => setOpenMenuId(null)}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <Package size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Formules & Tarifs</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {stats.active} actives · {stats.totalSubscribers} abonnés · {stats.formattedRevenue} F MRR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportPlans}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <Download size={15} /> Exporter
            </button>
            <button onClick={openCreateDialog}
              className="h-10 px-4 rounded-lg bg-white text-[#1B5E20] text-sm font-bold flex items-center gap-1.5 hover:bg-white/90 transition-colors">
              <Plus size={15} /> Nouvelle formule
            </button>
            <button onClick={loadPlans}
              className="h-10 w-10 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-7">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total formules',  value: stats.total,            icon: Package,      c: '#1565C0', bg: '#E8F1FD' },
            { label: 'Actives',         value: stats.active,           icon: CheckCircle2, c: '#2E7D32', bg: '#EAF5EB' },
            { label: 'Abonnés actifs',  value: stats.totalSubscribers, icon: Users,        c: '#6D28D9', bg: '#EDE9FE' },
            { label: 'MRR estimé',      value: `${stats.formattedRevenue} F`, icon: TrendingUp, c: '#B45309', bg: '#FEF3E2' },
          ].map(({ label, value, icon: Icon, c, bg }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#18181B] leading-none tabular-nums truncate">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
        <div className="bg-white p-3 flex flex-wrap items-center gap-2" style={CARD_STYLE}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
            <option value="all">Toutes les formules</option>
            <option value="active">Actives uniquement</option>
            <option value="inactive">Inactives uniquement</option>
            <option value="popular">Populaires</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
            <option value="position">Position d'affichage</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="name">Nom alphabétique</option>
            <option value="subscribers">Abonnés</option>
          </select>
          <div className="ml-auto flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            {VIEW_TABS.map(([k, label]) => (
              <button key={k} onClick={() => setViewMode(k as any)}
                className={`px-3 h-7 rounded-md text-xs font-semibold transition-colors ${viewMode === k ? 'bg-white text-[#18181B] shadow-sm' : 'text-zinc-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid view ─────────────────────────────────────────────────────────── */}
        {viewMode === 'grid' && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white h-64 animate-pulse" style={CARD_STYLE} />
              ))}
            </div>
          ) : filteredAndSortedPlans.length === 0 ? (
            <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <Package size={24} />
              </span>
              <h3 className="font-bold text-[#18181B]">Aucune formule</h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-xs">Ajustez vos filtres ou créez une nouvelle formule.</p>
              <button onClick={() => setFilter('all')}
                className="mt-4 h-9 px-4 rounded-lg border border-[#E7E7EA] text-sm text-[#18181B] hover:bg-zinc-50 transition-colors">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPlans.map(plan => (
                <div key={plan.id} className={`bg-white flex flex-col relative overflow-hidden ${!plan.is_active ? 'opacity-60' : ''}`} style={CARD_STYLE}>
                  {/* Top accent bar */}
                  <div className="h-1.5 w-full shrink-0"
                    style={{ background: plan.is_popular ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : ADMIN_GRAD }} />

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {plan.is_popular && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{ background: '#FEF3E2', color: '#B45309' }}>
                              <Sparkles size={10} /> Populaire
                            </span>
                          )}
                          {!plan.is_active && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{ background: '#F4F4F5', color: '#52525B' }}>
                              <Eye size={10} /> Masqué
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-[#18181B] text-base">{plan.name}</h3>
                        <p className="text-2xl font-extrabold tabular-nums text-[#18181B] mt-1">
                          {formatPrice(plan)}
                        </p>
                        <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wide mt-0.5">
                          {plan.billing_interval === 'monthly' ? 'Par mois' : plan.billing_interval === 'yearly' ? 'Par an' : 'Paiement unique'}
                        </p>
                      </div>

                      {/* Actions menu */}
                      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 transition-colors">
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === plan.id && (
                          <div className="absolute right-0 top-9 w-44 bg-white rounded-xl border border-[#E7E7EA] z-20 py-1 shadow-lg">
                            <button onClick={() => { openEditDialog(plan); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#18181B] hover:bg-zinc-50">
                              <Edit2 size={13} className="text-zinc-400" /> Modifier
                            </button>
                            <button onClick={() => { handleToggleActive(plan); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#18181B] hover:bg-zinc-50">
                              {plan.is_active ? <Eye size={13} className="text-zinc-400" /> : <CheckCircle2 size={13} className="text-zinc-400" />}
                              {plan.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                            <div className="border-t border-[#E7E7EA] my-1" />
                            <button onClick={() => { setSelectedPlan(plan); setDeleteDialogOpen(true); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50"
                              style={{ color: '#C62828' }}>
                              <Trash2 size={13} /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{plan.description}</p>
                    )}

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 5).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[#18181B]/80">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                              <CheckCircle2 size={10} />
                            </span>
                            {f}
                          </li>
                        ))}
                        {(plan.features.length) > 5 && (
                          <li className="text-xs font-semibold ml-6" style={{ color: '#2E7D32' }}>
                            +{plan.features.length - 5} autres
                          </li>
                        )}
                      </ul>
                    )}

                    {/* Footer stats */}
                    <div className="mt-auto pt-4 border-t border-[#E7E7EA] grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-0.5">Abonnés</p>
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-zinc-400" />
                          <span className="text-sm font-bold text-[#18181B]">{plan.subscribers_count || 0}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-0.5">Revenue</p>
                        <span className="text-sm font-bold tabular-nums" style={{ color: '#2E7D32' }}>
                          {(plan.monthly_revenue || 0).toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick edit footer */}
                  <button onClick={() => openEditDialog(plan)}
                    className="w-full h-10 border-t border-[#E7E7EA] text-xs font-semibold text-zinc-500 hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors">
                    <Edit2 size={12} /> Modifier la formule
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── List view ─────────────────────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredAndSortedPlans.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={32} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-400">Aucune formule</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">Formule</th>
                    <th className="py-3 px-3">Prix</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3 text-center">Abonnés</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                    <th className="py-3 px-3 text-center">Pos.</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPlans.map(plan => (
                    <tr key={plan.id} className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: plan.is_popular ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : ADMIN_GRAD, color: '#fff' }}>
                            <Package size={15} />
                          </span>
                          <div>
                            <p className="font-semibold text-[#18181B]">{plan.name}</p>
                            {plan.is_popular && <p className="text-[10px] font-bold uppercase" style={{ color: '#B45309' }}>Populaire</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold tabular-nums text-[#18181B] whitespace-nowrap">{formatPrice(plan)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${plan.is_active ? '' : ''}`}
                          style={plan.is_active ? { background: '#EAF5EB', color: '#2E7D32' } : { background: '#F4F4F5', color: '#52525B' }}>
                          <span className="w-1.5 h-1.5 rounded-full"
                            style={{ background: plan.is_active ? '#2E7D32' : '#52525B' }} />
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#18181B]">{plan.subscribers_count || 0}</td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums" style={{ color: '#2E7D32' }}>
                        {(plan.monthly_revenue || 0).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-400 font-mono text-xs">{plan.position}</td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditDialog(plan)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleToggleActive(plan)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 transition-colors"
                            title={plan.is_active ? 'Désactiver' : 'Activer'}>
                            {plan.is_active ? <Eye size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                          <button onClick={() => { setSelectedPlan(plan); setDeleteDialogOpen(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ color: '#C62828' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Stats view ─────────────────────────────────────────────────────────── */}
        {viewMode === 'stats' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: '#2E7D32' }} />
                <h2 className="text-sm font-bold text-[#18181B]">Analyse de performance</h2>
              </div>
              <select value={statsPeriod} onChange={e => setStatsPeriod(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-white text-xs text-[#18181B] outline-none">
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
                <option value="semester">Ce semestre</option>
                <option value="year">Cette année</option>
              </select>
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => <div key={i} className="bg-white h-60 animate-pulse" style={CARD_STYLE} />)}
              </div>
            ) : detailedStats.length === 0 ? (
              <div className="bg-white flex flex-col items-center justify-center py-16 text-center" style={CARD_STYLE}>
                <BarChart3 size={32} className="text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-400">Aucune donnée pour cette période</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {detailedStats.map((item: any) => (
                  <div key={item.id} className="bg-white overflow-hidden" style={CARD_STYLE}>
                    <div className="h-1" style={{ background: ADMIN_GRAD }} />
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-[#18181B]">{item.name}</h3>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">{item.slug}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: '#2E7D32' }}>{item.active_subscribers} abonnés</p>
                          <p className="text-[10px] text-zinc-400 uppercase font-bold">Actuels</p>
                        </div>
                      </div>

                      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#E8F5E9' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2E7D32', color: '#fff' }}>
                            <TrendingUp size={14} />
                          </span>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-zinc-500">Revenu</p>
                            <p className="text-lg font-extrabold tabular-nums text-[#18181B]">{item.revenue.toLocaleString('fr-FR')} F</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#2E7D32' }}>
                          <ArrowUpRight size={14} />
                          {(item.revenue / (item.active_subscribers || 1) * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3 bg-zinc-50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Users size={12} className="text-[#6D28D9]" />
                            <p className="text-[10px] font-bold uppercase text-zinc-400">Nouveaux</p>
                          </div>
                          <p className="text-xl font-extrabold text-[#18181B]">+{item.new_subscribers}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Sur la période</p>
                        </div>
                        <div className="rounded-xl p-3 bg-zinc-50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Target size={12} className="text-[#B45309]" />
                            <p className="text-[10px] font-bold uppercase text-zinc-400">ARPU</p>
                          </div>
                          <p className="text-xl font-extrabold text-[#18181B]">
                            {item.new_subscribers > 0 ? Math.round(item.revenue / item.new_subscribers).toLocaleString('fr-FR') : 0}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Moy. / nouveau</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-400 uppercase tracking-widest">Conversion</span>
                          <span style={{ color: '#2E7D32' }}>
                            {item.active_subscribers > 0 ? ((item.new_subscribers / item.active_subscribers) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, (item.new_subscribers / (item.active_subscribers || 1)) * 100)}%`, background: '#2E7D32' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          onClick={() => setDialogOpen(false)}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: ADMIN_GRAD }}>
              <div className="absolute inset-0 opacity-[0.12]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <button onClick={() => setDialogOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
                <X size={16} />
              </button>
              <div className="relative px-6 py-6 flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Package size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedPlan ? 'Modifier la formule' : 'Nouvelle formule'}</h2>
                  <p className="text-white/65 text-sm mt-0.5">Créez une offre pour vos utilisateurs.</p>
                </div>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Nom de la formule</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Starter NFC"
                    className="w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Position d'affichage</label>
                  <input type="number" value={position} onChange={e => setPosition(e.target.value)} placeholder="0"
                    className="w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Décrivez les avantages exclusifs…"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32] resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Tarif (F CFA)</label>
                  <div className="relative">
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="3000"
                      className="w-full h-10 pl-3 pr-16 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm font-bold text-[#18181B] outline-none focus:border-[#2E7D32]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">F CFA</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Périodicité</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]">
                    <option value="F CFA">Paiement unique</option>
                    <option value="par mois">Par mois</option>
                    <option value="par an">Par an</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-[#E7E7EA] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isActive ? '#EAF5EB' : '#F4F4F5', color: isActive ? '#2E7D32' : '#52525B' }}>
                      <CheckCircle2 size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#18181B]">Statut de visibilité</p>
                      <p className="text-xs text-zinc-400">Rendre la formule publique immédiatement</p>
                    </div>
                  </div>
                  <Toggle checked={isActive} onChange={setIsActive} />
                </div>
                <div className="border-t border-[#E7E7EA]" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isPopular ? '#FEF3E2' : '#F4F4F5', color: isPopular ? '#B45309' : '#52525B' }}>
                      <Star size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#18181B]">Badge Populaire</p>
                      <p className="text-xs text-zinc-400">Mettre en avant avec un badge spécial</p>
                    </div>
                  </div>
                  <Toggle checked={isPopular} onChange={setIsPopular} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Fonctionnalités incluses</label>
                  <button type="button" onClick={addFeatureField}
                    className="h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-zinc-100 transition-colors"
                    style={{ color: '#2E7D32' }}>
                    <Plus size={12} /> Ajouter
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={feat} onChange={e => updateFeature(i, e.target.value)} placeholder="ex: Design sur mesure"
                        className="flex-1 h-9 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                      {features.length > 1 && (
                        <button type="button" onClick={() => removeFeatureField(i)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-[#C62828] hover:bg-red-50 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#E7E7EA] flex items-center justify-between shrink-0">
              <button onClick={() => setDialogOpen(false)}
                className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSavePlan} disabled={refreshing}
                className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white transition-colors"
                style={{ background: '#2E7D32' }}>
                {selectedPlan ? 'Mettre à jour' : 'Créer la formule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────────── */}
      {deleteDialogOpen && selectedPlan && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          onClick={() => setDeleteDialogOpen(false)}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEECEC', color: '#C62828' }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#18181B]">Supprimer cette formule ?</h3>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                La formule <span className="font-semibold text-[#18181B]">"{selectedPlan.name}"</span> sera supprimée définitivement.
              </p>
            </div>

            {(selectedPlan.subscribers_count || 0) > 0 && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FEF3E2' }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#B45309' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                  <strong>Attention :</strong> {selectedPlan.subscribers_count} utilisateur(s) sont abonnés à cette formule. Sa suppression pourrait causer des erreurs de facturation.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 h-10 rounded-[10px] border border-[#E7E7EA] text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDeletePlan(selectedPlan)}
                className="flex-1 h-10 rounded-[10px] text-sm font-bold text-white transition-colors"
                style={{ background: '#C62828' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
