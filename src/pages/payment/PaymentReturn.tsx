import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

/**
 * PaymentReturn — Page de retour Stripe
 *
 * Stripe redirige ici après le paiement avec les paramètres :
 *   - payment_intent              : ID du PaymentIntent
 *   - payment_intent_client_secret : secret du PaymentIntent
 *   - redirect_status             : 'succeeded' | 'processing' | 'requires_action' | 'canceled'
 *
 * On route vers la bonne page selon le statut.
 */
export default function PaymentReturn() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const redirectStatus = searchParams.get('redirect_status');
    const clientSecret = searchParams.get('payment_intent_client_secret');
    const token = searchParams.get('token');
    const method = 'stripe';

    useEffect(() => {
        // Slight delay so the user sees the loading state before the redirect
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        const handleReturn = async () => {
            await delay(1200);

            switch (redirectStatus) {
                case 'succeeded':
                    navigate(`/payment/success?type=stripe&token=${token || ''}`, { replace: true });
                    break;

                case 'processing':
                    // Bank transfer or delayed payment — show pending page
                    navigate(`/payment/pending?type=stripe&token=${token || ''}`, { replace: true });
                    break;

                case 'requires_action':
                    // 3D Secure or additional authentication needed — send back to checkout
                    if (token) {
                        navigate(`/checkout?token=${token}&method=stripe`, { replace: true });
                    } else {
                        navigate('/payment/error?message=Authentification+supplémentaire+requise.+Veuillez+réessayer.', { replace: true });
                    }
                    break;

                case 'canceled':
                    navigate(`/payment/cancelled?token=${token || ''}&method=${method}`, { replace: true });
                    break;

                default:
                    // No redirect_status but has client_secret → likely a redirect from
                    // stripe.confirmPayment with redirect: 'if_required' that succeeded
                    if (clientSecret) {
                        navigate(`/payment/success?type=stripe&token=${token || ''}`, { replace: true });
                    } else {
                        navigate(
                            '/payment/error?message=Statut+du+paiement+inconnu.+Veuillez+contacter+le+support.',
                            { replace: true }
                        );
                    }
                    break;
            }
        };

        handleReturn();
    }, [redirectStatus, clientSecret, token, navigate]);

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Vérification de votre paiement…</h2>
                    <p className="text-gray-500 mt-1 text-sm">Veuillez ne pas fermer cette page.</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
