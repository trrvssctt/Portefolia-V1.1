import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Copy, CheckCircle2, Clock, AlertCircle, Smartphone,
  Shield, Check, Loader2, Download, Star, Zap, Sparkles, Crown,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Plan helpers ─────────────────────────────────────────────────────────────
function getPlanIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('business')) return <Crown className="w-4 h-4" />;
  if (n.includes('pro')) return <Sparkles className="w-4 h-4" />;
  if (n.includes('starter')) return <Zap className="w-4 h-4" />;
  return <Star className="w-4 h-4" />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get('token');
  const paymentStatus = searchParams.get('payment_status');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [copied, setCopied] = useState(false);
  const [waveConfirming, setWaveConfirming] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // ── Load checkout data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    if (paymentStatus === 'success') { setSucceeded(true); setLoading(false); triggerConfetti(); return; }

    const load = async () => {
      try {
        let res = await fetch(`${API_BASE}/api/checkout/${token}`);
        let json: any = null;
        if (res.ok) {
          json = await res.json();
        } else {
          res = await fetch(`${API_BASE}/api/abonnements/checkout/${token}`);
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lien invalide');
          json = await res.json();
        }
        setData(json);
        if (json.expires_at) {
          const diff = Math.max(0, Math.floor((new Date(json.expires_at).getTime() - Date.now()) / 1000));
          setTimeLeft(diff);
        }
      } catch (err: any) {
        toast({ title: 'Lien invalide', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, paymentStatus, toast]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 || !data?.expires_at) return;
    const t = setInterval(() => setTimeLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft, data?.expires_at]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Confetti ──────────────────────────────────────────────────────────────
  const triggerConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#28A745', '#0ea5e9', '#f59e0b'] });
    setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } }), 400);
  }, []);

  const [waveReference, setWaveReference] = useState('');

  // ── Wave confirm ──────────────────────────────────────────────────────────
  const handleWaveConfirm = async () => {
    if (!waveReference.trim()) {
      toast({ title: 'Référence requise', description: 'Veuillez saisir votre référence de transaction Wave.', variant: 'destructive' });
      return;
    }
    setWaveConfirming(true);
    try {
      const authToken = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      let res = await fetch(`${API_BASE}/api/checkout/${token}/confirm`, {
        method: 'POST', headers,
        body: JSON.stringify({ reference_transaction: waveReference, payment_method: 'wave' }),
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/abonnements/checkout/${token}/confirm`, {
          method: 'POST', headers,
          body: JSON.stringify({ reference_transaction: waveReference, payment_method: 'wave' }),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Échec');

      // Redirect to success page instead of setting succeeded state here
      navigate(`/payment/success?type=wave&token=${token}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setWaveConfirming(false);
    }
  };

  // ── Copy reference ─────────────────────────────────────────────────────────
  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!token || (!data && !succeeded)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Lien expiré ou invalide</h2>
          <p className="text-gray-600">Ce lien de paiement n'existe plus ou a déjà été utilisé.</p>
          <Button asChild size="lg" className="mt-4">
            <Link to="/upgrade">Voir les formules</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Paiement reçu !</h2>
            <p className="text-gray-600 leading-relaxed">
              Merci ! Votre paiement a bien été enregistré. Votre accès sera activé
              dès validation par notre équipe. Vous recevrez un email de confirmation.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Paiement enregistré
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Confirmation par email à venir
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              Compte activé sous 24h
            </div>
          </div>
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => navigate(localStorage.getItem('token') ? '/dashboard' : '/auth')}
          >
            Accéder à mon espace
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const plan = data?.plan || data?.checkout?.plan || {};
  const paiement = data?.paiement || {};
  const checkoutMeta = data?.checkout?.metadata || {};
  const durationMonths: number = Number(checkoutMeta.duration_months) || 1;
  const discountPercent: number = Number(checkoutMeta.discount_percent) || 0;
  const amount = Number(paiement?.montant || (plan.price_cents || 0) / 100 || 0);
  const reference = `REF-${(token || '').slice(0, 10).toUpperCase()}`;
  const expired = timeLeft === 0 && !!data?.expires_at;

  const periodLabel =
    durationMonths === 12 ? 'pour 1 an' :
    durationMonths > 1 ? `pour ${durationMonths} mois` :
    plan.billing_interval === 'yearly' ? 'par an' : 'par mois';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo_portefolia.png" alt="Portefolia" className="h-10 object-contain" />
            <span className="font-bold text-gray-900 text-lg">Portefolia</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 text-xs font-medium border-green-300 text-green-700 bg-green-50">
              <Shield className="w-3 h-3" /> Paiement sécurisé
            </Badge>
            {data?.expires_at && (
              <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${timeLeft <= 300 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                <Clock className="w-3.5 h-3.5" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">

        {/* Expired banner */}
        {expired && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Ce lien de paiement a expiré. Veuillez recommencer.</p>
            <Button variant="outline" size="sm" className="ml-auto border-red-300 text-red-700" asChild>
              <Link to="/upgrade">Réessayer</Link>
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 items-start">

          {/* ── Left: Order summary ────────────────────────────────────────── */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4">

            {/* Plan card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-4">
                <p className="text-green-100 text-sm font-medium mb-1">Vous souscrivez au plan</p>
                <div className="flex items-center gap-2">
                  <span className="text-white/80">{getPlanIcon(plan.name)}</span>
                  <h2 className="text-white text-2xl font-extrabold">{plan.name || 'Plan'}</h2>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {amount.toLocaleString('fr')}
                  </span>
                  <span className="text-gray-500 text-sm mb-1.5">XOF</span>
                </div>
                <p className="text-xs text-gray-500">{periodLabel}</p>
                {discountPercent > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                    Remise de {discountPercent}% appliquée
                  </p>
                )}

                {/* Reference */}
                <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Référence</p>
                    <code className="text-sm font-bold text-gray-800">{reference}</code>
                  </div>
                  <button
                    onClick={() => copyRef(reference)}
                    className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Garanties</p>
              {[
                { icon: Shield, text: 'Paiement 100% sécurisé' },
                { icon: Check, text: 'Accès immédiat après validation' },
                { icon: Check, text: 'Support client 7j/7' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon className="w-3 h-3 text-green-600" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Payment methods ─────────────────────────────────────── */}
          <div className="md:col-span-1 lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

              <div className="p-6">

                {/* ─── Wave ─────────────────────────────────────────────────── */}
                <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-gray-600 text-sm mb-5">
                        Scannez le QR code avec votre application <strong>Wave</strong> pour payer.
                      </p>

                      {/* QR code */}
                      <div className="inline-block relative">
                        <div className="bg-white rounded-3xl shadow-lg border-4 border-[#1BC29A]/30 p-4">
                          <img
                            src="/qr_code_marchant_wave.png"
                            alt="QR Code Wave"
                            className="w-40 h-40 sm:w-52 sm:h-52 object-contain rounded-xl"
                          />
                        </div>
                        {/* Wave logo badge */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1BC29A] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
                          Wave
                        </div>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {[
                        { step: '1', title: 'Ouvrez Wave', sub: 'Allez dans l\'onglet Payer / Scanner' },
                        { step: '2', title: `Entrez ${amount.toLocaleString('fr')} XOF`, sub: 'Vérifiez le montant avant de confirmer' },
                        { step: '3', title: 'Validez avec votre code PIN', sub: 'Puis revenez ici et cliquez sur le bouton' },
                      ].map(({ step, title, sub }) => (
                        <div key={step} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 bg-[#1BC29A] text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">
                            {step}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Download QR */}
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = '/qr_code_marchant_wave.png';
                        a.download = 'qr-wave-portefolia.png';
                        a.click();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                    >
                      <Download className="w-4 h-4" /> Télécharger le QR code
                    </button>

                    {/* Wave reference input */}
                    <div className="space-y-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="w-4 h-4 text-[#1BC29A]" />
                        <label htmlFor="wave-ref" className="text-sm font-bold text-gray-800">
                          Référence de transaction Wave
                        </label>
                      </div>
                      <input
                        id="wave-ref"
                        type="text"
                        placeholder="Ex: T.123456.789..."
                        value={waveReference}
                        onChange={(e) => setWaveReference(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#1BC29A] focus:ring-2 focus:ring-[#1BC29A]/20 transition-all outline-none text-base"
                      />
                      <p className="text-[10px] text-gray-500 leading-tight">
                        Vous trouverez cette référence dans votre historique Wave après avoir validé le paiement.
                      </p>
                    </div>

                    {/* Confirm button */}
                    <Button
                      size="lg"
                      disabled={waveConfirming || expired}
                      onClick={handleWaveConfirm}
                      className="w-full h-13 bg-[#1BC29A] hover:bg-[#17a884] text-base font-bold gap-2"
                    >
                      {waveConfirming
                        ? <><Loader2 className="w-5 h-5 animate-spin" />Validation…</>
                        : <><CheckCircle2 className="w-5 h-5" />Confirmer mon paiement</>
                      }
                    </Button>

                    <p className="text-center text-xs text-gray-400">
                      Compatible : Wave • Orange Money • Free Money • Moov Money
                    </p>
                </div>
              </div>
            </div>

            {/* Help link */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Un problème ? <a href="mailto:support@portefolia.tech" className="underline hover:text-gray-600">Contacter le support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
