import { usePlan } from '@/contexts/PlanContext';
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const envBase = import.meta.env.VITE_API_BASE;
const API_BASE = envBase || (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://backennfc.onrender.com');
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from '@/utils/authUtils';
import {
  Plus, CreditCard, CheckCircle, Clock, XCircle, Eye, Package,
  Search, Wifi, Zap, ShoppingCart, X, Trash2, ChevronDown, Scan,
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useAuth } from "@/hooks/useAuth";

/* ─── helpers ─────────────────────────────────────────────── */
const NFC_STATUS = {
  active:   { label: 'Active',     tint: '#E8F5E9', color: '#1B5E20', dot: '#2E7D32' },
  pending:  { label: 'En attente', tint: '#FEF3E2', color: '#B45309', dot: '#F59E0B' },
  inactive: { label: 'Inactive',   tint: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

function getCardStatus(card: any): 'active' | 'pending' | 'inactive' {
  if (card.is_active)    return 'active';
  if (card.activated_at) return 'inactive';
  return 'pending';
}

/* ─── NFCStat ──────────────────────────────────────────────── */
function NFCStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] p-4 flex items-center gap-3.5">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-[#18181B]/60">
        {icon}
      </span>
      <div>
        <p className="text-xl font-semibold text-[#18181B] leading-none tabular-nums">{value}</p>
        <p className="text-xs text-[#71717A] mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ─── NFCCardItem ──────────────────────────────────────────── */
function NFCCardItem({ card, onActivate, onDeactivate, onViewPortfolio }: {
  card: any;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onViewPortfolio: (slug: string) => void;
}) {
  const status = getCardStatus(card);
  const s = NFC_STATUS[status];
  const isActive = status === 'active';

  const cardBg = isActive
    ? 'linear-gradient(140deg, #2E7D32, #1B5E20)'
    : status === 'pending'
    ? 'linear-gradient(140deg, #F59E0B, #D97706)'
    : 'linear-gradient(140deg, #A1A1AA, #71717A)';

  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] overflow-hidden flex flex-col hover:shadow-[0_10px_36px_rgba(16,24,40,0.08)] transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Mini NFC card */}
          <div className="relative w-16 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: cardBg }}>
            <Wifi size={14} className="text-white/90 rotate-90" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[#18181B] text-sm leading-tight line-clamp-1">
                {card.portfolios?.title || 'Portfolio'}
              </h3>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                style={{ background: s.tint, color: s.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                {s.label}
              </span>
            </div>
            <p className="text-xs font-mono text-[#71717A]/80 mt-1">UID : {card.card_uid || '—'}</p>
            <div className="flex flex-wrap gap-x-3 mt-2 text-xs text-[#71717A]">
              {card.ordered_at && (
                <span>Commandée le {new Date(card.ordered_at).toLocaleDateString('fr-FR')}</span>
              )}
              {card.activated_at && (
                <span>· Activée le {new Date(card.activated_at).toLocaleDateString('fr-FR')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E7E7EA]">
          {card.portfolios?.slug && (
            <button
              onClick={() => onViewPortfolio(card.portfolios.slug)}
              className="flex-1 h-9 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={14} /> Voir portfolio
            </button>
          )}
          {isActive ? (
            <button
              onClick={() => onDeactivate(card.id)}
              className="flex-1 h-9 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle size={13} /> Désactiver
            </button>
          ) : (
            <button
              onClick={() => onActivate(card.id)}
              className="flex-1 h-9 rounded-[10px] text-sm font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
              style={{ background: '#2E7D32' }}
            >
              <Zap size={14} /> {card.activated_at ? 'Réactiver' : 'Activer'}
            </button>
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
  const [isFreePlan, setIsFreePlan]       = useState(false);
  const [nfcCards, setNfcCards]           = useState<any[]>([]);
  const [portfolios, setPortfolios]       = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);

  type LocalOrderItem = { portfolio_id: string; quantity: number };
  const [orderItems, setOrderItems]     = useState<LocalOrderItem[]>([]);
  const [pendingItem, setPendingItem]   = useState<LocalOrderItem>({ portfolio_id: '', quantity: 1 });
  const [submitting, setSubmitting]     = useState(false);

  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [sortBy, setSortBy]             = useState<'newest' | 'oldest' | 'status' | 'portfolio'>('newest');

  const navigate   = useNavigate();
  const { toast }  = useToast();

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
        await loadData();
      })();
    }
  }, [user, authLoading, navigate]);

  const handleSubscriptionError = (code: string) => {
    if (code === 'PENDING_VALIDATION') { navigate('/pending-validation'); return; }
    if (code === 'SUBSCRIPTION_EXPIRED') { navigate('/renouveler'); return; }
    if (code === 'ACCOUNT_SUSPENDED') { navigate('/compte-suspendu'); return; }
    navigate('/upgrade');
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const pRes  = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pRes.ok) {
        const errJson = await pRes.json().catch(() => ({}));
        if (pRes.status === 403 && errJson.code) { handleSubscriptionError(errJson.code); return; }
        throw new Error('Failed to load portfolios');
      }
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
        const ord = oc.order || {};
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
      <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
        <div className="h-16 bg-white border-b border-[#E7E7EA]" />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 space-y-7">
          <div className="h-9 w-56 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-zinc-100 animate-pulse" />)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10 space-y-7">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Wifi size={20} style={{ color: '#1B5E20' }} />
                  <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">Mes cartes NFC</h1>
                </div>
                <p className="text-[#71717A] text-sm mt-1">Partagez votre portfolio d'un simple geste.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/nfc-types')}
                  className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                >
                  Types de cartes
                </button>
                <button
                  onClick={() => setShowOrderForm(true)}
                  disabled={portfolios.length === 0}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: '#2E7D32' }}
                >
                  <Plus size={16} /> Commander
                </button>
              </div>
            </div>

            {/* ── No portfolio warning ── */}
            {portfolios.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100 text-[#18181B]/60">
                  <Package className="w-5 h-5" />
                </span>
                <div className="flex-1">
                  <p className="font-medium text-[#18181B] text-sm">Aucun portfolio disponible</p>
                  <p className="text-xs text-[#71717A] mt-0.5">Créez d'abord un portfolio pour pouvoir commander une carte NFC.</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/portfolios')}
                  className="h-9 px-4 rounded-[10px] text-sm font-medium text-white shrink-0"
                  style={{ background: '#2E7D32' }}
                >
                  Créer un portfolio
                </button>
              </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <NFCStat icon={<CreditCard size={18} />} label="Total cartes"  value={nfcCards.length} />
              <NFCStat icon={<CheckCircle size={18} />} label="Actives"       value={activeCount} />
              <NFCStat icon={<Clock size={18} />}       label="En attente"    value={pendingCount} />
              <NFCStat icon={<Zap size={18} />}         label="Prix unitaire" value="30 000 F" />
            </div>

            {/* ── Filter bar ── */}
            {nfcCards.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] p-2.5 flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    placeholder="Rechercher par portfolio…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B] placeholder:text-[#71717A]"
                  />
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="h-9 pl-3 pr-8 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 appearance-none bg-white outline-none hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="active">Actives</option>
                    <option value="inactive">Inactives</option>
                    <option value="pending">En attente</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#71717A]" />
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="h-9 pl-3 pr-8 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B]/70 appearance-none bg-white outline-none hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <option value="newest">Plus récent</option>
                    <option value="oldest">Plus ancien</option>
                    <option value="status">Statut</option>
                    <option value="portfolio">Portfolio</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#71717A]" />
                </div>
              </div>
            )}

            {/* ── Cards grid ── */}
            {nfcCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] p-12 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-[#18181B] mb-1">Aucune carte NFC</h3>
                <p className="text-sm text-[#71717A] max-w-xs mx-auto mb-6">
                  Commandez votre première carte NFC et partagez votre portfolio d'un simple geste.
                </p>
                {portfolios.length > 0 && (
                  <button
                    onClick={() => setShowOrderForm(true)}
                    className="h-10 px-4 rounded-[10px] text-sm font-semibold text-white flex items-center gap-1.5 mx-auto transition-colors"
                    style={{ background: '#2E7D32' }}
                  >
                    <Plus size={15} /> Commander ma première carte
                  </button>
                )}
              </div>
            ) : filteredAndSortedCards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-[#71717A]" />
                </div>
                <h3 className="font-semibold text-[#18181B] mb-1">Aucun résultat</h3>
                <p className="text-sm text-[#71717A] mb-4">Aucune carte ne correspond à vos filtres.</p>
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); }}
                  className="h-9 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAndSortedCards.map(card => (
                  <NFCCardItem
                    key={card.id}
                    card={card}
                    onActivate={activateCard}
                    onDeactivate={deactivateCard}
                    onViewPortfolio={slug => window.open(`/portfolio/${slug}`, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* ── Promo strip ── */}
            <div className="rounded-2xl border border-[#E7E7EA] bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                <Scan size={22} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-[#18181B] text-sm">Besoin de cartes pour votre équipe ?</p>
                <p className="text-sm text-[#71717A] mt-0.5">Commandez en lot et profitez de tarifs dégressifs dès 10 cartes.</p>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors shrink-0"
              >
                Découvrir l'offre Business
              </button>
            </div>
      </div>

      {/* ── Order modal ── */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E7EA] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#18181B] text-sm">Commander une carte NFC</h2>
                  <p className="text-xs text-[#71717A]">30 000 F CFA / carte</p>
                </div>
              </div>
              <button
                onClick={() => { setShowOrderForm(false); setOrderItems([]); setPendingItem({ portfolio_id: '', quantity: 1 }); }}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-[#71717A] hover:text-[#18181B] transition-colors"
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
                    <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Articles ajoutés</p>
                    {orderItems.map((it, idx) => {
                      const p = portfolios.find(pf => String(pf.id) === String(it.portfolio_id));
                      return (
                        <div key={idx} className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                              <CreditCard size={12} />
                            </div>
                            <span className="text-sm text-[#18181B]">{p ? p.title : `Portfolio ${it.portfolio_id}`}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[#71717A]">{it.quantity} carte{it.quantity > 1 ? 's' : ''}</span>
                            <button
                              type="button"
                              onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                              className="text-[#71717A]/50 hover:text-red-500 transition-colors"
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
                  <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Ajouter un article</p>
                  <div>
                    <label className="text-xs font-medium text-[#71717A] mb-1.5 block">Portfolio</label>
                    <select
                      value={pendingItem.portfolio_id}
                      onChange={e => setPendingItem(prev => ({ ...prev, portfolio_id: e.target.value }))}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] transition-colors"
                    >
                      <option value="">Sélectionnez un portfolio</option>
                      {portfolios.map(portfolio => (
                        <option key={portfolio.id} value={portfolio.id}>{portfolio.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#71717A] mb-1.5 block">Quantité</label>
                    <input
                      type="number"
                      min={1}
                      value={pendingItem.quantity}
                      onChange={e => setPendingItem(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!pendingItem.portfolio_id}
                    onClick={() => {
                      if (!pendingItem.portfolio_id) return;
                      setOrderItems(prev => [...prev, pendingItem]);
                      setPendingItem({ portfolio_id: '', quantity: 1 });
                    }}
                    className="w-full h-10 rounded-[10px] border-2 border-dashed border-[#E7E7EA] text-sm font-medium text-[#18181B]/60 hover:border-[#2E7D32] hover:text-[#1B5E20] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Ajouter à la commande
                  </button>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-[#E7E7EA] shrink-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#71717A]">Total estimé</span>
                  <span className="font-bold text-[#1B5E20] text-base">{totalEstimated.toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowOrderForm(false); setOrderItems([]); setPendingItem({ portfolio_id: '', quantity: 1 }); }}
                    className="flex-1 h-10 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (orderItems.length === 0 && !pendingItem.portfolio_id)}
                    className="flex-1 h-10 rounded-[10px] text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: '#2E7D32' }}
                  >
                    {submitting ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi…</>
                    ) : (
                      <><ShoppingCart size={15} /> Confirmer la commande</>
                    )}
                  </button>
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
