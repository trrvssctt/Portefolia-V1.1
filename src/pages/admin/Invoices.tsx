import { useEffect, useState, useMemo } from 'react';
import {
  Search, Download, FileText, RefreshCw, Calendar, User, CreditCard,
  TrendingUp, Eye, Receipt, CheckCircle2, XCircle, Clock, Copy, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id: number;
  reference: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  payment_method: string;
  notes: string | null;
  invoice_number: string;
  due_date: string | null;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';

const STATUS_PILL: Record<string, { c: string; bg: string; label: string }> = {
  paid:    { c: '#2E7D32', bg: '#EAF5EB', label: 'Payée' },
  pending: { c: '#B45309', bg: '#FEF3E2', label: 'En attente' },
  overdue: { c: '#C62828', bg: '#FEECEC', label: 'En retard' },
  draft:   { c: '#52525B', bg: '#F4F4F5', label: 'Brouillon' },
};

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

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminInvoices() {
  const { toast } = useToast();

  const [invoices, setInvoices]           = useState<Invoice[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [dateFilter, setDateFilter]       = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen]     = useState(false);
  const [stats, setStats] = useState({
    total: 0, paid: 0, pending: 0, overdue: 0,
    totalAmount: 0, avgAmount: 0, thisMonth: 0,
  });

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadInvoices = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');
      const res = await fetch(`${API_BASE}/api/admin/invoices?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur réseau');
      const data = await res.json();
      const items = data.invoices || [];

      const normalized: Invoice[] = items.map((inv: any) => ({
        id: inv.id,
        reference: inv.reference || inv.reference_transaction || '',
        user_email: inv.user_email || inv.email || '',
        user_name: inv.user_name || inv.user_prenom || '',
        plan_name: inv.plan_name || inv.plan || '',
        amount: Number(inv.amount || inv.montant || inv.total || 0),
        currency: inv.currency || 'F CFA',
        status: inv.status || inv.statut || 'pending',
        created_at: inv.created_at || inv.createdAt || new Date().toISOString(),
        paid_at: inv.paid_at || inv.date_paiement || null,
        payment_method: inv.payment_method || inv.moyen_paiement || 'unknown',
        notes: inv.notes || inv.commentaire || null,
        invoice_number: inv.invoice_number || inv.numero_facture || `FACT-${inv.id}`,
        due_date: inv.due_date || inv.date_echeance || null,
      }));

      setInvoices(normalized);

      const total   = normalized.length;
      const paid    = normalized.filter(i => i.status === 'paid').length;
      const pending = normalized.filter(i => i.status === 'pending').length;
      const overdue = normalized.filter(i => i.status === 'overdue').length;
      const totalAmount = normalized.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonth = normalized.filter(i => new Date(i.created_at) >= thisMonthStart).length;

      setStats({ total, paid, pending, overdue, totalAmount, avgAmount: paid > 0 ? Math.round(totalAmount / paid) : 0, thisMonth });
    } catch (e) {
      console.error('Erreur chargement invoices', e);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(inv =>
        inv.reference.toLowerCase().includes(q) ||
        inv.user_email.toLowerCase().includes(q) ||
        inv.user_name.toLowerCase().includes(q) ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.plan_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(inv => inv.status === statusFilter);
    if (dateFilter !== 'all') {
      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter(inv => {
        const d = new Date(inv.created_at);
        if (dateFilter === 'today') return d >= today;
        if (dateFilter === 'week')  { const w = new Date(today); w.setDate(w.getDate() - 7); return d >= w; }
        if (dateFilter === 'month') { const m = new Date(today); m.setMonth(m.getMonth() - 1); return d >= m; }
        if (dateFilter === 'year')  { const y = new Date(today); y.setFullYear(y.getFullYear() - 1); return d >= y; }
        return true;
      });
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [invoices, search, statusFilter, dateFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const openHtmlInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/admin/invoices/${invoice.id}/html`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Impossible de récupérer la facture');
      const html = await res.text();
      window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    } catch (e) { console.error(e); }
  };

  const downloadPdfInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/admin/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Impossible de récupérer le PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `facture-${invoice.reference}.pdf`;
      document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const exportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/admin/invoices/export.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `factures-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const copyReference = (reference: string) => {
    navigator.clipboard.writeText(reference);
    toast({ title: 'Référence copiée' });
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

  const formatCurrency = (n: number, currency: string) =>
    `${n.toLocaleString('fr-FR')} ${currency}`;

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'CA facturé', value: formatCurrency(stats.totalAmount, 'F CFA'), sub: `${stats.paid} factures payées`, icon: TrendingUp, c: '#2E7D32', bg: '#EAF5EB', pct: 100 },
    { label: 'Payées', value: stats.paid, sub: `${stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}% du total`, icon: CheckCircle2, c: '#2E7D32', bg: '#EAF5EB', pct: stats.total > 0 ? (stats.paid / stats.total) * 100 : 0 },
    { label: 'En attente', value: stats.pending, sub: 'Validation en cours', icon: Clock, c: stats.pending > 0 ? '#B45309' : '#52525B', bg: stats.pending > 0 ? '#FEF3E2' : '#F4F4F5', pct: stats.total > 0 ? (stats.pending / stats.total) * 100 : 0 },
    { label: 'Ce mois', value: stats.thisMonth, sub: 'Nouvelles factures', icon: Calendar, c: '#1565C0', bg: '#E8F1FD', pct: null },
  ];

  // ── Status tabs ───────────────────────────────────────────────────────────────
  const STATUS_TABS = [
    ['all', 'Toutes'],
    ['paid', 'Payées'],
    ['pending', 'En attente'],
    ['overdue', 'En retard'],
    ['draft', 'Brouillon'],
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
              <Receipt size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Factures</h1>
              <p className="text-white/65 text-sm mt-0.5">
                {formatCurrency(stats.totalAmount, 'F CFA')} encaissés · {stats.total} factures émises
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportCsv}
              className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors">
              <Download size={15} /> Exporter CSV
            </button>
            <button onClick={loadInvoices}
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
          {kpis.map(({ label, value, sub, icon: Icon, c, bg, pct }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5 mb-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#18181B] leading-none tabular-nums truncate">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{label}</p>
                </div>
              </div>
              {pct !== null && (
                <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
                </div>
              )}
              <p className="text-[11px] text-zinc-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filter toolbar ─────────────────────────────────────────────────────── */}
        <div className="bg-white p-3 flex flex-col gap-3" style={CARD_STYLE}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input placeholder="Rechercher par référence, client, numéro de facture, plan…"
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
                <option value="year">Cette année</option>
              </select>
            </div>
          </div>
        </div>

        {/* Count strip */}
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: '#1B5E20' }}>
            {filteredInvoices.length}
          </span>
          <div>
            <p className="text-sm font-bold text-[#18181B]">Factures</p>
            <p className="text-xs text-zinc-400">
              {filteredInvoices.filter(i => i.status === 'paid').length} payées ·{' '}
              {filteredInvoices.filter(i => i.status === 'pending').length} en attente
              {filteredInvoices.filter(i => i.status === 'overdue').length > 0 && (
                <span className="text-[#C62828] ml-1">
                  · {filteredInvoices.filter(i => i.status === 'overdue').length} en retard
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {[1, 2, 3, 4, 5].map(i => (
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
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <Receipt size={24} />
            </span>
            <h3 className="font-bold text-[#18181B]">Aucune facture</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-xs">Aucune facture ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">N° Facture</th>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Méthode</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id}
                      className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50/70 transition-colors cursor-pointer"
                      onClick={() => { setSelectedInvoice(inv); setDetailsOpen(true); }}>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          {/* Status accent dot */}
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: (STATUS_PILL[inv.status] ?? STATUS_PILL.draft).c }} />
                          <div>
                            <p className="font-mono text-xs font-semibold text-[#18181B]">{inv.invoice_number}</p>
                            <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[120px]">{inv.reference}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#18181B] whitespace-nowrap">{inv.user_name || '—'}</p>
                        <p className="text-xs text-zinc-400 truncate max-w-[160px]">{inv.user_email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-[#18181B]">{inv.plan_name || '—'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-zinc-500 capitalize">{inv.payment_method}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold tabular-nums text-[#18181B] whitespace-nowrap">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-3"><StatusPill status={inv.status} /></td>
                      <td className="py-3 px-3 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDate(inv.created_at)}
                      </td>
                      <td className="py-3 px-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setSelectedInvoice(inv); setDetailsOpen(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Détails">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openHtmlInvoice(inv)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Prévisualiser HTML">
                            <FileText size={14} />
                          </button>
                          <button onClick={() => downloadPdfInvoice(inv)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Télécharger PDF">
                            <Download size={14} />
                          </button>
                          <button onClick={() => copyReference(inv.reference)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                            title="Copier référence">
                            <Copy size={14} />
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

      </div>

      {/* ── Details drawer (slide-in right) ──────────────────────────────────────── */}
      {detailsOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[80] flex justify-end" onClick={() => setDetailsOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
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
                <span className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Receipt size={28} strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{selectedInvoice.invoice_number}</h2>
                  <p className="text-white/70 text-sm font-mono truncate">{selectedInvoice.reference}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusPill status={selectedInvoice.status} />
                    <span className="text-xs font-semibold text-white/80">
                      {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Montant',  formatCurrency(selectedInvoice.amount, selectedInvoice.currency)],
                  ['Plan',     selectedInvoice.plan_name || '—'],
                  ['Méthode',  selectedInvoice.payment_method || '—'],
                  ['Créée le', formatDate(selectedInvoice.created_at)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-[#E7E7EA] p-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-[#18181B] truncate">{v}</p>
                  </div>
                ))}
              </div>

              {/* Client */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Client</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={15} className="text-zinc-400 shrink-0" />
                    <span className="text-[#18181B]">{selectedInvoice.user_name || '—'}</span>
                  </div>
                  {selectedInvoice.user_email && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard size={15} className="text-zinc-400 shrink-0" />
                      <a href={`mailto:${selectedInvoice.user_email}`}
                        className="text-[#1565C0] hover:underline break-all"
                        onClick={e => e.stopPropagation()}>
                        {selectedInvoice.user_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              {(selectedInvoice.paid_at || selectedInvoice.due_date) && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Dates</p>
                  <div className="space-y-2.5">
                    {selectedInvoice.paid_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 size={15} className="shrink-0" style={{ color: '#2E7D32' }} />
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Payée le</span>
                          <span className="font-semibold" style={{ color: '#2E7D32' }}>{formatDate(selectedInvoice.paid_at)}</span>
                        </div>
                      </div>
                    )}
                    {selectedInvoice.due_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <Clock size={15} className="shrink-0" style={{ color: '#C62828' }} />
                        <div>
                          <span className="text-[10px] text-zinc-400 block">Échéance</span>
                          <span className="font-semibold" style={{ color: '#C62828' }}>{formatDate(selectedInvoice.due_date)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Notes</p>
                  <div className="rounded-xl border border-[#E7E7EA] p-3 text-sm text-zinc-600 leading-relaxed"
                    style={{ background: '#E8F1FD' }}>
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="border-t border-[#E7E7EA] p-4 flex items-center gap-2 shrink-0">
              <button onClick={() => copyReference(selectedInvoice.reference)}
                className="h-10 w-10 rounded-lg border border-[#E7E7EA] flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-colors shrink-0"
                title="Copier la référence">
                <Copy size={14} />
              </button>
              <button onClick={() => openHtmlInvoice(selectedInvoice)}
                className="flex-1 h-10 rounded-lg border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 flex items-center justify-center gap-1.5 transition-colors">
                <FileText size={14} /> Voir HTML
              </button>
              <button onClick={() => downloadPdfInvoice(selectedInvoice)}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                style={{ background: '#2E7D32' }}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
