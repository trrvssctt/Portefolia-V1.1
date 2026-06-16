import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const envBase = import.meta.env.VITE_API_BASE;
const API_BASE = envBase || (typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://backend-v-card.onrender.com');

type Phase = 'loading' | 'success_login' | 'success_verified' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState<Phase>('loading');
  const [prenom, setPrenom] = useState('');
  const [errorMsg, setErrorMsg] = useState('Ce lien a expiré ou a déjà été utilisé.');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Lien invalide. Aucun token fourni.');
      setPhase('error');
      return;
    }

    let cancelled = false;

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Ce lien a expiré ou a déjà été utilisé.');
          setPhase('error');
          return;
        }

        if (data.accessToken) {
          // Plan gratuit → connecté automatiquement
          localStorage.setItem('token', data.accessToken);
          setPrenom(data.user?.prenom || '');
          setPhase('success_login');
          setTimeout(() => {
            if (!cancelled) navigate('/dashboard', { replace: true });
          }, 2500);
        } else if (data.verified_only) {
          // Plan payant → juste vérifié, pas de connexion
          setPhase('success_verified');
        } else {
          setPhase('success_verified');
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.');
          setPhase('error');
        }
      }
    };

    verifyToken();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#E8F5E9] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        <img
          src="/lovable-uploads/logo_portefolia_remove_bg.png"
          alt="Portefolia"
          className="h-14 w-auto object-contain drop-shadow-sm"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />

        <div className="w-full bg-white rounded-2xl shadow-lg border border-[#C8E6C9] px-8 py-10 flex flex-col items-center gap-6">

          {/* Chargement */}
          {phase === 'loading' && (
            <>
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#C8E6C9]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#2E7D32] animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[15px] font-semibold text-[#1A1A2E]">Vérification en cours…</p>
                <p className="text-sm text-gray-400">Confirmation de votre adresse email</p>
              </div>
            </>
          )}

          {/* Succès + connexion automatique (plan gratuit) */}
          {phase === 'success_login' && (
            <>
              <div className="h-16 w-16 rounded-full bg-[#E8F5E9] border-2 border-[#2E7D32] flex items-center justify-center"
                   style={{ animation: 'pulse-once 0.45s ease-out forwards' }}>
                <svg className="h-8 w-8 text-[#2E7D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[18px] font-bold text-[#1A1A2E]">
                  Email vérifié{prenom ? `, ${prenom}` : ''} !
                </p>
                <p className="text-sm text-[#5C5C5C]">Connexion à votre dashboard… Redirection en cours.</p>
              </div>
              <div className="w-full h-1 bg-[#C8E6C9] rounded-full overflow-hidden">
                <div className="h-full bg-[#2E7D32] rounded-full" style={{ animation: 'progress 2.5s linear forwards' }} />
              </div>
            </>
          )}

          {/* Succès vérification seule (plan payant) */}
          {phase === 'success_verified' && (
            <>
              <div className="h-16 w-16 rounded-full bg-[#E8F5E9] border-2 border-[#2E7D32] flex items-center justify-center">
                <svg className="h-8 w-8 text-[#2E7D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center space-y-3">
                <p className="text-[18px] font-bold text-[#1A1A2E]">Email confirmé !</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Prochaine étape</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Votre adresse email est vérifiée. Notre équipe va valider votre paiement et vous envoyer
                    un lien de connexion par email dès confirmation.
                  </p>
                </div>
              </div>
              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-[#2E7D32] text-white text-sm font-semibold text-center hover:bg-[#1B5E20] transition-colors"
              >
                Retour à l'accueil
              </Link>
            </>
          )}

          {/* Erreur */}
          {phase === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[16px] font-bold text-[#1A1A2E]">Lien invalide</p>
                <p className="text-sm text-[#5C5C5C] leading-relaxed">{errorMsg}</p>
              </div>
              <div className="flex flex-col items-center gap-3 w-full">
                <Link
                  to="/auth"
                  className="w-full py-2.5 rounded-xl bg-[#2E7D32] text-white text-sm font-semibold text-center hover:bg-[#1B5E20] transition-colors"
                >
                  Aller à la connexion
                </Link>
                <a
                  href="mailto:support@portefolia.tech"
                  className="text-xs text-[#2E7D32] hover:underline"
                >
                  Contacter le support
                </a>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Portefolia</p>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes pulse-once {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
