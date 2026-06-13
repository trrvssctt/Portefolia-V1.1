// src/pages/UpgradePlan.tsx
// Design optimisé - code direct en Tailwind, moins de dépendances, rendu plus rapide

import { useEffect, useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Plan {
  id: string;
  name: string;
  description: string;
  features: string | string[];
  price_cents: number;
}

export default function UpgradePlan() {
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentPlan } = usePlan();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/plans`);
        if (!res.ok) throw new Error('Erreur chargement formules');
        const { plans: all = [] } = await res.json();

        const currentPrice = Number(currentPlan?.price_cents || 0);
        const filtered = all
          .filter((p: Plan) => Number(p.price_cents || 0) > currentPrice)
          .sort((a: Plan, b: Plan) => Number(a.price_cents) - Number(b.price_cents));

        setAvailablePlans(filtered);
      } catch (err: any) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les formules',
          variant: 'destructive',
        });
      }
    };
    load();
  }, [currentPlan, toast]);

  const handleChoose = async (plan: Plan) => {
    setLoading(prev => ({ ...prev, [plan.id]: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Connexion requise',
          description: 'Connectez-vous pour continuer',
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
      if (!res.ok) throw new Error(json.error || 'Erreur paiement');

      if (!json.checkout?.token) throw new Error('Lien de paiement non recu');
      navigate(`/checkout?token=${json.checkout.token}`);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de demarrer le paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [plan.id]: false }));
    }
  };

  const formatPrice = (cents: number) => `${(cents / 100).toLocaleString('fr-FR')} F CFA`;

  const bestPlanId = availablePlans[availablePlans.length - 1]?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-20">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Passez au niveau superieur
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Debloquez cartes NFC illimitees, portfolios personnalises et analytics avances
          </p>
        </header>

        {/* Formule actuelle */}
        {currentPlan && (
          <section className="max-w-xl mx-auto mb-8 sm:mb-16">
            <div className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-6">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Votre formule actuelle</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{currentPlan.name}</p>
                  <p className="text-sm text-slate-500">{currentPlan.description || 'Formule de base'}</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{formatPrice(Number(currentPlan.price_cents))}</p>
              </div>
            </div>
          </section>
        )}

        {/* Aucune upgrade disponible */}
        {availablePlans.length === 0 ? (
          <section className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Vous etes au sommet !</h2>
            <p className="text-lg text-slate-600">Vous beneficie deja de la meilleure formule</p>
          </section>
        ) : (
          /* Grille des formules */
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => {
              const isBest = plan.id === bestPlanId;
              const rawFeatures = plan.features || plan.description || '';
              const features: string[] = Array.isArray(rawFeatures)
                ? rawFeatures.map((f: any) => String(f).trim()).filter(Boolean)
                : String(rawFeatures).split(',').map((f) => f.trim()).filter(Boolean);

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl p-5 sm:p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${isBest
                    ? 'ring-2 ring-emerald-500 shadow-xl bg-gradient-to-b from-emerald-50 to-white'
                    : 'border border-slate-200 shadow-sm'
                    }`}
                >
                  {isBest && (
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold rounded-full">
                      ★ Populaire
                    </div>
                  )}

                  {/* En-tete carte */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isBest ? 'bg-emerald-500' : 'bg-slate-900'
                      }`}>
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black text-slate-900">{formatPrice(Number(plan.price_cents))}</span>
                      <span className="text-slate-500">/mois</span>
                    </div>
                  </div>

                  {/* Fonctionnalites */}
                  <ul className="space-y-3 mb-8">
                    {features.length > 0
                      ? features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))
                      : <li className="text-slate-500 italic">Fonctionnalites premium incluses</li>
                    }
                  </ul>

                  {/* Bouton */}
                  <button
                    onClick={() => handleChoose(plan)}
                    disabled={loading[plan.id]}
                    className={`w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-base sm:text-lg transition-all ${isBest
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading[plan.id] ? 'Traitement...' : 'Choisir cette formule →'}
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* Footer support */}
        <footer className="text-center mt-10 sm:mt-20 pt-8 border-t border-slate-200">
          <p className="text-slate-600">
            Une question ? <a href="mailto:support@portefolia.com" className="text-emerald-600 font-semibold hover:underline">
              support@portefolia.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
