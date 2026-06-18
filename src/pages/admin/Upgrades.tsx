import { useEffect, useState, useMemo } from 'react';
import {
  Search, CheckCircle2, Clock, XCircle, RefreshCw, User,
  Package, Calendar, TrendingUp, Download, Eye, AlertCircle,
  CreditCard, Check, X, Send, Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
type UpgradeRequest = {
  id: number;
  plan_name: string;
  plan_price_cents?: number;
  paiement_montant?: number;
  user_prenom?: string;
  user_nom?: string;
  user_email: string;
  status: string;
  reference_transaction?: string;
  image_paiement?: string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  plan_id?: number;
  notes?: string;
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

const STATUS_PILL: Record<string, { c: string; bg: string; label: string; bar: string }> = {
  pending:   { c: '#B45309', bg: '#FEF3E2', label: 'En attente', bar: '#F59E0B' },
  confirmed: { c: '#1565C0', bg: '#E8F1FD', label: 'Confirmé',   bar: '#1565C0' },
  approved:  { c: '#2E7D32', bg: '#EAF5EB', label: 'Approuvé',   bar: '#2E7D32' },
  rejected:  { c: '#C62828', bg: '#FEECEC', label: 'Refusé',     bar: '#C62828' },
  cancelled: { c: '#52525B', bg: '#F4F4F5', label: 'Annulé',     bar: '#D4D4D8' },
};

const PAYMENT_METHODS = [
  { value: 'wave',         label: 'Wave',          icon: '💸' },
  { value: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { value: 'mtn_money',   label: 'MTN Money',     icon: '🟡' },
  { value: 'card',        label: 'Carte bancaire', icon: '💳' },
  { value: 'manual',      label: 'Manuel',         icon: '📝' },
  { value: 'cash',        label: 'Espèces',        icon: '💰' },
  { value: 'transfer',    label: 'Virement',       icon: '🏦' },
];

function StatusPill({ status }: { status: string }) {
  const s = STATUS_PILL[status] ?? STATUS_PILL.cancelled;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.c, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.c }} />
      {s.label}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminUpgrades() {
  const { toast } = useToast();

  // ── Core state ────────────────────────────────────────────────────────────────
  const [upgrades, setUpgrades]           = useState<UpgradeRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeRequest | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [drawerTab, setDrawerTab]         = useState<'details' | 'payment' | 'notes'>('details');
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [dateFilter, setDateFilter]       = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen]   = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [emailSubject, setEmailSubject]   = useState('');
  const [emailMessage, setEmailMessage]   = useState('');

  // ── Action form state ─────────────────────────────────────────────────────────
  const [reference, setReference]         = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wave');
  const [imageUrl, setImageUrl]           = useState('');
  const [notes, setNotes]                 = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const formatPrice = (cents?: number) =>
    cents ? `${Number(cents).toLocaleString('fr-FR')} F CFA` : '—';

  const getPaymentMethodIcon  = (m: string) => PAYMENT_METHODS.find(p => p.value === m)?.icon  ?? '📝';
  const getPaymentMethodLabel = (m: string) => PAYMENT_METHODS.find(p => p.value === m)?.label ?? 'Manuel';

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadUpgrades = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentification requise');
      const res = await fetch(`${API_BASE}/api/admin/upgrades?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Impossible de charger les demandes'); }
      const json = await res.json();
      setUpgrades(json.checkouts || json.upgrades || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setUpgrades([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadUpgrades(); }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredUpgrades = useMemo(() => {
    let list = upgrades;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        `${u.user_prenom || ''} ${u.user_nom || ''}`.toLowerCase().includes(q) ||
        u.user_email.toLowerCase().includes(q) ||
        u.reference_transaction?.toLowerCase().includes(q) ||
        u.plan_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    if (dateFilter !== 'all') {
      const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(u => {
        if (!u.created_at) return false;
        const d = new Date(u.created_at);
        if (dateFilter === 'today') return d >= today;
        if (dateFilter === 'week') { const w = new Date(today); w.setDate(w.getDate() - 7); return d >= w; }
        if (dateFilter === 'month') { const m = new Date(today); m.setMonth(m.getMonth() - 1); return d >= m; }
        return true;
      });
    }
    return list;
  }, [upgrades, search, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total     = upgrades.length;
    const pending   = upgrades.filter(u => u.status === 'pending').length;
    const confirmed = upgrades.filter(u => u.status === 'confirmed').length;
    const approved  = upgrades.filter(u => u.status === 'approved').length;
    const rejected  = upgrades.filter(u => u.status === 'rejected').length;
    const revenue   = upgrades.filter(u => u.status === 'approved').reduce((s, u) => s + Number(u.paiement_montant ?? u.plan_price_cents ?? 0), 0);
    return { total, pending, confirmed, approved, rejected, revenue };
  }, [upgrades]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const openDrawer = (upgrade: UpgradeRequest) => {
    setSelectedUpgrade(upgrade);
    setReference(upgrade.reference_transaction || '');
    setPaymentMethod(upgrade.payment_method || 'wave');
    setImageUrl(upgrade.image_paiement || '');
    setNotes(upgrade.notes || '');
    setDrawerTab('details');
    setDrawerOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedUpgrade) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reference: reference || selectedUpgrade.reference_transaction || null,
          payment_method: paymentMethod,
          image_paiement: imageUrl || selectedUpgrade.image_paiement || null,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Échec de l\'approbation'); }
      toast({ title: '✅ Demande approuvée', description: 'L\'upgrade a été effectué avec succès' });
      setDrawerOpen(false); setSelectedUpgrade(null); loadUpgrades();
    } catch (err: any) { toast({ title: 'Erreur', description: err.message, variant: 'destructive' }); }
  };

  const handleReject = async () => {
    if (!selectedUpgrade) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason || 'Raison non spécifiée' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Échec du rejet'); }
      toast({ title: '❌ Demande refusée', description: 'La demande a été rejetée' });
      setRejectDialogOpen(false); setRejectReason(''); setSelectedUpgrade(null); loadUpgrades();
    } catch (err: any) { toast({ title: 'Erreur', description: err.message, variant: 'destructive' }); }
  };

  const handleSendEmail = async () => {
    if (!selectedUpgrade) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Échec de l\'envoi'); }
      toast({ title: '📧 Email envoyé', description: 'L\'email a été envoyé avec succès' });
      setEmailDialogOpen(false); setEmailSubject(''); setEmailMessage('');
    } catch (err: any) { toast({ title: 'Erreur', description: err.message, variant: 'destructive' }); }
  };

  const exportUpgrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob(); const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `upgrades-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
      toast({ title: 'Export réussi', description: 'Liste des upgrades téléchargée' });
    } catch { toast({ title: 'Erreur d\'export', description: 'Impossible d\'exporter', variant: 'destructive' }); }
  };

  const STATUS_TABS = [
    ['all',       'Tous'],
    ['pending',   'En attente'],
    ['confirmed', 'Confirmé'],
    ['approved',  'Approuvé'],
    ['rejected',  'Refusé'],
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
              <TrendingUp size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Upgrades</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {stats.pending} en attente · {stats.approved} approuvés · {stats.revenue.toLocaleString('fr-FR')} F CFA générés
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportUpgrades}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <Download size={15} /> Exporter
            </button>
            <button onClick={loadUpgrades}
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
            { label: 'En attente',    value: stats.pending,   icon: Clock,        c: '#B45309', bg: '#FEF3E2', sub: `${stats.confirmed} confirmés` },
            { label: 'Approuvés',     value: stats.approved,  icon: CheckCircle2, c: '#2E7D32', bg: '#EAF5EB', sub: 'Upgrades effectués' },
            { label: 'Revenue',       value: `${stats.revenue.toLocaleString('fr-FR')} F`, icon: CreditCard, c: '#1565C0', bg: '#E8F1FD', sub: 'Via upgrades approuvés' },
            { label: 'Total demandes', value: stats.total,    icon: Package,      c: '#6D28D9', bg: '#EDE9FE', sub: `${stats.rejected} refusés` },
          ].map(({ label, value, icon: Icon, c, bg, sub }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5 mb-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#18181B] leading-none tabular-nums truncate">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{label}</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filter toolbar ─────────────────────────────────────────────────────── */}
        <div className="bg-white p-3 flex flex-col gap-3" style={CARD_STYLE}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input placeholder="Rechercher par utilisateur, email, référence, plan…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B]" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map(([k, label]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`px-3 h-9 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === k ? 'text-white' : 'border border-[#E7E7EA] text-zinc-500 hover:bg-zinc-50'}`}
                style={statusFilter === k ? { background: '#1B5E20' } : undefined}>
                {label}
              </button>
            ))}
            <div className="ml-auto">
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
                <option value="all">Toute période</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>
          </div>
        </div>

        {/* Count strip */}
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: '#1B5E20' }}>
            {filteredUpgrades.length}
          </span>
          <div>
            <p className="text-sm font-bold text-[#18181B]">Demandes d'upgrade</p>
            <p className="text-xs text-zinc-400">
              {filteredUpgrades.filter(u => u.status === 'pending').length} en attente ·{' '}
              {filteredUpgrades.filter(u => u.status === 'approved').length} approuvées
            </p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#E7E7EA] last:border-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-zinc-100 rounded w-40 animate-pulse" />
                  <div className="h-2.5 bg-zinc-100 rounded w-56 animate-pulse" />
                </div>
                <div className="h-3 bg-zinc-100 rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredUpgrades.length === 0 ? (
          <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <TrendingUp size={24} />
            </span>
            <h3 className="font-bold text-[#18181B]">Aucune demande</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">Aucune demande d'upgrade ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">Utilisateur</th>
                    <th className="py-3 px-3">Plan cible</th>
                    <th className="py-3 px-3">Montant</th>
                    <th className="py-3 px-3">Méthode</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpgrades.map(upgrade => {
                    const s     = STATUS_PILL[upgrade.status] ?? STATUS_PILL.cancelled;
                    const isFinal = ['approved', 'rejected', 'cancelled'].includes(upgrade.status);
                    const initials = `${upgrade.user_prenom?.[0] ?? ''}${upgrade.user_nom?.[0] ?? ''}`.toUpperCase() || '?';
                    return (
                      <tr key={upgrade.id}
                        className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            {/* Status left accent */}
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: s.bar }}>
                                {initials}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#18181B] whitespace-nowrap">
                                {upgrade.user_prenom} {upgrade.user_nom}
                              </p>
                              <p className="text-xs text-zinc-400 truncate max-w-[160px]">{upgrade.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Package size={13} className="text-zinc-400 shrink-0" />
                            <span className="font-medium text-[#18181B]">{upgrade.plan_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold tabular-nums text-[#18181B] whitespace-nowrap">
                          {formatPrice(upgrade.paiement_montant ?? upgrade.plan_price_cents)}
                        </td>
                        <td className="py-3 px-3">
                          {upgrade.payment_method ? (
                            <span className="text-sm">
                              {getPaymentMethodIcon(upgrade.payment_method)}{' '}
                              <span className="text-xs text-zinc-500">{getPaymentMethodLabel(upgrade.payment_method)}</span>
                            </span>
                          ) : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="py-3 px-3"><StatusPill status={upgrade.status} /></td>
                        <td className="py-3 px-3 text-xs text-zinc-500 whitespace-nowrap">
                          {upgrade.created_at ? formatDate(upgrade.created_at) : '—'}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openDrawer(upgrade)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                              title="Détails">
                              <Eye size={14} />
                            </button>
                            {!isFinal && (
                              <>
                                <button onClick={() => { openDrawer(upgrade); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50 transition-colors"
                                  style={{ color: '#2E7D32' }} title="Approuver">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => { setSelectedUpgrade(upgrade); setRejectDialogOpen(true); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                                  style={{ color: '#C62828' }} title="Refuser">
                                  <X size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Details Drawer (slide-in right) ──────────────────────────────────────── */}
      {drawerOpen && selectedUpgrade && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1)' }}>

            {/* Drawer header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: ADMIN_GRAD }}>
              <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <button onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
              <div className="relative px-6 pt-7 pb-5 flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {`${selectedUpgrade.user_prenom?.[0] ?? ''}${selectedUpgrade.user_nom?.[0] ?? ''}`.toUpperCase() || '?'}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">
                    {selectedUpgrade.user_prenom} {selectedUpgrade.user_nom}
                  </h2>
                  <p className="text-white/70 text-xs truncate">{selectedUpgrade.user_email}</p>
                  <div className="mt-2">
                    <StatusPill status={selectedUpgrade.status} />
                  </div>
                </div>
              </div>
              {/* Tab bar */}
              <div className="flex border-t border-white/20">
                {(['details', 'payment', 'notes'] as const).map(tab => (
                  <button key={tab} onClick={() => setDrawerTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${drawerTab === tab ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white/80'}`}>
                    {tab === 'details' ? 'Identité' : tab === 'payment' ? 'Paiement' : 'Notes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Identité tab ─── */}
              {drawerTab === 'details' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Plan cible',  selectedUpgrade.plan_name],
                      ['Montant',     formatPrice(selectedUpgrade.paiement_montant ?? selectedUpgrade.plan_price_cents)],
                      ['Demandé le',  selectedUpgrade.created_at ? formatDate(selectedUpgrade.created_at) : '—'],
                      ['Mis à jour',  selectedUpgrade.updated_at ? formatDate(selectedUpgrade.updated_at) : '—'],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-xl border border-[#E7E7EA] p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">{l}</p>
                        <p className="text-sm font-semibold text-[#18181B] truncate">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Client</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 text-sm">
                        <User size={14} className="text-zinc-400 shrink-0" />
                        <span className="text-[#18181B] font-medium">
                          {selectedUpgrade.user_prenom} {selectedUpgrade.user_nom}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={14} className="text-zinc-400 shrink-0" />
                        <a href={`mailto:${selectedUpgrade.user_email}`}
                          className="text-[#1565C0] hover:underline break-all text-xs">
                          {selectedUpgrade.user_email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {selectedUpgrade.reference_transaction && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Référence</p>
                      <div className="rounded-xl border border-[#E7E7EA] px-3 py-2 font-mono text-xs text-[#18181B] bg-zinc-50">
                        {selectedUpgrade.reference_transaction}
                      </div>
                    </div>
                  )}

                  {selectedUpgrade.image_paiement && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Preuve de paiement</p>
                      <a href={selectedUpgrade.image_paiement} target="_blank" rel="noopener noreferrer"
                        className="block relative overflow-hidden rounded-xl border border-[#E7E7EA] aspect-video group/img">
                        <img src={selectedUpgrade.image_paiement} alt="Preuve" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-lg">Ouvrir</span>
                        </div>
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* ── Paiement tab ─── */}
              {drawerTab === 'payment' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Référence de transaction</label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input value={reference} onChange={e => setReference(e.target.value)}
                        placeholder="Ex: WAVE-MUT-123456"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Méthode de paiement</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]">
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">URL preuve de paiement</label>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://…/preuve.jpg"
                      className="w-full h-10 px-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                  </div>

                  {imageUrl && (
                    <a href={imageUrl} target="_blank" rel="noopener noreferrer"
                      className="block relative overflow-hidden rounded-xl border border-[#E7E7EA] aspect-video group/img mt-2">
                      <img src={imageUrl} alt="Preuve" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Voir en grand</span>
                      </div>
                    </a>
                  )}
                </>
              )}

              {/* ── Notes tab ─── */}
              {drawerTab === 'notes' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Notes administratives</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={8}
                    placeholder="Commentaires sur cette demande…"
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32] resize-none" />
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-[#E7E7EA] p-4 flex items-center gap-2 shrink-0">
              {selectedUpgrade && !['approved', 'rejected', 'cancelled'].includes(selectedUpgrade.status) ? (
                <>
                  <button onClick={() => { setDrawerOpen(false); setRejectDialogOpen(true); }}
                    className="flex-1 h-10 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-red-50"
                    style={{ borderColor: '#FECACA', color: '#C62828' }}>
                    <X size={14} /> Refuser
                  </button>
                  <button onClick={handleApprove}
                    className="flex-1 h-10 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: '#2E7D32' }}>
                    <Check size={14} /> Approuver
                  </button>
                  <button onClick={() => { setEmailDialogOpen(true); }}
                    className="h-10 w-10 rounded-lg border border-[#E7E7EA] flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-colors shrink-0"
                    title="Envoyer un email">
                    <Send size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2 px-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#F4F4F5', color: '#52525B' }}>
                      Flux terminé
                    </span>
                  </div>
                  <button onClick={() => setEmailDialogOpen(true)}
                    className="h-10 px-4 rounded-lg border border-[#E7E7EA] text-sm font-medium text-zinc-500 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors">
                    <Send size={14} /> Email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────────────────────────── */}
      {rejectDialogOpen && selectedUpgrade && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          onClick={() => setRejectDialogOpen(false)}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEECEC', color: '#C62828' }}>
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#18181B]">Refuser cette demande</h3>
                  <p className="text-xs text-zinc-400">{selectedUpgrade.user_email}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Raison du refus</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                  placeholder="Expliquez la raison du refus…"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#C62828] resize-none" />
              </div>

              <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: '#FEF3E2' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#B45309' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                  L'utilisateur sera notifié par email. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E7E7EA] flex gap-2">
              <button onClick={() => setRejectDialogOpen(false)}
                className="flex-1 h-10 rounded-[10px] border border-[#E7E7EA] text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleReject}
                className="flex-1 h-10 rounded-[10px] text-sm font-bold text-white transition-colors"
                style={{ background: '#C62828' }}>
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Modal ───────────────────────────────────────────────────────────── */}
      {emailDialogOpen && selectedUpgrade && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center px-4"
          onClick={() => setEmailDialogOpen(false)}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }} />
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="relative overflow-hidden shrink-0" style={{ background: ADMIN_GRAD }}>
              <div className="absolute inset-0 opacity-[0.12]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <button onClick={() => setEmailDialogOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
                <X size={16} />
              </button>
              <div className="relative px-6 py-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Mail size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">Envoyer un email</h2>
                  <p className="text-white/65 text-xs">{selectedUpgrade.user_email}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Sujet</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Statut de votre demande de mise à niveau"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Message</label>
                <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={6}
                  placeholder="Rédigez votre message à l'utilisateur…"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-sm text-[#18181B] outline-none focus:border-[#2E7D32] resize-none" />
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: '#E8F1FD' }}>
                <Send size={13} className="shrink-0 mt-0.5" style={{ color: '#1565C0' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#1E40AF' }}>
                  Les données de la demande (plan, montant, date) seront automatiquement incluses.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#E7E7EA] flex gap-2 shrink-0">
              <button onClick={() => setEmailDialogOpen(false)}
                className="flex-1 h-10 rounded-[10px] border border-[#E7E7EA] text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSendEmail}
                className="flex-1 h-10 rounded-[10px] text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                style={{ background: '#2E7D32' }}>
                <Send size={13} /> Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
