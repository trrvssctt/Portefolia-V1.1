import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isTokenExpired } from '@/utils/authUtils';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Download, Search, Filter, Eye, FileText, CreditCard, CheckCircle,
  XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Calendar,
  TrendingUp, Receipt, BarChart3, Bell, ArrowRight,
  Copy, Printer, AlertTriangle, Wallet, ExternalLink,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Paiement {
  id: number;
  reference_transaction?: string | null;
  reference?: string | null;
  numero_commande?: string | null;
  montant: number;
  currency?: string | null;
  statut?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  moyen_paiement?: string | null;
  payment_method?: string | null;
  payment_gateway?: string | null;
  invoice_id?: string | number | null;
  invoice_url?: string | null;
  metadata?: any;
  plan_name?: string;
  abonnement_id?: number | null;
  notes?: string | null;
}

interface Abonnement {
  id: number;
  statut: string;
  montant: number;
  currency?: string;
  end_date?: string | null;
  plan_id?: number;
  plan?: { name?: string; slug?: string };
  metadata?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeStatus = (raw: any): string => {
  if (!raw) return 'unknown';
  try {
    const s = raw.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    if (/reuss|reussie|paid|confirmed|success|succeeded|completed/.test(s)) return 'completed';
    if (/en_attente|pending|attente/.test(s)) return 'pending';
    if (/echou|echec|failed|fail/.test(s)) return 'failed';
    if (/rembours|refunded/.test(s)) return 'refunded';
    if (/cancel|annul/.test(s)) return 'cancelled';
    return s;
  } catch {
    return String(raw).toLowerCase();
  }
};

const fmt = (date: string | null | undefined, pattern = 'dd MMM yyyy') => {
  if (!date) return '—';
  try { return format(new Date(date), pattern, { locale: fr }); } catch { return '—'; }
};

const fmtMoney = (n: number, currency = 'F CFA') =>
  `${n.toLocaleString('fr-FR')} ${currency}`;

// ─── Génération de reçu imprimable ───────────────────────────────────────────
function printReceipt(p: Paiement, userName: string) {
  const win = window.open('', '_blank', 'width=600,height=700');
  if (!win) return;
  const ref = p.reference_transaction || p.reference || `#${p.id}`;
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Reçu ${ref}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#f5f5f5; display:flex; justify-content:center; padding:40px 20px; }
    .receipt { background:#fff; width:100%; max-width:480px; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.12); }
    .header { background:linear-gradient(135deg,#28A745,#20c954); color:#fff; padding:28px 24px; text-align:center; }
    .header h1 { font-size:22px; font-weight:700; letter-spacing:-.3px; }
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
      <h1>Portefolia</h1>
      <p>Reçu de paiement</p>
      <div class="status-badge">✓ ${p.statut === 'completed' ? 'Paiement confirmé' : p.statut}</div>
    </div>
    <div class="body">
      <div class="amount-block">
        <div class="label">Montant payé</div>
        <div class="amount">${p.montant.toLocaleString('fr-FR')}</div>
        <div class="currency">${p.currency || 'F CFA'}</div>
      </div>
      <div class="row"><span class="key">Référence</span><span class="val">${ref}</span></div>
      <div class="row"><span class="key">Client</span><span class="val">${userName}</span></div>
      ${p.plan_name ? `<div class="row"><span class="key">Plan</span><span class="val">${p.plan_name}</span></div>` : ''}
      <div class="row"><span class="key">Date</span><span class="val">${fmt(p.created_at, 'dd MMMM yyyy à HH:mm')}</span></div>
      ${p.payment_method ? `<div class="row"><span class="key">Méthode</span><span class="val">${p.payment_method}</span></div>` : ''}
      ${p.payment_gateway ? `<div class="row"><span class="key">Plateforme</span><span class="val">${p.payment_gateway}</span></div>` : ''}
    </div>
    <div class="footer">Ce reçu est généré automatiquement par Portefolia. Conservez-le pour vos archives.</div>
  </div>
  <script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`);
  win.document.close();
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(paiements: Paiement[]) {
  const rows = [
    ['Date', 'Référence', 'Plan', 'Montant', 'Devise', 'Statut', 'Méthode'],
    ...paiements.map(p => [
      fmt(p.created_at, 'dd/MM/yyyy HH:mm'),
      p.reference_transaction || p.reference || '',
      p.plan_name || '',
      String(p.montant),
      p.currency || 'F CFA',
      p.statut || '',
      p.payment_method || p.moyen_paiement || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paiements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
}

// ─── Composants de badge statut ───────────────────────────────────────────────
function StatusBadge({ statut }: { statut: string | null | undefined }) {
  switch (statut) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 font-medium"><CheckCircle className="w-3 h-3" />Payé</Badge>;
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 font-medium"><Clock className="w-3 h-3" />En attente</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1 font-medium"><XCircle className="w-3 h-3" />Échoué</Badge>;
    case 'refunded':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1 font-medium"><RefreshCw className="w-3 h-3" />Remboursé</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="text-gray-500 gap-1"><XCircle className="w-3 h-3" />Annulé</Badge>;
    default:
      return <Badge variant="outline">{statut || '—'}</Badge>;
  }
}

// ─── Carte stat ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent: string;
}) {
  return (
    <div className={`${accent} rounded-2xl p-4 flex items-center gap-4`}>
      <div className="p-2.5 bg-white/60 rounded-xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold mt-0.5 leading-none truncate">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function HistoriqueUserPaiement() {
  const [loading, setLoading] = useState(true);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPaiement, setSelectedPaiement] = useState<Paiement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copying, setCopying] = useState<number | null>(null);

  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();

  const userName = profile
    ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email || 'Utilisateur'
    : 'Utilisateur';

  // Token expiré
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      navigate('/auth');
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Chargement paiements + abonnements en parallèle
  const loadData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    try {
      const [payRes, abRes] = await Promise.all([
        fetch(`${API_BASE}/api/users/me/paiements`, {
          headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
        }),
        fetch(`${API_BASE}/api/abonnements/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (!payRes.ok) {
        if (payRes.status === 401) throw new Error('Session expirée. Veuillez vous reconnecter.');
        throw new Error(`Erreur ${payRes.status}`);
      }

      const payJson = await payRes.json();
      const items: Paiement[] = (payJson.paiements || payJson.payments || []).map((item: any) => ({
        id: item.id,
        reference_transaction: item.reference_transaction || item.transaction_id || null,
        reference: item.reference || null,
        montant: Number(item.montant || item.amount || 0),
        currency: item.currency || 'F CFA',
        statut: normalizeStatus(item.statut || item.status || ''),
        created_at: item.created_at || item.date_paiement || null,
        updated_at: item.updated_at || null,
        moyen_paiement: item.moyen_paiement || null,
        payment_method: item.payment_method || item.moyen_paiement || (item.metadata?.payment_method) || null,
        payment_gateway: item.payment_gateway || null,
        invoice_id: item.invoice_id || item.metadata?.invoice_id || null,
        invoice_url: item.invoice_url || null,
        metadata: item.metadata || null,
        plan_name: item.plan_name || item.plan?.name || null,
        abonnement_id: item.abonnement_id || item.subscription_id || null,
        notes: item.notes || null,
      }));
      setPaiements(items);

      if (abRes?.ok) {
        const abJson = await abRes.json();
        const abs: Abonnement[] = (abJson.abonnements || []).map((a: any) => ({
          id: a.id,
          statut: a.statut || '',
          montant: Number(a.montant || 0),
          currency: a.currency || 'F CFA',
          end_date: a.end_date || null,
          plan_id: a.plan_id,
          plan: a.plan || null,
          metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || null),
        }));
        setAbonnements(abs);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
      setPaiements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Prochain paiement (abonnement actif avec end_date future)
  const nextPayment = useMemo(() => {
    const candidates = abonnements.filter(a => {
      const s = (a.statut || '').toLowerCase();
      return (s === 'active' || s === 'pending') && a.end_date && new Date(a.end_date) > new Date();
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
    return candidates[0];
  }, [abonnements]);

  const daysUntilNext = nextPayment?.end_date
    ? differenceInDays(new Date(nextPayment.end_date), new Date())
    : null;

  // Filtrage & tri
  const filtered = useMemo(() => {
    let list = [...paiements];
    if (statusFilter !== 'all') list = list.filter(p => p.statut === statusFilter);
    if (periodFilter !== 'all') {
      const cutoff = new Date();
      if (periodFilter === '30d') cutoff.setDate(cutoff.getDate() - 30);
      else if (periodFilter === '90d') cutoff.setDate(cutoff.getDate() - 90);
      else if (periodFilter === '365d') cutoff.setDate(cutoff.getDate() - 365);
      list = list.filter(p => p.created_at && new Date(p.created_at) >= cutoff);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.reference?.toLowerCase().includes(t) ||
        p.reference_transaction?.toLowerCase().includes(t) ||
        p.plan_name?.toLowerCase().includes(t) ||
        p.payment_method?.toLowerCase().includes(t)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'date') {
        const d = (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime());
        return sortOrder === 'desc' ? -d : d;
      }
      return sortOrder === 'desc' ? b.montant - a.montant : a.montant - b.montant;
    });
    return list;
  }, [paiements, statusFilter, periodFilter, searchTerm, sortBy, sortOrder]);

  // Stats
  const completed = useMemo(() => paiements.filter(p => p.statut === 'completed'), [paiements]);
  const pending = useMemo(() => paiements.filter(p => p.statut === 'pending'), [paiements]);
  const totalRevenue = useMemo(() => completed.reduce((s, p) => s + p.montant, 0), [completed]);
  const monthRevenue = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    return completed.filter(p => p.created_at && new Date(p.created_at) >= start).reduce((s, p) => s + p.montant, 0);
  }, [completed]);

  const handleSort = (f: 'date' | 'amount') => {
    if (sortBy === f) setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSortBy(f); setSortOrder('desc'); }
  };

  const copyRef = async (p: Paiement) => {
    const ref = p.reference_transaction || p.reference || '';
    if (!ref) return;
    await navigator.clipboard.writeText(ref);
    setCopying(p.id);
    toast({ title: 'Référence copiée' });
    setTimeout(() => setCopying(null), 1500);
  };

  const handleSignOut = async () => { await signOut(); };

  // ─── Squelette ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#28A745] rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── En-tête ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historique des paiements</h1>
            <p className="text-sm text-gray-500 mt-1">Consultez et téléchargez vos reçus et factures</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 h-9">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0} className="gap-1.5 h-9">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exporter CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        {/* ── Prochain paiement ── */}
        {nextPayment && (
          <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${daysUntilNext !== null && daysUntilNext <= 7
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${daysUntilNext !== null && daysUntilNext <= 7 ? 'bg-red-100' : 'bg-blue-100'}`}>
                {daysUntilNext !== null && daysUntilNext <= 7
                  ? <AlertTriangle className="w-5 h-5 text-red-600" />
                  : <Bell className="w-5 h-5 text-blue-600" />
                }
              </div>
              <div>
                <p className={`font-semibold text-sm ${daysUntilNext !== null && daysUntilNext <= 7 ? 'text-red-900' : 'text-blue-900'}`}>
                  {daysUntilNext !== null && daysUntilNext <= 7 ? 'Paiement imminent' : 'Prochain paiement'}
                </p>
                <p className={`text-xs mt-0.5 ${daysUntilNext !== null && daysUntilNext <= 7 ? 'text-red-700' : 'text-blue-700'}`}>
                  <strong>{fmtMoney(nextPayment.montant, nextPayment.currency)}</strong>
                  {' '}— Plan <strong>{nextPayment.plan?.name || `#${nextPayment.plan_id}`}</strong>
                  {' '}— échéance le <strong>{fmt(nextPayment.end_date, 'dd MMMM yyyy')}</strong>
                  {daysUntilNext !== null && (
                    <span className="ml-1">
                      ({daysUntilNext === 0 ? "aujourd'hui" : daysUntilNext === 1 ? 'demain' : `dans ${daysUntilNext} jours`})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/upgrade')}
              className={`shrink-0 gap-1.5 font-semibold ${daysUntilNext !== null && daysUntilNext <= 7
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              Gérer mon abonnement <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* ── Stats ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Total dépensé" icon={<Wallet className="w-5 h-5 text-green-600" />}
              value={fmtMoney(totalRevenue)} sub={`${completed.length} transaction${completed.length > 1 ? 's' : ''}`}
              accent="bg-green-50 text-green-900"
            />
            <StatCard
              label="Mois en cours" icon={<Calendar className="w-5 h-5 text-blue-600" />}
              value={fmtMoney(monthRevenue)} sub={format(new Date(), 'MMMM yyyy', { locale: fr })}
              accent="bg-blue-50 text-blue-900"
            />
            <StatCard
              label="Transactions" icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
              value={paiements.length}
              sub={`${pending.length} en attente`}
              accent="bg-purple-50 text-purple-900"
            />
            <StatCard
              label="Taux de réussite" icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
              value={paiements.length > 0 ? `${Math.round((completed.length / paiements.length) * 100)}%` : '—'}
              sub={`${completed.length} / ${paiements.length} réussies`}
              accent="bg-amber-50 text-amber-900"
            />
          </div>
        )}

        {/* ── Abonnements en attente de paiement ── */}
        {(() => {
          const pendingAbs = abonnements.filter(a => {
            const s = (a.statut || '').toLowerCase();
            return s === 'pending' || s === 'en_attente';
          });
          if (!pendingAbs.length) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {pendingAbs.length === 1
                    ? '1 abonnement en attente de paiement'
                    : `${pendingAbs.length} abonnements en attente de paiement`}
                </h2>
              </div>
              {pendingAbs.map(a => {
                const token =
                  a.metadata?.payment_token ||
                  a.metadata?.checkout_token ||
                  null;
                const planName = a.plan?.name || (a.plan_id ? `Plan #${a.plan_id}` : 'Abonnement');
                return (
                  <div
                    key={a.id}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-900 text-sm">{planName}</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {fmtMoney(a.montant, a.currency)} · En attente de paiement
                        </p>
                        {a.end_date && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            Expire le {fmt(a.end_date, 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {token ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/checkout?token=${token}`)}
                          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 font-semibold"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Payer maintenant
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/upgrade')}
                          className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-1.5"
                        >
                          Gérer <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Filtres ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par référence, plan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10 text-sm">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les périodes</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">3 derniers mois</SelectItem>
                <SelectItem value="365d">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-5 h-9 gap-0">
                <TabsTrigger value="all" className="text-xs whitespace-nowrap px-3">Tous ({paiements.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs whitespace-nowrap px-3">
                  <CheckCircle className="w-3 h-3 sm:hidden mr-1" />
                  <span className="hidden sm:inline">Payés</span>
                  <span className="sm:hidden">Payés</span>
                  {' '}({completed.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs whitespace-nowrap px-3">
                  <Clock className="w-3 h-3 sm:hidden mr-1" />
                  <span className="hidden sm:inline">Attente</span>
                  <span className="sm:hidden">Attente</span>
                  {' '}({pending.length})
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-xs whitespace-nowrap px-3">
                  <XCircle className="w-3 h-3 sm:hidden mr-1" />
                  <span className="hidden sm:inline">Échoués</span>
                  <span className="sm:hidden">Échoués</span>
                  {' '}({paiements.filter(p => p.statut === 'failed').length})
                </TabsTrigger>
                <TabsTrigger value="refunded" className="text-xs whitespace-nowrap px-3">
                  <span className="hidden sm:inline">Remboursés</span>
                  <span className="sm:hidden">Remb.</span>
                  {' '}({paiements.filter(p => p.statut === 'refunded').length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        {/* ── Liste des paiements ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Transactions</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
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
                {searchTerm || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucun paiement'}
              </p>
              <p className="text-gray-500 text-xs mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : "Vous n'avez encore effectué aucun paiement."}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button size="sm" onClick={() => navigate('/upgrade')} className="bg-[#28A745] hover:bg-green-600 text-white gap-1.5">
                  Découvrir nos formules <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile : cartes */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map(p => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{fmtMoney(p.montant, p.currency ?? undefined)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(p.created_at, 'dd MMM yyyy · HH:mm')}</p>
                      </div>
                      <StatusBadge statut={p.statut} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {p.plan_name && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{p.plan_name}</span>}
                      {(p.reference_transaction || p.reference) && (
                        <span className="font-mono truncate max-w-[160px]">{p.reference_transaction || p.reference}</span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-gray-100">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-600" onClick={() => { setSelectedPaiement(p); setDialogOpen(true); }}>
                        <Eye className="w-3.5 h-3.5" /> Détails
                      </Button>
                      {p.statut === 'completed' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-700" onClick={() => printReceipt(p, userName)}>
                          <Printer className="w-3.5 h-3.5" /> Reçu
                        </Button>
                      )}
                      {(p.invoice_id || p.invoice_url) && (
                        <a href={p.invoice_url || `${API_BASE}/api/admin/invoices/${p.invoice_id}/pdf`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 h-7 px-2">
                          <FileText className="w-3.5 h-3.5" /> Facture
                        </a>
                      )}
                      {p.statut === 'pending' && (() => {
                        const ab = abonnements.find(a => a.id === p.abonnement_id);
                        const token = ab?.metadata?.payment_token || ab?.metadata?.checkout_token;
                        return token ? (
                          <Button size="sm" className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white ml-auto"
                            onClick={() => navigate(`/checkout?token=${token}`)}>
                            <CreditCard className="w-3.5 h-3.5" /> Payer
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop : tableau */}
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
                          <p className="font-mono text-xs text-gray-600 max-w-[160px] truncate" title={p.reference_transaction || p.reference || ''}>
                            {p.reference_transaction || p.reference || '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 max-w-[120px] truncate">{p.plan_name || '—'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-semibold text-gray-900">{fmtMoney(p.montant, p.currency ?? undefined)}</p>
                        </TableCell>
                        <TableCell><StatusBadge statut={p.statut} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[90px]">{p.payment_method || p.moyen_paiement || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reçu pour paiements complétés */}
                            {p.statut === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printReceipt(p, userName)}
                                className="h-7 px-2.5 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                              >
                                <Printer className="w-3.5 h-3.5" /> Reçu
                              </Button>
                            )}
                            {/* Facture si disponible */}
                            {(p.invoice_id || p.invoice_url) && (
                              <Button size="sm" variant="outline" asChild
                                className="h-7 px-2.5 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                <a href={p.invoice_url || `${API_BASE}/api/admin/invoices/${p.invoice_id}/pdf`}
                                  target="_blank" rel="noopener noreferrer">
                                  <FileText className="w-3.5 h-3.5" /> Facture
                                </a>
                              </Button>
                            )}
                            {/* Copier la référence */}
                            <button
                              onClick={() => copyRef(p)}
                              title="Copier la référence"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              {copying === p.id
                                ? <CheckCircle className="w-4 h-4 text-green-500" />
                                : <Copy className="w-4 h-4" />}
                            </button>
                            {/* Détails */}
                            <button
                              onClick={() => { setSelectedPaiement(p); setDialogOpen(true); }}
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

      {/* ── Modal détails ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Détails du paiement
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {selectedPaiement?.reference_transaction || selectedPaiement?.reference || `#${selectedPaiement?.id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPaiement && (
            <div className="space-y-4">
              {/* Montant + statut */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Montant</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtMoney(selectedPaiement.montant, selectedPaiement.currency ?? undefined)}</p>
                </div>
                <StatusBadge statut={selectedPaiement.statut} />
              </div>

              {/* Champs détails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Date de paiement', value: fmt(selectedPaiement.created_at, 'dd MMM yyyy à HH:mm') },
                  { label: 'Mise à jour', value: fmt(selectedPaiement.updated_at, 'dd MMM yyyy à HH:mm') },
                  { label: 'Méthode', value: selectedPaiement.payment_method || selectedPaiement.moyen_paiement || '—' },
                  { label: 'Plateforme', value: selectedPaiement.payment_gateway || '—' },
                  ...(selectedPaiement.plan_name ? [{ label: 'Plan', value: selectedPaiement.plan_name }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-900 text-sm break-words">{value}</p>
                  </div>
                ))}
              </div>

              {selectedPaiement.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  {selectedPaiement.notes}
                </div>
              )}

              {/* Actions dans le modal */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedPaiement.statut === 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => printReceipt(selectedPaiement, userName)} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Imprimer le reçu
                  </Button>
                )}
                {(selectedPaiement.invoice_id || selectedPaiement.invoice_url) && (
                  <Button size="sm" variant="outline" asChild className="gap-1.5">
                    <a href={selectedPaiement.invoice_url || `${API_BASE}/api/admin/invoices/${selectedPaiement.invoice_id}/pdf`} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-3.5 h-3.5" /> Voir la facture
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => copyRef(selectedPaiement)} className="gap-1.5 ml-auto">
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
}
