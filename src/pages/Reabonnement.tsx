import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Loader2, CalendarClock, CheckCircle2, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const DURATIONS = [
  { months: 1, label: '1 mois', discount: 0 },
  { months: 3, label: '3 mois', discount: 15, badge: '-15%' },
  { months: 12, label: '1 an', discount: 20, badge: '-20%' },
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

export default function Reabonnement() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingDuration, setLoadingDuration] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/auth'); return; }

    fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => {
        const plans: any[] = json.plans || [];
        const active = plans.find(p => p.status === 'active') || null;
        setCurrentPlan(active);
      })
      .catch(() => toast({ title: 'Erreur', description: 'Impossible de charger votre abonnement', variant: 'destructive' }))
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

  const isYearly = (currentPlan?.billing_interval || '').toLowerCase() === 'yearly';
  const monthlyPrice = isYearly
    ? Number(currentPlan?.price_cents || 0) / 100 / 12
    : Number(currentPlan?.price_cents || 0) / 100;
  const displayPrice = isYearly ? Number(currentPlan?.price_cents || 0) / 100 : monthlyPrice;
  const currentEndDate = currentPlan?.end_date ? new Date(currentPlan.end_date) : null;
  const baseDate = (currentEndDate && currentEndDate > new Date()) ? currentEndDate : new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50">
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" /> Renouvellement
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Renouveler mon abonnement</h1>
          <p className="text-slate-500">Payez plusieurs mois et économisez jusqu'à 20%</p>
        </div>

        {/* Abonnement actuel */}
        {loadingPlan ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
        ) : currentPlan ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 flex items-center gap-4 shadow-sm">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Abonnement actuel</p>
              <p className="font-bold text-slate-900">{currentPlan.name || 'Mon plan'}</p>
              {currentEndDate && (
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Expire le {formatDate(currentEndDate)}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-emerald-600 shrink-0">{formatXOF(displayPrice)}<span className="text-xs text-slate-400 font-normal">/{isYearly ? 'an' : 'mois'}</span></p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-center text-amber-700 space-y-3">
            <p className="font-semibold">Aucun abonnement actif trouvé.</p>
            <button
              onClick={() => navigate('/upgrade')}
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
            >
              Voir les offres →
            </button>
          </div>
        )}

        {/* Sélecteur de durée */}
        {currentPlan && currentPlan.plan_id && monthlyPrice > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DURATIONS.map(({ months, label, discount, badge }) => {
              const baseAmount = monthlyPrice * months;
              const finalAmount = Math.round(baseAmount * (1 - discount / 100));
              const savings = Math.round(baseAmount - finalAmount);
              const newEnd = addMonths(baseDate, months);
              const isLoading = loadingDuration === months;
              const isPopular = months === 3;

              return (
                <div
                  key={months}
                  className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isPopular ? 'border-emerald-500 shadow-md shadow-emerald-100' : 'border-slate-200'}`}
                >
                  {badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full ${isPopular ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      {badge}
                    </span>
                  )}

                  <div className="text-center pt-1">
                    <p className="font-bold text-slate-700 text-base">{label}</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{formatXOF(finalAmount)}</p>
                    {discount > 0 && (
                      <>
                        <p className="text-xs text-slate-400 line-through">{formatXOF(baseAmount)}</p>
                        <p className="text-xs font-semibold text-emerald-600">Économie : {formatXOF(savings)}</p>
                      </>
                    )}
                    {discount === 0 && <p className="text-xs text-slate-400">Sans remise</p>}
                  </div>

                  <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Prochain renouvellement</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{formatDate(newEnd)}</p>
                  </div>

                  <button
                    onClick={() => handlePay(months)}
                    disabled={isLoading || loadingDuration !== null}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${isPopular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                      : 'Payer avec Wave'
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {currentPlan && (!currentPlan.plan_id || monthlyPrice === 0) && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-slate-600">
            <p className="font-semibold mb-1">Vous êtes sur un plan gratuit.</p>
            <p className="text-sm mb-3">Passez à un plan payant pour accéder aux fonctionnalités premium.</p>
            <button
              onClick={() => navigate('/upgrade')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
            >
              Voir les offres →
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Paiement sécurisé via Wave · Validation sous 24h
        </p>
      </main>
    </div>
  );
}
