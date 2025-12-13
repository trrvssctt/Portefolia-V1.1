import React, { useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
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
import { Plus, Edit2, Trash2, Package, Euro } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend-v-card.onrender.com";

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("F CFA");
  const [description, setDescription] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/plans`);
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      toast({
        title: "Erreur de chargement",
        description: "Impossible de récupérer les formules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice("");
    setCurrency("F CFA");
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name || "");
    setDescription(p.description || "");
    setPrice((Number(p.price_cents || p.price || 0) / 100).toString());
    setCurrency(p.currency || "F CFA");
    setOpen(true);
  };

  const savePlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Authentification requise", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!name || !price) {
      toast({ title: "Champs requis", description: "Nom et prix obligatoires", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      description,
      price_cents: Math.round(parseFloat(price) * 100),
      currency,
    };

    try {
      const url = editing ? `${API_BASE}/api/plans/${editing.id}` : `${API_BASE}/api/plans`;
      const method = editing ? "PUT" : "POST";

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
        title: "Succès !",
        description: editing ? "Formule mise à jour" : "Formule créée avec succès",
      });

      setOpen(false);
      loadPlans();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible d’enregistrer la formule",
        variant: "destructive",
      });
    }
  };

  const deletePlan = async (p: any) => {
    if (!confirm(`Supprimer définitivement la formule "${p.name}" ?`)) return;

    const token = localStorage.getItem("token");
    if (!token) return navigate("/auth");

    try {
      const res = await fetch(`${API_BASE}/api/plans/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur suppression");

      toast({ title: "Supprimée", description: "Formule supprimée avec succès" });
      loadPlans();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const formatPrice = (p: any) => {
    const amount = (Number(p.price_cents || p.price || 0) / 100).toLocaleString("fr-FR");
    return `${amount} ${(p.currency === 'FCFA' ? 'F CFA' : (p.currency || 'F CFA'))}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-10 h-10 text-emerald-600" />
              Gestion des Formules NFC
            </h1>
            <p className="text-gray-600 mt-2">Créez et gérez vos offres de cartes NFC connectées</p>
          </div>
          <Button onClick={openCreate} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle formule
          </Button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700">Aucune formule pour le moment</h3>
            <p className="text-gray-500 mt-2">Commencez par créer votre première offre !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((p) => (
              <div key={p.id}>
                <Card className="h-full shadow-lg hover:shadow-xl transition-shadow border-0 overflow-hidden bg-white/95 backdrop-blur">
                  <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <CardTitle className="text-2xl flex items-center justify-between">
                      {p.name}
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {(p.currency === 'FCFA' ? 'F CFA' : (p.currency || 'F CFA'))}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-white/90 text-lg mt-3">
                      <span className="text-4xl font-bold">{formatPrice(p).split(" ")[0]}</span>
                      <span className="text-xl"> {(p.currency === "FCFA" || p.currency === 'F CFA') ? '' : '/'}{(p.currency === 'FCFA' ? 'F CFA' : (p.currency || 'F CFA'))}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <p className="text-gray-600 min-h-[60px]">
                      {p.description || "Aucune description"}
                    </p>
                  </CardContent>

                  <CardFooter className="flex justify-between bg-gray-50">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deletePlan(p)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Création / Édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editing ? "Modifier la formule" : "Créer une nouvelle formule"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Apportez vos modifications ci-dessous." : "Remplissez les informations de votre offre NFC."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div>
              <Label htmlFor="name">Nom de la formule</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Starter NFC"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez les avantages de cette formule..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Prix</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="30000"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="currency">Devise</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="F CFA"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={savePlan} className="bg-emerald-600 hover:bg-emerald-700">
              {editing ? "Enregistrer les modifications" : "Créer la formule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminFooter />
    </div>
  );
}