import { Clock, CheckCircle2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const STEPS = [
  { icon: CheckCircle2, color: 'text-[#28A745] bg-green-50', label: 'Référence Wave enregistrée' },
  { icon: Clock,        color: 'text-amber-500 bg-amber-50', label: 'Vérification par notre équipe (≤ 24h)' },
  { icon: Mail,         color: 'text-blue-500  bg-blue-50',  label: "Email de confirmation à l'activation" },
];

export default function PendingValidation() {
  const waveRef =
    localStorage.getItem('wave_reference') ||
    localStorage.getItem('payment_reference') ||
    null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#E8F5E9' }}>
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">

          {/* Icône horloge animée */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center ring-8 ring-green-100 shadow-md">
                <Clock className="w-12 h-12 text-[#28A745]" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#28A745] opacity-10 animate-ping" />
            </div>
          </div>

          {/* Titre */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-white text-[#28A745] px-4 py-1.5 rounded-full text-sm font-semibold border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              Paiement reçu
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Notre équipe vérifie votre paiement
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Votre référence Wave a bien été enregistrée. La validation prend généralement{' '}
              <span className="font-semibold text-gray-800">moins de 24h</span>.
            </p>
          </div>

          {/* Référence Wave */}
          {waveRef && (
            <div className="bg-white rounded-2xl border border-green-200 p-4 text-center shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                Référence Wave soumise
              </p>
              <p className="font-mono font-bold text-gray-800 text-lg tracking-widest">{waveRef}</p>
            </div>
          )}

          {/* Étapes */}
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prochaines étapes</h3>
            <div className="space-y-3">
              {STEPS.map(({ icon: Icon, color, label }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Délai */}
          <div className="bg-white border border-green-200 rounded-xl p-4 flex gap-3 text-sm text-gray-700">
            <Clock className="w-5 h-5 shrink-0 mt-0.5 text-[#28A745]" />
            <div>
              <p className="font-semibold mb-0.5">Délai de validation</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Notre équipe valide les paiements du lundi au samedi, de 8h à 20h.
                Délai maximum : 24h ouvrées.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-[#28A745] hover:bg-green-600 text-white gap-2"
              asChild
            >
              <a href="mailto:support@portefolia.tech">
                <MessageCircle className="w-4 h-4" />
                Contacter le support
              </a>
            </Button>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Votre compte sera activé automatiquement dès la validation.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
