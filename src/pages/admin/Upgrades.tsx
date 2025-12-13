// src/pages/admin/AdminUpgrades.tsx

import React, { useEffect, useState, useMemo } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import AdminFooter from '@/components/admin/AdminFooter';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

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
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode; final: boolean }> = {
  pending:   { label: 'En attente',   badge: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" />, final: false },
  confirmed: { label: 'Confirmé',     badge: 'bg-blue-100 text-blue-800',     icon: <CheckCircle2 className="w-4 h-4" />, final: false },
  approved:  { label: 'Approuvé',     badge: 'bg-green-100 text-green-800',   icon: <CheckCircle2 className="w-4 h-4" />, final: true },
  rejected:  { label: 'Refusé',       badge: 'bg-red-100 text-red-800',       icon: <XCircle className="w-4 h-4" />, final: true },
};

const PAYMENT_METHODS = [
  { value: 'wave',         label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'manual',       label: 'Manuel (espèces, virement…)' },
];

export default function AdminUpgrades() {
  const [items, setItems] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UpgradeRequest | null>(null);
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wave');
  const [imageUrl, setImageUrl] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentification requise');

      const res = await fetch(`${API_BASE}/api/admin/upgrades?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Impossible de charger');

      const json = await res.json();
      setItems(json.checkouts || json.upgrades || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        search === '' ||
        `${it.user_prenom} ${it.user_nom}`.toLowerCase().includes(search.toLowerCase()) ||
        it.user_email.toLowerCase().includes(search.toLowerCase()) ||
        it.reference_transaction?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || it.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const open = (it: UpgradeRequest) => {
    const config = STATUS_CONFIG[it.status];
    if (config?.final) {
      toast({
        title: 'Action impossible',
        description: `Cette demande a déjà été ${it.status === 'approved' ? 'approuvée' : 'refusée'} et ne peut plus être modifiée.`,
        variant: 'destructive',
      });
      return;
    }

    setSelected(it);
    setReference(it.reference_transaction || '');
    setPaymentMethod(it.payment_method || 'wave');
    setImageUrl(it.image_paiement || '');
  };

  const approve = async () => {
    if (!selected) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upgrades/${selected.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reference: reference || null,
          payment_method: paymentMethod,
          image_paiement: imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de l\'approbation');
      }

      toast({ title: 'Succès !', description: 'Demande approuvée avec succès' });
      setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const formatPrice = (cents?: number) => (cents ? `${(cents / 100).toLocaleString('fr-FR')} F CFA` : '—');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNav />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Demandes d'upgrade</h1>
            <p className="text-gray-600 mt-1">{filtered.length} demande{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}</p>
          </div>
          <Button onClick={load} size="sm" variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="Nom, email, référence..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="md:w-64">
                <Label>Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Liste */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Aucune demande trouvée</div>
            ) : (
              <div className="divide-y">
                {filtered.map((it) => {
                  const config = STATUS_CONFIG[it.status] || STATUS_CONFIG.pending;
                  const isFinal = config.final;

                  return (
                    <div key={it.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium text-gray-900">{it.user_prenom} {it.user_nom}</span>
                            </div>
                            <p className="text-sm text-gray-500">{it.user_email}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Package className="w-4 h-4" />
                              <span className="font-medium">{it.plan_name}</span>
                            </div>
                            <p className="text-sm font-semibold text-green-700">{formatPrice(it.plan_price_cents)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {config.icon}
                              <Badge variant="secondary" className={config.badge}>
                                {config.label}
                              </Badge>
                            </div>
                            {isFinal && <Lock className="w-4 h-4 text-gray-400" title="Traitement terminé" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {it.created_at ? formatDate(it.created_at) : '—'}
                            </div>
                          </div>
                        </div>

                        <div className="ml-6">
                          {isFinal ? (
                            <Button disabled size="sm" variant="secondary">
                              <Lock className="w-4 h-4 mr-1" />
                              Terminé
                            </Button>
                          ) : (
                            <Button onClick={() => open(it)} size="sm">
                              Gérer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal d'approbation */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
              Demande #{selected.id} — {selected.plan_name}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <Label>Utilisateur</Label>
                  <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-semibold">{selected.user_prenom} {selected.user_nom}</p>
                    <p className="text-sm text-blue-800">{selected.user_email}</p>
                  </div>
                </div>
                <div>
                  <Label>Montant</Label>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatPrice(selected.plan_price_cents)}
                  </p>
                </div>
              </div>

              {selected.image_paiement && (
                <div>
                  <Label>Preuve de paiement actuelle</Label>
                  <img src={selected.image_paiement} alt="Preuve" className="mt-2 rounded-lg border shadow-md max-h-64 mx-auto" />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <Label>Référence de paiement (facultatif)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex: WAVE-123456789" />
              </div>

              <div>
                <Label>Méthode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lien image preuve (facultatif)</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://i.imgur.com/..." />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <Button variant="outline" size="lg" onClick={() => setSelected(null)}>
                Annuler
              </Button>
              <Button size="lg" className="bg-[#28A745] hover:bg-[#218838]" onClick={approve}>
                Approuver la demande
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}