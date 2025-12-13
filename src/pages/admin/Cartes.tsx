import { useEffect, useState, useMemo } from "react";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  En_attente: { label: "En attente", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
  Active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  Annulée: { label: "Annulée", color: "bg-red-100 text-red-800", icon: XCircle },
  Gravée: { label: "Gravée", color: "bg-purple-100 text-purple-800", icon: Wifi },
};

export default function AdminCartes() {
  const [cartes, setCartes] = useState<Carte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/cartes?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCartes(json.cartes || []);
    } catch (err) {
      console.error("Erreur chargement cartes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assignUid = async (id: string) => {
    const token = localStorage.getItem("token");
    const uid = "NFC_" + Date.now();
    try {
      await fetch(`${API_BASE}/api/admin/cartes/${id}/assign-uid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      load();
    } catch (err) {
      console.error("Erreur assignation UID");
    }
  };

  const setStatus = async (id: string, statut: string) => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/api/admin/cartes/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut }),
      });
      load();
    } catch (err) {
      console.error("Erreur changement statut");
    }
  };

  const filteredCartes = useMemo(() => {
    return cartes.filter((c) =>
      searchTerm === "" ||
      c.uid_nfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.commande_id.includes(searchTerm) ||
      c.lien_portfolio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.portfolio_title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cartes, searchTerm]);

  const stats = {
    total: cartes.length,
    active: cartes.filter(c => c.statut === "Active").length,
    withoutUid: cartes.filter(c => !c.uid_nfc).length,
    today: cartes.filter(c => format(new Date(c.created_at), "dd/MM/yyyy") === format(new Date(), "dd/MM/yyyy")).length,
  };

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-80 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        </div>
        <AdminFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header + Stats */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <CreditCard className="h-10 w-10 text-[#28A745]" />
                Gestion des Cartes NFC
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {stats.total} cartes au total • {stats.active} actives • {stats.withoutUid} sans UID
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#28A745] to-green-600 text-white p-4 rounded-xl shadow-lg">
              <p className="text-sm opacity-90">Créées aujourd'hui</p>
              <p className="text-3xl font-bold">{stats.today}</p>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <Card className="mb-8 border shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Rechercher par UID, commande, email, portfolio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tableau des cartes */}
        <Card className="border-0 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#28A745]/5 to-emerald-500/5 border-b">
            <CardTitle className="text-2xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-6 w-6" />
                Toutes les cartes NFC ({filteredCartes.length})
              </span>
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </CardTitle>
            <CardDescription>
              Assignez un UID et activez les cartes pour qu'elles fonctionnent
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {filteredCartes.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Wifi className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg">
                  {searchTerm ? "Aucune carte trouvée" : "Aucune carte NFC créée pour le moment"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID NFC</TableHead>
                    <TableHead>Commande</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCartes.map((c) => {
                    const StatusIcon = STATUS_CONFIG[c.statut]?.icon || AlertCircle;
                    return (
                      <TableRow key={c.id} className="hover:bg-gray-50/70 transition">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.uid_nfc ? (
                              <>
                                <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {c.uid_nfc}
                                </code>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => copyUid(c.uid_nfc!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Non assigné</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium">
                          #{c.commande_id}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {c.portfolio_title || "—"}
                            </span>
                            {c.lien_portfolio && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => window.open(c.lien_portfolio, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {c.client_email?.[0].toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p className="font-medium">{c.client_name || "—"}</p>
                              <p className="text-gray-500">{c.client_email || "—"}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={STATUS_CONFIG[c.statut]?.color || "bg-gray-100"}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[c.statut]?.label || c.statut}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!c.uid_nfc && (
                              <Button
                                size="sm"
                                onClick={() => assignUid(c.id)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Wifi className="h-4 w-4 mr-1" />
                                Assigner UID
                              </Button>
                            )}
                            {c.statut !== "Active" && c.uid_nfc && (
                              <Button
                                size="sm"
                                onClick={() => setStatus(c.id, "Active")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Activer
                              </Button>
                            )}
                            {c.statut !== "Annulée" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setStatus(c.id, "Annulée")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Annuler
                              </Button>
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

      <AdminFooter />
    </div>
  );
}