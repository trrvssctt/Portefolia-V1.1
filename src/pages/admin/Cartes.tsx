import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  CreditCard,
  Wifi,
  CheckCircle2,
  XCircle,
  Zap,
  Link2,
  RefreshCw,
  Copy,
  ExternalLink,
  Filter,
  AlertCircle,
  Download,
  BarChart3,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  QrCode,
  Clock,
  Shield,
  Smartphone,
  Globe,
  Calendar,
  User,
  Mail,
  TrendingUp,
  Sparkles,
  Box,
  Activity,
  ArrowUpRight,
  Hash,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface Carte {
  id: string;
  uid_nfc: string | null;
  statut: string;
  commande_id: string;
  lien_portfolio: string;
  portfolio_title?: string;
  client_email?: string;
  client_name?: string;
  created_at: string;
  updated_at?: string;
  type?: string;
  notes?: string;
  user_id?: string;
  portfolio_id?: string;
}

interface OrderItem {
  id: string;
  portfolio_id?: string;
  quantity: number;
  price: number;
  portfolio_title?: string;
}

interface Order {
  id: string | number;
  numero_commande?: string;
  client_name?: string;
  client_email?: string;
  statut: string; // En_attente | En_traitement | Expédiée | Livrée | Annulée
  total: number;
  items: OrderItem[];
  created_at: string;
  date_livraison?: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: any;
  description: string;
}> = {
  En_attente: {
    label: "En attente",
    color: "text-orange-600",
    bgColor: "bg-orange-100 text-orange-800",
    icon: AlertCircle,
    description: "Carte en attente d'activation"
  },
  Active: {
    label: "Active",
    color: "text-green-600",
    bgColor: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    description: "Carte activée et fonctionnelle"
  },
  Annulée: {
    label: "Annulée",
    color: "text-red-600",
    bgColor: "bg-red-100 text-red-800",
    icon: XCircle,
    description: "Carte annulée"
  },
  Gravée: {
    label: "Gravée",
    color: "text-purple-600",
    bgColor: "bg-purple-100 text-purple-800",
    icon: Wifi,
    description: "Carte gravée et prête"
  },
  En_cours: {
    label: "En cours",
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-800",
    icon: Zap,
    description: "Carte en cours de traitement"
  },
  Livrée: {
    label: "Livrée",
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-800",
    icon: CheckCircle2,
    description: "Carte livrée au client"
  },
  Terminer: {
    label: "Terminer",
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-800",
    icon: CheckCircle2,
    description: "Commande ou traitement terminé"
  },
  Expédiée: {
    label: "Expédiée",
    color: "text-purple-600",
    bgColor: "bg-purple-100 text-purple-800",
    icon: Wifi,
    description: "Carte expédiée au client"
  },
  En_traitement: {
    label: "En traitement",
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-800",
    icon: Zap,
    description: "Commande en cours de traitement"
  },
};

export default function AdminCartes() {
  const normalizeCarteStatus = (st: string | undefined) => {
    if (!st) return 'En_attente';
    const s = String(st).trim();
    const map: Record<string, string> = {
      'en_attente': 'En_attente',
      'en-attente': 'En_attente',
      'en attente': 'En_attente',
      'en_traitement': 'En_traitement',
      'en-traitement': 'En_traitement',
      'en cours': 'En_traitement',
      'en_cours': 'En_traitement',
      'expédiée': 'Expédiée',
      'livrée': 'Livrée',
      'livree': 'Livrée',
      'annulée': 'Annulée',
      'annulee': 'Annulée',
      'active': 'Active',
      'gravée': 'Gravée',
      'gravee': 'Gravée',
      'graver': 'Gravée',
      'terminer': 'Terminer',
      'termine': 'Terminer',
    };
    const key = s.toLowerCase();
    return map[key] || s;
  };
  const [cartes, setCartes] = useState<Carte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCarte, setSelectedCarte] = useState<Carte | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newUid, setNewUid] = useState("");
  const [notes, setNotes] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    engraved: 0,
    delivered: 0,
    cancelled: 0,
    withoutUid: 0,
    today: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [openOrderRawId, setOpenOrderRawId] = useState<string | number | null>(null);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [commandeOwnerMap, setCommandeOwnerMap] = useState<Record<string, string>>({});
  const [estimatedRevenue, setEstimatedRevenue] = useState<number>(0);
  const [processingOrders, setProcessingOrders] = useState<Record<string, boolean>>({});
  const [processingCartes, setProcessingCartes] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const loadCartes = async () => {
    setRefreshing(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const cartesData = json.cartes || [];

      // Normalize statut for each carte to keep stats consistent
      const cartesNormalized = cartesData.map((c: any) => ({
        ...c,
        norm_statut: normalizeCarteStatus(c.statut),
      }));

      setCartes(cartesNormalized);

      // Calculate stats from normalized statut
      const total = cartesNormalized.length;
      const active = cartesNormalized.filter(c => c.norm_statut === "Active").length;
      const pending = cartesNormalized.filter(c => c.norm_statut === "En_attente").length;
      const engraved = cartesNormalized.filter(c => c.norm_statut === "Gravée").length;
      const delivered = cartesNormalized.filter(c => c.norm_statut === "Livrée").length;
      const cancelled = cartesNormalized.filter(c => c.norm_statut === "Annulée").length;
      const withoutUid = cartesNormalized.filter(c => !c.uid_nfc).length;
      const today = cartesNormalized.filter(c =>
        format(new Date(c.created_at), "dd/MM/yyyy") === format(new Date(), "dd/MM/yyyy")
      ).length;

      setStats({
        total,
        active,
        pending,
        engraved,
        delivered,
        cancelled,
        withoutUid,
        today,
      });
    } catch (err) {
      console.error("Erreur chargement cartes", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/commandes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load commandes');
      const json = await res.json();
      const commandes = json.commandes || json.orders || [];
      // Normalize structure: ensure total and items exist. Parse stringified items and compute total from items if missing.
      const normalized: Order[] = commandes.map((c: any) => {
        const rawItems = c.items || c.items_commandes || c.articles || [];
        let items: any[] = [];
        if (typeof rawItems === 'string') {
          try {
            const parsed = JSON.parse(rawItems);
            items = Array.isArray(parsed) ? parsed : (parsed.items || []);
          } catch (e) {
            items = [];
          }
        } else if (Array.isArray(rawItems)) {
          items = rawItems;
        } else if (rawItems && typeof rawItems === 'object') {
          items = rawItems.items || [];
        }

        const computedTotal = items.reduce((s: number, it: any) => {
          const price = Number(it.price || it.prix || it.montant || it.unit_price || 30000) || 30000;
          const qty = Number(it.quantity || it.qty || 1) || 1;
          return s + price * qty;
        }, 0);

        // prefer montant_total (DB field), then c.total/c.montant, then computedTotal
        const totalVal = Number(c.montant_total || c.total || c.montant || computedTotal || 0) || 0;

        // normalize statut values: map legacy 'Terminer' to 'Livrée'
        let statutVal = c.statut || c.status || 'En_attente';
        if (String(statutVal).toLowerCase() === 'terminer' || String(statutVal).toLowerCase() === 'termine') statutVal = 'Livrée';

        return {
          id: c.id,
          numero_commande: c.numero_commande || c.reference || c.reference_commande || `#${c.id}`,
          client_name: c.client_name || c.nom_client || c.user_name || c.customer || '',
          client_email: c.client_email || c.email || c.customer_email || '',
          statut: statutVal,
          type_commande: c.type_commande || c.type || 'commande_carte',
          total: totalVal,
          items,
          created_at: c.created_at || c.date_commande || c.createdAt || new Date().toISOString(),
          date_livraison: c.date_livraison || c.dateLivraison || c.date_livraison_timestamp || null,
          user_id: c.user_id || c.utilisateur_id || c.client_id || c.utilisateur || c.customer_id || null,
        } as Order;
      });
      setOrders(normalized);

      // compute estimated revenue
      const estimated = normalized.reduce((s, o) => s + (Number(o.total) || 0), 0);
      setEstimatedRevenue(estimated);

      // Fetch user details for orders that reference a user_id
      const userIds = Array.from(new Set(normalized.map(o => o.user_id).filter(Boolean)));
      const localUserMap: Record<string, any> = {};
      if (userIds.length > 0) {
        await Promise.all(userIds.map(async (uid: any) => {
          try {
            const ures = await fetch(`${API_BASE}/api/admin/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!ures.ok) return;
            const uj = await ures.json();
            const userObj = uj.user || uj;
            localUserMap[String(uid)] = userObj;
          } catch (e) {
            console.warn('Failed to load user', uid, e);
          }
        }));
        setUserMap(localUserMap);
      }

      // build commande -> owner display map
      const cmdMap: Record<string, string> = {};
      normalized.forEach((o: any) => {
        let owner = o.client_name || o.client_email || 'Client anonyme';
        if (o.user_id && localUserMap[String(o.user_id)]) {
          const u = localUserMap[String(o.user_id)];
          owner = `${u.prenom || u.first_name || ''} ${u.nom || u.last_name || ''}`.trim() || (u.email || owner);
        }
        cmdMap[String(o.id)] = owner;
      });
      setCommandeOwnerMap(cmdMap);

      // compute current revenue (sum of delivered/terminated orders)
      const realRevenue = normalized.reduce((s, o) => {
        const st = (o.statut || '').toString();
        if (st === 'Livrée' || st === 'Terminer') return s + Number(o.total || 0);
        return s;
      }, 0);
      // use backend-provided revenue if present, otherwise computed
      setRevenue(Number(json.revenue || json.chiffre_affaires || realRevenue || 0));
    } catch (err) {
      console.error('Erreur chargement commandes', err);
    }
  };

  const adjustRevenue = async (amount: number, op: 'increment' | 'decrement') => {
    const token = localStorage.getItem('token');
    try {
      // Try to update via backend endpoint; if missing, just update UI optimistically
      const res = await fetch(`${API_BASE}/api/admin/revenue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, op }),
      });
      if (res.ok) {
        const j = await res.json();
        setRevenue(Number(j.revenue || j.chiffre_affaires || (op === 'increment' ? revenue + amount : revenue - amount)));
      } else {
        // fallback: optimistic update
        setRevenue(prev => op === 'increment' ? prev + amount : prev - amount);
      }
    } catch (err) {
      console.warn('adjustRevenue failed, applying optimistic update', err);
      setRevenue(prev => op === 'increment' ? prev + amount : prev - amount);
    }
  }

  const updateOrderStatus = async (orderId: string | number, newStatus: string) => {
    const token = localStorage.getItem('token');
    const order = orders.find(o => String(o.id) === String(orderId));
    if (order && String(order.type_commande) === 'abonnement') {
      try { toast?.({ title: 'Action bloquée', description: 'Les abonnements sont déjà payés et ne peuvent pas être traités ici.' }); } catch (e) { }
      return;
    }
    setProcessingOrders(prev => ({ ...prev, [String(orderId)]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/commandes/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour commande');
      // reload commandes/cartes and let `loadOrders()` recompute the CA from commandes' statuses
      await loadOrders();
      await loadCartes();
      try { toast?.({ title: 'Succès', description: `Commande ${orderId} mise à jour: ${newStatus}` }); } catch (e) { }
    } catch (err) {
      console.error('Erreur updateOrderStatus', err);
    } finally {
      setProcessingOrders(prev => ({ ...prev, [String(orderId)]: false }));
    }
  };

  const generateCommandeInvoice = async (orderId: string | number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/commandes/${orderId}/invoice/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to generate invoice');
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commande-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (contentType.includes('text/html')) {
        // Server returned HTML fallback (puppeteer not available). Open in new tab for preview.
        const html = await res.text();
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
        } else {
          // Fallback: download as .html
          const blob = new Blob([html], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `commande-${orderId}.html`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        // Unknown content type — download raw blob
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commande-${orderId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Erreur génération facture', err);
      try { toast?.({ title: 'Erreur', description: 'Impossible de générer la facture' }); } catch (e) { }
    }
  };

  useEffect(() => {
    loadCartes();
    loadOrders();
  }, []);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach((o) => {
      let key = 'Autres';
      if (o.user_id && userMap[String(o.user_id)]) {
        const u = userMap[String(o.user_id)];
        key = (u.prenom || u.first_name || '') + ' ' + (u.nom || u.last_name || '');
        key = key.trim() || (u.email || 'Utilisateur');
      } else if (o.client_email) {
        key = o.client_email;
      } else if (o.client_name) {
        key = o.client_name;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return groups;
  }, [orders, userMap]);

  const getOrderOwnerDisplay = (order: Order) => {
    if (order.user_id && userMap[String(order.user_id)]) {
      const u = userMap[String(order.user_id)];
      return `${u.prenom || u.first_name || ''} ${u.nom || u.last_name || ''}`.trim() || (u.email || 'Utilisateur');
    }
    return order.client_name || order.client_email || 'Client anonyme';
  };

  const filteredCartes = useMemo(() => {
    let filtered = [...cartes];

    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        (c.uid_nfc || '').toString().toLowerCase().includes(searchLower) ||
        String(c.commande_id || '').toLowerCase().includes(searchLower) ||
        String(c.lien_portfolio || '').toLowerCase().includes(searchLower) ||
        (c.client_email || '').toString().toLowerCase().includes(searchLower) ||
        (c.client_name || '').toString().toLowerCase().includes(searchLower) ||
        (c.portfolio_title || '').toString().toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => ((c as any).norm_statut || normalizeCarteStatus(c.statut)) === statusFilter);
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    return filtered;
  }, [cartes, searchTerm, statusFilter, typeFilter]);

  const assignUid = async (carteId: string, uid: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}/assign-uid`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ uid }),
      });

      if (res.ok) {
        loadCartes();
        setAssignDialogOpen(false);
        setNewUid("");
      }
    } catch (err) {
      console.error("Erreur assignation UID", err);
    }
  };

  const updateStatus = async (carteId: string, status: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ statut: status }),
      });

      if (res.ok) {
        loadCartes();
      }
    } catch (err) {
      console.error("Erreur changement statut", err);
    }
  };

  // Mark a carte as delivered and also update the related commande status if present
  const markCarteLivree = async (carte: Carte) => {
    setProcessingCartes(prev => ({ ...prev, [String(carte.id)]: true }));
    try {
      // update carte status first
      await updateStatus(carte.id, 'Livrée');

      // if the carte is linked to a commande, also update the commande status so revenue logic runs
      if (carte.commande_id) {
        // commande id might be numeric or string; call updateOrderStatus which handles revenue adjustment
        await updateOrderStatus(carte.commande_id, 'Livrée');
      }
      try { toast?.({ title: 'Succès', description: `Carte ${carte.id} marquée livrée` }); } catch (e) { }
    } catch (err) {
      console.error('Erreur marquer carte livrée', err);
    } finally {
      setProcessingCartes(prev => ({ ...prev, [String(carte.id)]: false }));
    }
  };

  const updateCarte = async (carteId: string, updates: any) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        loadCartes();
        setEditDialogOpen(false);
        setSelectedCarte(null);
        setNotes("");
      }
    } catch (err) {
      console.error("Erreur mise à jour carte", err);
    }
  };

  const deleteCarte = async (carteId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        loadCartes();
        setDeleteDialogOpen(false);
        setSelectedCarte(null);
      }
    } catch (err) {
      console.error("Erreur suppression carte", err);
    }
  };

  const generateUid = () => {
    return `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
  };

  const exportCartes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/cartes/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cartes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: fr });
  };

  const getStatusBadge = (statut: string) => {
    const key = statut || 'En_attente';
    const config = STATUS_CONFIG[key] || STATUS_CONFIG.En_attente;
    const Icon = config.icon;

    return (
      <Badge className={`${config.bgColor} hover:${config.bgColor}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]/50">


      <main className="flex-1 p-6 lg:p-12 max-w-[1600px] mx-auto w-full space-y-12">
        {/* ── PREMIUM HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest px-4 py-1">
                Card Ecosystem v2.0
              </Badge>
            </div>
            <div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight">
                Gestion des <span className="text-blue-600">Cartes NFC</span>
              </h1>
              <p className="text-gray-400 font-bold text-lg mt-2 font-mono">
                Architecture Matrix • {stats.total} Unités Déployées
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={loadCartes}
              disabled={refreshing}
              className="h-14 px-8 rounded-2xl font-black border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-900 shadow-sm transition-all active:scale-95 group">
              <RefreshCw className={`mr-3 h-5 w-5 text-blue-500 group-hover:rotate-180 transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
            <Button
              variant="outline"
              onClick={exportCartes}
              className="h-14 px-8 rounded-2xl font-black border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-900 shadow-sm transition-all active:scale-95">
              <Download className="mr-3 h-5 w-5 text-emerald-500" />
              Exporter Data
            </Button>
            <Button className="h-14 px-10 rounded-2xl font-black bg-gray-900 text-white shadow-xl shadow-gray-200 hover:bg-blue-600 transition-all active:scale-95">
              <Plus className="mr-3 h-6 w-6" />
              Nouvelle Card
            </Button>
          </div>
        </motion.div>

        {/* ── DYNAMIC METRICS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            className="lg:col-span-2 relative overflow-hidden bg-gray-900 rounded-[3rem] p-10 group shadow-2xl shadow-blue-900/10">
            <div className="absolute top-0 right-0 p-8">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                <TrendingUp className="h-7 w-7 text-emerald-400" />
              </div>
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Performance Financière</p>
                <h2 className="text-5xl font-black text-white tracking-tighter shrink-0">
                  {(revenue).toLocaleString()} <span className="text-blue-500">FCFA</span>
                </h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-xl border border-white/5">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-black text-white">+12.5% vs Last Month</span>
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Estimé: {(estimatedRevenue).toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 h-64 w-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-between group hover:border-blue-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Active Network</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats.active}</h3>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Unités Opérationnelles</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-between group hover:border-orange-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest">Queue Priority</span>
            </div>
            <div className="mt-6">
              <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats.pending}</h3>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">En Attente d'Action</p>
            </div>
          </motion.div>
        </div>

        {/* ── TACTICAL FILTERS & CONTROLS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 p-4 shadow-2xl shadow-gray-200/30 flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <Input
              placeholder="Holographic Search: UID, Commande, Client, Portfolio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-16 pl-14 pr-8 rounded-[1.5rem] border-0 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
              <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <Filter className="h-5 w-5 text-blue-500" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-48 border-0 bg-transparent focus:ring-0 text-xs font-black uppercase tracking-widest text-gray-900 shadow-none hover:bg-white rounded-xl transition-all">
                  <SelectValue placeholder="Statut Global" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                  <SelectItem value="all" className="rounded-xl font-bold py-3">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="rounded-xl font-bold py-3">
                      <span className="flex items-center gap-3">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
              <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <Box className="h-5 w-5 text-orange-500" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 w-40 border-0 bg-transparent focus:ring-0 text-xs font-black uppercase tracking-widest text-gray-900 shadow-none hover:bg-white rounded-xl transition-all">
                  <SelectValue placeholder="Type Card" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                  <SelectItem value="all" className="rounded-xl font-bold py-3">Tous les types</SelectItem>
                  <SelectItem value="physique" className="rounded-xl font-bold py-3 text-emerald-600">Physique</SelectItem>
                  <SelectItem value="digital" className="rounded-xl font-bold py-3 text-blue-600">Digital</SelectItem>
                  <SelectItem value="hybrid" className="rounded-xl font-bold py-3 text-orange-600">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* ── TABS ARCHITECTURE ── */}
        <Tabs defaultValue="list" className="space-y-10">
          <TabsList className="inline-flex h-14 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200/50">
            <TabsTrigger value="list" className="px-8 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all">
              Registre NFC
            </TabsTrigger>
            <TabsTrigger value="overview" className="px-8 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all">
              Répartition Statistique
            </TabsTrigger>
            <TabsTrigger value="commandes" className="px-8 rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all">
              Flux de Commandes
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
              ) : filteredCartes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <div className="h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard className="h-12 w-12 text-gray-200" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Néant Technologique</h3>
                  <p className="text-gray-400 font-medium font-mono">Aucune unité NFC détectée pour ces paramètres.</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {filteredCartes.map((carte, index) => {
                    const statusKey = (carte as any).norm_statut || normalizeCarteStatus(carte.statut);
                    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.En_attente;

                    return (
                      <motion.div
                        key={carte.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative"
                      >
                        <div className="relative overflow-hidden bg-white hover:bg-gray-50/50 rounded-[2.5rem] border border-gray-100 hover:border-blue-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent pointer-events-none" />

                          <CardContent className="p-8">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                              <div className="flex flex-1 items-start gap-8">
                                <div className="relative">
                                  <div className={`h-16 w-16 rounded-2xl ${config.bgColor} ${config.color} flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
                                    <config.icon className="h-8 w-8" />
                                  </div>
                                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-100">
                                    <div className={`h-full w-full ${config.bgColor} flex items-center justify-center outline-none border-none`}>
                                      <QrCode className={`h-4 w-4 ${config.color}`} />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-xl font-black text-gray-900 tracking-tight font-mono">
                                      {carte.uid_nfc || "NO_UID_ASSIGNED"}
                                    </span>
                                    <Badge className={`rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-0 shadow-sm ${config.bgColor} ${config.color}`}>
                                      {config.label}
                                    </Badge>
                                    {carte.commande_id && (
                                      <span className="text-xs font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">CMD #{carte.commande_id}</span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Propriétaire</p>
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                          <User className="h-3 w-3 text-blue-600" />
                                        </div>
                                        <span className="text-sm font-black text-gray-900 shadow-none">{carte.client_name || "Anonyme"}</span>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Digital Portfolio</p>
                                      <div className="flex items-center gap-2 group/link">
                                        <Globe className="h-4 w-4 text-orange-400 group-hover/link:rotate-12 transition-transform" />
                                        <span className="text-xs font-bold text-blue-600 underline decoration-blue-200 underline-offset-4 truncate max-w-[180px]">
                                          {carte.portfolio_title || carte.lien_portfolio}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-50">Horodatage Système</p>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-purple-400" />
                                        <span className="text-xs font-bold text-gray-600">{formatDate(carte.created_at)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  onClick={() => { setSelectedCarte(carte); setDetailsOpen(true); }}
                                  className="h-14 w-14 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all group/btn outline-none">
                                  <Eye className="h-6 w-6 group-hover/btn:scale-110 transition-transform" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all outline-none border-none shadow-none">
                                      <MoreVertical className="h-6 w-6" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-72 rounded-[2rem] border-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] p-4 bg-white/95 backdrop-blur-xl">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-2">Administrative Actions</DropdownMenuLabel>
                                    <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => { setSelectedCarte(carte); setNewUid(carte.uid_nfc || generateUid()); setAssignDialogOpen(true); }}>
                                      <QrCode className="mr-3 h-4 w-4 text-blue-500" />
                                      Assigner/MAJ UID
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => { setSelectedCarte(carte); setNotes(carte.notes || ""); setEditDialogOpen(true); }}>
                                      <Edit className="mr-3 h-4 w-4 text-orange-500" />
                                      Modifier l'Entité
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl font-bold py-3" onClick={() => window.open(carte.lien_portfolio, '_blank')}>
                                      <ExternalLink className="mr-3 h-4 w-4 text-purple-500" />
                                      Ouvrir Digital View
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-2 bg-gray-100" />
                                    <DropdownMenuItem className="rounded-xl font-bold py-3 text-red-600 focus:bg-red-50 focus:text-red-600" onClick={() => { setSelectedCarte(carte); setDeleteDialogOpen(true); }}>
                                      <Trash2 className="mr-3 h-4 w-4" />
                                      Suppression Définitive
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>

                          <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${config.bgColor}`} />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="commandes" className="mt-0 outline-none">
            <div className="space-y-8">
              {Object.entries(groupedOrders).map(([clientKey, userOrders], sectionIdx) => (
                <motion.div
                  key={clientKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIdx * 0.1 }}
                  className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <div className="h-1 w-12 bg-gray-200 rounded-full" />
                    <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                      {clientKey === 'Autres' ? 'Architecture Sans Nom' : `Vecteur Client: ${clientKey}`}
                    </h5>
                    <Badge variant="outline" className="rounded-full border-gray-100 text-gray-400 font-bold">{userOrders.length} CMD</Badge>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {userOrders.map((order) => (
                      <div key={order.id} className="group relative bg-white/50 hover:bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500">
                        <div className="flex flex-col lg:flex-row justify-between gap-8">
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-gray-900 flex items-center justify-center">
                                <Hash className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h6 className="text-lg font-black text-gray-900">Commande #{order.numero_commande || order.id}</h6>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Engine ID: {order.id} • {formatDate(order.created_at)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Manifeste des Articles</p>
                                <ul className="space-y-2">
                                  {order.items.map((it) => (
                                    <li key={it.id} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                                      <span className="text-gray-900">{it.quantity}x</span> {it.portfolio_title || 'Unité NFC Portefolia'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-4 text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Calcul Transactionnel</p>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter">{order.total.toLocaleString()} <span className="text-blue-600">FCFA</span></p>
                                {getStatusBadge(order.statut)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row lg:flex-col items-center justify-end gap-3">
                            <Button
                              onClick={() => updateOrderStatus(order.id, 'Livrée')}
                              disabled={!!processingOrders[String(order.id)]}
                              className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">
                              <CheckCircle2 className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => generateCommandeInvoice(order.id)}
                              className="h-14 px-6 rounded-2xl border-gray-100 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-100 active:scale-95 transition-all shadow-sm">
                              <Download className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="mt-0 outline-none">
            <div className="grid grid-cols-1 gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl text-center">
                <Box className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-gray-900 mb-2">Réseau de Distribution Graphique</h3>
                <p className="text-gray-400 font-bold max-w-md mx-auto">Visualisation spatiale des unités NFC en cours de déploiement.</p>
              </motion.div>
            </div>
          </TabsContent>

        </Tabs>
      </main>

      {/* ── MODERNIZED DIALOGS ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-0 shadow-2xl rounded-[3rem]">
          {selectedCarte && (
            <div className="flex flex-col h-[85vh] md:h-auto">
              <div className="p-10 bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <QrCode className="h-32 w-32 rotate-12" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="outline" className="rounded-full border-white/10 text-white/60 font-black text-[10px] uppercase tracking-widest px-4">
                      Unité NFC Identifiée
                    </Badge>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight font-mono">{selectedCarte.uid_nfc || "NO_UID_ASSIGNED"}</h2>
                  <div className="flex items-center gap-4 text-white/40 text-xs font-bold">
                    <span>Engine ID: {selectedCarte.id}</span>
                    <span className="h-1 w-1 rounded-full bg-white/10" />
                    <span>Créée le {formatDate(selectedCarte.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-10 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Architecture de Liaison</h5>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <User className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Propriétaire</p>
                          <p className="font-bold text-gray-900">{selectedCarte.client_name || "Anonyme"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Hash className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vecteur Commande</p>
                          <p className="font-bold text-gray-900">#{selectedCarte.commande_id}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Cible Digitale</h5>
                    <div className="p-6 rounded-[2rem] bg-orange-50/50 border border-orange-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <Globe className="h-8 w-8 text-orange-500" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(selectedCarte.lien_portfolio, '_blank')}
                          className="text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-100">
                          Visiter
                        </Button>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg tracking-tight">{selectedCarte.portfolio_title || "Portfolio Anonyme"}</p>
                        <p className="text-xs font-bold text-orange-600/60 truncate">{selectedCarte.lien_portfolio}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedCarte.notes && (
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Notes Techniques</h5>
                    <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-sm text-gray-600">
                      {selectedCarte.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                  className="h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-widest border-gray-200 hover:bg-white transition-all">
                  Fermer le Panel
                </Button>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => { setDetailsOpen(false); setEditDialogOpen(true); }}
                    className="h-14 px-8 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">
                    Éditer l'Entité
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign UID Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white/90 backdrop-blur-2xl border-0 shadow-2xl rounded-[3rem]">
          <div className="p-12 space-y-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Assignation UID</h2>
              <p className="text-gray-400 font-bold text-sm">Lier un identifiant physique au flux digital Portefolia.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Identifiant Unique (Hex/String)</Label>
                <div className="flex gap-4">
                  <Input
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    placeholder="NFC_MATRIX_XXXXXX"
                    className="h-16 px-6 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-mono font-bold text-lg transition-all"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setNewUid(generateUid())}
                    className="h-16 w-16 shrink-0 rounded-2xl border-gray-100 hover:bg-gray-50 group transition-all">
                    <RefreshCw className="h-5 w-5 text-blue-500 group-hover:rotate-180 transition-transform duration-500" />
                  </Button>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 flex items-start gap-4">
                <QrCode className="h-6 w-6 text-blue-600 mt-1" />
                <p className="text-sm font-bold text-blue-900 leading-relaxed">
                  Cet identifiant est définitif une fois gravé. Il permet la synchronisation immédiate avec le portfolio client.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                className="h-14 flex-1 rounded-2xl font-black text-xs uppercase tracking-widest border-gray-200 transition-all shadow-none">
                Annuler
              </Button>
              <Button
                onClick={() => { if (selectedCarte && newUid) assignUid(selectedCarte.id, newUid); }}
                className="h-14 flex-[2] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                Propager l'UID
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border-0 shadow-2xl rounded-[3rem]">
          <div className="p-12 space-y-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Édition Entité</h2>
              <p className="text-gray-400 font-bold text-sm">Modification des paramètres vitaux de l'unité NFC.</p>
            </div>

            {selectedCarte && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Statut Global</Label>
                  <Select
                    value={(selectedCarte as any).norm_statut || normalizeCarteStatus(selectedCarte.statut)}
                    onValueChange={(value) => setSelectedCarte({ ...selectedCarte, statut: value, norm_statut: value })}
                  >
                    <SelectTrigger className="h-16 rounded-2xl bg-gray-50 border-gray-100 font-bold px-6 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="rounded-xl font-bold py-3">
                          <span className="flex items-center gap-3">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Type d'Unité</Label>
                  <Select
                    value={selectedCarte.type || 'physique'}
                    onValueChange={(value) => setSelectedCarte({ ...selectedCarte, type: value })}
                  >
                    <SelectTrigger className="h-16 rounded-2xl bg-gray-50 border-gray-100 font-bold px-6 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      <SelectItem value="physique" className="rounded-xl font-bold py-3">Physique</SelectItem>
                      <SelectItem value="digital" className="rounded-xl font-bold py-3">Digital</SelectItem>
                      <SelectItem value="hybrid" className="rounded-xl font-bold py-3">Hybride</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Notes de Management</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Commentaires internes..."
                    className="min-h-[120px] rounded-2xl bg-gray-50 border-gray-100 font-medium p-6 resize-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/5"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="h-14 flex-1 rounded-2xl font-black text-xs uppercase tracking-widest border-gray-200 transition-all shadow-none">
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (selectedCarte) {
                    updateCarte(selectedCarte.id, {
                      uid_nfc: selectedCarte.uid_nfc,
                      statut: (selectedCarte as any).norm_statut || selectedCarte.statut,
                      type: selectedCarte.type,
                      notes: notes
                    });
                  }
                }}
                className="h-14 flex-[2] rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                Appliquer MAJ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-xl p-0 overflow-hidden bg-white/90 backdrop-blur-3xl border-0 shadow-2xl rounded-[3rem]">
          <div className="p-12 space-y-8">
            <div className="h-20 w-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
              <Trash2 className="h-10 w-10" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Annihilation d'Unité</h2>
              <p className="text-gray-400 font-bold text-sm leading-relaxed">
                La suppression de l'entité <span className="text-red-600 font-black font-mono">{selectedCarte?.uid_nfc || "NO_UID"}</span> est irréversible.
                L'accès digital via cette card sera instantanément rompu.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <AlertDialogCancel className="h-14 flex-1 rounded-2xl font-black text-xs uppercase tracking-widest border-gray-200 hover:bg-gray-50 transition-all shadow-none">
                Avorter
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedCarte && deleteCarte(selectedCarte.id)}
                className="h-14 flex-1 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all outline-none border-none">
                Supprimer
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}