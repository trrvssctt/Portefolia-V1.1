import { Mail, ShieldOff, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SUPPORT_EMAIL = 'support@portefolia.tech';

export default function AccountSuspended() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">

          {/* Icône */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center ring-8 ring-orange-50">
              <ShieldOff className="w-10 h-10 text-orange-400" />
            </div>
          </div>

          {/* Titre */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Compte temporairement suspendu
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Votre accès a été suspendu suite à un problème avec votre abonnement.
              Notre équipe peut vous aider à régulariser la situation rapidement.
            </p>
          </div>

          {/* Que faire */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-700">Pour rétablir votre accès :</p>
            <ul className="space-y-2">
              {[
                'Contactez notre support par email',
                'Indiquez votre adresse email de connexion',
                "Notre équipe vous répond sous 24h ouvrées",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-[#28A745] font-bold shrink-0 mt-0.5">•</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-[#28A745] hover:bg-green-600 text-white gap-2"
              asChild
            >
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Compte suspendu - demande de rétablissement`}>
                <Mail className="w-4 h-4" />
                {SUPPORT_EMAIL}
              </a>
            </Button>

            <Button variant="outline" size="lg" className="w-full gap-2" asChild>
              <Link to="/">
                Retour à l'accueil
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Si vous pensez qu'il s'agit d'une erreur, merci de nous contacter en précisant
            votre référence de paiement.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
