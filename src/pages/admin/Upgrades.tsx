import React, { useEffect, useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  User,
  Package,
  Calendar,
  Lock,
  TrendingUp,
  Filter,
  Download,
  Eye,
  AlertCircle,
  ChevronDown,
  Shield,
  CreditCard,
  Check,
  X,
  Send,
  Mail,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

type UpgradeRequest = {
  id: number;
  plan_name: string;
  plan_price_cents?: number;
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

const STATUS_CONFIG: Record<string, {
  label: string;
  badge: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  pending: {
    label: 'En attente',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="w-4 h-4" />,
    color: 'yellow',
    description: 'En attente de confirmation'
  },
  confirmed: {
    label: 'Confirmé',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'blue',
    description: 'Paiement confirmé, en attente de validation'
  },
  approved: {
    label: 'Approuvé',
    badge: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'green',
    description: 'Upgrade effectué avec succès'
  },
  rejected: {
    label: 'Refusé',
    badge: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-4 h-4" />,
    color: 'red',
    description: 'Demande refusée'
  },
  cancelled: {
    label: 'Annulé',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <XCircle className="w-4 h-4" />,
    color: 'gray',
    description: 'Demande annulée'
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

export default function AdminUpgrades() {
  const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeRequest | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Action form states
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wave');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { toast } = useToast();

  const loadUpgrades = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentification requise');

      const res = await fetch(`${API_BASE}/api/admin/upgrades?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Impossible de charger les demandes');
      }

      const json = await res.json();
      setUpgrades(json.checkouts || json.upgrades || []);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
      setUpgrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUpgrades();
  }, []);

  const filteredUpgrades = useMemo(() => {
    let filtered = upgrades;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((upgrade) =>
        `${upgrade.user_prenom || ''} ${upgrade.user_nom || ''}`
          .toLowerCase()
          .includes(searchLower) ||
        upgrade.user_email.toLowerCase().includes(searchLower) ||
        upgrade.reference_transaction?.toLowerCase().includes(searchLower) ||
        upgrade.plan_name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((upgrade) => upgrade.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((upgrade) => {
        if (!upgrade.created_at) return false;
        const createdDate = new Date(upgrade.created_at);

        switch (dateFilter) {
          case 'today':
            return createdDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return createdDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return createdDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [upgrades, search, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = upgrades.length;
    const pending = upgrades.filter(u => u.status === 'pending').length;
    const confirmed = upgrades.filter(u => u.status === 'confirmed').length;
    const approved = upgrades.filter(u => u.status === 'approved').length;
    const rejected = upgrades.filter(u => u.status === 'rejected').length;
    const revenue = upgrades
      .filter(u => u.status === 'approved')
      .reduce((sum, u) => sum + (u.plan_price_cents || 0), 0) / 100;

    return { total, pending, confirmed, approved, rejected, revenue };
  }, [upgrades]);

  const handleApprove = async () => {
    if (!selectedUpgrade) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference: reference || selectedUpgrade.reference_transaction || null,
          payment_method: paymentMethod,
          image_paiement: imageUrl || selectedUpgrade.image_paiement || null,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de l\'approbation');
      }

      toast({
        title: '✅ Demande approuvée',
        description: 'L\'upgrade a été effectué avec succès'
      });

      setActionDialogOpen(false);
      setSelectedUpgrade(null);
      loadUpgrades();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleReject = async () => {
    if (!selectedUpgrade) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: rejectReason || 'Raison non spécifiée',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec du rejet');
      }

      toast({
        title: '❌ Demande refusée',
        description: 'La demande a été rejetée'
      });

      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedUpgrade(null);
      loadUpgrades();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedUpgrade) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selectedUpgrade.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de l\'envoi');
      }

      toast({
        title: '📧 Email envoyé',
        description: 'L\'email a été envoyé avec succès'
      });

      setEmailDialogOpen(false);
      setEmailSubject('');
      setEmailMessage('');
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (cents?: number) => {
    return cents ? `${(cents / 100).toLocaleString('fr-FR')} F CFA` : '—';
  };

  const getPaymentMethodIcon = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? found.icon : '📝';
  };

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? found.label : 'Manuel';
  };

  const openActionDialog = (upgrade: UpgradeRequest) => {
    // Always allow opening the details dialog so admins can view information
    // even for already processed requests. Action buttons remain hidden
    // for final statuses further down in the dialog footer.
    setSelectedUpgrade(upgrade);
    setReference(upgrade.reference_transaction || '');
    setPaymentMethod(upgrade.payment_method || 'wave');
    setImageUrl(upgrade.image_paiement || '');
    setNotes(upgrade.notes || '');
    setActionDialogOpen(true);
  };

  const exportUpgrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upgrades-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: "La liste des upgrades a été téléchargée"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">


      <main className="flex-1 p-6 lg:p-12 max-w-[1600px] mx-auto w-full space-y-12">
        {/* ── HEADER BENTO ── */}
        <div className="relative overflow-hidden group rounded-[3rem] bg-gray-900 p-12 text-white shadow-2xl shadow-gray-900/20 transition-all duration-700 hover:shadow-gray-900/40">
          <div className="absolute top-0 right-0 p-12 opacity-15 transition-transform duration-1000 group-hover:rotate-12 group-hover:scale-110">
            <TrendingUp className="h-48 w-48 text-white" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  <TrendingUp className="h-6 w-6 text-white text-blue-500 shadow-none" />
                </div>
                <Badge variant="outline" className="rounded-full border-white/10 text-white/60 font-black text-[10px] uppercase tracking-[0.4em] px-5 py-1.5">
                  Pôle Transformation Premium
                </Badge>
              </div>
              <div className="space-y-2 text-white shadow-none outline-none border-none border-0">
                <h1 className="text-5xl font-black tracking-tight text-white">
                  Vecteurs <span className="text-blue-500">d'Upgrade</span>
                </h1>
                <p className="text-lg font-bold text-gray-400 max-w-xl leading-relaxed text-white">
                  Pilotage des flux d'accélération et management des transactions de changement de plan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                onClick={loadUpgrades}
                disabled={refreshing}
                className="h-14 px-8 rounded-2xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md active:scale-95 outline-none">
                <RefreshCw className={`h-4 w-4 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
                Synchroniser
              </Button>
              <Button
                onClick={exportUpgrades}
                className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 outline-none">
                <Download className="h-4 w-4 mr-3 shadow-none" />
                Export Analytique
              </Button>
            </div>
          </div>
        </div>

        {/* ── METRICS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              label: 'Demandes Actives',
              value: stats.pending,
              icon: Clock,
              color: 'text-yellow-500',
              bg: 'bg-yellow-50',
              trend: 'En attente de validation',
              subValue: `Confirmées: ${stats.confirmed}`
            },
            {
              label: 'Accélérations Réussies',
              value: stats.approved,
              icon: CheckCircle2,
              color: 'text-emerald-500',
              bg: 'bg-emerald-50',
              trend: 'Taux de conversion optimal',
              subValue: 'Flux validé'
            },
            {
              label: 'Revenus Générés',
              value: `${stats.revenue.toLocaleString()} FCFA`,
              icon: CreditCard,
              color: 'text-blue-500',
              bg: 'bg-blue-50',
              trend: '+12.5% vs mois dernier',
              subValue: 'Volume transactionnel'
            },
            {
              label: 'Total Requêtes',
              value: stats.total,
              icon: Package,
              color: 'text-purple-500',
              bg: 'bg-purple-50',
              trend: 'Volume historique complet',
              subValue: `Rejetées: ${stats.rejected}`
            }
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-gray-300/60 transition-all group">
              <div className="flex items-start justify-between mb-8">
                <div className={`h-14 w-14 rounded-2xl ${metric.bg} ${metric.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-none`}>
                  <metric.icon className="h-7 w-7 shadow-none" />
                </div>
                <div className="text-right text-white shadow-none outline-none border-none border-0 group-hover:translate-x-1 transition-transform group-hover:translate-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60 group-hover:opacity-100 shadow-none">KPI Index</p>
                  <p className="text-xs font-bold text-gray-400 text-white shadow-none group-hover:text-gray-900 group-hover:underline">{metric.subValue}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-blue-500 transition-colors shadow-none">{metric.label}</h4>
                <p className="text-4xl font-black text-gray-900 tracking-tighter group-hover:scale-105 transition-transform origin-left">{metric.value}</p>
                <p className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-none group-hover:active:scale-95 group-hover:shadow-none">{metric.trend}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── FILTERS BENTO ── */}
        <Card className="relative overflow-hidden group rounded-[2.5rem] bg-white border border-gray-100 p-10 shadow-xl shadow-gray-200/40 transition-all duration-700 hover:shadow-gray-200/60">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Recherche Multidimensionnelle</Label>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                <Input
                  placeholder="Utilisateur, Email, Référence de transaction..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-16 pl-16 pr-8 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-lg transition-all placeholder:text-gray-300 shadow-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-64 space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Statut Flux</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-16 rounded-2xl bg-gray-50 border-gray-100 font-bold px-8 shadow-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5">
                    <SelectValue placeholder="Vecteur Statut" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                    <SelectItem value="all" className="rounded-xl font-bold py-3 hover:bg-gray-50 transition-colors">Toute l'Architecture</SelectItem>
                    <SelectItem value="pending" className="rounded-xl font-bold py-3">En Attente</SelectItem>
                    <SelectItem value="confirmed" className="rounded-xl font-bold py-3">Confirmé (Paiement)</SelectItem>
                    <SelectItem value="approved" className="rounded-xl font-bold py-3 text-emerald-600">Approuvé</SelectItem>
                    <SelectItem value="rejected" className="rounded-xl font-bold py-3 text-red-600">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-64 space-y-3 shadow-none">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Période Temporelle</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-16 rounded-2xl bg-gray-50 border-gray-100 font-bold px-8 shadow-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5">
                    <SelectValue placeholder="Index Temporel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-2xl outline-none">
                    <SelectItem value="all" className="rounded-xl font-bold py-3 shadow-none">Timeline Complète</SelectItem>
                    <SelectItem value="today" className="rounded-xl font-bold py-3 shadow-none">Cycle Actuel (Jour)</SelectItem>
                    <SelectItem value="week" className="rounded-xl font-bold py-3 shadow-none">Octave (7 jours)</SelectItem>
                    <SelectItem value="month" className="rounded-xl font-bold py-3 shadow-none">Mensis (Mois)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* ── UPGRADES LIST BENTO ── */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Répertoire des Mutations</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Management des Transitions de Plan</p>
            </div>
            <Badge variant="outline" className="rounded-full border-gray-100 text-gray-400 font-bold px-4 py-1">
              {filteredUpgrades.length} RÉCURRENCES
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[320px] w-full rounded-[3rem]" />
              ))}
            </div>
          ) : filteredUpgrades.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[4rem] border border-gray-100 p-24 text-center space-y-6 shadow-xl shadow-gray-200/50">
              <div className="h-32 w-32 rounded-[2.5rem] bg-gray-50 flex items-center justify-center mx-auto transition-transform hover:rotate-12">
                <TrendingUp className="h-16 w-16 text-gray-200" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Néant Opérationnel</h3>
                <p className="text-gray-400 font-bold max-w-xs mx-auto">Aucune demande de mutation n'a été détectée dans le périmètre actuel.</p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
              <AnimatePresence mode="popLayout">
                {filteredUpgrades.map((upgrade, idx) => {
                  const config = STATUS_CONFIG[upgrade.status] || STATUS_CONFIG.pending;
                  const isFinal = ['approved', 'rejected', 'cancelled'].includes(upgrade.status);

                  return (
                    <motion.div
                      key={upgrade.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative bg-white/70 hover:bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 flex flex-col justify-between min-h-[400px]">

                      <div className="space-y-8">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 rounded-[1.5rem] shadow-xl shadow-gray-200/50 border-2 border-white transition-transform group-hover:scale-110">
                              <AvatarFallback className={`bg-${config.color}-50 text-${config.color}-600 font-black text-xl`}>
                                {upgrade.user_prenom?.[0]}{upgrade.user_nom?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <h4 className="font-black text-gray-900 tracking-tight">{upgrade.user_prenom} {upgrade.user_nom}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[150px] shadow-none">{upgrade.user_email}</p>
                            </div>
                          </div>
                          <Badge className={`rounded-2xl ${config.badge} px-4 py-2 border-0 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-gray-100`}>
                            {config.label}
                          </Badge>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Plan de Destination</p>
                              <p className="text-lg font-black text-gray-900">{upgrade.plan_name}</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                              <Package className="h-6 w-6 text-blue-500" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest shadow-none shadow-none">Engagement Financier</p>
                              <p className="text-2xl font-black text-gray-900 tracking-tighter">{formatPrice(upgrade.plan_price_cents)}</p>
                            </div>
                            {upgrade.payment_method && (
                              <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none shadow-none shadow-none">Vecteur</p>
                                <p className="font-bold text-gray-600 flex items-center gap-2 justify-end">
                                  <span className="text-lg">{getPaymentMethodIcon(upgrade.payment_method)}</span>
                                  {getPaymentMethodLabel(upgrade.payment_method)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-2 text-white shadow-none shadow-none shadow-none">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-300" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shadow-none">Re reçu le {upgrade.created_at ? formatDate(upgrade.created_at) : '—'}</p>
                          </div>
                          {upgrade.reference_transaction && (
                            <Badge variant="secondary" className="bg-gray-50 text-[10px] font-mono font-bold text-gray-400 border-0 outline-none shadow-none">
                              REF: {upgrade.reference_transaction.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-8">
                        <Button
                          variant="outline"
                          onClick={() => openActionDialog(upgrade)}
                          className="h-14 flex-1 rounded-2xl border-gray-100 hover:bg-gray-50 font-black text-[10px] uppercase tracking-widest transition-all shadow-none">
                          Détails Flux
                        </Button>
                        {!isFinal && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                className="h-14 w-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg shadow-gray-900/10 active:scale-95 transition-all outline-none">
                                <RefreshCw className="h-5 w-5 opacity-80" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-[2rem] border-gray-100 shadow-2xl p-3">
                              <DropdownMenuItem
                                onClick={() => { setSelectedUpgrade(upgrade); setActionDialogOpen(true); }}
                                className="rounded-xl py-3 font-bold text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 transition-colors">
                                <Check className="mr-3 h-4 w-4 shadow-none" /> Approbation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setSelectedUpgrade(upgrade); setRejectDialogOpen(true); }}
                                className="rounded-xl py-3 font-bold text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors shadow-none">
                                <X className="mr-3 h-4 w-4 shadow-none shadow-none" /> Rejet Analytique
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-2 bg-gray-100 shadow-none outline-none"></DropdownMenuSeparator>
                              <DropdownMenuItem
                                onClick={() => { setSelectedUpgrade(upgrade); setEmailDialogOpen(true); }}
                                className="rounded-xl py-3 font-bold text-blue-600 focus:bg-blue-50 focus:text-blue-700 transition-colors">
                                <Send className="mr-3 h-4 w-4 shadow-none shadow-none" /> Communication
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className={`absolute top-0 bottom-0 left-0 w-2 ${config.color === 'yellow' ? 'bg-yellow-400' : config.color === 'blue' ? 'bg-blue-500' : config.color === 'green' ? 'bg-emerald-500' : config.color === 'red' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>


      {/* ── ACTION DIALOG BENTO ── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-4xl bg-white/80 backdrop-blur-2xl border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.1)] rounded-[3rem] p-0 overflow-hidden outline-none">
          <div className="relative h-32 bg-gray-900 p-12 transition-all group overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center justify-between text-white">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Analyse Mutation</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 opacity-80">ID: #{selectedUpgrade?.id} • {selectedUpgrade?.plan_name}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="p-12 space-y-12">
            {selectedUpgrade && (
              <Tabs defaultValue="details" className="w-full space-y-10">
                <TabsList className="grid w-full grid-cols-3 h-16 bg-gray-50/50 p-2 rounded-2xl border border-gray-100/50 shadow-none">
                  <TabsTrigger value="details" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-gray-200/50 transition-all shadow-none outline-none">Identité</TabsTrigger>
                  <TabsTrigger value="payment" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-gray-200/50 transition-all outline-none">Transaction</TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-gray-200/50 transition-all outline-none">Annotations</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-10 focus-visible:outline-none">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Profil Utilisateur</Label>
                        <div className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-gray-200/50">
                          <p className="text-2xl font-black text-gray-900 tracking-tight">{selectedUpgrade.user_prenom} {selectedUpgrade.user_nom}</p>
                          <p className="text-blue-600 font-bold opacity-80">{selectedUpgrade.user_email}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1 shadow-none shadow-none shadow-none">Cible de Migration</Label>
                        <div className="p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 transition-all hover:shadow-xl hover:shadow-emerald-200/50 group/plan">
                          <p className="text-emerald-800 font-black text-xs uppercase tracking-[0.3em] mb-2 shadow-none shadow-none">Plan de Destination</p>
                          <p className="text-3xl font-black text-emerald-950 tracking-tighter shadow-none shadow-none">{selectedUpgrade.plan_name}</p>
                          <p className="text-4xl font-black text-emerald-600 mt-4 tracking-tighter group-hover/plan:scale-110 transition-transform origin-left">
                            {formatPrice(selectedUpgrade.plan_price_cents)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8 shadow-none shadow-none">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1 shadow-none shadow-none">Statut Opérationnel</Label>
                        <div className="mt-2 opacity-100">
                          <Badge variant="secondary" className={`rounded-2xl ${STATUS_CONFIG[selectedUpgrade.status]?.badge || 'bg-gray-100'} px-6 py-3 font-black text-xs uppercase tracking-widest border-0 shadow-lg shadow-gray-200/50`}>
                            <span className="mr-3">{STATUS_CONFIG[selectedUpgrade.status]?.icon}</span>
                            {STATUS_CONFIG[selectedUpgrade.status]?.label || selectedUpgrade.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1 shadow-none">Timeline</Label>
                        <div className="space-y-4 p-6 rounded-3xl bg-gray-50/50 border border-gray-100 shadow-none outline-none">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initialisation:</span>
                            <span className="font-bold text-gray-700 text-xs shadow-none shadow-none shadow-none">{selectedUpgrade.created_at ? formatDate(selectedUpgrade.created_at) : '—'}</span>
                          </div>
                          {selectedUpgrade.updated_at && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 opacity-60">Dernière Mutation:</span>
                              <span className="font-bold text-blue-600 text-xs shadow-none">{formatDate(selectedUpgrade.updated_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedUpgrade.image_paiement && (
                        <div className="space-y-3 shadow-none outline-none">
                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Visualisation Preuve</Label>
                          <div className="relative aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 group/img rotate-1 hover:rotate-0 transition-transform">
                            <img
                              src={selectedUpgrade.image_paiement}
                              alt="Preuve"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={selectedUpgrade.image_paiement} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="rounded-2xl bg-white/20 backdrop-blur-md border-white/30 text-white font-black">Ouvrir Analytique</Button>
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-10 focus-visible:outline-none">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1 shadow-none shadow-none">Référence de Transaction</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500 shadow-none" />
                          <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Ex: WAVE-MUT-123456"
                            className="h-16 pl-16 pr-8 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-lg transition-all shadow-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 shadow-none shadow-none shadow-none">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Vecteur de Transfert</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-16 rounded-2xl bg-gray-50 border-gray-100 font-bold px-8 shadow-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.value} value={method.value} className="rounded-xl font-bold py-3">
                                <span className="mr-3 text-lg">{method.icon}</span>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-4 shadow-none shadow-none outline-none border-none border-0">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Source Documentaire (URL)</Label>
                        <Input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://cloud.storage.com/proof.jpg"
                          className="h-16 px-8 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-none outline-none"
                        />
                      </div>

                      <div className="space-y-4 shadow-none outline-none border-none border-0">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Injection Directe</Label>
                        <div className="group relative h-32 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50 flex flex-col items-center justify-center transition-all hover:bg-white hover:border-blue-200 cursor-pointer">
                          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                            <Download className="h-5 w-5 text-blue-500" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors shadow-none outline-none border-none border-0">Cliquer ou glisser preuve</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-6 shadow-none outline-none border-none border-0 focus-visible:outline-none focus:outline-none">
                  <div className="space-y-4 shadow-none">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Commentaires Stratégiques</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Détails additionnels sur cette mutation..."
                      className="min-h-[250px] p-8 rounded-[2rem] bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-lg transition-all shadow-none shadow-none"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="px-12 py-10 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="h-14 px-8 rounded-2xl border-gray-200 hover:bg-white font-black text-xs uppercase tracking-widest transition-all shadow-none transition-all active:scale-95">
              Suspendre
            </Button>

            <div className="flex gap-4">
              {selectedUpgrade && !['approved', 'rejected', 'cancelled'].includes(selectedUpgrade.status) ? (
                <>
                  <Button
                    onClick={() => { setSelectedUpgrade(selectedUpgrade); setRejectDialogOpen(true); }}
                    variant="destructive"
                    className="h-14 px-8 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black text-xs uppercase tracking-widest transition-all border-0 shadow-none active:scale-95">
                    <X className="mr-3 h-4 w-4 shadow-none shadow-none" /> Rejet Analytique
                  </Button>
                  <Button
                    onClick={handleApprove}
                    className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-200 shadow-none active:scale-95">
                    <Check className="mr-3 h-4 w-4 shadow-none shadow-none" />
                    Approuver Mutation
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="rounded-full border-gray-200 text-gray-400 font-bold px-4 py-2">FLUX TERMINÉ</Badge>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Aucune action requise</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── REJECT DIALOG BENTO ── */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="rounded-[3rem] border-white/20 bg-white/80 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden outline-none">
          <div className="p-12 space-y-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-[2rem] bg-red-50 flex items-center justify-center shadow-lg shadow-red-100 transition-transform hover:scale-110">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Action Irréversible</h2>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] shadow-none">Rejet Critique du Flux</p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-gray-500 font-medium leading-relaxed">
                Vous êtes sur le point de rejeter la demande de <span className="font-black text-gray-900">{selectedUpgrade?.user_email}</span>.
              </p>

              <div className="space-y-3 shadow-none">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Justification du Rejet</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Spécifiez la raison analytique du rejet..."
                  className="min-h-[150px] p-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-red-500/5 font-bold transition-all shadow-none shadow-none"
                />
              </div>

              <div className="p-6 rounded-[2.5rem] bg-yellow-50 border border-yellow-100 flex gap-6 items-center shadow-none outline-none">
                <div className="h-14 w-14 rounded-2xl bg-yellow-100 flex items-center justify-center shadow-none">
                  <AlertCircle className="h-7 w-7 text-yellow-600 shadow-none" />
                </div>
                <p className="text-sm text-yellow-800 font-bold leading-tight">
                  Attention: Cette mutation sera marquée comme échec système. Un flux de notification sera déclenché.
                </p>
              </div>
            </div>
          </div>

          <div className="px-12 py-10 bg-gray-50 border-t border-gray-100 flex gap-4 justify-end">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl border-gray-200 font-black text-[10px] uppercase tracking-widest shadow-none hover:bg-white transition-all active:scale-95 shadow-none outline-none">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95">
              Confirmer le Rejet
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── EMAIL DIALOG BENTO ── */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-3xl bg-white/80 backdrop-blur-2xl border-white/20 shadow-2xl rounded-[3rem] p-0 overflow-hidden outline-none">
          <div className="p-12 space-y-10">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-[2rem] bg-blue-50 flex items-center justify-center shadow-lg shadow-blue-100 transition-transform hover:scale-110">
                <Mail className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Vecteur Communication</h2>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Notification Sortante</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4 shadow-none">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Sujet du Message</Label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Statut de votre demande de mise à niveau"
                    className="h-16 pl-16 pr-8 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-none outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 shadow-none shadow-none">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Corps de l'Expédition</Label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Rédigez le message stratégique destiné à l'utilisateur..."
                  className="min-h-[250px] p-8 rounded-[2rem] bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold transition-all shadow-none shadow-none shadow-none focus:outline-none"
                />
              </div>

              <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 flex items-center gap-6 shadow-none">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Send className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-blue-800 font-bold opacity-80 shadow-none outline-none">
                  L'email intégrera automatiquement les données temporelles et structurelles de la demande.
                </p>
              </div>
            </div>
          </div>

          <div className="px-12 py-10 bg-gray-50 border-t border-gray-100 flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="h-14 px-8 rounded-2xl border-gray-200 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all active:scale-95 shadow-none shadow-none outline-none shadow-none">
              Avorter
            </Button>
            <Button
              onClick={handleSendEmail}
              className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95">
              Envoyer Vecteur
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}