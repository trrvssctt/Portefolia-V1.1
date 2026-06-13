import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Clock, Mail, CheckCircle2, ChevronRight, ArrowLeft, Smartphone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCheckoutPolling } from '@/hooks/useCheckoutPolling';
import { UpgradeConfirmedAlert } from '@/components/payment/UpgradeConfirmedAlert';

export default function PaymentPending() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const type = searchParams.get('type') || 'wave'; // 'wave' | 'stripe'
    const token = searchParams.get('token') || null;
    const [elapsed, setElapsed] = useState(0);
    const [alertDismissed, setAlertDismissed] = useState(false);

    // Compteur visuel "la page est active"
    useEffect(() => {
        const t = setInterval(() => setElapsed(v => v + 1), 1000);
        return () => clearInterval(t);
    }, []);

    // Polling du statut
    const { isApproved, planName } = useCheckoutPolling(token, !!token);
    const showAlert = isApproved && !alertDismissed;

    const isStripe = type === 'stripe';

    const steps = isStripe
        ? [
            { icon: CheckCircle2, color: 'text-green-500 bg-green-50', label: 'Paiement soumis à Stripe' },
            { icon: Clock, color: 'text-amber-500 bg-amber-50', label: 'Traitement en cours (1–2 min)' },
            { icon: Mail, color: 'text-blue-500 bg-blue-50', label: 'Confirmation par email à venir' },
        ]
        : [
            { icon: CheckCircle2, color: 'text-green-500 bg-green-50', label: 'Référence Wave enregistrée' },
            { icon: Clock, color: 'text-amber-500 bg-amber-50', label: 'Vérification par notre équipe (≤ 24h)' },
            { icon: Mail, color: 'text-blue-500 bg-blue-50', label: 'Email de confirmation à recevoir' },
        ];

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white">
            <Header />

            <main className="flex-1 flex items-center justify-center p-4 py-16">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">

                    {/* Icône */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center ring-8 ring-amber-50">
                                <Clock className="w-12 h-12 text-amber-500" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-amber-300 opacity-20 animate-ping" />
                            <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-white border-2 border-amber-200 rounded-full flex items-center justify-center shadow-sm">
                                {isStripe
                                    ? <Shield className="w-4 h-4 text-blue-600" />
                                    : <Smartphone className="w-4 h-4 text-[#1BC29A]" />
                                }
                            </div>
                        </div>
                    </div>

                    {/* Titre */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-extrabold text-gray-900">
                            Paiement en cours de validation
                        </h1>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {isStripe
                                ? "Votre paiement est en cours de traitement par Stripe. Cette opération peut prendre quelques instants."
                                : "Votre référence de transaction a bien été reçue. Notre équipe va vérifier le paiement dans les prochaines heures."}
                        </p>
                    </div>

                    {/* Étapes */}
                    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ce qui se passe</h3>
                        <div className="space-y-3">
                            {steps.map(({ icon: Icon, color, label }, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-gray-700">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Indicateur polling actif */}
                    {token && !isApproved && (
                        <div className="flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span>
                                Cette page vérifie automatiquement le statut de votre paiement.{' '}
                                <span className="font-medium">Vous serez alerté dès la validation.</span>
                            </span>
                        </div>
                    )}

                    {/* Bannière délai */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
                        <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                            <p className="font-semibold mb-1">
                                {isStripe ? "Temps de traitement estimé" : "Délai de validation"}
                            </p>
                            <p className="text-amber-700 text-xs leading-relaxed">
                                {isStripe
                                    ? "Généralement instantané. En cas de délai, vérifiez votre boîte email dans 5 minutes."
                                    : "Notre équipe valide les paiements Wave du lundi au samedi, de 8h à 20h. Délai maximum : 24h ouvrées."}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full bg-gray-900 hover:bg-black text-base gap-2"
                            onClick={() => navigate(localStorage.getItem('token') ? '/dashboard' : '/auth')}
                        >
                            {localStorage.getItem('token') ? 'Accéder à mon espace' : 'Retour à la connexion'}
                            <ChevronRight className="w-4 h-4" />
                        </Button>

                        {token && (
                            <Button variant="outline" size="lg" className="w-full gap-2" asChild>
                                <Link to={`/checkout?token=${token}`}>
                                    <ArrowLeft className="w-4 h-4" />
                                    Revoir ma commande
                                </Link>
                            </Button>
                        )}

                        <Button variant="ghost" className="w-full text-gray-400 text-sm" asChild>
                            <Link to="/">Retour à l'accueil</Link>
                        </Button>
                    </div>

                    {/* Support */}
                    <p className="text-center text-xs text-gray-400">
                        Un problème ?{' '}
                        <a href="mailto:support@portefolia.tech" className="underline underline-offset-4 hover:text-gray-600">
                            Contacter le support
                        </a>
                    </p>
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
