import { PartyPopper, LogOut, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutUser } from '@/utils/authUtils';

interface Props {
  planName: string | null;
  onLater?: () => void;
}

/**
 * Modal plein écran affichée quand l'admin valide un upgrade (Wave)
 * ou quand Stripe confirme automatiquement.
 * Le bouton principal déconnecte l'utilisateur pour forcer le rechargement
 * des droits associés au nouveau plan.
 */
export function UpgradeConfirmedAlert({ planName, onLater }: Props) {
  const handleDisconnect = async () => {
    await signOutUser();
    localStorage.removeItem('token');
    // Rechargement complet pour réinitialiser tous les contextes React
    window.location.replace('/auth');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

        {/* En-tête coloré */}
        <div className="bg-gradient-to-br from-[#28A745] via-emerald-500 to-teal-500 px-8 pt-8 pb-10 text-center relative overflow-hidden">
          {/* Cercles décoratifs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Upgrade confirmé !</h2>
            {planName && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Plan {planName} activé
              </div>
            )}
          </div>
        </div>

        {/* Corps */}
        <div className="px-6 py-6 space-y-4">
          <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl p-4">
            <CheckCircle2 className="w-5 h-5 text-[#28A745] shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              Votre paiement a été <strong>validé avec succès</strong>.
              Pour accéder à vos nouvelles fonctionnalités, reconnectez-vous —
              vos droits seront mis à jour automatiquement.
            </p>
          </div>

          <Button
            onClick={handleDisconnect}
            className="w-full h-12 bg-[#28A745] hover:bg-[#218838] text-white font-bold rounded-xl gap-2 text-base shadow-md shadow-green-200 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter et accéder
          </Button>

          {onLater && (
            <button
              onClick={onLater}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
            >
              Plus tard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
