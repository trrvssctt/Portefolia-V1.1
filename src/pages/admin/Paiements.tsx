
import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
  ExternalLink,
  Download,
  Filter,
  BarChart3,
  DollarSign,
  CreditCard,
  Users,
  Calendar,
  Eye,
  MoreVertical,
  Clock,
  Receipt,
  QrCode,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  Box,
  TrendingDown,
  Layout,
  Banknote,
  Navigation,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { UserPaiementHistorique } from '@/components/admin/UserPaiementHistorique';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis as ReXAxis,
  YAxis as ReYAxis
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

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
  date_paiement: string | null;
  created_at: string;
  notes?: string;
  invoice_id?: string;
  motif_remboursement?: string | null;
};

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
}> = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="w-4 h-4" />,
    description: 'En attente de validation'
  },
  confirmed: {
    label: 'Confirmé',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Paiement confirmé'
  },
  paid: {
    label: 'Payé',
    color: 'text-green-600',
    bgColor: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Paiement finalisé'
  },
  failed: {
    label: 'Échoué',
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-800',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Paiement échoué'
  },
  upcoming: {
    label: 'À venir',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 text-indigo-800',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Paiements programmés (abonnements)'
  },
  refunded: {
    label: 'Remboursé',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 text-purple-800',
    icon: <RefreshCw className="w-4 h-4" />,
    description: 'Paiement remboursé'
  },
  reussi: {
    label: 'Réussi',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 text-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: 'Paiement réussi'
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 text-gray-800',
    icon: <XCircle className="w-4 h-4" />,
    description: 'Paiement annulé'
  },
};

const PAYMENT_METHODS = [
  { value: 'wave', label: 'Wave', icon: '💸' },
  { value: 'orange_money', label: 'Orange Money', icon: '🟠' },
  { value: 'mtn_money', label: 'MTN Money', icon: '🟡' },
  { value: 'card', label: 'Carte bancaire', icon: '💳' },
  { value: 'manual', label: 'Manuel', icon: '📝' },
  { value: 'cash', label: 'Espèces', icon: '💰' },
  { value: 'transfer', label: 'Virement', icon: '🏦' },
];

export default function AdminPaiements() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'user' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPaiement, setSelectedPaiement] = useState<Paiement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
    totalRevenue: 0,
    avgAmount: 0,
    todayRevenue: 0,
    reussi: {
      label: 'Réussi',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-100 text-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4" />,
      description: 'Paiement réussi'
    },
  });

  const normalize = (s: any) => {
    if (!s && s !== 0) return '';
    try {
      return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    } catch (e) {
      return String(s).toLowerCase();
    }
  };

  // Map various localized or provider statuses to canonical keys used by the UI
  const canonicalStatus = (s: any) => {
    const n = normalize(s || '');
    if (!n) return '';
    // french refunded 'remboursé' -> 'rembourse' after normalization; map to 'refunded'
    if (['refunded', 'rembourse', 'remboursement', 'remboursee'].includes(n)) return 'refunded';
    if (['reussi', 'success', 'succeeded'].includes(n)) return 'reussi';
    if (['paid', 'paye', 'payee', 'paye'].includes(n)) return 'paid';
    if (['confirmed'].includes(n)) return 'confirmed';
    if (['pending', 'enattente', 'en_attente'].includes(n)) return 'pending';
    if (['failed', 'echoue', 'echec', 'echoue'].includes(n)) return 'failed';
    if (['upcoming', 'a venir', 'avenir', 'avenu'].includes(n)) return 'upcoming';
    if (['cancelled', 'annule', 'annulé', 'annulee'].includes(n)) return 'cancelled';
    return n;
  };

  const loadPaiements = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');

      let res;
      if (statusFilter === 'upcoming') {
        // fetch upcoming abonnements/payments
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

      const normalized: Paiement[] = items.map((p: any) => ({
        id: p.id,
        reference: p.reference || p.reference_transaction || null,
        numero_commande: p.numero_commande || p.order_number || null,
        commande_id: p.commande_id || p.order_id || null,
        utilisateur_id: p.utilisateur_id || p.user_id || null,
        user_name: p.user_name
          || (p.utilisateur_prenom ? `${p.utilisateur_prenom} ${p.utilisateur_nom || ''}`.trim() : null)
          || p.user_prenom
          || null,
        user_email: p.user_email || p.utilisateur_email || null,
        image_paiement: p.image_paiement || p.payment_image || null,
        payment_method: p.moyen_paiement || p.payment_method || 'Manual',
        montant: Number(p.montant || p.montant_total || p.amount || 0),
        status: canonicalStatus(p.status || p.statut || 'pending'),
        date_paiement: p.date_paiement || p.created_at || p.createdAt || null,
        created_at: p.created_at || p.createdAt || new Date().toISOString(),
        notes: p.notes || p.commentaire || null,
        invoice_id: p.invoice_id || p.facture_id || null,
        motif_remboursement: p.motif_remboursement || p.motif || p.refund_reason || null,
      }));

      setPaiements(normalized);

      // Prefer server-provided stats if available to avoid client-side discrepancies
      if (json && json.stats) {
        const s: any = json.stats;
        setStats({
          total: Number(s.total || normalized.length || 0),
          paid: Number(s.paid || 0),
          pending: Number(s.pending || 0),
          failed: Number(s.failed || 0),
          refunded: Number(s.refunded || 0),
          totalRevenue: Number(s.totalRevenue || s.total_revenue || 0),
          avgAmount: Number(s.avgAmount || s.avg_amount || 0),
          todayRevenue: Number(s.todayRevenue || s.today_revenue || 0),
        });
      } else {
        // Calculate stats locally (safe guards against division by zero)
        const total = normalized.length;
        const paidStatuses = ['paid', 'reussi', 'confirmed'];
        const paid = normalized.filter(p => paidStatuses.includes(p.status)).length;
        const pending = normalized.filter(p => p.status === 'pending').length;
        const failed = normalized.filter(p => p.status === 'failed').length;
        const refunded = normalized.filter(p => p.status === 'refunded').length;
        const totalRevenue = normalized
          .filter(p => paidStatuses.includes(p.status))
          .reduce((acc, p) => acc + p.montant, 0);
        const avgAmount = paid > 0 ? Math.round(totalRevenue / paid) : 0;

        // Today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenue = normalized
          .filter(p => paidStatuses.includes(p.status) && new Date(p.date_paiement || p.created_at) >= today)
          .reduce((acc, p) => acc + p.montant, 0);

        setStats({
          total,
          paid,
          pending,
          failed,
          refunded,
          totalRevenue,
          avgAmount,
          todayRevenue,
        });
      }
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setPaiements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaiements();
  }, [statusFilter]);

  const filteredPaiements = useMemo(() => {
    let filtered = [...paiements];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.reference || '').toLowerCase().includes(searchLower) ||
        (p.numero_commande || '').toLowerCase().includes(searchLower) ||
        (p.user_name || '').toLowerCase().includes(searchLower) ||
        (p.user_email || '').toLowerCase().includes(searchLower) ||
        String(p.utilisateur_id || '').includes(search)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const canonicalFilter = canonicalStatus(statusFilter);
      filtered = filtered.filter(p => p.status === canonicalFilter);
    }

    // Filter by payment method
    if (methodFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_method === methodFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((p) => {
        const paymentDate = new Date(p.date_paiement || p.created_at);

        switch (dateFilter) {
          case 'today':
            return paymentDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return paymentDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return paymentDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      let aV: any;
      let bV: any;
      switch (sortBy) {
        case 'user':
          aV = (a.user_name || '').toString().toLowerCase();
          bV = (b.user_name || '').toString().toLowerCase();
          break;
        case 'amount':
          aV = Number(a.montant || 0);
          bV = Number(b.montant || 0);
          break;
        case 'status':
          aV = (a.status || '').toString().toLowerCase();
          bV = (b.status || '').toString().toLowerCase();
          break;
        case 'date':
        default:
          aV = new Date(a.date_paiement || a.created_at).getTime();
          bV = new Date(b.date_paiement || b.created_at).getTime();
          break;
      }

      // string compare
      if (typeof aV === 'string' && typeof bV === 'string') {
        const cmp = aV.localeCompare(bV);
        return sortOrder === 'desc' ? -cmp : cmp;
      }

      // numeric compare
      const numCmp = (Number(aV) || 0) - (Number(bV) || 0);
      return sortOrder === 'desc' ? -numCmp : numCmp;
    });

    return sorted;
  }, [paiements, search, statusFilter, methodFilter, dateFilter, sortBy, sortOrder]);

  const updatePaiementStatus = async (paiementId: number, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');

      const res = await fetch(`${API_BASE}/api/admin/paiements/${paiementId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur mise à jour');
      }

      const jsonRes = await res.json().catch(() => null);

      setUpdateDialogOpen(false);
      setSelectedPaiement(null);
      setNotes('');
      // If server returned the paiement and its status is 'reussi', show success toast
      const paiementReturned = jsonRes && jsonRes.paiement ? jsonRes.paiement : null;
      if (paiementReturned) {
        const returnedStatus = canonicalStatus(paiementReturned.status || paiementReturned.statut || '');
        if (returnedStatus === 'reussi') {
          toast({ title: 'Paiement confirmé', description: 'Facture générée et email envoyé à l\'utilisateur.' });
        } else if (returnedStatus === 'refunded') {
          const motif = paiementReturned.motif_remboursement || paiementReturned.motif || paiementReturned.notes || null;
          toast({ title: 'Paiement remboursé', description: motif ? `Motif: ${motif}` : 'Le paiement a été remboursé.' });
        }
      }

      loadPaiements();

    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')} F CFA`;

  const getPaymentMethodIcon = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? found.icon : '📝';
  };

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? found.label : 'Manuel';
  };

  const exportPaiements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/paiements/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paiements-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const openInvoice = async (paiement: Paiement) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let invoiceId = paiement.invoice_id;

      // If no invoice ID, try to find by reference
      if (!invoiceId && paiement.reference) {
        const byRef = await fetch(
          `${API_BASE}/api/admin/invoices/by-reference?reference=${encodeURIComponent(paiement.reference)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (byRef.ok) {
          const data = await byRef.json();
          invoiceId = data.invoice?.id;
        }
      }

      if (invoiceId) {
        window.open(`/admin/invoices/${invoiceId}`, '_blank');
      } else {
        // Open HTML view directly
        const htmlRes = await fetch(`${API_BASE}/api/admin/invoices/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paiement_id: paiement.id,
            reference: paiement.reference,
          }),
        });

        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">


      <main className="flex-1 p-4 sm:p-6 lg:p-12 max-w-[1600px] mx-auto w-full space-y-12">
        {/* ── PREMIUM HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-8"
        >
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                <CreditCard className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest px-4 py-1">
                Admin Financial Engine
              </Badge>
            </div>
            <h1 className="text-4xl lg:text-6xl font-black text-gray-900 tracking-tight">
              Gestion des <span className="text-blue-600">Paiements</span>
            </h1>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-[0.2em] mt-4">
              Trésorerie & Performance Transactionnelle</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={loadPaiements}
              disabled={refreshing}
              className="h-14 px-8 rounded-2xl font-black border-gray-100 shadow-xl shadow-gray-100/50 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
              Sync Live
            </Button>
            <Button
              onClick={exportPaiements}
              className="h-14 px-8 rounded-2xl font-black bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-blue-600 transition-all"
            >
              <Download className="h-4 w-4 mr-3" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* ── BENTO STATS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Main Revenue Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="h-full border-0 shadow-3xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-10 relative h-full flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-2">Chiffre d'Affaires Global</p>
                  <h3 className="text-5xl font-black tracking-tighter mb-4">
                    {formatCurrency(stats.totalRevenue).split(' ')[0]}<span className="text-2xl ml-2">FCFA</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Activity className="h-3 w-3 animate-pulse" /> +{stats.todayRevenue.toLocaleString()} F aujourd'hui
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <p className="text-emerald-100/60 text-[10px] font-bold uppercase tracking-widest">Volume : {stats.paid} paiements validés</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Amount Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-0 shadow-3xl shadow-blue-100/50 bg-white rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-8 flex flex-col justify-between h-full">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="mb-4">
                  <h4 className="text-4xl font-black text-gray-900 tracking-tight">{stats.avgAmount.toLocaleString()}</h4>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Panier Moyen (F)</p>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Efficacité Lab</span>
                  <div className="h-1.5 w-12 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conversion/Status Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full border-0 shadow-3xl shadow-orange-100/50 bg-white rounded-[2.5rem] overflow-hidden group">
              <CardContent className="p-8 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm border border-orange-100">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900 leading-none">{stats.pending}</p>
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-tighter mt-1">A Valider</p>
                  </div>
                </div>
                <div className="mt-8">
                  <h4 className="text-xl font-black text-gray-900 mb-2">Transactions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-tighter">{stats.paid}</p>
                      <p className="text-[8px] text-gray-400 font-bold">Payés</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-xs font-black text-red-600 uppercase tracking-tighter">{stats.failed}</p>
                      <p className="text-[8px] text-gray-400 font-bold">Echecs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── HIGH PERFORMANCE FILTERS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-3xl shadow-gray-100/50 bg-white rounded-[2.5rem] p-4">
            <CardContent className="p-2">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Rechercher une transaction, un client, une référence..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-16 pl-14 rounded-2xl border-gray-50 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-50 font-bold transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-16 lg:w-48 rounded-2xl border-gray-50 bg-gray-50/50 font-black text-xs uppercase tracking-widest">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl font-black text-xs">
                      <SelectItem value="all">Tous Statuts</SelectItem>
                      <SelectItem value="pending">En Attente</SelectItem>
                      <SelectItem value="reussi">Réussi</SelectItem>
                      <SelectItem value="confirmed">Confirmé</SelectItem>
                      <SelectItem value="paid">Payé</SelectItem>
                      <SelectItem value="failed">Échoué</SelectItem>
                      <SelectItem value="refunded">Remboursé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="h-16 lg:w-48 rounded-2xl border-gray-50 bg-gray-50/50 font-black text-xs uppercase tracking-widest">
                      <SelectValue placeholder="Méthode" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl font-black text-xs">
                      <SelectItem value="all">Toutes Méthodes</SelectItem>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          <span className="flex items-center gap-2">
                            {method.icon} {method.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-16 lg:w-40 rounded-2xl border-gray-50 bg-gray-50/50 font-black text-xs uppercase tracking-widest">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl font-black text-xs">
                      <SelectItem value="all">Période Totale</SelectItem>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette Semaine</SelectItem>
                      <SelectItem value="month">Ce Mois</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="h-16 lg:w-32 rounded-2xl border-gray-50 bg-gray-50/50 font-black text-[10px] uppercase tracking-tighter">
                        <SelectValue placeholder="Tri" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl font-black text-xs">
                        <SelectItem value="date">Chronologique</SelectItem>
                        <SelectItem value="amount">Montant</SelectItem>
                        <SelectItem value="user">Utilisateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── TRANSACTION LIST ── */}
        <Tabs defaultValue="list" className="w-full space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="h-12 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
              <TabsTrigger value="list" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6">Transactions</TabsTrigger>
              <TabsTrigger value="overview" className="rounded-xl font-bold text-xs uppercase tracking-widest px-6">Vue d'ensemble</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-50 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                {filteredPaiements.length} Operations Identifiées
              </span>
            </div>
          </div>

          <TabsContent value="list" className="mt-0 active:scale-1 transition-transform focus-visible:outline-none">
            {loading ? (
              <div className="grid gap-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-[2.5rem]" />
                ))}
              </div>
            ) : filteredPaiements.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                <div className="h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                  <Banknote className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Aucun Paiement</h3>
                <p className="text-gray-400 font-bold text-sm tracking-tight">Désolé, nous n'avons trouvé aucune transaction correspondante.</p>
              </motion.div>
            ) : (
              <div className="grid gap-6">
                {filteredPaiements.map((paiement, idx) => {
                  const config = STATUS_CONFIG[paiement.status] || STATUS_CONFIG.pending;

                  return (
                    <motion.div
                      key={paiement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="group border-0 shadow-3xl shadow-gray-100/50 bg-white rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-blue-100/30 transition-all duration-500">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Left Status Bar */}
                            <div className={`w-2 lg:w-3 ${config.bgColor.split(' ')[0]} transition-colors group-hover:w-4 duration-500`} />

                            <div className="flex-1 p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                              <div className="flex items-center gap-8 flex-1">
                                <div className="relative">
                                  <div className={`h-20 w-20 rounded-3xl ${config.bgColor} flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 duration-500`}>
                                    {config.icon}
                                  </div>
                                  <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-50">
                                    <span className="text-xl">{getPaymentMethodIcon(paiement.payment_method || '')}</span>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <Badge variant="outline" className={`border-0 rounded-full px-4 py-1 font-black text-[9px] uppercase tracking-widest ${config.bgColor}`}>
                                      {config.label}
                                    </Badge>
                                    <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">REF: {paiement.reference || 'SYSTEM_INTERNAL'}</span>
                                  </div>

                                  <h3 className="text-2xl font-black text-gray-900 mb-1">{formatCurrency(paiement.montant)}</h3>
                                  <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-500">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-blue-500" />
                                      {paiement.user_name || 'Anonyme'}
                                    </div>
                                    {paiement.user_email && (
                                      <>
                                        <div className="h-1 w-1 rounded-full bg-gray-200" />
                                        <a
                                          href={`mailto:${paiement.user_email}`}
                                          className="text-blue-500 hover:text-blue-700 hover:underline text-xs font-bold transition-colors"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {paiement.user_email}
                                        </a>
                                      </>
                                    )}
                                    <div className="h-1 w-1 rounded-full bg-gray-200" />
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-orange-400" />
                                      {formatDate(paiement.date_paiement)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="hidden xl:block text-right">
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Moyen de Paiement</p>
                                  <p className="text-sm font-black text-gray-700">{getPaymentMethodLabel(paiement.payment_method || '')}</p>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-gray-100 hover:bg-gray-50 shadow-sm active:scale-95 transition-all text-gray-400 hover:text-blue-600">
                                      <MoreVertical className="h-6 w-6" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-[1.5rem] border-gray-100 shadow-2xl p-3 min-w-[240px]">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Operations Disponibles</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedPaiement(paiement);
                                      setDetailsOpen(true);
                                    }} className="rounded-xl py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-600 font-bold">
                                      <Eye className="mr-3 h-4 w-4 opacity-40" /> Voir Intelligence
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => openInvoice(paiement)} className="rounded-xl py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-600 font-bold">
                                      <Receipt className="mr-3 h-4 w-4 opacity-40" /> Consulter Facture
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-gray-50" />

                                    {paiement.status !== 'reussi' && paiement.status !== 'refunded' && paiement.status !== 'failed' && (
                                      <>
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedPaiement(paiement);
                                          setNewStatus('reussi');
                                          setUpdateDialogOpen(true);
                                        }} className="rounded-xl py-3 cursor-pointer focus:bg-emerald-50 focus:text-emerald-600 text-emerald-600 font-black">
                                          <CheckCircle2 className="mr-3 h-4 w-4" /> Valider Paiement
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    <DropdownMenuItem onClick={() => {
                                      setSelectedPaiement(paiement);
                                      setNewStatus('failed');
                                      setUpdateDialogOpen(true);
                                    }} className="rounded-xl py-3 cursor-pointer focus:bg-red-50 focus:text-red-600 text-red-500 font-bold">
                                      <XCircle className="mr-3 h-4 w-4 opacity-40" /> Marquer Rejeté
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                      const count = paiements.filter(p => p.status === status).length;
                      const percentage = paiements.length > 0 ? (count / paiements.length * 100).toFixed(1) : 0;

                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                              {config.icon}
                            </div>
                            <div>
                              <div className="font-medium">{config.label}</div>
                              <div className="text-sm text-gray-500">{config.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{count}</div>
                            <div className="text-sm text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Méthodes de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {PAYMENT_METHODS.map((method) => {
                      const count = paiements.filter(p => p.payment_method === method.value).length;

                      return (
                        <div key={method.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              {method.icon}
                            </div>
                            <div className="font-medium">{method.label}</div>
                          </div>
                          <div className="font-bold">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {selectedUser && (
        <div className="max-w-7xl mx-auto w-full p-4">
          <h2 className="text-xl font-semibold mb-4">Historique paiement utilisateur</h2>
          <UserPaiementHistorique userId={selectedUser} onClose={() => setSelectedUser(null)} />
        </div>
      )}


      {/* ── PAYMENT DETAILS INTELLIGENCE ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl bg-white/80 backdrop-blur-2xl border-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] p-0 overflow-hidden focus-visible:outline-none">
          {selectedPaiement && (
            <div className="flex flex-col h-full">
              <div className="p-10 lg:p-12 space-y-10">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest px-4 py-1 mb-4">
                      Transaction Intelligence
                    </Badge>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Détails du <span className="text-blue-600">Paiement</span></h2>
                    <p className="text-gray-400 font-bold text-sm mt-2 font-mono">REF: {selectedPaiement.reference || 'SYSTEM'}</p>
                  </div>
                  <div className={`h-20 w-20 rounded-[2rem] ${STATUS_CONFIG[selectedPaiement.status]?.bgColor || 'bg-gray-100'} flex items-center justify-center shadow-lg transform rotate-6`}>
                    {STATUS_CONFIG[selectedPaiement.status]?.icon}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-gray-100/50 transition-all">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Montant Total</p>
                    <h4 className="text-3xl font-black text-gray-900 tracking-tighter group-hover:text-blue-600 transition-colors">{formatCurrency(selectedPaiement.montant)}</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-2">Incluant les taxes et frais</p>
                  </div>

                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Mode de Règlement</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getPaymentMethodIcon(selectedPaiement.payment_method || '')}</span>
                      <h4 className="text-xl font-black text-gray-900">{getPaymentMethodLabel(selectedPaiement.payment_method || '')}</h4>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Statut Actuel</p>
                    <Badge className={`rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest border-0 shadow-sm ${STATUS_CONFIG[selectedPaiement.status]?.bgColor}`}>
                      {STATUS_CONFIG[selectedPaiement.status]?.label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-blue-500" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-gray-900">Identité Client</h5>
                    </div>
                    <div className="space-y-4 bg-gray-50/30 p-6 rounded-[1.5rem]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Nom Complet</span>
                        <span className="text-sm font-black text-gray-900">{selectedPaiement.user_name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Email Direct</span>
                        {selectedPaiement.user_email ? (
                          <a
                            href={`mailto:${selectedPaiement.user_email}`}
                            className="text-sm font-black text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {selectedPaiement.user_email}
                          </a>
                        ) : (
                          <span className="text-sm font-black text-gray-900">—</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Identifiant</span>
                        <span className="text-sm font-mono font-bold text-blue-600">#{selectedPaiement.utilisateur_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Box className="h-5 w-5 text-orange-400" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-gray-900">Données Commande</h5>
                    </div>
                    <div className="space-y-4 bg-gray-50/30 p-6 rounded-[1.5rem]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Numéro Order</span>
                        <span className="text-sm font-black text-gray-900">#{selectedPaiement.numero_commande || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Horodatage</span>
                        <span className="text-sm font-black text-gray-900">{formatDate(selectedPaiement.date_paiement)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPaiement.notes && (
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 block">Notes Administratives</Label>
                    <div className="p-6 bg-blue-50/50 rounded-[1.5rem] border border-blue-100 border-dashed text-sm font-bold text-blue-900">
                      {selectedPaiement.notes}
                    </div>
                  </div>
                )}

                {selectedPaiement.image_paiement && (
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 block">Preuve de Règlement</Label>
                    <div className="relative aspect-[16/9] bg-gray-100 rounded-[2rem] overflow-hidden group">
                      <img
                        src={selectedPaiement.image_paiement}
                        alt="Justificatif"
                        className="absolute inset-0 w-full h-full object-contain cursor-zoom-in transition-transform duration-700 group-hover:scale-105"
                        onClick={() => window.open(selectedPaiement.image_paiement!, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <ExternalLink className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setDetailsOpen(false)}
                  className="h-14 px-8 rounded-2xl font-black text-gray-400 hover:text-gray-900 transition-all uppercase tracking-widest text-xs">
                  Fermer la vue
                </Button>
                <Button
                  onClick={() => openInvoice(selectedPaiement)}
                  className="h-14 px-10 rounded-2xl font-black bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-gray-900 transition-all">
                  <Receipt className="mr-3 h-5 w-5" />
                  Générer Facture
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── STATUS UPDATE INTERFACE ── */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-xl bg-white/95 backdrop-blur-xl border-0 shadow-3xl shadow-gray-200/50 rounded-[2.5rem] p-0 overflow-hidden focus-visible:outline-none">
          <div className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
                <RefreshCw className="h-6 w-6 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Modifier <span className="text-orange-600">Statut</span></h2>
                <p className="text-xs font-bold text-gray-400 font-mono mt-1">REF: {selectedPaiement?.reference}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nouveau Statut Transactionnel</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-16 rounded-2xl border-gray-100 bg-gray-50/30 font-black text-sm uppercase tracking-widest">
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-2xl font-black text-xs h-full">
                    <SelectItem value="pending">En Attente</SelectItem>
                    <SelectItem value="reussi">Réussi / Validé</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="failed">Échoué / Rejeté</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Raison ou Commentaire Interne</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Précisez la raison du changement de statut..."
                  className="min-h-[140px] rounded-2xl border-gray-100 bg-gray-50/30 p-6 font-bold focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>

              <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5" />
                <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
                  Action Critique : La validation synchronisera les données et pourra déclencher l'envoi d'un mail de confirmation au client.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row gap-4">
            <Button
              variant="ghost"
              onClick={() => setUpdateDialogOpen(false)}
              className="flex-1 h-16 rounded-2xl font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest text-xs">
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (newStatus === 'refunded' && (!notes || notes.trim().length === 0)) {
                  toast({ title: 'Motif requis', description: 'Veuillez indiquer un motif de remboursement.', variant: 'destructive' });
                  return;
                }
                if (selectedPaiement) {
                  updatePaiementStatus(selectedPaiement.id, newStatus, notes);
                }
              }}
              className="flex-2 h-16 px-10 rounded-2xl font-black bg-gray-900 text-white shadow-xl hover:bg-blue-600 transition-all">
              Enregistrer les Modifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}