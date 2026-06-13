import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Eye, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Receipt,
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Paiement {
  id: number;
  reference_transaction?: string;
  reference?: string;
  montant: number;
  currency?: string;
  statut: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';
  created_at: string;
  updated_at: string;
  payment_method?: string;
  payment_gateway?: string;
  user_id: number;
  abonnement_id?: number;
  plan_name?: string;
  image_paiement?: string;
  metadata?: any;
  notes?: string;
}

interface UserPaiementHistoriqueProps {
  userId: number;
  userName?: string;
  onClose?: () => void;
  showHeader?: boolean;
  className?: string;
}

export const UserPaiementHistorique: React.FC<UserPaiementHistoriqueProps> = ({ 
  userId, 
  userName, 
  onClose, 
  showHeader = true,
  className 
}) => {
  const { toast } = useToast();
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPaiement, setSelectedPaiement] = useState<Paiement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPaiements();
    }
  }, [userId]);

  const loadPaiements = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: 'Erreur',
        description: 'Session expirée. Veuillez vous reconnecter.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/paiements?user_id=${userId}&page=1&limit=100`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          } 
        }
      );
      
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setPaiements(data.paiements || []);
    } catch (error: any) {
      console.error('Erreur chargement paiements:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger l\'historique des paiements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPaiements = useMemo(() => {
    let filtered = paiements.filter(paiement => {
      // Filtre par statut
      if (statusFilter !== 'all' && paiement.statut !== statusFilter) {
        return false;
      }
      
      // Filtre par recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          (paiement.reference_transaction?.toLowerCase().includes(searchLower)) ||
          (paiement.reference?.toLowerCase().includes(searchLower)) ||
          (paiement.plan_name?.toLowerCase().includes(searchLower)) ||
          (paiement.payment_method?.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'amount':
          aValue = a.montant;
          bValue = b.montant;
          break;
        case 'status':
          aValue = a.statut;
          bValue = b.statut;
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    return filtered;
  }, [paiements, searchTerm, statusFilter, sortBy, sortOrder]);

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (statut: string) => {
    const baseClass = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
    
    switch (statut) {
      case 'completed':
        return (
          <Badge className={`${baseClass} bg-green-100 text-green-800 hover:bg-green-100`}>
            {getStatusIcon(statut)}
            Payé
          </Badge>
        );
      case 'pending':
        return (
          <Badge className={`${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-100`}>
            {getStatusIcon(statut)}
            En attente
          </Badge>
        );
      case 'failed':
        return (
          <Badge className={`${baseClass} bg-red-100 text-red-800 hover:bg-red-100`}>
            {getStatusIcon(statut)}
            Échoué
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className={`${baseClass} bg-blue-100 text-blue-800 hover:bg-blue-100`}>
            {getStatusIcon(statut)}
            Remboursé
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className={`${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-100`}>
            {getStatusIcon(statut)}
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getTotalAmount = () => {
    return filteredAndSortedPaiements.reduce((sum, p) => sum + p.montant, 0);
  };

  const getCompletedAmount = () => {
    return filteredAndSortedPaiements
      .filter(p => p.statut === 'completed')
      .reduce((sum, p) => sum + p.montant, 0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csvContent = [
        ['Date', 'Référence', 'Montant', 'Statut', 'Méthode', 'Plan', 'Date création'],
        ...filteredAndSortedPaiements.map(p => [
          format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
          p.reference_transaction || p.reference || 'N/A',
          `${p.montant} ${p.currency || 'F CFA'}`,
          p.statut,
          p.payment_method || 'N/A',
          p.plan_name || 'N/A',
          format(new Date(p.created_at), 'dd/MM/yyyy', { locale: fr })
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `paiements_${userName || 'utilisateur'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export réussi',
        description: 'L\'historique a été exporté en CSV',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const openPaiementDetails = (paiement: Paiement) => {
    setSelectedPaiement(paiement);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Historique des paiements
                  {userName && (
                    <span className="text-sm font-normal text-gray-500">
                      pour {userName}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {paiements.length} paiements trouvés • Total: {getTotalAmount().toLocaleString('fr-FR')} F CFA
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPaiements}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting || paiements.length === 0}
                  className="gap-1"
                >
                  <Download className="h-3 w-3" />
                  {exporting ? 'Export...' : 'Exporter'}
                </Button>
                
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    Fermer
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent>
          {/* Barre de filtres et recherche */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par référence, plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* En-têtes de tri */}
            <div className="grid grid-cols-12 gap-2 text-sm text-gray-500 font-medium px-4">
              <div className="col-span-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium"
                  onClick={() => handleSort('date')}
                >
                  Date
                  {sortBy === 'date' && (
                    sortOrder === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
              <div className="col-span-3">Référence</div>
              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium"
                  onClick={() => handleSort('amount')}
                >
                  Montant
                  {sortBy === 'amount' && (
                    sortOrder === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium"
                  onClick={() => handleSort('status')}
                >
                  Statut
                  {sortBy === 'status' && (
                    sortOrder === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          <Separator className="mb-4" />

          {/* Liste des paiements */}
          {filteredAndSortedPaiements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Aucun paiement trouvé' : 'Aucun paiement'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Essayez de modifier vos critères de recherche'
                  : "Cet utilisateur n'a encore effectué aucun paiement"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedPaiements.map((paiement) => (
                <div
                  key={paiement.id}
                  className="group grid grid-cols-12 gap-2 items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div className="text-sm">
                        <div className="font-medium">
                          {format(new Date(paiement.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <div className="text-gray-500">
                          {format(new Date(paiement.created_at), 'HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <div className="font-medium text-sm truncate">
                      {paiement.reference_transaction || paiement.reference || 'N/A'}
                    </div>
                    {paiement.plan_name && (
                      <div className="text-xs text-gray-500 truncate">
                        {paiement.plan_name}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">
                        {paiement.montant.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {paiement.currency || 'F CFA'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    {getStatusBadge(paiement.statut)}
                  </div>

                  <div className="col-span-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPaiementDetails(paiement)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Détails
                        </DropdownMenuItem>
                        {paiement.image_paiement && (
                          <DropdownMenuItem asChild>
                            <a
                              href={paiement.image_paiement}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Voir la preuve
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(paiement.reference_transaction || paiement.reference || '')}>
                          Copier la référence
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Résumé */}
          {filteredAndSortedPaiements.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-600">Total paiements</div>
                    <div className="text-2xl font-bold">
                      {getTotalAmount().toLocaleString('fr-FR')} F CFA
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-600">Paiements réussis</div>
                    <div className="text-2xl font-bold text-green-600">
                      {getCompletedAmount().toLocaleString('fr-FR')} F CFA
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-600">Nombre total</div>
                    <div className="text-2xl font-bold">
                      {filteredAndSortedPaiements.length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-600">Taux de réussite</div>
                    <div className="text-2xl font-bold">
                      {((filteredAndSortedPaiements.filter(p => p.statut === 'completed').length / filteredAndSortedPaiements.length) * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Détails du paiement
            </DialogTitle>
            <DialogDescription>
              Référence: {selectedPaiement?.reference_transaction || selectedPaiement?.reference}
            </DialogDescription>
          </DialogHeader>

          {selectedPaiement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Montant</div>
                  <div className="font-semibold text-lg">
                    {selectedPaiement.montant.toLocaleString('fr-FR')} {selectedPaiement.currency || 'F CFA'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Statut</div>
                  <div>{getStatusBadge(selectedPaiement.statut)}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Date création</div>
                  <div>
                    {format(new Date(selectedPaiement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Dernière mise à jour</div>
                  <div>
                    {format(new Date(selectedPaiement.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Méthode de paiement</div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    {selectedPaiement.payment_method || 'Non spécifié'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Plateforme</div>
                  <div>{selectedPaiement.payment_gateway || 'Non spécifié'}</div>
                </div>
              </div>

              {selectedPaiement.plan_name && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Plan associé</div>
                  <div className="font-medium">{selectedPaiement.plan_name}</div>
                </div>
              )}

              {selectedPaiement.notes && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Notes</div>
                  <div className="bg-gray-50 p-3 rounded text-sm">{selectedPaiement.notes}</div>
                </div>
              )}

              {selectedPaiement.image_paiement && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Preuve de paiement</div>
                  <div className="flex gap-2">
                    <a
                      href={selectedPaiement.image_paiement}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ouvrir l'image
                    </a>
                  </div>
                  <img
                    src={selectedPaiement.image_paiement}
                    alt="Preuve de paiement"
                    className="mt-2 max-h-48 rounded border"
                  />
                </div>
              )}

              <Separator />

              <div className="flex justify-end gap-2">
                {selectedPaiement.image_paiement && (
                  <Button variant="outline" asChild>
                    <a
                      href={selectedPaiement.image_paiement}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Voir la preuve
                    </a>
                  </Button>
                )}
                <Button onClick={() => setDialogOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserPaiementHistorique;