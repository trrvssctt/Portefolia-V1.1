import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PaymentCancelled() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const method = searchParams.get('method') || 'stripe'; // which method was attempted

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
            <Header />

            <main className="flex-1 flex items-center justify-center p-4 py-16">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">

                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center ring-8 ring-gray-50">
                            <XCircle className="w-12 h-12 text-gray-400" />
                        </div>
                    </div>

                    {/* Title & description */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-extrabold text-gray-900">Paiement annulé</h1>
                        <p className="text-gray-500 leading-relaxed">
                            Vous avez annulé le processus de paiement. <strong>Aucun montant n'a été débité</strong> de votre compte.
                        </p>
                    </div>

                    {/* Info box */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 text-left space-y-3 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700">Vous pouvez :</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    <RefreshCw className="w-3 h-3 text-gray-500" />
                                </div>
                                Réessayer avec la même méthode de paiement
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    {method === 'stripe'
                                        ? <Smartphone className="w-3 h-3 text-[#1BC29A]" />
                                        : <CreditCard className="w-3 h-3 text-blue-500" />
                                    }
                                </div>
                                Choisir une autre méthode de paiement
                            </li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {/* Primary: retry */}
                        <Button
                            size="lg"
                            className="w-full bg-gray-900 hover:bg-black text-base gap-2"
                            asChild
                        >
                            <Link to={token ? `/checkout?token=${token}` : '/upgrade'}>
                                <RefreshCw className="w-4 h-4" />
                                Réessayer le paiement
                            </Link>
                        </Button>

                        {/* Secondary: change plan */}
                        <Button variant="outline" size="lg" className="w-full gap-2" asChild>
                            <Link to="/upgrade">
                                <ArrowLeft className="w-4 h-4" />
                                Choisir une autre formule
                            </Link>
                        </Button>

                        <Button variant="ghost" className="w-full text-gray-400 text-sm" asChild>
                            <Link to="/">Retour à l'accueil</Link>
                        </Button>
                    </div>

                    {/* Support */}
                    <p className="text-xs text-gray-400">
                        Besoin d'aide ?{' '}
                        <a href="mailto:support@portefolia.tech" className="underline underline-offset-4 hover:text-gray-600">
                            Contacter le support client
                        </a>
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
