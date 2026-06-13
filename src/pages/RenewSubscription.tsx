import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarClock, AlertCircle, Zap } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const DURATIONS = [
  { months: 1,  label: '1 mois',  discount: 0  },
  { months: 3,  label: '3 mois',  discount: 15, badge: '-15%' },
  { months: 12, label: '1 an',    discount: 20, badge: '-20%' },
] as const;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatXOF(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} XOF`;
}

export default function RenewSubscription() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingDuration, setLoadingDuration] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/auth'); return; }

    fetch(`${API_BASE}/api/plans/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const plans: any[] = json.plans || [];
        // Prendre le dernier plan (expiré ou actif)
        const plan = plans.find(p => p.status === 'active') || plans[0] || null;
        setCurrentPlan(plan);
      })
      .catch(() =>
        toast({ title: 'Erreur', description: 'Impossible de charger votre plan', variant: 'destructive' })
      )
      .finally(() => setLoadingPlan(false));
  }, [navigate, toast]);

  const handlePay = async (months: number) => {
    if (!currentPlan) return;
    setLoadingDuration(months);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: currentPlan.plan_id, duration_months: months }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la création du paiement');
      navigate(`/checkout?token=${json.checkout.token}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingDuration(null);
    }
  };

  const monthlyPrice = (() => {
    if (!currentPlan) return 0;
    const isYearly = (currentPlan.billing_interval || '').toLowerCase() === 'yearly';
    return isYearly
      ? Number(currentPlan.price_cents || 0) / 100 / 12
      : Number(currentPlan.price_cents || 0) / 100;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-red-50/20 to-slate-100">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:py-16">

        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <AlertCircle className="w-4 h-4" />
            Abonnement expiré
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Votre abonnement a expiré
          </h1>
          <p className="text-slate-500">
            Renouvelez pour retrouver l'accès à toutes vos fonctionnalités.
            Payez plusieurs mois et{' '}
            <span className="font-semibold text-[#28A745]">économisez jusqu'à 20%</span>.
          </p>
        </div>

        {/* Plan actuel */}
        {loadingPlan ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#28A745]" />
          </div>
        ) : currentPlan ? (
          <div className="bg-white border border-red-200 rounded-2xl p-5 mb-8 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <CalendarClock className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Plan expiré</p>
              <p className="font-bold text-slate-900">{currentPlan.name || 'Mon plan'}</p>
              {currentPlan.end_date && (
                <p className="text-sm text-red-500 mt-0.5">
                  Expiré le {formatDate(new Date(currentPlan.end_date))}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-slate-400 shrink-0 line-through">
              {formatXOF(monthlyPrice)}<span className="text-xs font-normal">/mois</span>
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-center text-amber-700 space-y-3">
            <p className="font-semibold">Aucun plan trouvé.</p>
            <button
              onClick={() => navigate('/upgrade')}
              className="bg-[#28A745] hover:bg-green-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
            >
              Voir les offres →
            </button>
          </div>
        )}

        {/* Cards de durée */}
        {currentPlan && currentPlan.plan_id && monthlyPrice > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DURATIONS.map(({ months, label, discount, badge }) => {
              const base = monthlyPrice * months;
              const final = Math.round(base * (1 - discount / 100));
              const savings = Math.round(base - final);
              const newEnd = addMonths(new Date(), months);
              const isLoading = loadingDuration === months;
              const isPopular = months === 3;

              return (
                <div
                  key={months}
                  className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                    isPopular ? 'border-[#28A745] shadow-md shadow-green-100' : 'border-slate-200'
                  }`}
                >
                  {badge && (
                    <span
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full ${
                        isPopular ? 'bg-[#28A745]' : 'bg-slate-600'
                      }`}
                    >
                      {badge}
                    </span>
                  )}

                  <div className="text-center pt-1">
                    <p className="font-bold text-slate-700 text-base">{label}</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{formatXOF(final)}</p>
                    {discount > 0 ? (
                      <>
                        <p className="text-xs text-slate-400 line-through">{formatXOF(base)}</p>
                        <p className="text-xs font-semibold text-[#28A745]">Économie : {formatXOF(savings)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Sans remise</p>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">
                      Prochain renouvellement
                    </p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{formatDate(newEnd)}</p>
                  </div>

                  <button
                    onClick={() => handlePay(months)}
                    disabled={isLoading || loadingDuration !== null}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      isPopular
                        ? 'bg-[#28A745] hover:bg-green-600 text-white shadow-lg shadow-green-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Payer maintenant</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Paiement sécurisé via Wave · Validation sous 24h · support@portefolia.tech
        </p>
      </main>

      <Footer />
    </div>
  );
}
