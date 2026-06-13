import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const envBase = import.meta.env.VITE_API_BASE;
const API_BASE = envBase || (typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://backend-v-card.onrender.com');

type Phase = 'loading' | 'welcome' | 'error';

interface ApiError {
  code?: string;
  message?: string;
}

export default function TokenLogin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

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

    const authenticate = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/token/${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok) {
          const err = data as ApiError;
          setErrorMsg(err.message || 'Ce lien a expiré ou a déjà été utilisé.');
          setPhase('error');
          return;
        }

        const accessToken: string = data.accessToken || data.token || data.access_token;
        if (!accessToken) {
          setErrorMsg('Réponse du serveur invalide. Veuillez réessayer.');
          setPhase('error');
          return;
        }

        localStorage.setItem('token', accessToken);
        setPrenom(data.user?.prenom || '');
        setPhase('welcome');

        setTimeout(() => {
          if (!cancelled) navigate('/dashboard', { replace: true });
        }, 2200);
      } catch {
        if (!cancelled) {
          setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.');
          setPhase('error');
        }
      }
    };

    authenticate();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#E8F5E9] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <img
          src="/logo_portefolia.png"
          alt="Portefolia"
          className="h-14 w-auto object-contain"
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
          }}
        />

        {/* Carte */}
        <div className="w-full bg-white rounded-2xl shadow-lg border border-[#C8E6C9] px-8 py-10 flex flex-col items-center gap-6 transition-all duration-300">

          {phase === 'loading' && (
            <>
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#C8E6C9]" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#2E7D32] animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[15px] font-semibold text-[#1A1A2E]">Connexion en cours…</p>
                <p className="text-sm text-gray-400">Vérification de votre lien</p>
              </div>
            </>
          )}

          {phase === 'welcome' && (
            <>
              {/* Cercle de succès animé */}
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#2E7D32] flex items-center justify-center animate-pulse-once">
                  <svg className="h-8 w-8 text-[#2E7D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[18px] font-bold text-[#1A1A2E] leading-snug">
                  Bienvenue{prenom ? `, ${prenom}` : ''}&nbsp;!
                </p>
                <p className="text-sm text-[#5C5C5C]">Votre espace est prêt. Redirection…</p>
              </div>
              <div className="w-full h-1 bg-[#C8E6C9] rounded-full overflow-hidden">
                <div className="h-full bg-[#2E7D32] rounded-full animate-progress" />
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <p className="text-[16px] font-bold text-[#1A1A2E]">Lien invalide</p>
                <p className="text-sm text-[#5C5C5C] leading-relaxed">{errorMsg}</p>
              </div>
              <div className="flex flex-col items-center gap-3 w-full">
                <a
                  href="/auth"
                  className="w-full py-2.5 rounded-xl bg-[#2E7D32] text-white text-sm font-semibold text-center hover:bg-[#1B5E20] transition-colors"
                >
                  Se connecter manuellement
                </a>
                <a
                  href="mailto:support@portefolia.com"
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
        .animate-progress {
          animation: progress 2.2s linear forwards;
        }
        @keyframes pulse-once {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .animate-pulse-once {
          animation: pulse-once 0.45s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
