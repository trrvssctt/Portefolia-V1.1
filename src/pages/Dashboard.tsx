
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Plus, Eye, BarChart, CreditCard } from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PortfolioForm } from "@/components/dashboard/PortfolioForm";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from '@/contexts/PlanContext';
import { format } from 'date-fns';

const Dashboard = () => {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const { isFreePlan: ctxIsFree, loading: planLoading, currentPlan } = usePlan();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading, signOut } = useAuth();

  const handlePayNow = async () => {
    if (!currentPlan) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: currentPlan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      const url = json.checkout_url || (json.checkout && `${window.location.origin}/checkout?token=${json.checkout.token}`);
      if (url) window.location.href = url;
    } catch (err: any) {
      console.error('Error creating checkout:', err);
      toast({ title: 'Erreur', description: 'Impossible de démarrer le paiement', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadPortfolios();
    }
  }, [user, loading, navigate]);

  // sync local UI state with plan context
  useEffect(() => {
    setIsFreePlan(!!ctxIsFree);
  }, [ctxIsFree]);

  const loadPortfolios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPortfolios(json.portfolios || []);
    } catch (error: any) {
      console.error('Error loading portfolios:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les portfolios",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  const handlePortfolioCreated = () => {
    setShowPortfolioForm(false);
    if (user) {
      loadPortfolios();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#28A745] rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav onSignOut={handleSignOut} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour {profile?.prenom || 'Utilisateur'} ! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez vos portfolios et suivez vos performances depuis votre dashboard.
          </p>
        </div>

        

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolios Section */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Mes Portfolios</h2>
              <Button 
                onClick={() => {
                  const isStarter = !!(currentPlan && String(currentPlan.slug).toLowerCase() === 'starter');
                  if ((isFreePlan && portfolios.length >= 1) || (isStarter && portfolios.length >= 5)) {
                    const msg = isStarter
                      ? 'Votre formule Starter limite la création à 5 portfolios. Veuillez upgrader pour en créer davantage.'
                      : 'Votre formule gratuite limite la création à 1 portfolio. Veuillez upgrader pour en créer davantage.';
                    toast({ title: 'Limite atteinte', description: msg, variant: 'destructive' });
                    return;
                  }
                  setShowPortfolioForm(true);
                }}
                className="bg-[#28A745] hover:bg-green-600"
              >
                <Plus size={16} className="mr-2" />
                Nouveau Portfolio
              </Button>
            </div>

            {portfolios.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun portfolio pour le moment
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Créez votre premier portfolio pour commencer à partager votre profil professionnel.
                  </p>
                  <Button 
                    onClick={() => {
                        const isStarter2 = !!(currentPlan && String(currentPlan.slug).toLowerCase() === 'starter');
                        if ((isFreePlan && portfolios.length >= 1) || (isStarter2 && portfolios.length >= 5)) {
                          const msg2 = isStarter2
                            ? 'Votre formule Starter limite la création à 5 portfolios. Veuillez upgrader pour en créer davantage.'
                            : 'Votre formule gratuite limite la création à 1 portfolio. Veuillez upgrader pour en créer davantage.';
                          toast({ title: 'Limite atteinte', description: msg2, variant: 'destructive' });
                          return;
                        }
                      setShowPortfolioForm(true);
                    }}
                    className="bg-[#28A745] hover:bg-green-600"
                  >
                    Créer mon premier portfolio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {portfolios.map((portfolio) => (
                  <Card key={portfolio.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{portfolio.titre}</h3>
                          <p className="text-gray-600 text-sm mb-2">{portfolio.description || 'Aucune description'}</p>
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <span>Créé le {new Date(portfolio.date_creation).toLocaleDateString('fr-FR')}</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              portfolio.est_public 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {portfolio.est_public ? 'Public' : 'Privé'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/portfolio/${portfolio.url_slug || portfolio.slug}`, '_blank')}
                          >
                            <Eye size={16} className="mr-1" />
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/portfolios`)}
                          >
                            Gérer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/dashboard/portfolios')}
                >
                  <BarChart size={16} className="mr-2" />
                  Gérer mes portfolios
                </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/dashboard/nfc-cards')}>
                    <CreditCard size={16} className="mr-2" />
                    Commander une carte NFC
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/upgrade')}>
                    <CreditCard size={16} className="mr-2" />
                    Voir les formules
                  </Button>
              </CardContent>
            </Card>

            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Formule actuelle</CardTitle>
              </CardHeader>
              <CardContent>
                {planLoading ? (
                  <p className="text-sm text-gray-500">Chargement...</p>
                ) : currentPlan ? (
                  <div>
                    <p className="text-sm font-medium">{currentPlan.name}</p>
                    <p className="text-xs text-gray-500">{currentPlan.description || ''}</p>
                    <p className="mt-2 text-sm">
                      {Number(currentPlan.price_cents || 0) > 0 ? (
                        <strong>{(Number(currentPlan.price_cents || 0) / 100).toLocaleString('fr-FR')} {currentPlan.currency || 'F CFA'}</strong>
                      ) : (
                        <strong>Gratuit</strong>
                      )}
                    </p>
                    {currentPlan.billing_interval && String(currentPlan.billing_interval).toLowerCase() === 'monthly' && currentPlan.next_payment_date && (
                      <p className="mt-2 text-sm text-gray-700">Prochain prélèvement le <strong>{format(new Date(currentPlan.next_payment_date), 'dd MMMM yyyy')}</strong></p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucune formule active</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Module: appears when payment is due or account inactive */}
            {currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
              (() => {
                const now = new Date();
                const nextDate = currentPlan.next_payment_date ? new Date(currentPlan.next_payment_date) : null;
                const paymentDue = (profile && profile.is_active === false) || (nextDate && nextDate <= now);
                if (!paymentDue) return null;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>Paiement requis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-3">Votre abonnement requiert un paiement pour continuer à utiliser toutes les fonctionnalités.</p>
                      <p className="text-sm font-medium mb-4">Montant: <strong>{(Number(currentPlan.price_cents || 0) / 100).toLocaleString('fr-FR')} {currentPlan.currency || 'F CFA'}</strong></p>
                      <Button className="bg-[#28A745] hover:bg-green-600 w-full" onClick={handlePayNow}>
                        Payer maintenant
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">Aucune activité récente</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Portfolio Form Modal */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PortfolioForm 
              onClose={() => setShowPortfolioForm(false)}
              onSuccess={handlePortfolioCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
