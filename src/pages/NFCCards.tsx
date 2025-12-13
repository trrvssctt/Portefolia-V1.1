import { usePlan } from '@/contexts/PlanContext';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const envBase = import.meta.env.VITE_API_BASE;
const API_BASE = envBase || (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? 'https://backend-v-card.onrender.com' : 'https://backennfc.onrender.com');
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  XCircle,
  Eye,
  Settings,
  Package
} from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useAuth } from "@/hooks/useAuth";

const NFCCards = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { isFreePlan: ctxFree, loading: planLoading } = usePlan();
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [nfcCards, setNfcCards] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState({
    portfolio_id: '',
    quantity: 1,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      (async () => {
        setIsFreePlan(!!ctxFree);
        if (ctxFree) {
          setLoading(false);
          return;
        }
        await loadData();
      })();
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load portfolios from backend
      const pRes = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pRes.ok) throw new Error('Failed to load portfolios');
      const pJson = await pRes.json();
      const portfoliosData = pJson.portfolios || [];
      // normalize titles/slugs
      const normalizedPortfolios = portfoliosData.map((p: any) => ({
        ...p,
        title: p.title || p.titre || '',
        slug: p.slug || p.url_slug || '',
      }));
      setPortfolios(normalizedPortfolios);

      // Load orders (commandes) and their cards, then flatten cards into nfcCards
      const ordersRes = await fetch(`${API_BASE}/api/commandes`, { headers: { Authorization: `Bearer ${token}` } });
      if (!ordersRes.ok) throw new Error('Failed to load commandes');
      const ordersJson = await ordersRes.json();
      const orders = ordersJson.orders || [];

      // For each order, fetch its cards
      const cardsPromises = orders.map(async (order: any) => {
        const ordRes = await fetch(`${API_BASE}/api/commandes/${order.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!ordRes.ok) return { order, cards: [] };
        const ordJson = await ordRes.json();
        return { order: ordJson.order, cards: ordJson.cards || [] };
      });
      const ordersWithCards = await Promise.all(cardsPromises);

      // flatten cards and attach order + portfolio info
      const allCards: any[] = [];
      for (const oc of ordersWithCards) {
        const ord = oc.order || {};
        const cards = oc.cards || [];
        for (const card of cards) {
          // find portfolio title from normalizedPortfolios by slug
          const portfolioSlug = card.lien_portfolio || card.lienPortfolio || card.portfolio_slug || '';
          const matching = normalizedPortfolios.find((p: any) => (p.slug || '') === portfolioSlug);
          allCards.push({
            ...card,
            order_id: ord.id,
            ordered_at: ord.date_commande || ord.created_at || ord.ordered_at,
            statut: ord.statut || ord.status || 'pending',
            portfolios: {
              title: matching ? (matching.title || matching.titre) : (portfolioSlug || 'Portfolio'),
              slug: portfolioSlug,
            }
          });
        }
      }
      setNfcCards(allCards);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!orderData.portfolio_id) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un portfolio",
          variant: "destructive",
        });
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/commandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ portfolio_id: Number(orderData.portfolio_id), quantity: Number(orderData.quantity) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la commande');
      toast({ title: 'Commande effectuée', description: `Commande ${json.order.numero_commande} créée` });
      setShowOrderForm(false);
      setOrderData({ portfolio_id: '', quantity: 1 });
      await loadData();

    } catch (error: any) {
      console.error('Error ordering card:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de passer la commande",
        variant: "destructive",
      });
    }
  };

  const activateCard = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/cartes/${cardId}/activate`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Impossible d\'activer la carte');

      toast({
        title: "Carte activée",
        description: "Votre carte NFC est maintenant active",
      });

      loadData();

    } catch (error: any) {
      console.error('Error activating card:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer la carte",
        variant: "destructive",
      });
    }
  };

  const deactivateCard = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/cartes/${cardId}/deactivate`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Impossible de désactiver la carte');

      toast({
        title: "Carte désactivée",
        description: "Votre carte NFC est maintenant inactive",
      });

      loadData();

    } catch (error: any) {
      console.error('Error deactivating card:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver la carte",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#28A745] rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos cartes NFC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav onSignOut={() => {}} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isFreePlan && (
          <Card className="mb-6">
            <CardContent>
              <h2 className="text-xl font-semibold">Fonctionnalité non disponible</h2>
              <p className="text-gray-600 mt-2">Votre formule gratuite ne permet pas de commander des cartes NFC. Pour accéder à cette fonctionnalité, veuillez passer à une formule payante.</p>
              <div className="mt-4">
                <Button onClick={() => navigate('/upgrade')} className="bg-[#28A745]">Voir les formules</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isFreePlan && (
          <>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Cartes NFC</h1>
            <p className="text-gray-600 mt-2">Partagez facilement votre portfolio professionnel.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/nfc-types')}
              className="bg-[#2563EB] hover:bg-blue-700"
            >
              Voir les types
            </Button>
            <Button
              onClick={() => setShowOrderForm(true)}
              className="bg-[#1f9d55] hover:bg-green-700"
              disabled={portfolios.length === 0 || isFreePlan}
            >
              <Plus size={16} className="mr-2" />
              Commander
            </Button>
          </div>
        </div>

        {portfolios.length === 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="text-center">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun portfolio disponible
                </h3>
                <p className="text-gray-600 mb-4">
                  Vous devez créer au moins un portfolio avant de pouvoir commander une carte NFC.
                </p>
                <Button onClick={() => navigate('/dashboard/portfolios')}>
                  Créer un portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cartes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{nfcCards.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cartes Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {nfcCards.filter(card => card.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">En Attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {nfcCards.filter(card => !card.is_active && !card.activated_at).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Prix Unitaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#28A745]">30,000 F&nbsp;CFA</div>
            </CardContent>
          </Card>
        </div>

        {/* NFC Cards List */}
        {nfcCards.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune carte NFC pour le moment
              </h3>
              <p className="text-gray-600 mb-6">
                Commandez votre première carte NFC pour partager votre portfolio professionnellement.
              </p>
              {portfolios.length > 0 && (
                <Button 
                  onClick={() => setShowOrderForm(true)}
                  className="bg-[#28A745] hover:bg-green-600"
                >
                  Commander ma première carte
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {nfcCards.map((card) => (
              <Card key={card.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#1f9d55] rounded-lg flex items-center justify-center">
                        <CreditCard size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {card.portfolios?.title || 'Portfolio'}
                        </h3>
                        <p className="text-gray-600">UID: {card.card_uid}</p>
                        <p className="text-sm text-gray-500 mt-1">Commandée le {new Date(card.ordered_at).toLocaleDateString('fr-FR')}</p>
                        {card.activated_at && <p className="text-sm text-gray-500">Activée le {new Date(card.activated_at).toLocaleDateString('fr-FR')}</p>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={card.is_active ? "default" : card.activated_at ? "secondary" : "outline"}
                        className={card.is_active ? 'bg-green-100 text-green-800' : (card.activated_at ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800')}
                      >
                        {card.is_active ? 'Active' : card.activated_at ? 'Inactive' : 'En attente'}
                      </Badge>

                      {card.portfolios?.slug && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/portfolio/${card.portfolios.slug}`, '_blank')}
                          title="Voir le portfolio"
                        >
                          <Eye size={16} />
                        </Button>
                      )}

                      {!card.activated_at ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => activateCard(card.id)}
                          title="Activer la carte"
                          className="text-green-600"
                        >
                          Activer
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => card.is_active ? deactivateCard(card.id) : activateCard(card.id)}
                          title={card.is_active ? "Désactiver" : "Activer"}
                        >
                          {card.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Commander une carte NFC</h2>
            <p className="text-gray-600 mb-6 text-sm">Choisissez le portfolio à associer et la quantité. Paiement et livraison après confirmation.</p>

            <form onSubmit={handleOrderCard} className="space-y-6">
              <div>
                <Label htmlFor="portfolio">Portfolio</Label>
                <select
                  id="portfolio"
                  value={orderData.portfolio_id}
                  onChange={(e) => setOrderData(prev => ({ ...prev, portfolio_id: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-md bg-white"
                  required
                >
                  <option value="">Sélectionnez un portfolio</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    value={orderData.quantity}
                    onChange={(e) => setOrderData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    required
                  />
                </div>
                <div>
                  <Label>Prix unitaire</Label>
                  <div className="p-3 border border-gray-100 rounded-md text-right font-semibold text-[#1f9d55]">30 000 F&nbsp;CFA</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-[#1f9d55]">{(orderData.quantity * 30000).toLocaleString()} F CFA</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Délai de livraison estimé : 5–7 jours ouvrés • Livraison incluse</p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOrderForm(false);
                    setOrderData({ portfolio_id: '', quantity: 1 });
                  }}
                >
                  Fermer
                </Button>
                <Button type="submit" className="bg-[#1f9d55] hover:bg-green-700">
                  Commander
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFCCards;
