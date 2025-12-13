// src/pages/UpgradePlan.tsx

import React, { useEffect, useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Check, Zap, Star, ArrowRight, Crown, Rocket } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

export default function UpgradePlan() {
  const [plans, setPlans] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentPlan } = usePlan();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/plans`);
        if (!res.ok) throw new Error('Impossible de charger les formules');
        const json = await res.json();
        const all = json.plans || [];

        const currentPrice = Number(currentPlan?.price_cents || 0);
        const filtered = all
          .filter((p: any) => Number(p.price_cents || 0) > currentPrice)
          .sort((a: any, b: any) => Number(a.price_cents) - Number(b.price_cents));

        setPlans(all);
        setAvailablePlans(filtered);
      } catch (err: any) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les formules',
          variant: 'destructive',
        });
      }
    }
    load();
  }, [currentPlan, toast]);

  const handleChoose = async (plan: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Connexion requise',
          description: 'Connectez-vous pour passer à une formule supérieure',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la création du paiement');

      const checkoutToken = json.checkout?.token;
      if (!checkoutToken) throw new Error('Lien de paiement non reçu');

      navigate(`/checkout?token=${checkoutToken}`);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de démarrer le paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) =>
    `${(cents / 100).toLocaleString('fr-FR')} F CFA`;

  // Trouver la formule la plus chère = "populaire"
  const bestPlan = availablePlans[availablePlans.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <DashboardNav onSignOut={() => {}} profile={{}} />

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Passez à la vitesse supérieure
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Débloquez des fonctionnalités puissantes : cartes NFC illimitées, portfolios personnalisés, analytics avancés…
          </p>
        </div>

        {/* Formule actuelle */}
        {currentPlan && (
          <div className="max-w-2xl mx-auto mb-12">
            <Card className="border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg text-gray-600">
                  Votre formule actuelle
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{currentPlan.name}</p>
                    <p className="text-sm text-gray-500">{currentPlan.description || 'Formule de base'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-gray-800">
                    {formatPrice(Number(currentPlan.price_cents || 0))}
                  </p>
                  <p className="text-sm text-gray-500">/ mois</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aucune formule disponible */}
        {availablePlans.length === 0 && (
          <div className="text-center py-20">
            <Rocket className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Vous êtes déjà au sommet !
            </h2>
            <p className="text-xl text-gray-600">
              Vous bénéficiez déjà de la meilleure formule disponible.
            </p>
          </div>
        )}

        {/* Cartes des formules supérieures */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {availablePlans.map((plan) => {
            const isBest = plan.id === bestPlan?.id;
            const features = (plan.features || plan.description || '')
              .split(',')
              .map((f: string) => f.trim())
              .filter(Boolean);

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 ${
                  isBest ? 'border-[#28A745] shadow-xl' : 'border-gray-200'
                }`}
              >
                {isBest && (
                  <div className="absolute -top-1 -right-10 bg-gradient-to-r from-[#28A745] to-emerald-600 text-white px-12 py-2 text-sm font-bold transform rotate-12 shadow-lg">
                    <Star className="inline w-4 h-4 mr-1" />
                    Le plus populaire
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    <div className={`inline-flex p-4 rounded-full ${isBest ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <Zap className={`w-10 h-10 ${isBest ? 'text-[#28A745]' : 'text-gray-600'}`} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {formatPrice(Number(plan.price_cents))}
                    </span>
                    <span className="text-gray-500 text-lg"> / mois</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {features.length > 0 ? (
                      features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[#28A745] flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-600 italic">Fonctionnalités premium incluses</li>
                    )}
                  </ul>

                  <Button
                    onClick={() => handleChoose(plan)}
                    disabled={loading}
                    className={`w-full h-14 text-lg font-bold transition-all ${
                      isBest
                        ? 'bg-[#28A745] hover:bg-[#218838] text-white shadow-lg'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {loading ? (
                      'Création du paiement...'
                    ) : (
                      <>
                        Choisir cette formule
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-gray-600">
            Besoin d’aide ? Contactez le support :{' '}
            <a href="mailto:support@votreapp.com" className="text-[#28A745] font-semibold">
              support@votreapp.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}