import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Euro,
  CheckCircle2,
  Star,
  Zap,
  TrendingUp,
  Users,
  Shield,
  RefreshCw,
  Download,
  Filter,
  ArrowUpRight,
  Eye,
  Copy,
  MoreVertical,
  Sparkles,
  Crown,
  Target,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

interface Plan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
  position: number;
  features?: string[];
  created_at: string;
  updated_at: string;
  subscribers_count?: number;
  monthly_revenue?: number;
  billing_interval?: string;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("position");
  const [statsPeriod, setStatsPeriod] = useState<string>("month");
  const [detailedStats, setDetailedStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("F CFA");
  const [isActive, setIsActive] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [position, setPosition] = useState("0");
  const [features, setFeatures] = useState<string[]>([""]);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  const isZeroDecimal = (cur: string) => ["XOF", "FCFA", "XAF"].includes(cur.toUpperCase());

  async function loadPlans() {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/admin/plans`, { headers });
      if (res.status === 401) {
        navigate('/admin/sama_connection_page');
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de récupérer les formules",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDetailedStats(period: string) {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/admin/stats/plans-detailed?period=${period}`, { headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Analytics fetch error:', res.status, errorData);
        throw new Error("Failed to fetch detailed stats");
      }
      const data = await res.json();
      setDetailedStats(data.stats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    if (detailedStats.length === 0 || refreshing) {
      loadDetailedStats(statsPeriod);
    }
  }, [statsPeriod, refreshing]);

  const openCreateDialog = () => {
    setSelectedPlan(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");

    // Fix: Price display for zero-decimal currencies
    const p = isZeroDecimal(plan.currency) ? plan.price_cents : plan.price_cents / 100;
    setPrice(p.toString());

    setCurrency(plan.currency === 'FCFA' ? 'F CFA' : plan.currency);
    setIsActive(plan.is_active);
    setIsPopular(plan.is_popular || false);
    setPosition(plan.position?.toString() || "0");
    setFeatures(plan.features?.length ? plan.features : [""]);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCurrency("F CFA");
    setIsActive(true);
    setIsPopular(false);
    setPosition("0");
    setFeatures([""]);
  };

  const handleSavePlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Authentification requise", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!name || !price) {
      toast({
        title: "Champs requis",
        description: "Nom et prix obligatoires",
        variant: "destructive"
      });
      return;
    }

    const cur = currency.replace(/\s+/g, '').toUpperCase();
    const finalCurrency = cur === 'FCFA' ? 'XOF' : cur;

    const payload: any = {
      name,
      description,
      // Fix: Price saving for zero-decimal currencies
      price_cents: isZeroDecimal(finalCurrency) ? Math.round(parseFloat(price)) : Math.round(parseFloat(price) * 100),
      currency: finalCurrency,
      is_active: isActive,
      is_popular: isPopular,
      position: parseInt(position) || 0,
    };

    const filteredFeatures = features.filter(f => f.trim() !== "");
    if (filteredFeatures.length > 0) {
      payload.features = filteredFeatures;
    }

    try {
      const url = selectedPlan
        ? `${API_BASE}/api/admin/plans/${selectedPlan.id}`
        : `${API_BASE}/api/admin/plans`;

      const method = selectedPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) navigate("/auth");
        throw new Error(data?.error || "Erreur serveur");
      }

      toast({
        title: "✅ Succès",
        description: selectedPlan
          ? "Formule mise à jour avec succès"
          : "Formule créée avec succès",
      });

      setDialogOpen(false);
      loadPlans();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'enregistrer la formule",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/auth");

    try {
      const res = await fetch(`${API_BASE}/api/admin/plans/${plan.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur suppression");

      toast({
        title: "✅ Supprimée",
        description: "Formule supprimée avec succès"
      });

      setDeleteDialogOpen(false);
      setSelectedPlan(null);
      loadPlans();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/plans/${plan.id}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Erreur activation");

      toast({
        title: plan.is_active ? "✅ Désactivée" : "✅ Activée",
        description: plan.is_active
          ? "La formule a été désactivée"
          : "La formule a été activée",
      });

      loadPlans();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (plan: Plan) => {
    const amount = isZeroDecimal(plan.currency) ? plan.price_cents : plan.price_cents / 100;
    return `${amount.toLocaleString("fr-FR")} F CFA`;
  };

  const addFeatureField = () => {
    setFeatures([...features, ""]);
  };

  const removeFeatureField = (index: number) => {
    const newFeatures = features.filter((_, i) => i !== index);
    setFeatures(newFeatures.length ? newFeatures : [""]);
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const exportPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/plans/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plans-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: "La liste des plans a été téléchargée"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  const filteredAndSortedPlans = useMemo(() => {
    let filtered = [...plans];

    // Filter
    if (filter !== "all") {
      if (filter === "active") {
        filtered = filtered.filter(p => p.is_active);
      } else if (filter === "inactive") {
        filtered = filtered.filter(p => !p.is_active);
      } else if (filter === "popular") {
        filtered = filtered.filter(p => p.is_popular);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "position":
          return a.position - b.position;
        case "price_asc":
          return a.price_cents - b.price_cents;
        case "price_desc":
          return b.price_cents - a.price_cents;
        case "name":
          return a.name.localeCompare(b.name);
        case "subscribers":
          return (b.subscribers_count || 0) - (a.subscribers_count || 0);
        default:
          return a.position - b.position;
      }
    });

    return filtered;
  }, [plans, filter, sortBy]);

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => p.is_active).length;
    const popular = plans.filter(p => p.is_popular).length;
    const totalRevenue = plans.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0);
    const totalSubscribers = plans.reduce((sum, p) => sum + (p.subscribers_count || 0), 0);

    return {
      total,
      active,
      popular,
      totalRevenue,
      totalSubscribers,
      formattedRevenue: totalRevenue.toLocaleString("fr-FR")
    };
  }, [plans]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">


      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-semibold mb-2">
                <Badge variant="outline" className="bg-blue-50/50 border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                  Administration
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                  <Package className="h-8 w-8 text-white" />
                </div>
                Formules & Tarifs
              </h1>
              <p className="text-gray-500 mt-3 text-lg max-w-2xl leading-relaxed">
                Optimisez vos revenus en gérant vos offres de cartes NFC connectées.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="lg"
                onClick={loadPlans}
                disabled={refreshing}
                className="rounded-2xl hover:bg-white/50 transition-all active:scale-95"
              >
                <RefreshCw className={`h-5 w-5 mr-3 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={exportPlans}
                className="rounded-2xl bg-white border-0 shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <Download className="h-5 w-5 mr-3 text-gray-500" />
                Exporter
              </Button>

              <Button
                size="lg"
                onClick={openCreateDialog}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 px-8"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle formule
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Formules", value: stats.total, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Formules Actives", value: stats.active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "Abonnés Actifs", value: stats.totalSubscribers, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "MRR Estimé", value: `${stats.formattedRevenue} F`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" }
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white group hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="rounded-2xl bg-white border-0 shadow-sm h-12">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Filtrer" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="all">Toutes les formules</SelectItem>
                  <SelectItem value="active">Actives uniquement</SelectItem>
                  <SelectItem value="inactive">Inactives uniquement</SelectItem>
                  <SelectItem value="popular">Populaires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:w-64">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-2xl bg-white border-0 shadow-sm h-12">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-2xl">
                  <SelectItem value="position">Position d'affichage</SelectItem>
                  <SelectItem value="price_asc">Prix croissant</SelectItem>
                  <SelectItem value="price_desc">Prix décroissant</SelectItem>
                  <SelectItem value="name">Nom alphabétique</SelectItem>
                  <SelectItem value="subscribers">Nombre d'abonnés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="grid" className="w-full md:w-auto">
            <TabsList className="bg-white/50 p-1 rounded-2xl h-12 border border-white">
              <TabsTrigger value="grid" className="rounded-xl px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Grille</TabsTrigger>
              <TabsTrigger value="list" className="rounded-xl px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Liste</TabsTrigger>
              <TabsTrigger value="stats" className="rounded-xl px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Analyse</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs defaultValue="grid">
          <TabsContent value="grid" className="mt-0 outline-none">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[400px] rounded-[32px] bg-white/50" />
                ))}
              </div>
            ) : filteredAndSortedPlans.length === 0 ? (
              <div className="bg-white/50 backdrop-blur-md rounded-[40px] border-2 border-dashed border-gray-300 py-20 text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <Package className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Aucune formule à afficher</h3>
                <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                  Ajustez vos filtres ou créez une nouvelle formule pour commencer.
                </p>
                <Button variant="outline" className="mt-8 rounded-2xl px-8 h-12 border-gray-300" onClick={() => setFilter("all")}>
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredAndSortedPlans.map((plan) => (
                  <Card key={plan.id} className={`group relative h-full border-0 rounded-[32px] bg-white shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden flex flex-col ${!plan.is_active ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                    {/* Visual accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${plan.is_popular ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} />

                    <CardHeader className="pt-8 px-8 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {plan.is_popular && (
                              <Badge className="bg-orange-50 text-orange-600 border-orange-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-none">
                                <Sparkles className="h-3 w-3 mr-1" /> Best-seller
                              </Badge>
                            )}
                            {!plan.is_active && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-none">
                                <Eye className="h-3 w-3 mr-1" /> Masqué
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                            {plan.name}
                          </CardTitle>
                        </div>

                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100" onClick={() => openEditDialog(plan)}>
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-2xl p-2 min-w-[180px]">
                              <DropdownMenuItem onClick={() => handleToggleActive(plan)} className="rounded-xl py-3 cursor-pointer">
                                {plan.is_active ? (
                                  <><Eye className="mr-3 h-4 w-4 text-orange-500" /> Désactiver</>
                                ) : (
                                  <><CheckCircle2 className="mr-3 h-4 w-4 text-green-500" /> Activer</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-2" />
                              <DropdownMenuItem
                                className="text-red-500 rounded-xl py-3 cursor-pointer hover:bg-red-50"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-3 h-4 w-4" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-gray-900 tracking-tight">
                            {plan.price_cents.toLocaleString()}
                          </span>
                          <span className="text-lg font-bold text-gray-400">F CFA</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium uppercase mt-1">
                          {plan.billing_interval === 'monthly' ? 'Par mois' : plan.billing_interval === 'yearly' ? 'Par an' : 'Paiement unique'}
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-8 flex-1 flex flex-col">
                      <p className="text-gray-500 leading-relaxed mb-8 text-sm italic">
                        {plan.description || "Aucune description de formule"}
                      </p>

                      <div className="space-y-4 mb-8">
                        {plan.features?.slice(0, 5).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="p-1 bg-green-50 text-green-600 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                            <span className="font-medium">{feat}</span>
                          </div>
                        ))}
                        {(plan.features?.length || 0) > 5 && (
                          <p className="text-xs text-blue-500 font-bold ml-7">
                            + {plan.features!.length - 5} autres avantages
                          </p>
                        )}
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Abonnés</span>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {[...Array(Math.min(3, plan.subscribers_count || 0))].map((_, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
                              ))}
                            </div>
                            <span className="text-sm font-black text-gray-700">{plan.subscribers_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue</span>
                          <span className="text-sm font-black text-blue-600">{(plan.monthly_revenue || 0).toLocaleString()} F</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-0 outline-none">
            <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden bg-white/70 backdrop-blur-md">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-2xl bg-gray-100" />
                    ))}
                  </div>
                ) : filteredAndSortedPlans.length === 0 ? (
                  <div className="text-center py-20">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Aucune formule trouvée</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredAndSortedPlans.map((plan) => (
                      <div key={plan.id} className="flex flex-col sm:flex-row items-center justify-between p-6 hover:bg-white/50 transition-colors group">
                        <div className="flex items-center gap-6 w-full sm:w-auto mb-4 sm:mb-0">
                          <div className={`h-16 w-16 rounded-[20px] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 ${plan.is_popular
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-br from-blue-500 to-blue-700'
                            }`}>
                            <Package className="h-8 w-8 text-white" />
                          </div>

                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-black text-gray-900">{plan.name}</h3>
                              {plan.is_popular && (
                                <Badge className="bg-orange-50 text-orange-600 border-none font-bold text-[10px] uppercase">Populaire</Badge>
                              )}
                              {!plan.is_active && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-400 border-none font-bold text-[10px] uppercase">Inactif</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xl font-black text-blue-600">
                                {plan.price_cents.toLocaleString()} F
                              </span>
                              <span className="text-xs font-bold text-gray-400 uppercase">
                                {plan.billing_interval === 'monthly' ? 'Mensuel' : plan.billing_interval === 'yearly' ? 'Annuel' : 'Unique'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                          <div className="hidden lg:flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Abonnés</p>
                              <p className="font-black text-gray-700">{plan.subscribers_count || 0}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Position</p>
                              <p className="font-black text-gray-700">{plan.position}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => openEditDialog(plan)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-2xl p-2 min-w-[180px]">
                                <DropdownMenuItem onClick={() => handleToggleActive(plan)} className="rounded-xl py-3 cursor-pointer">
                                  {plan.is_active ? "Désactiver" : "Activer"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-2" />
                                <DropdownMenuItem
                                  className="text-red-500 rounded-xl py-3 cursor-pointer hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedPlan(plan);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-0 outline-none">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Analyse de Performance</h2>
                </div>

                <Select value={statsPeriod} onValueChange={setStatsPeriod}>
                  <SelectTrigger className="w-full sm:w-[180px] rounded-2xl bg-white border-0 shadow-sm">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-2xl">
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="semester">Ce semestre</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-[32px] bg-white/50" />
                  ))}
                </div>
              ) : detailedStats.length === 0 ? (
                <div className="bg-white/50 backdrop-blur-md rounded-[32px] border-2 border-dashed border-gray-300 py-20 text-center">
                  <BarChart3 className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">Aucune donnée disponible pour cette période</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {detailedStats.map((item) => (
                    <Card key={item.id} className="border-0 rounded-[32px] bg-white shadow-xl overflow-hidden group">
                      <div className="h-2 w-full bg-blue-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl font-black">{item.name}</CardTitle>
                            <Badge variant="outline" className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {item.slug}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-600">{item.active_subscribers} abonnés</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Actuels</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl">
                              <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Revenu</p>
                              <p className="text-xl font-black text-gray-900">{item.revenue.toLocaleString()} F</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                              <ArrowUpRight className="h-4 w-4" />
                              <span>{(item.revenue / (item.active_subscribers || 1) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nouveaux</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">+{item.new_subscribers}</p>
                            <p className="text-xs text-gray-500 mt-1">Sur la période</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-orange-600" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ARPU</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">
                              {item.new_subscribers > 0 ? Math.round(item.revenue / item.new_subscribers).toLocaleString() : 0}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Moy. / nouveau</p>
                          </div>
                        </div>

                        {/* Progress bar logic for revenue vs subscribers */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-400 uppercase tracking-widest">Conversion</span>
                            <span className="text-blue-600">{item.active_subscribers > 0 ? ((item.new_subscribers / item.active_subscribers) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, (item.new_subscribers / (item.active_subscribers || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>


      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto rounded-[32px] border-0 shadow-2xl p-0 bg-[#f8fafc]">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-white p-0">
                  {selectedPlan ? "Modifier la formule" : "Nouvelle formule"}
                </DialogTitle>
                <DialogDescription className="text-blue-100 text-base">
                  Créez une offre irrésistible pour vos utilisateurs.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Nom de la formule</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Starter NFC"
                  className="rounded-2xl border-gray-200 h-12 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="position" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Position d'affichage</Label>
                <Input
                  id="position"
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="0"
                  className="rounded-2xl border-gray-200 h-12 bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Description marketing</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez les avantages exclusifs..."
                rows={3}
                className="rounded-2xl border-gray-200 bg-white shadow-sm p-4"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="price" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Tarif (F CFA)</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3000"
                    className="rounded-2xl border-gray-200 h-12 bg-white shadow-sm pl-4 pr-16 font-black text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">F CFA</div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="currency" className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Périodicité</Label>
                <Select value={currency} onValueChange={(val) => setCurrency(val)}>
                  <SelectTrigger className="rounded-2xl border-gray-200 h-12 bg-white shadow-sm">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-2xl">
                    <SelectItem value="F CFA">Paiement unique</SelectItem>
                    <SelectItem value="par mois">Par mois</SelectItem>
                    <SelectItem value="par an">Par an</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-gray-900 font-bold">Statut de visibilité</Label>
                    <p className="text-xs text-gray-500">Rendre la formule publique immédiatement</p>
                  </div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Separator className="bg-gray-50" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${isPopular ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-gray-900 font-bold">Badge Populaire</Label>
                    <p className="text-xs text-gray-500">Mettre en avant avec un badge spécial</p>
                  </div>
                </div>
                <Switch checked={isPopular} onCheckedChange={setIsPopular} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Fonctionnalités incluses</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addFeatureField} className="text-blue-600 hover:bg-blue-50 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un avantage
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <div className="relative flex-1">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder="ex: Design sur mesure"
                        className="rounded-xl border-gray-200 bg-white h-10 pr-10"
                      />
                      {features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeatureField(index)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-white border-t border-gray-100 sm:justify-between items-center">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-2xl px-8 h-12 text-gray-500 font-bold">
              Annuler
            </Button>
            <Button onClick={handleSavePlan} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black h-12 px-10 shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5" disabled={refreshing}>
              {selectedPlan ? "Mettre à jour" : "Lancer la formule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-0 shadow-2xl p-8 bg-white">
          <AlertDialogHeader>
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-gray-900">
              Supprimer cette formule ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 text-base leading-relaxed mt-2">
              Êtes-vous sûr de vouloir supprimer la formule <span className="font-bold text-gray-900">"{selectedPlan?.name}"</span> ? Cette action est définitive et toutes les données associées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedPlan && (selectedPlan.subscribers_count || 0) > 0 && (
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 mt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800 leading-relaxed">
                  <p className="font-bold">Attention</p>
                  <p className="mt-1">
                    Cette formule est actuellement utilisée par <span className="font-black">{selectedPlan.subscribers_count} utilisateur(s)</span>. Sa suppression pourrait entraîner des erreurs de facturation ou de service pour ces clients.
                  </p>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="mt-8 sm:justify-center gap-3">
            <AlertDialogCancel className="rounded-2xl px-8 h-12 border-gray-200 font-bold text-gray-500">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                selectedPlan && handleDeletePlan(selectedPlan);
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black h-12 px-8 shadow-lg shadow-red-100"
            >
              Oui, supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}