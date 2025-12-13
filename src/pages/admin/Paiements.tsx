// src/pages/admin/AdminPaiements.tsx
import { useEffect, useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingUp,
  XCircle,
  ExternalLink,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

type Paiement = {
  id: number;
  reference: string | null;
  numero_commande: string | null;
  commande_id: number | null;
  utilisateur_id: number | null;
  image_paiement: string | null;
  payment_method: string | null;
  montant: number;
  status: string;
  date_paiement: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-4 h-4" /> },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-4 h-4" /> },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
  refunded: { label: 'Remboursé', color: 'bg-purple-100 text-purple-800', icon: <RefreshCw className="w-4 h-4" /> },
};

export default function AdminPaiements() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [filtered, setFiltered] = useState<Paiement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token manquant');

      const res = await fetch(`${API_BASE}/api/admin/paiements?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erreur réseau');

      const json = await res.json();
      const items = json.paiements || json.items || [];

      const normalized: Paiement[] = items.map((p: any) => ({
        id: p.id,
        reference: p.reference || p.reference_transaction || '—',
        numero_commande: p.numero_commande || p.order_number || null,
        commande_id: p.commande_id || p.order_id || null,
        utilisateur_id: p.utilisateur_id || p.user_id || null,
        image_paiement: p.image_paiement || p.payment_image || null,
        payment_method: p.moyen_paiement || p.payment_method || 'Manual',
        montant: Number(p.montant || p.montant_total || p.amount || 0),
        status: (p.status || p.statut || 'pending').toLowerCase(),
        date_paiement: p.date_paiement || p.created_at || p.createdAt || null,
      }));

      setPaiements(normalized);
      setFiltered(normalized);
      setTotal(normalized.reduce((acc, p) => acc + (isNaN(p.montant) ? 0 : p.montant), 0));
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setPaiements([]);
      setFiltered([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrage (useMemo pour recalculer seulement quand nécessaire)
  useMemo(() => {
    let list = paiements.slice();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.reference || '').toLowerCase().includes(q) ||
        (p.numero_commande || '').toLowerCase().includes(q) ||
        String(p.utilisateur_id || '').includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter);
    }

    setFiltered(list);
  }, [paiements, search, statusFilter]);

  const updateStatus = async (id: number, newStatus: string) => {
    const token = localStorage.getItem('token');
    if (!token) return console.error('Token manquant');
    try {
      setUpdatingId(id);
      const res = await fetch(`${API_BASE}/api/admin/paiements/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erreur mise à jour: ${text}`);
      }

      // mise à jour locale rapide pour UX (optimiste) puis recharger proprement
      setPaiements(prev => prev.map(p => (p.id === id ? { ...p, status: newStatus } : p)));
      load();
    } catch (err) {
      console.error(err);
      alert('Impossible de mettre à jour le statut. Voir la console.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return d;
    }
  };

  const formatCurrency = (v: number) => `${v.toLocaleString('fr-FR')} F CFA`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNav />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Paiements & Revenus</h1>

        {/* Chiffre d’affaires */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="col-span-1 bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium text-green-800">
                Chiffre d’affaires total
              </CardTitle>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(total)}
              </div>
              <p className="text-sm text-green-600">
                {paiements.length} paiement{paiements.length > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Référence, commande, utilisateur…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={load} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Rafraîchir
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Tableau */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des paiements ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                Aucun paiement trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Référence</th>
                      <th className="text-left p-4 font-medium">Commande</th>
                      <th className="text-left p-4 font-medium">Utilisateur</th>
                      <th className="text-left p-4 font-medium">Méthode</th>
                      <th className="text-right p-4 font-medium">Montant</th>
                      <th className="text-center p-4 font-medium">Reçu</th>
                      <th className="text-center p-4 font-medium">Statut</th>
                      <th className="text-center p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const cfg = STATUS_CONFIG[p.status] || { label: p.status, color: 'bg-gray-100 text-gray-800', icon: null };
                      return (
                        <tr key={p.id} className="border-b last:border-b-0">
                          <td className="p-4">{formatDate(p.date_paiement)}</td>
                          <td className="p-4">{p.reference}</td>
                          <td className="p-4">
                            {p.numero_commande ? (
                              <a
                                href={`/admin/commandes/${p.commande_id ?? ''}`}
                                className="underline hover:text-primary-600"
                              >
                                #{p.numero_commande}
                              </a>
                            ) : '—'}
                          </td>
                          <td className="p-4">{p.utilisateur_id ?? '—'}</td>
                          <td className="p-4">{p.payment_method}</td>
                          <td className="p-4 text-right font-medium">{formatCurrency(p.montant)}</td>
                          <td className="p-4 text-center">
                            {p.image_paiement ? (
                              <a
                                href={p.image_paiement}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 underline"
                              >
                                Voir <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-semibold ${cfg.color}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Select quick-change */}
                              <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">En attente</SelectItem>
                                  <SelectItem value="confirmed">Confirmé</SelectItem>
                                  <SelectItem value="paid">Payé</SelectItem>
                                  <SelectItem value="failed">Échoué</SelectItem>
                                  <SelectItem value="refunded">Remboursé</SelectItem>
                                </SelectContent>
                              </Select>

                              <div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // actions rapides
                                    if (p.status === 'pending') {
                                      updateStatus(p.id, 'confirmed');
                                    } else {
                                      updateStatus(p.id, 'paid');
                                    }
                                  }}
                                  disabled={updatingId === p.id}
                                >
                                  {updatingId === p.id ? 'Mise à jour...' : (p.status === 'pending' ? 'Confirmer' : 'Marquer payé')}
                                </Button>
                              </div>

                              <div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus(p.id, 'refunded')}
                                  disabled={updatingId === p.id}
                                >
                                  Rembourser
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminFooter />
    </div>
  );
}
