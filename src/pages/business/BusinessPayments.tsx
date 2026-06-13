import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import BusinessNav from '@/components/business/BusinessNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CreditCard, Clock, CheckCircle, XCircle, RefreshCw,
  Download, Search, Eye, Receipt, Printer, Copy, AlertTriangle,
  Wallet, BarChart3, TrendingUp, Building2, ExternalLink, ChevronDown, ChevronUp,
  CalendarClock,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Paiement {
  id: number;
  montant: number;
  statut: string | null;
  moyen_paiement: string | null;
  reference_transaction: string | null;
  created_at: string | null;
  updated_at: string | null;
  abonnement_statut: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  checkout_token: string | null;
}

const normalizeStatus = (raw: any): string => {
  if (!raw) return 'unknown';
  const s = String(raw).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/reuss|reussie|paid|confirmed|success|succeeded|completed/.test(s)) return 'completed';
  if (/en_attente|pending|attente/.test(s)) return 'pending';
  if (/echou|echec|failed|fail/.test(s)) return 'failed';
  if (/rembours|refunded/.test(s)) return 'refunded';
  if (/cancel|annul/.test(s)) return 'cancelled';
  return s;
};

const fmt = (date: string | null | undefined, pattern = 'dd MMM yyyy') => {
  if (!date) return '—';
  try { return format(new Date(date), pattern, { locale: fr }); } catch { return '—'; }
};

const fmtMoney = (n: number) => `${n.toLocaleString('fr-FR')} F CFA`;

function printReceipt(p: Paiement, companyName: string) {
  const win = window.open('', '_blank', 'width=600,height=700');
  if (!win) return;
  const ref = p.reference_transaction || `#${p.id}`;
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Reçu ${ref}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#f5f5f5; display:flex; justify-content:center; padding:40px 20px; }
    .receipt { background:#fff; width:100%; max-width:480px; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.12); }
    .header { background:linear-gradient(135deg,#1a1a2e,#0f3460); color:#fff; padding:28px 24px; text-align:center; }
    .header h1 { font-size:22px; font-weight:700; }
    .header p { font-size:13px; opacity:.85; margin-top:4px; }
    .status-badge { display:inline-flex; align-items:center; gap:6px; margin-top:14px; background:rgba(255,255,255,.2); border-radius:20px; padding:5px 14px; font-size:13px; font-weight:600; }
    .body { padding:24px; }
    .amount-block { text-align:center; padding:20px 0; border-bottom:1px dashed #e5e7eb; margin-bottom:20px; }
    .amount-block .label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
    .amount-block .amount { font-size:36px; font-weight:800; color:#111827; margin-top:4px; }
    .amount-block .currency { font-size:14px; color:#6b7280; margin-top:2px; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; padding:9px 0; border-bottom:1px solid #f3f4f6; }
    .row .key { font-size:13px; color:#6b7280; }
    .row .val { font-size:13px; font-weight:600; color:#111827; text-align:right; max-width:55%; word-break:break-all; }
    .footer { text-align:center; padding:18px 24px; background:#f9fafb; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; }
    @media print { body { background:#fff; padding:0; } .receipt { box-shadow:none; border-radius:0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Reçu de paiement Business</p>
      <div class="status-badge">✓ Paiement confirmé</div>
    </div>
    <div class="body">
      <div class="amount-block">
        <div class="label">Montant payé</div>
        <div class="amount">${p.montant.toLocaleString('fr-FR')}</div>
        <div class="currency">F CFA</div>
      </div>
      <div class="row"><span class="key">Référence</span><span class="val">${ref}</span></div>
      <div class="row"><span class="key">Compte</span><span class="val">${companyName}</span></div>
      ${p.plan_name ? `<div class="row"><span class="key">Plan</span><span class="val">${p.plan_name}</span></div>` : ''}
      <div class="row"><span class="key">Date</span><span class="val">${fmt(p.created_at, 'dd MMMM yyyy à HH:mm')}</span></div>
      ${p.moyen_paiement ? `<div class="row"><span class="key">Méthode</span><span class="val">${p.moyen_paiement}</span></div>` : ''}
    </div>
    <div class="footer">Ce reçu est généré automatiquement par Portefolia. Conservez-le pour vos archives.</div>
  </div>
  <script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`);
  win.document.close();
}

function exportCSV(paiements: Paiement[]) {
  const rows = [
    ['Date', 'Référence', 'Plan', 'Montant (F CFA)', 'Statut', 'Méthode'],
    ...paiements.map(p => [
      fmt(p.created_at, 'dd/MM/yyyy HH:mm'),
      p.reference_transaction || '',
      p.plan_name || '',
      String(p.montant),
      p.statut || '',
      p.moyen_paiement || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paiements_business_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
}

function StatusBadge({ statut }: { statut: string | null | undefined }) {
  switch (normalizeStatus(statut)) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 font-medium"><CheckCircle className="w-3 h-3" />Payé</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 font-medium"><Clock className="w-3 h-3" />En attente</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1 font-medium"><XCircle className="w-3 h-3" />Échoué</Badge>;
    case 'refunded':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1 font-medium"><RefreshCw className="w-3 h-3" />Remboursé</Badge>;
    default:
      return <Badge variant="outline">{statut || '—'}</Badge>;
  }
}

function StatCard({ label, value, sub, icon, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex items-center gap-4`}>
      <div className="p-2.5 bg-white/60 rounded-xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold mt-0.5 leading-none truncate">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const BusinessPayments: React.FC = () => {
  const { account } = useBusiness();
  const { signOut } = useAuth();
  const { currentPlan } = usePlan();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [selected, setSelected] = useState<Paiement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copying, setCopying] = useState<number | null>(null);

  const primaryColor = account?.primary_color || '#1a1a2e';
  const secondaryColor = account?.secondary_color || '#16213e';
  const accentColor = account?.accent_color || '#0f3460';
  const companyName = account?.company_name || 'Votre entreprise';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/business/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      const rows: Paiement[] = (data.paiements || []).map((p: any) => ({
        id: p.id,
        montant: Number(p.montant || 0),
        statut: normalizeStatus(p.statut),
        moyen_paiement: p.moyen_paiement || null,
        reference_transaction: p.reference_transaction || null,
        created_at: p.created_at || null,
        updated_at: p.updated_at || null,
        abonnement_statut: p.abonnement_statut || null,
        plan_name: p.plan_name || null,
        plan_slug: p.plan_slug || null,
        checkout_token: p.checkout_token || null,
      }));
      setPaiements(rows);
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
      setPaiements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const completed = useMemo(() => paiements.filter(p => p.statut === 'completed'), [paiements]);
  const pending = useMemo(() => paiements.filter(p => p.statut === 'pending'), [paiements]);
  const totalRevenue = useMemo(() => completed.reduce((s, p) => s + p.montant, 0), [completed]);
  const monthRevenue = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    return completed.filter(p => p.created_at && new Date(p.created_at) >= start).reduce((s, p) => s + p.montant, 0);
  }, [completed]);

  const filtered = useMemo(() => {
    let list = [...paiements];
    if (statusFilter !== 'all') list = list.filter(p => p.statut === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.reference_transaction?.toLowerCase().includes(q) ||
        p.plan_name?.toLowerCase().includes(q) ||
        p.moyen_paiement?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'date') {
        const d = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        return sortOrder === 'desc' ? -d : d;
      }
      return sortOrder === 'desc' ? b.montant - a.montant : a.montant - b.montant;
    });
    return list;
  }, [paiements, statusFilter, search, sortBy, sortOrder]);

  const handleSort = (f: 'date' | 'amount') => {
    if (sortBy === f) setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSortBy(f); setSortOrder('desc'); }
  };

  const copyRef = async (p: Paiement) => {
    const ref = p.reference_transaction || '';
    if (!ref) return;
    await navigator.clipboard.writeText(ref);
    setCopying(p.id);
    toast({ title: 'Référence copiée' });
    setTimeout(() => setCopying(null), 1500);
  };

  const TABS = [
    { key: 'all', label: 'Tous', count: paiements.length },
    { key: 'completed', label: 'Payés', count: completed.length },
    { key: 'pending', label: 'En attente', count: pending.length },
    { key: 'failed', label: 'Échoués', count: paiements.filter(p => p.statut === 'failed').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessNav onSignOut={signOut} />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, ${accentColor} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            {account?.company_logo_url ? (
              <img src={account.company_logo_url} alt={companyName} className="h-14 w-14 object-contain rounded-xl bg-white/20 p-1.5 shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Building2 className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Historique des paiements</h1>
              <p className="text-white/70 text-sm mt-0.5">{companyName} — Abonnements et transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Pending Wave payments banner */}
        {pending.length > 0 && (
          <div className="space-y-3">
            {pending.filter(p => p.checkout_token).map(p => (
              <div
                key={p.id}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      Paiement en attente — {p.plan_name || 'Abonnement Business'}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {fmtMoney(p.montant)} · {fmt(p.created_at)} · {p.moyen_paiement || 'Wave'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/checkout?token=${p.checkout_token}`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 font-semibold shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Payer maintenant
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total dépensé"
              icon={<Wallet className="w-5 h-5 text-green-600" />}
              value={fmtMoney(totalRevenue)}
              sub={`${completed.length} transaction${completed.length !== 1 ? 's' : ''}`}
              bg="bg-green-50 text-green-900"
            />
            <StatCard
              label="Mois en cours"
              icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              value={fmtMoney(monthRevenue)}
              sub={format(new Date(), 'MMMM yyyy', { locale: fr })}
              bg="bg-blue-50 text-blue-900"
            />
            <StatCard
              label="Transactions"
              icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
              value={paiements.length}
              sub={`${pending.length} en attente`}
              bg="bg-purple-50 text-purple-900"
            />
            <StatCard
              label="Taux de réussite"
              icon={<CheckCircle className="w-5 h-5 text-amber-600" />}
              value={paiements.length > 0 ? `${Math.round((completed.length / paiements.length) * 100)}%` : '—'}
              sub={`${completed.length} / ${paiements.length} réussies`}
              bg="bg-amber-50 text-amber-900"
            />
          </div>
        )}

        {/* Prochain renouvellement */}
        {currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
          <div className="bg-white border border-emerald-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Abonnement actif</p>
                <p className="font-bold text-gray-900 text-sm">{currentPlan.name}</p>
                {(currentPlan.next_billing_date || currentPlan.end_date) ? (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Prochain renouvellement : <strong>{fmt(currentPlan.next_billing_date || currentPlan.end_date, 'dd MMMM yyyy')}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Renouvellement à définir</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/reabonnement')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Renouveler l'abonnement
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Référence, plan, méthode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === tab.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={statusFilter === tab.key ? { backgroundColor: primaryColor } : {}}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 ${statusFilter === tab.key ? 'text-white/70' : 'text-gray-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Transactions</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-800 font-medium transition-colors">
                Date {sortBy === 'date' ? (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
              </button>
              <span>·</span>
              <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-gray-800 font-medium transition-colors">
                Montant {sortBy === 'amount' ? (sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">Erreur de chargement</p>
              <p className="text-gray-500 text-xs mb-4">{error}</p>
              <Button size="sm" onClick={loadData}>Réessayer</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">
                {search || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun paiement'}
              </p>
              <p className="text-gray-500 text-xs">
                {search || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : "Aucun paiement n'a encore été effectué pour ce compte Business."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map(p => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fmtMoney(p.montant)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(p.created_at, 'dd MMM yyyy · HH:mm')}</p>
                      </div>
                      <StatusBadge statut={p.statut} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {p.plan_name && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{p.plan_name}</span>}
                      {p.reference_transaction && (
                        <span className="font-mono truncate max-w-[160px]">{p.reference_transaction}</span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-gray-100">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setSelected(p); setDialogOpen(true); }}>
                        <Eye className="w-3.5 h-3.5" /> Détails
                      </Button>
                      {p.statut === 'completed' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-700" onClick={() => printReceipt(p, companyName)}>
                          <Printer className="w-3.5 h-3.5" /> Reçu
                        </Button>
                      )}
                      {p.statut === 'pending' && p.checkout_token && (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white ml-auto"
                          onClick={() => navigate(`/checkout?token=${p.checkout_token}`)}>
                          <CreditCard className="w-3.5 h-3.5" /> Payer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/60">
                      <TableHead className="text-xs font-semibold text-gray-500 pl-5">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Référence</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Plan</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Montant</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Méthode</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-right pr-5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => (
                      <TableRow key={p.id} className="hover:bg-gray-50/60 transition-colors">
                        <TableCell className="pl-5">
                          <p className="text-sm font-medium text-gray-900">{fmt(p.created_at, 'dd MMM yyyy')}</p>
                          <p className="text-xs text-gray-400">{fmt(p.created_at, 'HH:mm')}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-xs text-gray-600 max-w-[160px] truncate" title={p.reference_transaction || ''}>
                            {p.reference_transaction || '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 max-w-[120px] truncate">{p.plan_name || '—'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold text-gray-900">{fmtMoney(p.montant)}</p>
                        </TableCell>
                        <TableCell><StatusBadge statut={p.statut} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[90px]">{p.moyen_paiement || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.statut === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printReceipt(p, companyName)}
                                className="h-7 px-2.5 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                              >
                                <Printer className="w-3.5 h-3.5" /> Reçu
                              </Button>
                            )}
                            {p.statut === 'pending' && p.checkout_token && (
                              <Button
                                size="sm"
                                onClick={() => navigate(`/checkout?token=${p.checkout_token}`)}
                                className="h-7 px-2.5 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Payer
                              </Button>
                            )}
                            <button
                              onClick={() => copyRef(p)}
                              title="Copier la référence"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              {copying === p.id
                                ? <CheckCircle className="w-4 h-4 text-green-500" />
                                : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => { setSelected(p); setDialogOpen(true); }}
                              title="Voir les détails"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Détails du paiement
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {selected?.reference_transaction || `#${selected?.id}`}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Montant</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtMoney(selected.montant)}</p>
                </div>
                <StatusBadge statut={selected.statut} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Date de paiement', value: fmt(selected.created_at, 'dd MMM yyyy à HH:mm') },
                  { label: 'Mise à jour', value: fmt(selected.updated_at, 'dd MMM yyyy à HH:mm') },
                  { label: 'Méthode', value: selected.moyen_paiement || '—' },
                  ...(selected.plan_name ? [{ label: 'Plan', value: selected.plan_name }] : []),
                  ...(selected.abonnement_statut ? [{ label: 'Statut abonnement', value: selected.abonnement_statut }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-900 text-sm break-words">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selected.statut === 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => printReceipt(selected, companyName)} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Imprimer le reçu
                  </Button>
                )}
                {selected.statut === 'pending' && selected.checkout_token && (
                  <Button
                    size="sm"
                    onClick={() => { setDialogOpen(false); navigate(`/checkout?token=${selected.checkout_token}`); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Payer maintenant
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => copyRef(selected)} className="gap-1.5 ml-auto">
                  <Copy className="w-3.5 h-3.5" /> Copier la réf.
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessPayments;
