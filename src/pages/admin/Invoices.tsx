import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ExternalLink,
  Search,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  Filter,
  MoreVertical,
  Eye,
  Receipt,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Mail,
  Copy,
  Sparkles,
  Activity,
  Box,
  TrendingDown,
  Layout,
  Banknote,
  Navigation,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  QrCode
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

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

export default function AdminInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    avgAmount: 0,
    thisMonth: 0,
  });

  const loadInvoices = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');

      const res = await fetch(`${API_BASE}/api/admin/invoices?limit=500`, {
        headers: { Authorization: `Bearer ${token}` }
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

      // Calculate stats
      const total = normalized.length;
      const paid = normalized.filter(i => i.status === 'paid').length;
      const pending = normalized.filter(i => i.status === 'pending').length;
      const overdue = normalized.filter(i => i.status === 'overdue').length;
      const totalAmount = normalized
        .filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + i.amount, 0);
      const avgAmount = paid > 0 ? Math.round(totalAmount / paid) : 0;

      // This month's invoices
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthCount = normalized.filter(i =>
        new Date(i.created_at) >= thisMonthStart
      ).length;

      setStats({
        total,
        paid,
        pending,
        overdue,
        totalAmount,
        avgAmount,
        thisMonth: thisMonthCount,
      });

    } catch (e) {
      console.error('Erreur chargement invoices', e);
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.reference.toLowerCase().includes(searchLower) ||
        inv.user_email.toLowerCase().includes(searchLower) ||
        inv.user_name.toLowerCase().includes(searchLower) ||
        inv.invoice_number.toLowerCase().includes(searchLower) ||
        inv.plan_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((inv) => {
        const invoiceDate = new Date(inv.created_at);

        switch (dateFilter) {
          case 'today':
            return invoiceDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return invoiceDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return invoiceDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return invoiceDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [invoices, search, statusFilter, dateFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Payée
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            En retard
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="outline">
            Brouillon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  };

  const openHtmlInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/admin/invoices/${invoice.id}/html`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Impossible de récupérer la facture');

      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const downloadPdfInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/admin/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Impossible de récupérer le PDF');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoice.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const exportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/admin/invoices/export.csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur export');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factures-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const copyReference = (reference: string) => {
    navigator.clipboard.writeText(reference);
    toast({ title: "Référence copiée", description: "La référence a été copiée dans le presse-papier." });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">


      <main className="flex-1 p-6 lg:p-12 max-w-[1600px] mx-auto w-full space-y-12">
        {/* ── PREMIUM HEADER ARCHITECTURE ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Facturation Intelligente</span>
            </motion.div>
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tight leading-none">
              Gestion des <span className="text-blue-600 block lg:inline">Factures</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium max-w-2xl">
              Pilotez votre écosystème financier avec une précision chirurgicale et des données en temps réel.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={loadInvoices}
              disabled={refreshing}
              className="h-16 px-8 rounded-[2rem] border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-900 font-black transition-all shadow-sm"
            >
              <RefreshCw className={`h-5 w-5 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser le Flux
            </Button>
            <Button
              onClick={exportCsv}
              className="h-16 px-8 rounded-[2rem] bg-gray-900 hover:bg-blue-600 text-white font-black transition-all shadow-xl shadow-gray-200"
            >
              <Download className="h-5 w-5 mr-3" />
              Exporter les Données
            </Button>
          </div>
        </div>

        {/* ── BENTO METRICS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Main Revenue Bento */}
          <Card className="lg:col-span-2 overflow-hidden border-0 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-200 group">
            <CardContent className="p-10 relative">
              <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                <div className="flex items-start justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Banknote className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-emerald-400/20 text-emerald-400 border-emerald-400/30 font-black text-[10px] uppercase tracking-widest px-4 py-1">
                    Performance Mensuelle
                  </Badge>
                </div>
                <div className="space-y-4">
                  <p className="text-white/60 font-black text-xs uppercase tracking-[0.2em]">Chiffre d'Affaires Facturé</p>
                  <h3 className="text-5xl lg:text-7xl font-black text-white tracking-tighter">
                    {formatCurrency(stats.totalAmount, 'F')}<span className="text-2xl ml-2 font-black">CFA</span>
                  </h3>
                  <div className="flex items-center gap-3 pt-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 font-black text-[10px] uppercase">
                      <TrendingUp className="h-3 w-3" />
                      +24% vs mois dernier
                    </div>
                    <p className="text-white/40 text-xs font-bold">{stats.thisMonth} nouvelles factures</p>
                  </div>
                </div>
              </div>
              {/* Design Elements */}
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp className="h-48 w-48 text-white" />
              </div>
              <div className="absolute -bottom-12 -left-12 h-64 w-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </CardContent>
          </Card>

          {/* Status Distribution Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:col-span-1">
            <Card className="border-0 bg-white shadow-xl shadow-gray-100 group overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Validées</span>
                </div>
                <h4 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{stats.paid}</h4>
                <p className="text-xs font-bold text-gray-400">Factures payées</p>
                <div className="mt-4 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.paid / stats.total) * 100 || 0}%` }}
                    className="h-full bg-green-500"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl shadow-gray-100 group overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Clock className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Attente</span>
                </div>
                <h4 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{stats.pending}</h4>
                <p className="text-xs font-bold text-gray-400">Validation en cours</p>
                <div className="mt-4 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.pending / stats.total) * 100 || 0}%` }}
                    className="h-full bg-orange-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics Bento */}
          <Card className="border-0 bg-white shadow-xl shadow-gray-100 group overflow-hidden">
            <CardContent className="p-8 flex flex-col h-full justify-between items-center text-center space-y-8">
              <div className="space-y-2">
                <div className="h-16 w-16 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                  <Activity className="h-8 w-8" />
                </div>
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pt-4">Activité Globale</h5>
              </div>
              <div className="space-y-2">
                <h4 className="text-5xl font-black text-gray-900 tracking-tighter">{stats.total}</h4>
                <p className="text-xs font-bold text-gray-400">Total Factures Émises</p>
              </div>
              <div className="w-full space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-red-500">Alertes ({stats.overdue})</span>
                  <span className="text-gray-400">Retards</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.overdue / stats.total) * 100 || 0}%` }}
                    className="h-full bg-red-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── HIGH-DENSITY FILTER ARCHITECTURE ── */}
        <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Rechercher un flux, une référence, un client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-16 pl-16 pr-8 rounded-[1.5rem] border-0 bg-transparent text-lg font-bold placeholder:text-gray-300 focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto p-2 bg-gray-50/50 rounded-[2rem]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 px-6 rounded-[1.5rem] border-0 bg-white shadow-sm font-black text-xs uppercase tracking-widest w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 font-bold">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-12 px-6 rounded-[1.5rem] border-0 bg-white shadow-sm font-black text-xs uppercase tracking-widest w-[160px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 font-bold">
                <SelectItem value="all">Toute période</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-12 w-12 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center text-gray-400">
              <Filter className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* ── TABS ARCHITECTURE ── */}
        <Tabs defaultValue="list" className="space-y-10">
          <TabsList className="inline-flex h-14 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200/50">
            <TabsTrigger value="list" className="px-8 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all">
              Registre Transactionnel
            </TabsTrigger>
            <TabsTrigger value="overview" className="px-8 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all">
              Intelligence Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0 outline-none">
            <div className="grid grid-cols-1 gap-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-[2rem] bg-white shadow-sm border border-gray-100" />
                  ))}
                </div>
              ) : filteredInvoices.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200"
                >
                  <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Receipt className="h-12 w-12 text-gray-200" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Néant Transactionnel</h3>
                  <p className="text-gray-400 font-medium font-mono">Aucun flux n'a été détecté pour ces paramètres.</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {filteredInvoices.map((invoice, index) => (
                    <motion.div
                      key={invoice.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      <div className="relative overflow-hidden bg-white hover:bg-gray-50/50 rounded-[2.5rem] border border-gray-100 hover:border-blue-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                        {/* Light Sweep Animation */}
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent pointer-events-none" />

                        <CardContent className="p-8">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex flex-1 items-start gap-8">
                              <div className="relative">
                                <div className={`h-16 w-16 rounded-2xl ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'} flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
                                  <FileText className="h-8 w-8" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center">
                                  {invoice.status === 'paid' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-orange-500" />}
                                </div>
                              </div>

                              <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xl font-black text-gray-900 tracking-tight">{invoice.reference}</span>
                                  <Badge className={`rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-0 shadow-sm ${invoice.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'}`}>
                                    {invoice.status === 'paid' ? 'Payée' : invoice.status === 'pending' ? 'En attente' : invoice.status}
                                  </Badge>
                                  {invoice.invoice_number && (
                                    <span className="text-xs font-mono font-bold text-gray-400">#{invoice.invoice_number}</span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Flux Financier</p>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-lg font-black text-blue-600 tracking-tighter">{formatCurrency(invoice.amount, invoice.currency)}</h4>
                                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{invoice.payment_method}</span>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Propriétaire</p>
                                    <div className="flex items-center gap-2 h-full">
                                      <span className="text-sm font-black text-gray-900">{invoice.user_name || 'Inconnu'}</span>
                                      <span className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]">{invoice.user_email}</span>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Horodatage</p>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3 text-orange-400" />
                                      <span className="text-xs font-bold text-gray-600">{formatDate(invoice.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                onClick={() => { setSelectedInvoice(invoice); setDetailsOpen(true); }}
                                className="h-14 w-14 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all group/btn">
                                <Eye className="h-6 w-6 group-hover/btn:scale-110 transition-transform" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
                                    <MoreVertical className="h-6 w-6" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 rounded-2xl border-gray-100 p-2 shadow-2xl">
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => openHtmlInvoice(invoice)}>
                                    <Layout className="mr-3 h-4 w-4 text-blue-500" />
                                    Prévisualiser HTML
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => downloadPdfInvoice(invoice)}>
                                    <Download className="mr-3 h-4 w-4 text-emerald-500" />
                                    Télécharger PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => copyReference(invoice.reference)}>
                                    <Copy className="mr-3 h-4 w-4 text-orange-500" />
                                    Copier Référence
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-2" />
                                  <DropdownMenuItem className="rounded-xl font-bold py-3 text-blue-600" onClick={() => window.open(`${API_BASE}/api/admin/invoices/${invoice.id}`, '_blank')}>
                                    <Navigation className="mr-3 h-4 w-4" />
                                    Ouvrir Endpoint API
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>

                        {/* Status Edge */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${invoice.status === 'paid' ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="overview" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Intelligence Distribution */}
              <Card className="lg:col-span-2 border-0 bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] overflow-hidden group">
                <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">Analyse Transactionnelle</CardTitle>
                    <CardDescription className="text-sm font-bold text-gray-400 font-mono mt-1">Répartition volumétrique par statut</CardDescription>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 group/item hover:bg-emerald-50 transition-all cursor-default">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Validées</p>
                            <p className="text-[10px] font-bold text-emerald-600 text-opacity-60">Flux garantis</p>
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-emerald-700 tracking-tighter">{stats.paid}</h4>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-orange-50/50 rounded-[2rem] border border-orange-100/50 group/item hover:bg-orange-50 transition-all cursor-default">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-orange-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-orange-700 uppercase tracking-widest">Attente</p>
                            <p className="text-[10px] font-bold text-orange-600 text-opacity-60">En vérification</p>
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-orange-700 tracking-tighter">{stats.pending}</h4>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-red-50/50 rounded-[2rem] border border-red-100/50 group/item hover:bg-red-50 transition-all cursor-default">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-100">
                            <XCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-red-700 uppercase tracking-widest">Retards</p>
                            <p className="text-[10px] font-bold text-red-600 text-opacity-60">Alertes système</p>
                          </div>
                        </div>
                        <h4 className="text-2xl font-black text-red-700 tracking-tighter">{stats.overdue}</h4>
                      </div>
                    </div>

                    <div className="relative flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-[3rem] border border-gray-100">
                      <div className="relative flex items-center justify-center h-48 w-48">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                          <circle className="text-gray-200 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                          <motion.circle
                            className="text-blue-600 stroke-current"
                            strokeWidth="8"
                            strokeLinecap="round"
                            fill="transparent"
                            r="40" cx="50" cy="50"
                            initial={{ strokeDasharray: "0 251", strokeDashoffset: 0 }}
                            animate={{ strokeDasharray: `${(stats.paid / stats.total) * 251 || 0} 251` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center text-center">
                          <span className="text-4xl font-black text-gray-900 tracking-tighter">{Math.round((stats.paid / stats.total) * 100) || 0}%</span>
                          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Taux Succès</span>
                        </div>
                      </div>
                      <p className="mt-8 text-xs font-bold text-gray-400 text-center leading-relaxed">
                        L'intelligence système valide automatiquement {Math.round((stats.paid / stats.total) * 100) || 0}% des flux entrants sur la période active.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Pulse */}
              <Card className="border-0 bg-gray-900 text-white shadow-2xl shadow-gray-400/20 rounded-[3rem] overflow-hidden group">
                <CardHeader className="p-10 pb-0">
                  <CardTitle className="text-2xl font-black tracking-tight">Pouls Financier</CardTitle>
                  <CardDescription className="text-xs font-bold text-gray-400 font-mono mt-1">Indicateurs de performance réseau</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Ticket Moyen Système</p>
                        <h4 className="text-2xl font-black tracking-tighter text-blue-400">{formatCurrency(stats.avgAmount, 'F')}</h4>
                      </div>
                      <div className="h-12 w-full bg-white/5 rounded-2xl flex items-center px-4">
                        <TrendingUp className="h-5 w-5 text-emerald-400 mr-3" />
                        <span className="text-xs font-bold">En progression de +8.4%</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Flux Mensuel Actif</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 20 }}
                              animate={{ height: Math.floor(Math.random() * 40) + 10 }}
                              transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.5, delay: i * 0.1 }}
                              className="w-3 bg-blue-500 rounded-full"
                            />
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black tracking-tighter">{stats.thisMonth}</p>
                          <p className="text-[10px] font-bold text-white/40">UNITÉS</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button className="w-full h-14 rounded-2xl bg-white text-gray-900 font-black hover:bg-blue-600 hover:text-white transition-all">
                        Générer Rapport IA
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl" />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>


      {/* ── INVOICE DETAILS INTELLIGENCE ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl bg-white/80 backdrop-blur-2xl border-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] p-0 overflow-hidden focus-visible:outline-none">
          {selectedInvoice && (
            <div className="flex flex-col h-full">
              <div className="p-10 lg:p-12 space-y-10">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest px-4 py-1 mb-4">
                      Financial Intelligence
                    </Badge>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Détails de la <span className="text-blue-600">Facture</span></h2>
                    <p className="text-gray-400 font-bold text-sm mt-2 font-mono">REF: {selectedInvoice.reference}</p>
                  </div>
                  <div className={`h-20 w-20 rounded-[2rem] ${selectedInvoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'} flex items-center justify-center shadow-lg transform rotate-6`}>
                    <Receipt className="h-10 w-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-gray-100/50 transition-all">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Montant Total</p>
                    <h4 className="text-3xl font-black text-gray-900 tracking-tighter group-hover:text-blue-600 transition-colors">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-2">Taxes et frais inclus</p>
                  </div>

                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Numéro Document</p>
                    <h4 className="text-xl font-mono font-black text-gray-900 tracking-tighter">#{selectedInvoice.invoice_number}</h4>
                  </div>

                  <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4 opacity-50">Statut Actuel</p>
                    <Badge className={`rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest border-0 shadow-sm ${selectedInvoice.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'}`}>
                      {selectedInvoice.status === 'paid' ? 'Payée' : 'En attente'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-blue-500" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-gray-900">Informations Client</h5>
                    </div>
                    <div className="space-y-4 bg-gray-50/30 p-6 rounded-[1.5rem]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Nom Complet</span>
                        <span className="text-sm font-black text-gray-900">{selectedInvoice.user_name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Email Direct</span>
                        <span className="text-sm font-black text-gray-900">{selectedInvoice.user_email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="h-5 w-5 text-orange-400" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-gray-900">Détails Facturation</h5>
                    </div>
                    <div className="space-y-4 bg-gray-50/30 p-6 rounded-[1.5rem]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Plan de Souscription</span>
                        <span className="text-sm font-black text-gray-900">{selectedInvoice.plan_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 underline decoration-gray-200 underline-offset-4">Méthode de Règlement</span>
                        <span className="text-sm font-black text-gray-900">{selectedInvoice.payment_method}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Date de Création</p>
                    <p className="text-sm font-black text-gray-900">{formatDate(selectedInvoice.created_at)}</p>
                  </div>
                  {selectedInvoice.paid_at && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Date de Règlement</p>
                      <p className="text-sm font-black text-emerald-600">{formatDate(selectedInvoice.paid_at)}</p>
                    </div>
                  )}
                  {selectedInvoice.due_date && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Date d'Échéance</p>
                      <p className="text-sm font-black text-red-500">{formatDate(selectedInvoice.due_date)}</p>
                    </div>
                  )}
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 block">Notes Administratives</Label>
                    <div className="p-6 bg-blue-50/50 rounded-[1.5rem] border border-blue-100 border-dashed text-sm font-bold text-blue-900">
                      {selectedInvoice.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setDetailsOpen(false)}
                    className="h-14 px-8 rounded-2xl font-black text-gray-400 hover:text-gray-900 transition-all uppercase tracking-widest text-xs">
                    Fermer
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => copyReference(selectedInvoice.reference)}
                    className="h-14 px-8 rounded-2xl font-black text-gray-400 hover:text-blue-600 transition-all uppercase tracking-widest text-xs">
                    <Copy className="mr-2 h-4 w-4" />
                    Copier Ref
                  </Button>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => openHtmlInvoice(selectedInvoice)}
                    className="h-14 px-8 rounded-2xl font-black border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-900 shadow-sm transition-all">
                    <FileText className="mr-3 h-5 w-5 text-blue-500" />
                    Voir HTML
                  </Button>
                  <Button
                    onClick={() => downloadPdfInvoice(selectedInvoice)}
                    className="h-14 px-10 rounded-2xl font-black bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-blue-600 transition-all">
                    <Download className="mr-3 h-5 w-5" />
                    Télécharger PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}