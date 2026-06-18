import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle, CheckCircle2, RefreshCw, Search, TrendingUp, XCircle,
  ExternalLink, Download, Filter, DollarSign, CreditCard, Calendar,
  Eye, Clock, Receipt, Banknote, User, X, ChevronLeft, ChevronRight, Mail,
} from 'lucide-react';
import { UserPaiementHistorique } from '@/components/admin/UserPaiementHistorique';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
type Paiement = {
  id: number;
  reference: string | null;
  numero_commande: string | null;
  commande_id: number | null;
  utilisateur_id: number | null;
  user_name?: string;
  user_email?: string;
  image_paiement: string | null;
  payment_method: string | null;
  montant: number;
  status: string;
  type_paiement: string;
  date_paiement: string | null;
  created_at: string;
  notes?: string;
  invoice_id?: string;
  motif_remboursement?: string | null;
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

const STATUS_PILL: Record<string, { c: string; bg: string; label: string }> = {
  pending:   { c: '#B45309', bg: '#FEF3E2', label: 'En attente' },
  confirmed: { c: '#1565C0', bg: '#E8F1FD', label: 'Confirmé' },
  paid:      { c: '#2E7D32', bg: '#EAF5EB', label: 'Payé' },
  reussi:    { c: '#2E7D32', bg: '#EAF5EB', label: 'Réussi' },
  failed:    { c: '#C62828', bg: '#FEECEC', label: 'Échoué' },
  refunded:  { c: '#7C3AED', bg: '#F3EEFF', label: 'Remboursé' },
  upcoming:  { c: '#7C3AED', bg: '#F3EEFF', label: 'À venir' },
  cancelled: { c: '#52525B', bg: '#F4F4F5', label: 'Annulé' },
};

// ─── Type badges ──────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, { c: string; bg: string; label: string }> = {
  abonnement:   { c: '#2E7D32', bg: '#EAF5EB', label: 'Abonnement' },
  reabonnement: { c: '#0369a1', bg: '#e0f2fe', label: 'Réabonnement' },
  upgrade:      { c: '#92400e', bg: '#fef3c7', label: 'Upgrade' },
  commande_nfc: { c: '#6d28d9', bg: '#ede9fe', label: 'Carte NFC' },
};

const PAYMENT_METHODS = [
  { value: 'wave',         label: 'Wave',          icon: '💸' },
  { value: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { value: 'mtn_money',    label: 'MTN Money',     icon: '🟡' },
  { value: 'card',         label: 'Carte bancaire',icon: '💳' },
  { value: 'manual',       label: 'Manuel',        icon: '📝' },
  { value: 'cash',         label: 'Espèces',       icon: '💰' },
  { value: 'transfer',     label: 'Virement',      icon: '🏦' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = STATUS_PILL[status] ?? { c: '#52525B', bg: '#F4F4F5', label: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.c, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.c }} />
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = TYPE_BADGE[type] ?? { c: '#52525B', bg: '#F4F4F5', label: type };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: t.c, background: t.bg }}>
      {t.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminPaiements() {
  const { toast } = useToast();

  const [selectedUser, setSelectedUser]   = useState<number | null>(null);
  const [paiements, setPaiements]         = useState<Paiement[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [typeFilter, setTypeFilter]       = useState('all');
  const [methodFilter, setMethodFilter]   = useState('all');
  const [dateFilter, setDateFilter]       = useState('all');
  const [sortBy, setSortBy]               = useState<'date' | 'user' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder]         = useState<'asc' | 'desc'>('desc');
  const [selectedPaiement, setSelectedPaiement] = useState<Paiement | null>(null);
  const [detailsOpen, setDetailsOpen]     = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus]         = useState('');
  const [notes, setNotes]                 = useState('');
  const [sendingEmail, setSendingEmail]   = useState(false);
  const [stats, setStats] = useState({
    total: 0, paid: 0, pending: 0, failed: 0, refunded: 0,
    totalRevenue: 0, avgAmount: 0, todayRevenue: 0,
  });

  // ── Normalizers ──────────────────────────────────────────────────────────────
  const normalize = (s: any) => {
    if (!s && s !== 0) return '';
    try {
      return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    } catch {
      return String(s).toLowerCase();
    }
  };

  const canonicalStatus = (s: any) => {
    const n = normalize(s || '');
    if (!n) return '';
    if (['refunded', 'rembourse', 'remboursement', 'remboursee'].includes(n)) return 'refunded';
    if (['reussi', 'success', 'succeeded'].includes(n)) return 'reussi';
    if (['paid', 'paye', 'payee', 'paye'].includes(n)) return 'paid';
    if (['confirmed'].includes(n)) return 'confirmed';
    if (['pending', 'enattente', 'en_attente'].includes(n)) return 'pending';
    if (['failed', 'echoue', 'echec'].includes(n)) return 'failed';
    if (['upcoming', 'a venir', 'avenir', 'avenu'].includes(n)) return 'upcoming';
    if (['cancelled', 'annule', 'annulee'].includes(n)) return 'cancelled';
    return n;
  };

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadPaiements = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');

      let res;
      if (statusFilter === 'upcoming') {
        res = await fetch(`${API_BASE}/api/admin/paiements/upcoming?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const params = new URLSearchParams();
        params.set('limit', '500');
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
        res = await fetch(`${API_BASE}/api/admin/paiements?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) throw new Error('Erreur réseau');
      const json = await res.json();
      const items = statusFilter === 'upcoming' ? (json.upcoming || []) : (json.paiements || json.items || []);

      const normalized: Paiement[] = items.map((p: any) => {
        const commandeId = p.commande_id || p.order_id || null;
        const rawType = p.type_paiement || (commandeId ? 'commande_nfc' : 'abonnement');
        return {
          id: p.id,
          reference: p.reference || p.reference_transaction || null,
          numero_commande: p.numero_commande || p.order_number || null,
          commande_id: commandeId,
          utilisateur_id: p.utilisateur_id || p.user_id || null,
          user_name: p.user_name
            || (p.utilisateur_prenom ? `${p.utilisateur_prenom} ${p.utilisateur_nom || ''}`.trim() : null)
            || p.user_prenom || null,
          user_email: p.user_email || p.utilisateur_email || null,
          image_paiement: p.image_paiement || p.payment_image || null,
          payment_method: p.moyen_paiement || p.payment_method || 'Manual',
          montant: Number(p.montant || p.montant_total || p.amount || 0),
          status: canonicalStatus(p.status || p.statut || 'pending'),
          type_paiement: rawType,
          date_paiement: p.date_paiement || p.created_at || p.createdAt || null,
          created_at: p.created_at || p.createdAt || new Date().toISOString(),
          notes: p.notes || p.commentaire || null,
          invoice_id: p.invoice_id || p.facture_id || null,
          motif_remboursement: p.motif_remboursement || p.motif || p.refund_reason || null,
        };
      });

      setPaiements(normalized);

      if (json?.stats) {
        const s: any = json.stats;
        setStats({
          total: Number(s.total || normalized.length || 0),
          paid: Number(s.paid || 0), pending: Number(s.pending || 0),
          failed: Number(s.failed || 0), refunded: Number(s.refunded || 0),
          totalRevenue: Number(s.totalRevenue || s.total_revenue || 0),
          avgAmount: Number(s.avgAmount || s.avg_amount || 0),
          todayRevenue: Number(s.todayRevenue || s.today_revenue || 0),
        });
      } else {
        const paidStatuses = ['paid', 'reussi', 'confirmed'];
        const paid      = normalized.filter(p => paidStatuses.includes(p.status)).length;
        const pending   = normalized.filter(p => p.status === 'pending').length;
        const failed    = normalized.filter(p => p.status === 'failed').length;
        const refunded  = normalized.filter(p => p.status === 'refunded').length;
        const totalRevenue = normalized.filter(p => paidStatuses.includes(p.status)).reduce((a, p) => a + p.montant, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayRevenue = normalized
          .filter(p => paidStatuses.includes(p.status) && new Date(p.date_paiement || p.created_at) >= today)
          .reduce((a, p) => a + p.montant, 0);
        setStats({ total: normalized.length, paid, pending, failed, refunded, totalRevenue, avgAmount: paid > 0 ? Math.round(totalRevenue / paid) : 0, todayRevenue });
      }
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setPaiements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPaiements(); }, [statusFilter]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredPaiements = useMemo(() => {
    let list = [...paiements];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.reference || '').toLowerCase().includes(q) ||
        (p.numero_commande || '').toLowerCase().includes(q) ||
        (p.user_name || '').toLowerCase().includes(q) ||
        (p.user_email || '').toLowerCase().includes(q) ||
        String(p.utilisateur_id || '').includes(search)
      );
    }
    if (statusFilter !== 'all') {
      const cf = canonicalStatus(statusFilter);
      list = list.filter(p => p.status === cf);
    }
    if (typeFilter !== 'all') list = list.filter(p => p.type_paiement === typeFilter);
    if (methodFilter !== 'all') list = list.filter(p => p.payment_method === methodFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(p => {
        const d = new Date(p.date_paiement || p.created_at);
        if (dateFilter === 'today') return d >= today;
        if (dateFilter === 'week')  { const w = new Date(today); w.setDate(w.getDate() - 7); return d >= w; }
        if (dateFilter === 'month') { const m = new Date(today); m.setMonth(m.getMonth() - 1); return d >= m; }
        return true;
      });
    }
    list.sort((a, b) => {
      let aV: any, bV: any;
      switch (sortBy) {
        case 'user':   aV = (a.user_name || '').toLowerCase();   bV = (b.user_name || '').toLowerCase(); break;
        case 'amount': aV = Number(a.montant || 0);              bV = Number(b.montant || 0); break;
        case 'status': aV = (a.status || '').toLowerCase();      bV = (b.status || '').toLowerCase(); break;
        default:       aV = new Date(a.date_paiement || a.created_at).getTime(); bV = new Date(b.date_paiement || b.created_at).getTime();
      }
      if (typeof aV === 'string') return sortOrder === 'desc' ? -aV.localeCompare(bV) : aV.localeCompare(bV);
      return sortOrder === 'desc' ? -(aV - bV) : aV - bV;
    });
    return list;
  }, [paiements, search, statusFilter, methodFilter, dateFilter, sortBy, sortOrder]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const updatePaiementStatus = async (paiementId: number, status: string, notesVal?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      const res = await fetch(`${API_BASE}/api/admin/paiements/${paiementId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: notesVal || undefined }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour');
      const jsonRes = await res.json().catch(() => null);
      setUpdateDialogOpen(false);
      setSelectedPaiement(null);
      setNotes('');
      const returned = jsonRes?.paiement;
      if (returned) {
        const rs = canonicalStatus(returned.status || returned.statut || '');
        if (rs === 'reussi') toast({ title: 'Paiement confirmé', description: 'Facture générée et email envoyé.' });
        else if (rs === 'refunded') toast({ title: 'Paiement remboursé' });
      }
      loadPaiements();
    } catch (err) {
      console.error(err);
    }
  };

  const resendEmail = async (paiementId: number) => {
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/paiements/${paiementId}/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        toast({ title: 'Email envoyé', description: `Confirmation envoyée à ${json?.sent_to || 'l\'utilisateur'}.` });
      } else {
        toast({ title: 'Erreur', description: json?.error || 'Impossible d\'envoyer l\'email.' });
      }
    } catch {
      toast({ title: 'Erreur réseau', description: 'Vérifiez votre connexion.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const exportPaiements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/paiements/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paiements-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e) { console.error('Export error:', e); }
  };

  const openInvoice = async (paiement: Paiement) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      let invoiceId = paiement.invoice_id;
      if (!invoiceId && paiement.reference) {
        const byRef = await fetch(
          `${API_BASE}/api/admin/invoices/by-reference?reference=${encodeURIComponent(paiement.reference)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (byRef.ok) { const data = await byRef.json(); invoiceId = data.invoice?.id; }
      }
      if (invoiceId) {
        window.open(`/admin/invoices/${invoiceId}`, '_blank');
      } else {
        const htmlRes = await fetch(`${API_BASE}/api/admin/invoices/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paiement_id: paiement.id, reference: paiement.reference }),
        });
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const blob = new Blob([html], { type: 'text/html' });
          window.open(URL.createObjectURL(blob), '_blank');
        }
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

  const formatCurrency = (n: number) => `${n.toLocaleString('fr-FR')} F CFA`;
  const getMethodIcon  = (m: string) => PAYMENT_METHODS.find(x => x.value === m)?.icon || '📝';
  const getMethodLabel = (m: string) => PAYMENT_METHODS.find(x => x.value === m)?.label || 'Manuel';

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'CA total', value: formatCurrency(stats.totalRevenue), sub: `${stats.paid} paiements validés`, icon: TrendingUp, c: '#2E7D32', bg: '#EAF5EB' },
    { label: "Aujourd'hui", value: formatCurrency(stats.todayRevenue), sub: "Encaissé aujourd'hui", icon: Calendar, c: '#1565C0', bg: '#E8F1FD' },
    { label: 'En attente', value: stats.pending, sub: 'À traiter', icon: Clock, c: stats.pending > 0 ? '#B45309' : '#52525B', bg: stats.pending > 0 ? '#FEF3E2' : '#F4F4F5' },
    { label: 'Panier moyen', value: formatCurrency(stats.avgAmount), sub: `${stats.total} transactions`, icon: Banknote, c: '#7C3AED', bg: '#F3EEFF' },
  ];

  // ── Status filter tabs ────────────────────────────────────────────────────────
  const STATUS_TABS = [
    ['all', 'Tous'],
    ['reussi', 'Réussi'],
    ['pending', 'En attente'],
    ['failed', 'Échoué'],
    ['refunded', 'Remboursé'],
    ['cancelled', 'Annulé'],
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <CreditCard size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Paiements</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {formatCurrency(stats.totalRevenue)} encaissés · {stats.total} transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportPaiements}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <Download size={15} /> Exporter
            </button>
            <button onClick={loadPaiements}
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
          {kpis.map(({ label, value, sub, icon: Icon, c, bg }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold text-[#18181B] leading-none tabular-nums truncate">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-tight">{label}</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 mt-3 pl-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filter toolbar ─────────────────────────────────────────────────────── */}
        <div className="bg-white p-3 flex flex-col gap-3" style={CARD_STYLE}>
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input placeholder="Rechercher une transaction, un client, une référence…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B]" />
          </div>

          {/* Type tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {([['all', 'Tous types'], ['abonnement', 'Abonnement'], ['reabonnement', 'Réabonnement'], ['upgrade', 'Upgrade'], ['commande_nfc', 'Carte NFC']] as const).map(([k, label]) => {
              const active = typeFilter === k;
              const t = k !== 'all' ? TYPE_BADGE[k] : null;
              return (
                <button key={k} onClick={() => setTypeFilter(k)}
                  className={`px-3 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${active ? 'text-white' : 'border border-[#E7E7EA] text-zinc-500 hover:bg-zinc-50'}`}
                  style={active ? { background: t ? t.c : '#1B5E20' } : undefined}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status tabs + filters */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map(([k, label]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`px-3 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === k ? 'text-white' : 'border border-[#E7E7EA] text-zinc-500 hover:bg-zinc-50'}`}
                style={statusFilter === k ? { background: '#1B5E20' } : undefined}>
                {label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
                <option value="all">Toutes méthodes</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
              </select>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
                <option value="all">Toute période</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
                <option value="date">Date</option>
                <option value="amount">Montant</option>
                <option value="user">Client</option>
                <option value="status">Statut</option>
              </select>
              <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                className="h-9 px-2.5 rounded-lg border border-[#E7E7EA] text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>

        {/* Count strip */}
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: '#1B5E20' }}>
            {filteredPaiements.length}
          </span>
          <div>
            <p className="text-sm font-bold text-[#18181B]">Transactions</p>
            <p className="text-xs text-zinc-400">
              {filteredPaiements.filter(p => ['paid', 'reussi'].includes(p.status)).length} validés ·{' '}
              {filteredPaiements.filter(p => p.status === 'pending').length} en attente
            </p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#E7E7EA] last:border-0">
                <div className="w-9 h-9 rounded-full bg-zinc-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-zinc-100 rounded w-48 animate-pulse" />
                  <div className="h-2.5 bg-zinc-100 rounded w-32 animate-pulse" />
                </div>
                <div className="h-3 bg-zinc-100 rounded w-24 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredPaiements.length === 0 ? (
          <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <Banknote size={24} />
            </span>
            <h3 className="font-bold text-[#18181B]">Aucune transaction</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">Aucun paiement ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">Référence</th>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Méthode</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaiements.map(p => (
                    <tr key={p.id}
                      className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50/70 transition-colors cursor-pointer"
                      onClick={() => { setSelectedPaiement(p); setDetailsOpen(true); }}>
                      <td className="py-3 px-5">
                        <span className="font-mono text-xs text-zinc-500">
                          {p.reference || `#${p.id}`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#18181B] whitespace-nowrap">{p.user_name || 'Anonyme'}</p>
                        {p.user_email && (
                          <p className="text-xs text-zinc-400 truncate max-w-[160px]">{p.user_email}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <TypeBadge type={p.type_paiement} />
                      </td>
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1.5 text-sm text-[#18181B]">
                          <span>{getMethodIcon(p.payment_method || '')}</span>
                          <span className="text-xs text-zinc-500">{getMethodLabel(p.payment_method || '')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold tabular-nums text-[#18181B] whitespace-nowrap">
                          {formatCurrency(p.montant)}
                        </span>
                      </td>
                      <td className="py-3 px-3"><StatusPill status={p.status} /></td>
                      <td className="py-3 px-3 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(p.date_paiement)}
                      </td>
                      <td className="py-3 px-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setSelectedPaiement(p); setDetailsOpen(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Détails">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openInvoice(p)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Facture">
                            <Receipt size={14} />
                          </button>
                          {p.status !== 'reussi' && p.status !== 'refunded' && p.status !== 'failed' && (
                            <button onClick={() => { setSelectedPaiement(p); setNewStatus('reussi'); setUpdateDialogOpen(true); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-[#EAF5EB] hover:text-[#2E7D32] transition-colors"
                              title="Valider">
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button onClick={() => { setSelectedPaiement(p); setNewStatus(p.status); setUpdateDialogOpen(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Modifier statut">
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User payment history */}
        {selectedUser && (
          <div>
            <h2 className="text-base font-bold text-[#18181B] mb-3">Historique paiement utilisateur</h2>
            <UserPaiementHistorique userId={selectedUser} onClose={() => setSelectedUser(null)} />
          </div>
        )}

      </div>

      {/* ── Details drawer (slide-in right) ──────────────────────────────────────── */}
      {detailsOpen && selectedPaiement && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setDetailsOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

            {/* Header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: ADMIN_GRAD }}>
              <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <button onClick={() => setDetailsOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
              <div className="relative px-6 pt-7 pb-6 flex items-center gap-4">
                <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <CreditCard size={28} strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{selectedPaiement.user_name || 'Anonyme'}</h2>
                  <p className="text-white/70 text-sm font-mono truncate">{selectedPaiement.reference || `#${selectedPaiement.id}`}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusPill status={selectedPaiement.status} />
                    <span className="text-xs font-semibold text-white/80">{formatCurrency(selectedPaiement.montant)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E7E7EA] p-3">
                  <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Type</p>
                  <TypeBadge type={selectedPaiement.type_paiement} />
                </div>
                {[
                  ['Montant', formatCurrency(selectedPaiement.montant)],
                  ['Méthode', getMethodLabel(selectedPaiement.payment_method || '')],
                  ['Date', formatDate(selectedPaiement.date_paiement)],
                  ...(selectedPaiement.numero_commande ? [['N° commande', `#${selectedPaiement.numero_commande}`]] : []),
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-[#E7E7EA] p-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-[#18181B] truncate">{v}</p>
                  </div>
                ))}
              </div>

              {/* Client info */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Client</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={15} className="text-zinc-400 shrink-0" />
                    <span className="text-[#18181B]">{selectedPaiement.user_name || '—'}</span>
                  </div>
                  {selectedPaiement.user_email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Receipt size={15} className="text-zinc-400 shrink-0" />
                      <a href={`mailto:${selectedPaiement.user_email}`}
                        className="text-[#1565C0] hover:underline break-all"
                        onClick={e => e.stopPropagation()}>
                        {selectedPaiement.user_email}
                      </a>
                    </div>
                  )}
                  {selectedPaiement.utilisateur_id && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs text-zinc-400 pl-6">ID #{selectedPaiement.utilisateur_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedPaiement.notes && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Notes</p>
                  <div className="rounded-xl border border-[#E7E7EA] p-3 text-sm text-zinc-600 leading-relaxed"
                    style={{ background: '#E8F1FD' }}>
                    {selectedPaiement.notes}
                  </div>
                </div>
              )}

              {/* Motif remboursement */}
              {selectedPaiement.motif_remboursement && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Motif remboursement</p>
                  <div className="rounded-xl border border-[#E7E7EA] p-3 text-sm text-[#7C3AED] leading-relaxed"
                    style={{ background: '#F3EEFF' }}>
                    {selectedPaiement.motif_remboursement}
                  </div>
                </div>
              )}

              {/* Payment proof */}
              {selectedPaiement.image_paiement && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Preuve de paiement</p>
                  <div className="relative rounded-xl overflow-hidden border border-[#E7E7EA] group cursor-pointer"
                    onClick={() => window.open(selectedPaiement.image_paiement!, '_blank')}>
                    <img src={selectedPaiement.image_paiement} alt="Preuve"
                      className="w-full object-contain max-h-48 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <ExternalLink size={16} className="text-white" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#E7E7EA] p-4 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => openInvoice(selectedPaiement)}
                  className="flex-1 h-10 rounded-lg border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors">
                  <Receipt size={14} /> Facture
                </button>
                <button onClick={() => { setUpdateDialogOpen(true); setNewStatus(selectedPaiement.status); }}
                  className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                  style={{ background: '#2E7D32' }}>
                  <RefreshCw size={14} /> Modifier statut
                </button>
              </div>
              <button
                onClick={() => resendEmail(selectedPaiement.id)}
                disabled={sendingEmail}
                className="w-full h-10 rounded-lg border border-blue-200 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail size={14} />
                {sendingEmail ? 'Envoi en cours…' : 'Renvoyer l\'email de confirmation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update status modal ───────────────────────────────────────────────────── */}
      {updateDialogOpen && selectedPaiement && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setUpdateDialogOpen(false)}>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#E7E7EA]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#FEF3E2', color: '#B45309' }}>
                  <RefreshCw size={17} />
                </span>
                <div>
                  <h2 className="font-semibold text-[#18181B] text-sm">Modifier le statut</h2>
                  <p className="text-xs text-zinc-400 font-mono truncate max-w-[220px]">{selectedPaiement.reference || `#${selectedPaiement.id}`}</p>
                </div>
              </div>
              <button onClick={() => setUpdateDialogOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18181B] uppercase tracking-wide">Nouveau statut</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#E7E7EA] bg-zinc-50 outline-none text-sm text-[#18181B]">
                  <option value="pending">En attente</option>
                  <option value="reussi">Réussi / Validé</option>
                  <option value="confirmed">Confirmé</option>
                  <option value="paid">Payé</option>
                  <option value="failed">Échoué / Rejeté</option>
                  <option value="refunded">Remboursé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18181B] uppercase tracking-wide">
                  Commentaire interne{newStatus === 'refunded' && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Raison du changement de statut…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] resize-none focus:border-[#18181B]/30" />
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border p-3"
                style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
                <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  La validation peut déclencher l'envoi d'un email de confirmation au client.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-[#E7E7EA] flex items-center gap-2 justify-end">
              <button onClick={() => setUpdateDialogOpen(false)}
                className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => {
                  if (newStatus === 'refunded' && (!notes || notes.trim().length === 0)) {
                    toast({ title: 'Motif requis', description: 'Indiquez un motif de remboursement.', variant: 'destructive' });
                    return;
                  }
                  updatePaiementStatus(selectedPaiement.id, newStatus, notes);
                }}
                className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white"
                style={{ background: '#2E7D32' }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
