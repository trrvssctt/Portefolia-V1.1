import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NFC_API_BASE } from '@/hooks/useNfcConfig';

// Secours de https://portefolia.tech/c/{CODE} quand la requête atteint le frontend au lieu du backend
// (normalement Nginx envoie /c/ directement au backend, qui redirige en une étape)
const STATE_TO_PAGE: Record<string, string> = {
  inconnue: 'non-activee',
  non_activee: 'non-activee',
  preparation: 'en-preparation',
  desactivee: 'desactivee',
  indisponible: 'indisponible',
};

export default function NfcCardRedirect() {
  const { code = '' } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetch(`${NFC_API_BASE}/api/nfc/cards/resolve/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : { state: 'indisponible' }))
      .catch(() => ({ state: 'indisponible' }))
      .then((d) => {
        if (cancelled) return;
        if (d.state === 'ok' && d.slug) {
          navigate(`/portfolio/${encodeURIComponent(d.slug)}?src=nfc&card=${d.code}`, { replace: true });
        } else {
          const page = STATE_TO_PAGE[d.state] || 'non-activee';
          navigate(`/carte/${page}${d.code ? `?code=${d.code}` : ''}`, { replace: true });
        }
      });
    return () => { cancelled = true; };
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]">
      <Loader2 size={28} className="animate-spin text-[#2E7D32]" />
    </div>
  );
}
