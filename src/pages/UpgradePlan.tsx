import { useEffect, useState } from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { useAuth } from '@/hooks/useAuth';
import { Check, Sparkles, Star, Building2, X, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const DURATIONS = [
  { months: 1,  label: '1 mois', discount: 0 },
  { months: 3,  label: '3 mois', discount: 15, badge: '-15%' },
  { months: 12, label: '1 an',   discount: 20, badge: '-20%' },
] as const;

function addMonths(d: Date, m: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFCFA(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' F CFA';
}

interface Plan {
  id: string;
  name: string;
  description: string;
  features: string | string[];
  price_cents: number;
}

function getPlanFeatures(plan: Plan): string[] {
  const raw = plan.features || plan.description || '';
  return Array.isArray(raw)
    ? raw.map((f: any) => String(f).trim()).filter(Boolean)
    : String(raw).split(',').map(f => f.trim()).filter(Boolean);
}

type Tone = 'ink' | 'accent' | 'business';

function getPlanTone(index: number, total: number): Tone {
  if (total === 1) return 'accent';
  if (total === 2) return index === 0 ? 'ink' : 'accent';
  const mid = Math.floor(total / 2);
  if (index === mid) return 'accent';
  if (index === total - 1) return 'business';
  return 'ink';
}

function PlanCard({ plan, tone, onChoose, isCurrent, canUpgrade }: {
  plan: Plan; tone: Tone;
  onChoose: () => void; isCurrent: boolean; canUpgrade: boolean;
}) {
  const popular  = tone === 'accent';
  const features = getPlanFeatures(plan);
  const priceVal = plan.price_cents.toLocaleString('fr-FR');
  const PlanIcon = tone === 'business' ? Building2 : tone === 'accent' ? Sparkles : Star;

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white border p-7 ${popular ? 'border-transparent' : 'border-[#E7E7EA]'}`}
      style={popular ? { boxShadow: '0 0 0 2px #2E7D32, 0 20px 50px -20px rgba(16,24,40,0.25)' } : undefined}
    >
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide text-white px-3 py-1 rounded-full"
          style={{ background: '#2E7D32' }}
        >
          Le plus populaire
        </span>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#18181B]">{plan.name}</h3>
        <PlanIcon
          size={18}
          style={tone === 'accent' ? { color: '#1B5E20' } : { color: '#71717A' }}
        />
      </div>

      <div className="mt-4 flex items-end gap-1.5">
        <span className="font-serif text-[#18181B] tracking-tight leading-none" style={{ fontSize: '3.2rem' }}>
          {priceVal}
        </span>
        <span className="text-sm text-[#71717A] mb-1.5">F CFA</span>
      </div>
      <p className="text-xs text-[#71717A] mt-1">/mois</p>
      <p className="text-sm text-[#18181B]/60 mt-4 leading-relaxed">{plan.description || ''}</p>

      {isCurrent ? (
        <div className="mt-6 h-11 rounded-xl border border-[#E7E7EA] flex items-center justify-center text-sm font-medium text-[#71717A]">
          Formule actuelle
        </div>
      ) : canUpgrade ? (
        <button
          onClick={onChoose}
          className={`mt-6 h-11 rounded-xl text-sm font-semibold transition-colors ${popular ? 'text-white' : tone === 'business' ? 'text-white' : 'text-[#18181B] border border-[#E7E7EA] hover:bg-zinc-50'}`}
          style={popular ? { background: '#2E7D32' } : tone === 'business' ? { background: '#1B5E20' } : undefined}
        >
          Choisir cette formule
        </button>
      ) : (
        <div className="mt-6 h-11 rounded-xl border border-[#E7E7EA] flex items-center justify-center text-sm font-medium text-[#71717A]/50">
          Inférieur à votre plan
        </div>
      )}

      {features.length > 0 && (
        <ul className="mt-6 space-y-3 pt-6 border-t border-[#E7E7EA]">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#18181B]/75">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: '#E8F5E9' }}
              >
                <Check size={11} style={{ color: '#1B5E20' }} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FAQS = [
  ['Puis-je changer de formule à tout moment ?', 'Oui, vous pouvez passer à une formule supérieure quand vous le souhaitez.'],
  ['Comment se passe le paiement ?', 'Les paiements sont sécurisés via Wave. Vous recevez une facture après chaque règlement.'],
  ['Les cartes NFC sont-elles incluses ?', 'La commande des cartes NFC est disponible dès la formule Pro. Le prix unitaire est de 30 000 F CFA.'],
];

export default function UpgradePlan() {
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan]     = useState<Plan | null>(null);
  const [durationLoading, setDurationLoading] = useState<number | null>(null);
  const { toast }       = useToast();
  const navigate        = useNavigate();
  const { currentPlan } = usePlan();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    fetch(`${API_BASE}/api/plans`)
      .then(r => r.json())
      .then(({ plans: all = [] }) => {
        setAvailablePlans(all.sort((a: Plan, b: Plan) => Number(a.price_cents) - Number(b.price_cents)));
      })
      .catch(() => toast({ title: 'Erreur', description: 'Impossible de charger les formules', variant: 'destructive' }));
  }, [currentPlan, toast]);

  const handlePay = async (plan: Plan, months: number) => {
    setDurationLoading(months);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/auth'); return; }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: plan.id, duration_months: months }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur paiement');
      if (!json.checkout?.token) throw new Error('Lien de paiement non reçu');
      navigate(`/checkout?token=${json.checkout.token}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de démarrer le paiement', variant: 'destructive' });
    } finally {
      setDurationLoading(null);
    }
  };

  const currentPrice = Number(currentPlan?.price_cents || 0);
  const monthlyPrice = selectedPlan ? Number(selectedPlan.price_cents) : 0;

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <DashboardNav onSignOut={signOut} profile={profile || user || {}} />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* ── Header ── */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-3">Formules</p>
          <h1
            className="font-serif text-[#18181B] leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
          >
            Passez au niveau supérieur
          </h1>
          <p className="mt-4 text-[#18181B]/60">
            Débloquez cartes NFC illimitées, portfolios personnalisés et analytics avancées.
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm text-[#71717A]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              3 mois → <strong className="text-[#1B5E20]">−15%</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-700" />
              1 an → <strong className="text-[#1B5E20]">−20%</strong>
            </span>
          </div>
        </div>

        {/* ── Plans grid ── */}
        {availablePlans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-semibold text-[#18181B] mb-2">Vous êtes au sommet !</h2>
            <p className="text-[#71717A]">Vous bénéficiez déjà de la meilleure formule.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mt-12 items-start max-w-5xl mx-auto">
            {availablePlans.map((plan, index) => {
              const tone = getPlanTone(index, availablePlans.length);
              const isCurrent  = plan.id === currentPlan?.id || Number(plan.price_cents) === currentPrice;
              const canUpgrade = Number(plan.price_cents) > currentPrice;
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  tone={tone}
                  onChoose={() => setSelectedPlan(plan)}
                  isCurrent={isCurrent}
                  canUpgrade={canUpgrade}
                />
              );
            })}
          </div>
        )}

        {/* ── FAQ ── */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-xl font-semibold text-[#18181B] text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQS.map(([q, a]) => (
              <div key={q} className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
                <p className="font-semibold text-[#18181B] text-sm">{q}</p>
                <p className="mt-1.5 text-sm text-[#18181B]/60 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#71717A] mt-8">
            Une question ?{' '}
            <a href="mailto:support@portefolia.tech" className="font-semibold hover:underline" style={{ color: '#1B5E20' }}>
              support@portefolia.tech
            </a>
          </p>
        </div>
      </div>

      {/* ── Duration picker modal ── */}
      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlan(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">

            {/* Modal header */}
            <div className="px-7 py-5 border-b border-[#E7E7EA] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#71717A] mb-0.5">Formule sélectionnée</p>
                <h2 className="text-xl font-bold text-[#18181B]">{selectedPlan.name}</h2>
                <p className="text-sm text-[#71717A] mt-0.5">{formatFCFA(monthlyPrice)} / mois · Choisissez votre durée</p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F7F8F8] transition-colors text-[#71717A]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Duration cards */}
            <div className="p-6 grid grid-cols-3 gap-3">
              {DURATIONS.map(({ months, label, discount, badge }) => {
                const base    = monthlyPrice * months;
                const final   = Math.round(base * (1 - discount / 100));
                const savings = Math.round(base - final);
                const newEnd  = formatDate(addMonths(new Date(), months));
                const loading = durationLoading === months;
                const popular = months === 3;

                return (
                  <div
                    key={months}
                    className={`relative flex flex-col rounded-2xl border-2 p-4 gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      popular ? 'border-[#2E7D32] shadow-sm shadow-green-100' : 'border-[#E7E7EA]'
                    }`}
                  >
                    {badge && (
                      <span
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          popular ? 'bg-[#2E7D32]' : 'bg-slate-500'
                        }`}
                      >
                        {badge}
                      </span>
                    )}

                    <div className="text-center pt-1">
                      <p className="text-sm font-bold text-slate-700">{label}</p>
                      <p className="text-2xl font-black text-[#18181B] mt-1">{formatFCFA(final)}</p>
                      {discount > 0 ? (
                        <>
                          <p className="text-xs text-slate-400 line-through">{formatFCFA(base)}</p>
                          <p className="text-[11px] font-semibold text-[#2E7D32]">Économie : {formatFCFA(savings)}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">Sans remise</p>
                      )}
                    </div>

                    <div className="bg-[#F7F8F8] rounded-xl px-2 py-1.5 text-center">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Accès jusqu'au</p>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5 leading-tight">{newEnd}</p>
                    </div>

                    <button
                      onClick={() => handlePay(selectedPlan, months)}
                      disabled={!!durationLoading}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                        popular
                          ? 'text-white shadow-lg shadow-green-200'
                          : 'text-white'
                      }`}
                      style={{ background: popular ? '#2E7D32' : '#18181B' }}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer'}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-[#71717A] pb-5">
              Paiement sécurisé via Wave · Activation sous 24h
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
