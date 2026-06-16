import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Shield, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCheckoutPolling } from '@/hooks/useCheckoutPolling';
import { UpgradeConfirmedAlert } from '@/components/payment/UpgradeConfirmedAlert';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const type = searchParams.get('type') || 'stripe'; // 'stripe' | 'wave'
    const token = searchParams.get('token') || null;

    const isWave = type === 'wave';

    // Pour Wave  : on poll jusqu'à validation admin
    // Pour Stripe: statut confirmé rapidement via webhook — on poll aussi mais
    //              on s'attend à une réponse rapide (< 10 s)
    const { isApproved, planName } = useCheckoutPolling(token, !!token);

    const [alertDismissed, setAlertDismissed] = useState(false);
    const showAlert = isApproved && !alertDismissed;

    // Confetti seulement pour Stripe (déjà confirmé) ou quand l'upgrade devient approuvé
    useEffect(() => {
        const shouldFireConfetti = !isWave || isApproved;
        if (!shouldFireConfetti) return;

        const duration = 3_000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: ReturnType<typeof setInterval> = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, [isWave, isApproved]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">

                    {/* Icône principale */}
                    <div className="relative inline-block">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-200">
                            <CheckCircle2 className="w-14 h-14 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                            <Shield className="w-4 h-4 text-green-600" />
                        </div>
                    </div>

                    {/* Titre & description */}
                    <div className="space-y-3">
                        <h1 className="text-3xl font-extrabold text-gray-900">
                            {isWave ? 'Paiement enregistré !' : 'Paiement réussi !'}
                        </h1>
                        <p className="text-gray-600 leading-relaxed">
                            {isWave
                                ? "Votre référence de transaction Wave a été soumise avec succès. Notre équipe va maintenant procéder à la validation."
                                : "Merci ! Votre paiement Stripe a été confirmé et votre abonnement est désormais actif."}
                        </p>
                    </div>

                    {/* Prochaines étapes */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-green-100 text-left space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Prochaines étapes
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-gray-600">
                                <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-green-600">1</span>
                                </div>
                                <span>Un reçu de paiement a été envoyé à votre adresse email.</span>
                            </li>
                            {isWave ? (
                                <li className="flex gap-3 text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-amber-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <span>
                                        <strong>Validation Wave :</strong> Votre compte sera activé manuellement par nos administrateurs (sous 24h maximum).{' '}
                                        <span className="text-[#28A745] font-medium">
                                            Cette page vous alertera dès que c'est validé.
                                        </span>
                                    </span>
                                </li>
                            ) : (
                                <li className="flex gap-3 text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-bold text-green-600">2</span>
                                    </div>
                                    <span>Votre accès Premium est désormais débloqué.</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Indicateur d'attente Wave */}
                    {isWave && !isApproved && (
                        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            En attente de validation par notre équipe…
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full bg-green-600 hover:bg-green-700 h-13 text-base shadow-lg shadow-green-100"
                            onClick={() => navigate(isWave ? '/auth' : '/dashboard')}
                        >
                            {isWave ? 'Retour à la connexion' : 'Accéder à mon Dashboard'}
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link to="/" className="text-gray-500 text-sm">Retour à l'accueil</Link>
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Alerte upgrade confirmé */}
            {showAlert && (
                <UpgradeConfirmedAlert
                    planName={planName}
                    onLater={() => setAlertDismissed(true)}
                />
            )}
        </div>
    );
}
