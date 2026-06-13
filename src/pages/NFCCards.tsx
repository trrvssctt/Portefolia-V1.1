import { usePlan } from '@/contexts/PlanContext';
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const envBase = import.meta.env.VITE_API_BASE;
const API_BASE = envBase || (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://backennfc.onrender.com');
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from '@/utils/authUtils';
import {
  Plus,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Package,
  Search,
  Wifi,
  Zap,
  ShoppingCart,
  X,
  Trash2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── helpers ─────────────────────────────────────────────── */
const statusConfig = {
  active:   { label: 'Active',      icon: CheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive',    icon: XCircle,     bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  pending:  { label: 'En attente',  icon: Clock,       bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
};

function getCardStatus(card: any) {
  if (card.is_active)         return 'active';
  if (card.activated_at)      return 'inactive';
  return 'pending';
}

/* ─── NFC card visual ──────────────────────────────────────── */
function NFCCardVisual({ card, onActivate, onDeactivate, onViewPortfolio }: {
  card: any;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onViewPortfolio: (slug: string) => void;
}) {
  const status = getCardStatus(card);
  const cfg    = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Accent bar top */}
      <div className={`h-1 w-full ${status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-green-500' : status === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-gray-300 to-gray-400'}`} />

      <div className="p-5">
        {/* Card visual + info */}
        <div className="flex items-start gap-4">
          {/* Mini NFC card illustration */}
          <div className={`relative flex-shrink-0 w-16 h-10 rounded-lg flex items-center justify-center shadow-md ${status === 'active' ? 'bg-gradient-to-br from-[#28A745] to-emerald-700' : status === 'pending' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
            <Wifi size={14} className="text-white opacity-90" />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/30" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {card.portfolios?.title || 'Portfolio'}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

            <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
              UID: {card.card_uid || '—'}
            </p>

            <div className="flex flex-wrap gap-x-3 mt-2">
              {card.ordered_at && (
                <span className="text-xs text-gray-400">
                  Commandée le {new Date(card.ordered_at).toLocaleDateString('fr-FR')}
                </span>
              )}
              {card.activated_at && (
                <span className="text-xs text-gray-400">
                  Activée le {new Date(card.activated_at).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          {card.portfolios?.slug && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewPortfolio(card.portfolios.slug)}
              className="flex-1 text-xs h-8 gap-1.5"
            >
              <Eye size={13} />
              Voir portfolio
            </Button>
          )}

          {!card.activated_at ? (
            <Button
              size="sm"
              onClick={() => onActivate(card.id)}
              className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <Zap size={13} />
              Activer
            </Button>
          ) : card.is_active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeactivate(card.id)}
              className="flex-1 text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
            >
              <XCircle size={13} />
              Désactiver
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onActivate(card.id)}
              className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <CheckCircle size={13} />
              Réactiver
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────── */
const NFCCards = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { isFreePlan: ctxFree } = usePlan();
  const [isFreePlan, setIsFreePlan]     = useState(false);
  const [nfcCards, setNfcCards]         = useState<any[]>([]);
  const [portfolios, setPortfolios]     = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);

  type LocalOrderItem = { portfolio_id: string; quantity: number };
  const [orderItems, setOrderItems]     = useState<LocalOrderItem[]>([]);
  const [pendingItem, setPendingItem]   = useState<LocalOrderItem>({ portfolio_id: '', quantity: 1 });
  const [submitting, setSubmitting]     = useState(false);

  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [sortBy, setSortBy]             = useState<'newest' | 'oldest' | 'status' | 'portfolio'>('newest');

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      navigate('/auth');
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) {
      (async () => {
        setIsFreePlan(!!ctxFree);
        if (ctxFree) { setLoading(false); return; }
        await loadData();
      })();
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const pRes  = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pRes.ok) throw new Error('Failed to load portfolios');
      const pJson = await pRes.json();
      const normalizedPortfolios = (pJson.portfolios || []).map((p: any) => ({
        ...p, title: p.title || p.titre || '', slug: p.slug || p.url_slug || '',
      }));
      setPortfolios(normalizedPortfolios);

      const ordersRes  = await fetch(`${API_BASE}/api/commandes`, { headers: { Authorization: `Bearer ${token}` } });
      if (!ordersRes.ok) throw new Error('Failed to load commandes');
      const ordersJson = await ordersRes.json();
      const orders     = ordersJson.orders || [];

      const ordersWithCards = await Promise.all(orders.map(async (order: any) => {
        const r = await fetch(`${API_BASE}/api/commandes/${order.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return { order, cards: [] };
        const j = await r.json();
        return { order: j.order, cards: j.cards || [] };
      }));

      const allCards: any[] = [];
      for (const oc of ordersWithCards) {
        const ord   = oc.order || {};
        for (const card of (oc.cards || [])) {
          const portfolioSlug = card.lien_portfolio || card.lienPortfolio || card.portfolio_slug || '';
          const matching      = normalizedPortfolios.find((p: any) => (p.slug || '') === portfolioSlug);
          allCards.push({
            ...card,
            order_id:   ord.id,
            ordered_at: ord.date_commande || ord.created_at || ord.ordered_at,
            statut:     ord.statut || ord.status || 'pending',
            portfolios: { title: matching ? (matching.title || matching.titre) : (portfolioSlug || 'Portfolio'), slug: portfolioSlug },
          });
        }
      }
      setNfcCards(allCards);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCards = useMemo(() => {
    let filtered = [...nfcCards];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(c => (c.portfolios?.title || '').toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => getCardStatus(c) === statusFilter);
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':    return new Date(b.ordered_at || 0).getTime() - new Date(a.ordered_at || 0).getTime();
        case 'oldest':    return new Date(a.ordered_at || 0).getTime() - new Date(b.ordered_at || 0).getTime();
        case 'status':    return getCardStatus(a).localeCompare(getCardStatus(b));
        case 'portfolio': return (a.portfolios?.title || '').localeCompare(b.portfolios?.title || '');
        default:          return 0;
      }
    });
    return filtered;
  }, [nfcCards, searchTerm, statusFilter, sortBy]);

  const handleOrderCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsPayload = orderItems.length > 0 ? orderItems : (pendingItem.portfolio_id ? [pendingItem] : []);
    if (itemsPayload.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE}/api/commandes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ items: itemsPayload.map(it => ({ portfolio_id: Number(it.portfolio_id), quantity: Number(it.quantity) })) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la commande');
      toast({ title: 'Commande effectuée !', description: `Commande ${json.order?.numero_commande || json.order?.id || ''} créée avec succès.` });
      setShowOrderForm(false);
      setOrderItems([]);
      setPendingItem({ portfolio_id: '', quantity: 1 });
      await loadData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de passer la commande", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const activateCard = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE}/api/cartes/${cardId}/activate`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast({ title: "Carte activée", description: "Votre carte NFC est maintenant active." });
      loadData();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'activer la carte", variant: "destructive" });
    }
  };

  const deactivateCard = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE}/api/cartes/${cardId}/deactivate`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      toast({ title: "Carte désactivée", description: "Votre carte NFC est maintenant inactive." });
      loadData();
    } catch {
      toast({ title: "Erreur", description: "Impossible de désactiver la carte", variant: "destructive" });
    }
  };

  /* ── stats ── */
  const activeCount  = nfcCards.filter(c => c.is_active).length;
  const pendingCount = nfcCards.filter(c => !c.is_active && !c.activated_at).length;
  const totalEstimated = (orderItems.reduce((s, it) => s + it.quantity * 30000, 0)
    + (orderItems.length === 0 && pendingItem.portfolio_id ? pendingItem.quantity * 30000 : 0));

  /* ── loading ── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#28A745] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Chargement de vos cartes NFC…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Upgrade prompt (free plan) ── */}
        {isFreePlan && (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
            <div className="h-1 bg-gradient-to-r from-[#28A745] to-emerald-400" />
            <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-7 h-7 text-[#28A745]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Cartes NFC indisponibles</h2>
                <p className="text-sm text-gray-500 mt-1">Passez à une formule payante pour commander vos cartes NFC et partager votre portfolio professionnellement.</p>
              </div>
              <Button onClick={() => navigate('/upgrade')} className="bg-[#28A745] hover:bg-green-600 shrink-0">
                Voir les formules <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {!isFreePlan && (
          <>
            {/* ── Page header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-5 h-5 text-[#28A745]" />
                  <h1 className="text-2xl font-bold text-gray-900">Mes Cartes NFC</h1>
                </div>
                <p className="text-sm text-gray-500">Partagez votre portfolio d'un simple geste.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/nfc-types')}
                  className="text-sm h-9"
                >
                  Types de cartes
                </Button>
                <Button
                  onClick={() => setShowOrderForm(true)}
                  disabled={portfolios.length === 0}
                  className="bg-[#28A745] hover:bg-green-600 text-sm h-9 gap-1.5"
                >
                  <Plus size={15} />
                  Commander
                </Button>
              </div>
            </div>

            {/* ── No portfolio warning ── */}
            {portfolios.length === 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900 text-sm">Aucun portfolio disponible</p>
                  <p className="text-xs text-amber-700 mt-0.5">Créez d'abord un portfolio pour pouvoir commander une carte NFC.</p>
                </div>
                <Button size="sm" onClick={() => navigate('/dashboard/portfolios')} className="bg-amber-600 hover:bg-amber-700 shrink-0 text-xs">
                  Créer un portfolio
                </Button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total cartes',   value: nfcCards.length,  icon: CreditCard,   from: 'from-blue-500',    to: 'to-blue-600'    },
                { label: 'Actives',        value: activeCount,      icon: CheckCircle,  from: 'from-emerald-500', to: 'to-green-600'   },
                { label: 'En attente',     value: pendingCount,     icon: Clock,        from: 'from-amber-500',   to: 'to-orange-500'  },
                { label: 'Prix unitaire',  value: '30 000 F',       icon: Sparkles,     from: 'from-violet-500',  to: 'to-purple-600'  },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.from} ${stat.to} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Filter bar ── */}
            {nfcCards.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par portfolio…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="active">Actives</SelectItem>
                      <SelectItem value="inactive">Inactives</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Plus récent</SelectItem>
                      <SelectItem value="oldest">Plus ancien</SelectItem>
                      <SelectItem value="status">Statut</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── Cards grid ── */}
            {nfcCards.length === 0 ? (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#28A745] to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-200">
                  <CreditCard className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune carte NFC</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                  Commandez votre première carte NFC et partagez votre portfolio d'un simple geste.
                </p>
                {portfolios.length > 0 && (
                  <Button onClick={() => setShowOrderForm(true)} className="bg-[#28A745] hover:bg-green-600 gap-2">
                    <Plus size={16} />
                    Commander ma première carte
                  </Button>
                )}
              </div>
            ) : filteredAndSortedCards.length === 0 ? (
              /* No results */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Aucun résultat</h3>
                <p className="text-sm text-gray-500 mb-5">Aucune carte ne correspond à vos filtres.</p>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedCards.map((card) => (
                  <NFCCardVisual
                    key={card.id}
                    card={card}
                    onActivate={activateCard}
                    onDeactivate={deactivateCard}
                    onViewPortfolio={(slug) => window.open(`/portfolio/${slug}`, '_blank')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order modal ── */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#28A745]/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-[#28A745]" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Commander une carte NFC</h2>
                  <p className="text-xs text-gray-400">30 000 F CFA / carte</p>
                </div>
              </div>
              <button
                onClick={() => { setShowOrderForm(false); setOrderItems([]); setPendingItem({ portfolio_id: '', quantity: 1 }); }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleOrderCard} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Items list */}
                {orderItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Articles ajoutés</p>
                    {orderItems.map((it, idx) => {
                      const p = portfolios.find(pf => String(pf.id) === String(it.portfolio_id));
                      return (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-[#28A745]/10 flex items-center justify-center">
                              <CreditCard size={12} className="text-[#28A745]" />
                            </div>
                            <span className="text-sm text-gray-800">{p ? p.title : `Portfolio ${it.portfolio_id}`}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600">{it.quantity} carte{it.quantity > 1 ? 's' : ''}</span>
                            <button
                              type="button"
                              onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add item */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ajouter un article</p>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Portfolio</Label>
                    <select
                      value={pendingItem.portfolio_id}
                      onChange={(e) => setPendingItem(prev => ({ ...prev, portfolio_id: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#28A745]/30 focus:border-[#28A745]"
                    >
                      <option value="">Sélectionnez un portfolio</option>
                      {portfolios.map((portfolio) => (
                        <option key={portfolio.id} value={portfolio.id}>{portfolio.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Quantité</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pendingItem.quantity}
                      onChange={(e) => setPendingItem(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="h-9 text-sm rounded-xl"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-sm h-9 gap-2 border-dashed"
                    disabled={!pendingItem.portfolio_id}
                    onClick={() => {
                      if (!pendingItem.portfolio_id) return;
                      setOrderItems(prev => [...prev, pendingItem]);
                      setPendingItem({ portfolio_id: '', quantity: 1 });
                    }}
                  >
                    <Plus size={14} />
                    Ajouter à la commande
                  </Button>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total estimé</span>
                  <span className="font-bold text-[#28A745] text-base">{totalEstimated.toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 text-sm"
                    onClick={() => { setShowOrderForm(false); setOrderItems([]); setPendingItem({ portfolio_id: '', quantity: 1 }); }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || (orderItems.length === 0 && !pendingItem.portfolio_id)}
                    className="flex-1 h-10 text-sm bg-[#28A745] hover:bg-green-600 gap-2"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi…</>
                    ) : (
                      <><ShoppingCart size={15} /> Confirmer la commande</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFCCards;
