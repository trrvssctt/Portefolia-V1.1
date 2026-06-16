import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, AlertCircle, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PaymentError() {
    const [searchParams] = useSearchParams();
    const error = searchParams.get('message') || "Une erreur est survenue lors du traitement de votre paiement.";
    const token = searchParams.get('token');

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50">
                        <XCircle className="w-12 h-12 text-red-500" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-extrabold text-gray-900">Oups ! Échec du paiement</h1>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm flex items-start gap-3 text-left">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Votre carte n'a pas été débitée. Vous pouvez réessayer avec une autre méthode de paiement.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full bg-gray-900 hover:bg-black h-13 text-base"
                            asChild
                        >
                            <Link to={token ? `/checkout?token=${token}` : '/upgrade'}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Réessayer le paiement
                            </Link>
                        </Button>

                        <div className="pt-4 flex flex-col gap-2">
                            <Button variant="outline" asChild className="w-full">
                                <Link to="/upgrade">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Changer de plan
                                </Link>
                            </Button>
                            <Button variant="ghost" asChild className="w-full text-gray-400">
                                <Link to="/">Retour à l'accueil</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-200">
                        <p className="text-xs text-gray-400">
                            Besoin d'aide ? <a href="mailto:support@portefolia.tech" className="underline underline-offset-4 hover:text-gray-600">Contacter le support client</a>
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
