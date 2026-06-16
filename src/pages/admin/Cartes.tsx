import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from '@/hooks/use-toast';
import {
  Search, CreditCard, Wifi, CheckCircle2, XCircle, Zap,
  RefreshCw, ExternalLink, AlertCircle, Download,
  Eye, Edit, Trash2, QrCode, Globe,
  Calendar, User, Hash, X,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';
const CARD_STYLE: React.CSSProperties = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' };

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
  statut: string;
  total: number;
  items: OrderItem[];
  created_at: string;
  date_livraison?: string;
  type_commande?: string;
  user_id?: string | number | null;
}

const S: Record<string, { label: string; dot: string; bg: string; color: string; Icon: React.ElementType }> = {
  En_attente:    { label: 'En attente',    dot: '#F59E0B', bg: '#FEF3C7', color: '#92400E', Icon: AlertCircle },
  Active:        { label: 'Active',         dot: '#22C55E', bg: '#DCFCE7', color: '#14532D', Icon: CheckCircle2 },
  Annulée:      { label: 'Annulée',       dot: '#EF4444', bg: '#FEE2E2', color: '#7F1D1D', Icon: XCircle },
  Gravée:       { label: 'Gravée',        dot: '#A855F7', bg: '#F3E8FF', color: '#581C87', Icon: Wifi },
  En_cours:     { label: 'En cours',       dot: '#3B82F6', bg: '#DBEAFE', color: '#1E3A8A', Icon: Zap },
  Livrée:       { label: 'Livrée',        dot: '#3B82F6', bg: '#DBEAFE', color: '#1E3A8A', Icon: CheckCircle2 },
  Terminer:     { label: 'Terminé',        dot: '#3B82F6', bg: '#DBEAFE', color: '#1E3A8A', Icon: CheckCircle2 },
  Expédiée:    { label: 'Expédiée',      dot: '#A855F7', bg: '#F3E8FF', color: '#581C87', Icon: Wifi },
  En_traitement:{ label: 'En traitement',  dot: '#3B82F6', bg: '#DBEAFE', color: '#1E3A8A', Icon: Zap },
};

function Pill({ s }: { s: string }) {
  const c = S[s] ?? S.En_attente;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

export default function AdminCartes() {
  const normalizeCarteStatus = (st: string | undefined) => {
    if (!st) return 'En_attente';
    const s = String(st).trim();
    const map: Record<string, string> = {
      'en_attente': 'En_attente', 'en-attente': 'En_attente', 'en attente': 'En_attente',
      'en_traitement': 'En_traitement', 'en-traitement': 'En_traitement',
      'en cours': 'En_traitement', 'en_cours': 'En_traitement',
      'expédiée': 'Expédiée', 'livrée': 'Livrée', 'livree': 'Livrée',
      'annulée': 'Annulée', 'annulee': 'Annulée',
      'active': 'Active', 'gravée': 'Gravée', 'gravee': 'Gravée', 'graver': 'Gravée',
      'terminer': 'Terminer', 'termine': 'Terminer',
    };
    return map[s.toLowerCase()] || s;
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
    total: 0, active: 0, pending: 0, engraved: 0,
    delivered: 0, cancelled: 0, withoutUid: 0, today: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [openOrderRawId, setOpenOrderRawId] = useState<string | number | null>(null);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [commandeOwnerMap, setCommandeOwnerMap] = useState<Record<string, string>>({});
  const [estimatedRevenue, setEstimatedRevenue] = useState<number>(0);
  const [processingOrders, setProcessingOrders] = useState<Record<string, boolean>>({});
  const [processingCartes, setProcessingCartes] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'list' | 'overview' | 'commandes'>('list');
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
      const cartesNormalized = cartesData.map((c: any) => ({
        ...c,
        norm_statut: normalizeCarteStatus(c.statut),
      }));
      setCartes(cartesNormalized);
      const total = cartesNormalized.length;
      const active = cartesNormalized.filter((c: any) => c.norm_statut === "Active").length;
      const pending = cartesNormalized.filter((c: any) => c.norm_statut === "En_attente").length;
      const engraved = cartesNormalized.filter((c: any) => c.norm_statut === "Gravée").length;
      const delivered = cartesNormalized.filter((c: any) => c.norm_statut === "Livrée").length;
      const cancelled = cartesNormalized.filter((c: any) => c.norm_statut === "Annulée").length;
      const withoutUid = cartesNormalized.filter((c: any) => !c.uid_nfc).length;
      const today = cartesNormalized.filter((c: any) =>
        format(new Date(c.created_at), "dd/MM/yyyy") === format(new Date(), "dd/MM/yyyy")
      ).length;
      setStats({ total, active, pending, engraved, delivered, cancelled, withoutUid, today });
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
      const normalized: Order[] = commandes.map((c: any) => {
        const rawItems = c.items || c.items_commandes || c.articles || [];
        let items: any[] = [];
        if (typeof rawItems === 'string') {
          try {
            const parsed = JSON.parse(rawItems);
            items = Array.isArray(parsed) ? parsed : (parsed.items || []);
          } catch (e) { items = []; }
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
        const totalVal = Number(c.montant_total || c.total || c.montant || computedTotal || 0) || 0;
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
          date_livraison: c.date_livraison || c.dateLivraison || null,
          user_id: c.user_id || c.utilisateur_id || c.client_id || c.utilisateur || c.customer_id || null,
        } as Order;
      });
      setOrders(normalized);
      const estimated = normalized.reduce((s, o) => s + (Number(o.total) || 0), 0);
      setEstimatedRevenue(estimated);
      const userIds = Array.from(new Set(normalized.map((o: any) => o.user_id).filter(Boolean)));
      const localUserMap: Record<string, any> = {};
      if (userIds.length > 0) {
        await Promise.all(userIds.map(async (uid: any) => {
          try {
            const ures = await fetch(`${API_BASE}/api/admin/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!ures.ok) return;
            const uj = await ures.json();
            localUserMap[String(uid)] = uj.user || uj;
          } catch (e) { console.warn('Failed to load user', uid, e); }
        }));
        setUserMap(localUserMap);
      }
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
      const realRevenue = normalized.reduce((s, o) => {
        const st = (o.statut || '').toString();
        if (st === 'Livrée' || st === 'Terminer') return s + Number(o.total || 0);
        return s;
      }, 0);
      setRevenue(Number(json.revenue || json.chiffre_affaires || realRevenue || 0));
    } catch (err) {
      console.error('Erreur chargement commandes', err);
    }
  };

  const adjustRevenue = async (amount: number, op: 'increment' | 'decrement') => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/revenue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, op }),
      });
      if (res.ok) {
        const j = await res.json();
        setRevenue(Number(j.revenue || j.chiffre_affaires || (op === 'increment' ? revenue + amount : revenue - amount)));
      } else {
        setRevenue(prev => op === 'increment' ? prev + amount : prev - amount);
      }
    } catch (err) {
      console.warn('adjustRevenue failed', err);
      setRevenue(prev => op === 'increment' ? prev + amount : prev - amount);
    }
  };

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
      if (!res.ok) { const text = await res.text(); throw new Error(text || 'Failed'); }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `commande-${orderId}.pdf`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
      } else if (contentType.includes('text/html')) {
        const html = await res.text();
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        else {
          const blob = new Blob([html], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `commande-${orderId}.html`;
          document.body.appendChild(a); a.click();
          window.URL.revokeObjectURL(url); document.body.removeChild(a);
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `commande-${orderId}`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
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
      const uid = o.user_id;
      if (uid && userMap[String(uid)]) {
        const u = userMap[String(uid)];
        key = `${u.prenom || u.first_name || ''} ${u.nom || u.last_name || ''}`.trim() || (u.email || 'Utilisateur');
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

  const filteredCartes = useMemo(() => {
    let filtered = [...cartes];
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
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => ((c as any).norm_statut || normalizeCarteStatus(c.statut)) === statusFilter);
    }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) { loadCartes(); setAssignDialogOpen(false); setNewUid(""); }
    } catch (err) { console.error("Erreur assignation UID", err); }
  };

  const updateStatus = async (carteId: string, status: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: status }),
      });
      if (res.ok) loadCartes();
    } catch (err) { console.error("Erreur changement statut", err); }
  };

  const markCarteLivree = async (carte: Carte) => {
    setProcessingCartes(prev => ({ ...prev, [String(carte.id)]: true }));
    try {
      await updateStatus(carte.id, 'Livrée');
      if (carte.commande_id) await updateOrderStatus(carte.commande_id, 'Livrée');
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) { loadCartes(); setEditDialogOpen(false); setSelectedCarte(null); setNotes(""); }
    } catch (err) { console.error("Erreur mise à jour carte", err); }
  };

  const deleteCarte = async (carteId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes/${carteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { loadCartes(); setDeleteDialogOpen(false); setSelectedCarte(null); }
    } catch (err) { console.error("Erreur suppression carte", err); }
  };

  const generateUid = () => `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const copyUid = (uid: string) => navigator.clipboard.writeText(uid);

  const exportCartes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/cartes/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cartes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (error) { console.error('Export error:', error); }
  };

  const formatDate = (dateString: string) =>
    format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: fr });

  const TABS = [
    { key: 'list' as const,      label: 'Registre NFC' },
    { key: 'overview' as const,  label: 'Statistiques' },
    { key: 'commandes' as const, label: 'Commandes' },
  ];

  return (
    <div className="space-y-6">

      {/* ── AdminHeader ── */}
      <div className="relative overflow-hidden rounded-2xl text-white px-8 py-6" style={{ background: ADMIN_GRAD }}>
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Wifi size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Gestion des Cartes NFC</h1>
              <p className="text-white/70 text-sm mt-0.5">
                {stats.total} cartes · {stats.active} actives · {stats.pending} en attente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadCartes}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              onClick={exportCartes}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={15} />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl" style={CARD_STYLE}>
          <p className="text-xs text-gray-500 font-medium mb-1">Total cartes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-xl" style={CARD_STYLE}>
          <p className="text-xs text-gray-500 font-medium mb-1">Actives</p>
          <p className="text-3xl font-bold text-[#15803D]">{stats.active}</p>
        </div>
        <div className="bg-white p-5 rounded-xl" style={CARD_STYLE}>
          <p className="text-xs text-gray-500 font-medium mb-1">En attente</p>
          <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-5 rounded-xl" style={CARD_STYLE}>
          <p className="text-xs text-gray-500 font-medium mb-1">Chiffre d'affaires</p>
          <p className="text-xl font-bold text-gray-900">
            {revenue.toLocaleString()} <span className="text-sm text-gray-400 font-normal">FCFA</span>
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-xl flex flex-col sm:flex-row gap-3" style={CARD_STYLE}>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Rechercher par UID, commande, client, portfolio..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32] bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(S).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
        >
          <option value="all">Tous les types</option>
          <option value="physique">Physique</option>
          <option value="digital">Digital</option>
          <option value="hybrid">Hybride</option>
        </select>
      </div>

      {/* ── Tabs ── */}
      <div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === key ? 'bg-white shadow text-[#2E7D32]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Registre ── */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white animate-pulse rounded-xl" style={CARD_STYLE} />
              ))
            ) : filteredCartes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl" style={CARD_STYLE}>
                <CreditCard size={44} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucune carte trouvée</p>
              </div>
            ) : (
              filteredCartes.map(carte => {
                const norm = (carte as any).norm_statut || normalizeCarteStatus(carte.statut);
                const cfg = S[norm] ?? S.En_attente;
                return (
                  <div key={carte.id} className="bg-white rounded-xl p-4" style={CARD_STYLE}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cfg.bg }}
                      >
                        <cfg.Icon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {carte.uid_nfc || 'NO_UID'}
                          </span>
                          <Pill s={norm} />
                          {carte.commande_id && (
                            <span className="text-xs text-gray-400 font-mono">CMD #{carte.commande_id}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={11} />{carte.client_name || 'Anonyme'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe size={11} className="shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {carte.portfolio_title || carte.lien_portfolio}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />{formatDate(carte.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => { setSelectedCarte(carte); setDetailsOpen(true); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#2E7D32] transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => { setSelectedCarte(carte); setNewUid(carte.uid_nfc || generateUid()); setAssignDialogOpen(true); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Assigner UID"
                        >
                          <QrCode size={15} />
                        </button>
                        <button
                          onClick={() => { setSelectedCarte(carte); setNotes(carte.notes || ""); setEditDialogOpen(true); }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Modifier"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => window.open(carte.lien_portfolio, '_blank')}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Ouvrir portfolio"
                        >
                          <ExternalLink size={15} />
                        </button>
                        <button
                          onClick={() => { setSelectedCarte(carte); setDeleteDialogOpen(true); }}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab: Statistiques ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total',        value: stats.total,      dot: '#6B7280' },
              { label: 'Actives',      value: stats.active,     dot: '#22C55E' },
              { label: 'En attente',   value: stats.pending,    dot: '#F59E0B' },
              { label: 'Gravées',      value: stats.engraved,   dot: '#A855F7' },
              { label: 'Livrées',      value: stats.delivered,  dot: '#3B82F6' },
              { label: 'Annulées',     value: stats.cancelled,  dot: '#EF4444' },
              { label: 'Sans UID',     value: stats.withoutUid, dot: '#9CA3AF' },
              { label: "Aujourd'hui",  value: stats.today,      dot: '#2E7D32' },
            ].map(({ label, value, dot }) => (
              <div key={label} className="bg-white p-5 rounded-xl flex items-center gap-3" style={CARD_STYLE}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Commandes ── */}
        {activeTab === 'commandes' && (
          <div className="space-y-8">
            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl" style={CARD_STYLE}>
                <Hash size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune commande</p>
              </div>
            ) : (
              Object.entries(groupedOrders).map(([clientKey, userOrders]) => (
                <div key={clientKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {clientKey === 'Autres' ? 'Client anonyme' : clientKey}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {userOrders.length} commande{userOrders.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="space-y-3">
                    {userOrders.map(order => (
                      <div key={order.id} className="bg-white rounded-xl p-5" style={CARD_STYLE}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                Commande #{order.numero_commande || order.id}
                              </span>
                              <Pill s={order.statut} />
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{formatDate(order.created_at)}</p>
                            <ul className="space-y-1">
                              {order.items.map(it => (
                                <li key={it.id} className="text-xs text-gray-600 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] shrink-0" />
                                  {it.quantity}× {it.portfolio_title || 'Unité NFC Portefolia'}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                            <span className="text-lg font-bold text-gray-900">
                              {order.total.toLocaleString()}{' '}
                              <span className="text-sm text-gray-400 font-normal">FCFA</span>
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'Livrée')}
                                disabled={!!processingOrders[String(order.id)]}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold hover:bg-[#C8E6C9] transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} /> Livrer
                              </button>
                              <button
                                onClick={() => generateCommandeInvoice(order.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                              >
                                <Download size={12} /> Facture
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <div className={`fixed inset-0 z-50 ${detailsOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${detailsOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDetailsOpen(false)}
        />
        <aside
          className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
          style={{
            transform: detailsOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {selectedCarte && (
            <>
              <div className="p-6 text-white shrink-0" style={{ background: ADMIN_GRAD }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Wifi size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-white/60 font-medium">Détails de la carte</p>
                      <p className="font-mono font-semibold text-sm mt-0.5">
                        {selectedCarte.uid_nfc || 'NO_UID_ASSIGNED'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsOpen(false)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Statut</p>
                  <Pill s={(selectedCarte as any).norm_statut || normalizeCarteStatus(selectedCarte.statut)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Propriétaire</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <User size={13} className="text-gray-400" />
                    {selectedCarte.client_name || 'Anonyme'}
                  </p>
                  {selectedCarte.client_email && (
                    <p className="text-xs text-gray-500 mt-1 ml-5">{selectedCarte.client_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Commande</p>
                  <p className="text-sm font-mono text-gray-700">#{selectedCarte.commande_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Portfolio lié</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCarte.portfolio_title || '—'}</p>
                  {selectedCarte.lien_portfolio && (
                    <button
                      onClick={() => window.open(selectedCarte.lien_portfolio, '_blank')}
                      className="mt-1 text-xs text-[#2E7D32] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Ouvrir le portfolio
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date de création</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Calendar size={11} className="text-gray-400" />
                    {formatDate(selectedCarte.created_at)}
                  </p>
                </div>
                {selectedCarte.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                    <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 font-mono leading-relaxed">
                      {selectedCarte.notes}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    setDetailsOpen(false);
                    setNotes(selectedCarte.notes || '');
                    setEditDialogOpen(true);
                  }}
                  className="flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{ background: ADMIN_GRAD }}
                >
                  <Edit size={14} /> Modifier
                </button>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="px-4 h-9 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Assign UID Modal ── */}
      {assignDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAssignDialogOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" style={CARD_STYLE}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Assigner un UID NFC</h2>
              <button onClick={() => setAssignDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Identifiant NFC
                </label>
                <div className="flex gap-2">
                  <input
                    value={newUid}
                    onChange={e => setNewUid(e.target.value)}
                    placeholder="NFC_XXXXXX"
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                  />
                  <button
                    onClick={() => setNewUid(generateUid())}
                    className="px-3 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                    title="Générer un UID aléatoire"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                <QrCode size={13} className="mt-0.5 shrink-0" />
                <span>Cet identifiant sera lié de façon permanente à la carte une fois gravé.</span>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setAssignDialogOpen(false)}
                className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => { if (selectedCarte && newUid) assignUid(selectedCarte.id, newUid); }}
                className="flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-colors"
                style={{ background: ADMIN_GRAD }}
              >
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editDialogOpen && selectedCarte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditDialogOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" style={CARD_STYLE}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Modifier la carte</h2>
              <button onClick={() => setEditDialogOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Statut</label>
                <select
                  value={(selectedCarte as any).norm_statut || normalizeCarteStatus(selectedCarte.statut)}
                  onChange={e => setSelectedCarte({ ...selectedCarte, statut: e.target.value, norm_statut: e.target.value } as any)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                >
                  {Object.entries(S).map(([k, c]) => (
                    <option key={k} value={k}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                <select
                  value={selectedCarte.type || 'physique'}
                  onChange={e => setSelectedCarte({ ...selectedCarte, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                >
                  <option value="physique">Physique</option>
                  <option value="digital">Digital</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes internes..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEditDialogOpen(false)}
                className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedCarte) {
                    updateCarte(selectedCarte.id, {
                      uid_nfc: selectedCarte.uid_nfc,
                      statut: (selectedCarte as any).norm_statut || selectedCarte.statut,
                      type: selectedCarte.type,
                      notes,
                    });
                  }
                }}
                className="flex-1 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteDialogOpen && selectedCarte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteDialogOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={CARD_STYLE}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900 mb-2">Supprimer cette carte ?</h2>
              <p className="text-sm text-gray-500 mb-6">
                La carte{' '}
                <span className="font-mono font-semibold text-red-600">
                  {selectedCarte.uid_nfc || 'NO_UID'}
                </span>{' '}
                sera supprimée définitivement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteCarte(selectedCarte.id)}
                  className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
