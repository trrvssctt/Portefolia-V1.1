import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://portefolia.tech');

export default function ResetPassword() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!token) {
      setError('Lien invalide ou incomplet.');
      setStatus('error');
      return;
    }

    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/auth/confirm-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Lien expiré ou invalide. Veuillez refaire une demande.');
          setStatus('error');
          return;
        }

        // Stocker le JWT → utilisateur connecté
        if (json.accessToken) {
          localStorage.setItem('token', json.accessToken);
        }

        setStatus('success');
        // window.location.href force un rechargement complet pour que AuthProvider
        // relise le token depuis localStorage et initialise correctement la session
        setTimeout(() => {
          window.location.href = '/dashboard/profile?tab=security&force_change=1';
        }, 1500);
      } catch {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
        setStatus('error');
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#E8F5E9 0%,#fff 60%,#F0FFF4 100%)' }}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-sm text-center">
        <Link to="/" className="inline-block mb-6">
          <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="h-12 mx-auto" />
        </Link>

        {status === 'loading' && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#E8F5E9' }}>
              <Loader2 size={26} className="text-[#2E7D32] animate-spin" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">Connexion en cours…</p>
            <p className="text-sm text-gray-500 mt-1">Vérification du lien de réinitialisation</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#E8F5E9' }}>
              <CheckCircle2 size={26} className="text-[#2E7D32]" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">Connecté !</p>
            <p className="text-sm text-gray-500 mt-1">
              Redirection vers votre profil pour changer votre mot de passe…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50">
              <XCircle size={26} className="text-red-500" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">Lien invalide</p>
            <p className="text-sm text-gray-500 mt-1 mb-6">{error}</p>
            <Link to="/auth"
              className="inline-block w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center transition-colors"
              style={{ background: '#2E7D32' }}>
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
