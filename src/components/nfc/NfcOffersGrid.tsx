import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';

interface PublicOffer {
  code: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number | null;
  is_quote: boolean;
  available: boolean;
  options: { features?: string[] };
}

// L'offre mise en avant sur la page de comparaison
const HIGHLIGHT = 'personnalisee';

export default function NfcOffersGrid() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<{ offers: PublicOffer[] }>({
    queryKey: ['nfc-offers'],
    queryFn: async () => {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/offers`);
      if (!res.ok) throw new Error('offres indisponibles');
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#2E7D32]" /></div>;
  if (isError || !data) return <p className="text-center text-sm text-gray-500 py-6">Offres momentanément indisponibles. Réessayez dans un instant.</p>;

  const choose = (o: PublicOffer) => {
    if (o.is_quote) navigate('/nfc/devis');
    else if (!o.available) document.getElementById('liste-attente')?.scrollIntoView({ behavior: 'smooth' });
    else navigate(`/nfc/commander/${o.code}`);
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.offers.map((o) => {
        const hl = o.code === HIGHLIGHT;
        return (
          <div key={o.code} className="relative bg-white rounded-2xl border shadow-sm p-5 flex flex-col"
            style={{ borderColor: hl ? '#2E7D32' : '#F3F4F6', boxShadow: hl ? '0 8px 30px rgba(46,125,50,0.15)' : undefined }}>
            {hl && <span className="absolute -top-3 left-5 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: '#2E7D32' }}>Le plus choisi</span>}
            <p className="text-lg font-bold text-gray-900">{o.name}</p>
            {o.tagline && <p className="text-xs text-gray-500 mt-0.5 min-h-[2rem]">{o.tagline}</p>}
            <p className="mt-3 text-2xl font-black" style={{ color: '#1B5E20' }}>
              {o.is_quote ? 'Sur devis' : formatFcfa(o.price || 0)}
            </p>
            {!o.is_quote && <p className="text-[11px] text-gray-400">par carte</p>}
            <ul className="mt-4 space-y-2 flex-1">
              {(o.options.features || []).map((f) => (
                <li key={f} className="flex gap-2 text-sm text-gray-600"><Check size={15} className="shrink-0 mt-0.5 text-[#2E7D32]" />{f}</li>
              ))}
            </ul>
            <button onClick={() => choose(o)}
              className="mt-5 h-11 rounded-xl text-sm font-bold transition-opacity"
              style={o.available || o.is_quote
                ? (hl ? { background: 'linear-gradient(135deg,#2E7D32,#1BC29A)', color: '#fff' } : { border: '1.5px solid #2E7D32', color: '#1B5E20' })
                : { background: '#F3F4F6', color: '#6B7280' }}>
              {o.is_quote ? 'Demander un devis' : o.available ? 'Choisir cette carte' : 'Rupture · être prévenu(e)'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
