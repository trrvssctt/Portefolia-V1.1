import { useEffect, useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldX,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface Commande {
  id: string;
  numero_commande: string;
  utilisateur_email: string;
  utilisateur_id: string;
  utilisateur?: {
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  montant_total: number;
  statut: string;
  ordered_at: string;
  card_uid?: string;
  portfolio_title?: string;
  paiement_statut: 'non_payé' | 'en_attente_validation' | 'payé' | 'refusé';
  paiement_mode?: string;
  paiement_reference?: string;
  paiement_date?: string;
  paiement_note?: string;
}

const PAIEMENT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  non_payé:              { label: 'Non payé',           color: 'bg-gray-100 text-gray-700',    icon: AlertCircle },
  en_attente_validation: { label: 'En attente valid.',  color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  payé:                  { label: 'Payé ✓',             color: 'bg-green-100 text-green-800',  icon: ShieldCheck },
  refusé:                { label: 'Refusé',             color: 'bg-red-100 text-red-800',      icon: ShieldX },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  En_attente: { label: "En attente", color: "bg-orange-100 text-orange-800", icon: Clock },
  En_traitement: { label: "En traitement", color: "bg-blue-100 text-blue-800", icon: Package },
  Gravée: { label: "Gravée", color: "bg-purple-100 text-purple-800", icon: RefreshCw },
  Expédiée: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800", icon: Truck },
  Livrée: { label: "Livrée", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  Annulée: { label: "Annulée", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function AdminCommandes() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paiementFilter, setPaiementFilter] = useState<string>("all");
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/commandes?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCommandes(json.commandes || []);
    } catch (err) {
      console.error("Erreur chargement commandes");
    } finally {
      setLoading(false);
    }
  };

  function safeFormatDate(dateStr?: string, fmt = "dd MMM yyyy à HH:mm") {
    try {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return format(d, fmt, { locale: fr });
    } catch (e) {
      return "—";
    }
  }

  useEffect(() => {
    load();
    // refresh when other views dispatch that orders changed
    const onUpdated = () => load();
    window.addEventListener('ordersUpdated', onUpdated);
    return () => window.removeEventListener('ordersUpdated', onUpdated);
  }, []);

  const updateStatus = async (id: string, statut: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/api/admin/commandes/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut }),
      });
      await load();
      try {
        window.dispatchEvent(new CustomEvent('ordersUpdated'));
      } catch (e) {}
    } catch (err) {
      console.error("Erreur mise à jour statut");
    }
  };

  const validerPaiement = async (id: string, note = "") => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE}/api/admin/commandes/${id}/valider-paiement`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    setSelectedCommande(null);
    setAdminNote("");
    await load();
  };

  const refuserPaiement = async (id: string, note = "") => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE}/api/admin/commandes/${id}/refuser-paiement`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    setSelectedCommande(null);
    setAdminNote("");
    await load();
  };

  const filteredCommandes = useMemo(() => {
    return commandes.filter((c) => {
      const matchesSearch =
        (c.numero_commande ?? "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.utilisateur_email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.card_uid ?? "").toString().includes(searchTerm) ||
        (c.portfolio_title ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = statusFilter === "all" || c.statut === statusFilter;
      if (statusFilter === 'processed') matchesStatus = c.statut !== 'En_attente' && c.statut !== 'Annulée';
      const matchesPaiement = paiementFilter === "all" || c.paiement_statut === paiementFilter;
      return matchesSearch && matchesStatus && matchesPaiement;
    });
  }, [commandes, searchTerm, statusFilter, paiementFilter]);

  const stats = useMemo(() => {
    const total = commandes.length;
    const enAttente = commandes.filter(c => c.statut === "En_attente").length;
    const livrees = commandes.filter(c => c.statut === "Livrée").length;
    const aValider = commandes.filter(c => c.paiement_statut === "en_attente_validation").length;
    const revenuTotal = commandes.filter(c => c.paiement_statut === 'payé').reduce((acc, c) => acc + Number(c.montant_total || 0), 0);
    return { total, enAttente, livrees, aValider, revenuTotal };
  }, [commandes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-80 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header + Stats */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="h-10 w-10 text-[#28A745]" />
                Gestion des Commandes NFC
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {stats.total} commandes • {stats.enAttente} en attente • {stats.livrees} livrées
                {stats.aValider > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-sm font-semibold px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {stats.aValider} paiement{stats.aValider > 1 ? 's' : ''} à valider
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Revenu total généré</p>
              <p className="text-3xl font-bold text-[#28A745]">
                {stats.revenuTotal.toLocaleString()} F CFA
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-8 border shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Rechercher par numéro, email, UID carte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.keys(STATUS_CONFIG).map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paiementFilter} onValueChange={setPaiementFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrer par paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les paiements</SelectItem>
                  {Object.entries(PAIEMENT_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des commandes */}
        <Card className="border-0 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#28A745]/5 to-emerald-500/5 border-b">
            <CardTitle className="text-2xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-6 w-6" />
                  Commandes ({filteredCommandes.length})
              </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={statusFilter === 'processed' ? 'default' : 'outline'} onClick={() => setStatusFilter(statusFilter === 'processed' ? 'all' : 'processed')}>
                    Commandes traitées
                  </Button>
                  <Button size="sm" variant="outline" onClick={load}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCommandes.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg">
                  {searchTerm || statusFilter !== "all"
                    ? "Aucune commande ne correspond"
                    : "Aucune commande pour le moment"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Portfolio / UID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommandes.map((c) => {
                    const StatusIcon = STATUS_CONFIG[c.statut]?.icon || Clock;
                    return (
                      <TableRow key={c.id} className="hover:bg-gray-50/70 transition">
                        <TableCell className="font-mono font-semibold">
                          #{c.numero_commande}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={c.utilisateur?.profile_image_url} />
                              <AvatarFallback>
                                {(c.utilisateur_email?.[0] ?? "?").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {c.utilisateur?.first_name || "Inconnu"}{" "}
                                {c.utilisateur?.last_name || ""}
                              </p>
                              <p className="text-xs text-gray-500">{c.utilisateur_email ?? '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{c.portfolio_title || "—"}</p>
                            {c.card_uid && (
                              <p className="font-mono text-xs text-gray-500">UID: {c.card_uid}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {safeFormatDate(c.ordered_at)}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-[#28A745]">
                          {Number(c.montant_total).toLocaleString()} F CFA
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[c.statut]?.color || "bg-gray-100"}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[c.statut]?.label || c.statut}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const pcfg = PAIEMENT_CONFIG[c.paiement_statut] || PAIEMENT_CONFIG['non_payé'];
                            const PIcon = pcfg.icon;
                            return (
                              <Badge className={pcfg.color}>
                                <PIcon className="h-3 w-3 mr-1" />
                                {pcfg.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.paiement_statut === 'en_attente_validation' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                onClick={() => { setSelectedCommande(c); setAdminNote(""); }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Valider paiement
                              </Button>
                            )}
                            {c.statut !== "Livrée" && c.statut !== "Annulée" && c.paiement_statut === 'payé' && (
                              <>
                                {c.statut === "En_attente" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(c.id, "En_traitement")}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Traiter
                                  </Button>
                                )}
                                {c.statut === "En_traitement" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(c.id, "Gravée")}
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    Graver
                                  </Button>
                                )}
                                {c.statut === "Gravée" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(c.id, "Expédiée")}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                  >
                                    Expédier
                                  </Button>
                                )}
                                {c.statut === "Expédiée" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(c.id, "Livrée")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Livrée
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog validation paiement */}
      <Dialog open={!!selectedCommande} onOpenChange={(open) => { if (!open) { setSelectedCommande(null); setAdminNote(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-yellow-600" />
              Validation du paiement — #{selectedCommande?.numero_commande}
            </DialogTitle>
          </DialogHeader>
          {selectedCommande && (
            <div className="space-y-4 pt-2">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="font-medium">{selectedCommande.utilisateur_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant</span>
                  <span className="font-bold text-[#28A745]">{Number(selectedCommande.montant_total).toLocaleString()} F CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode de paiement</span>
                  <span className="font-medium capitalize">{selectedCommande.paiement_mode?.replace('_', ' ') || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Référence</span>
                  <span className="font-mono font-semibold text-blue-700">{selectedCommande.paiement_reference || '—'}</span>
                </div>
                {selectedCommande.paiement_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date soumission</span>
                    <span>{safeFormatDate(selectedCommande.paiement_date)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Note admin (optionnel)</label>
                <Textarea
                  placeholder="Raison du refus ou commentaire..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => validerPaiement(selectedCommande.id, adminNote)}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Valider le paiement
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-400 text-red-700 hover:bg-red-50"
                  onClick={() => refuserPaiement(selectedCommande.id, adminNote)}
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}