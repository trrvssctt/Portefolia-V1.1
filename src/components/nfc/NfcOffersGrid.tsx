import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus, Loader2, Bell, ChevronDown, Sparkles } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';

interface OfferOptions {
  print_faces?: 'info' | 'both';
  allow_templates?: boolean;
  allow_colors?: boolean;
  allow_photo?: boolean;
  allow_logo?: boolean;
  needs_design?: boolean;
  features?: string[];
}

interface PublicOffer {
  code: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number | null;
  is_quote: boolean;
  available: boolean;
  options: OfferOptions;
}

// L'offre mise en avant sur la page de comparaison
const HIGHLIGHT = 'personnalisee';

// Miniature de la carte de chaque offre (CSS pur, pas d'image à charger)
function OfferVisual({ code }: { code: string }) {
  const base = 'absolute rounded-[10px] shadow-lg';
  const card = { width: 132, height: 83 };
  if (code === 'entreprise') {
    return (
      <div className="relative h-[104px] flex items-center justify-center">
        {[['#0F172A', -12, -6], ['#1E3A8A', 0, 0], ['#2E7D32', 12, 6]].map(([bg, x, r], i) => (
          <div key={i} className={`${base} transition-transform duration-500`} style={{ width: 112, height: 70, background: bg as string, transform: `translateX(${x}px) rotate(${r}deg)`, zIndex: i }}>
            {i === 2 && (
              <div className="p-2.5">
                <div className="w-6 h-6 rounded bg-white/90 mb-2" />
                <div className="h-1.5 w-16 rounded bg-white/80 mb-1" />
                <div className="h-1 w-10 rounded bg-white/50" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  const styles: Record<string, { bg: string; accent: string; logo: 'portefolia' | 'client' | 'photo' }> = {
    standard: { bg: 'linear-gradient(135deg,#1f2024,#121315)', accent: '#4cc12a', logo: 'portefolia' },
    personnalisee: { bg: 'linear-gradient(135deg,#7C3AED,#2563EB)', accent: '#FDE68A', logo: 'photo' },
    premium: { bg: 'linear-gradient(135deg,#111827,#3f3f46)', accent: '#E5B85C', logo: 'client' },
  };
  const s = styles[code] || styles.standard;
  return (
    <div className="relative h-[104px] flex items-center justify-center">
      <div className={`${base} overflow-hidden transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105`} style={{ ...card, background: s.bg }}>
        <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            {s.logo === 'photo'
              ? <div className="w-7 h-7 rounded-full border-2" style={{ borderColor: s.accent, background: 'linear-gradient(135deg,#fde68a,#f59e0b)' }} />
              : s.logo === 'client'
                ? <div className="px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider" style={{ color: s.accent, border: `1px solid ${s.accent}` }}>VOTRE LOGO</div>
                : <img src="/nfc-card/logo-p.webp" alt="" className="w-5 h-5 object-contain" />}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.accent} strokeWidth="2.5" strokeLinecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" /></svg>
          </div>
          <div>
            <div className="h-1.5 w-16 rounded mb-1" style={{ background: 'rgba(255,255,255,0.9)' }} />
            <div className="h-1 w-10 rounded mb-1.5" style={{ background: s.accent }} />
            <div className="h-0.5 w-20 rounded" style={{ background: 'rgba(255,255,255,0.45)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Lignes du comparatif, dérivées des options de chaque offre
const COMPARE: { label: string; has: (o: PublicOffer) => boolean | string }[] = [
  { label: 'Puce NFC reliée à votre portfolio', has: () => true },
  { label: 'Changer de portfolio sans réimprimer', has: () => true },
  { label: 'Statistiques des taps', has: () => true },
  { label: 'Logo Portefolia sur une face', has: (o) => o.options.print_faces === 'info' },
  { label: 'Choix du gabarit', has: (o) => !!o.options.allow_templates },
  { label: 'Choix des couleurs', has: (o) => !!o.options.allow_colors },
  { label: 'Votre photo', has: (o) => !!o.options.allow_photo },
  { label: 'Votre logo', has: (o) => !!o.options.allow_logo },
  { label: 'Design par notre équipe', has: (o) => !!o.options.needs_design },
  { label: 'Bon à tirer validé avant impression', has: () => true },
  { label: 'Une carte par membre de l\'équipe', has: (o) => o.code === 'entreprise' },
];

export default function NfcOffersGrid() {
  const navigate = useNavigate();
  const [showCompare, setShowCompare] = useState(false);
  const { data, isLoading, isError } = useQuery<{ offers: PublicOffer[] }>({
    queryKey: ['nfc-offers'],
    queryFn: async () => {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/offers`);
      if (!res.ok) throw new Error('offres indisponibles');
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#2E7D32]" /></div>;
  if (isError || !data) return <p className="text-center text-sm text-gray-500 py-8">Offres momentanément indisponibles. Réessayez dans un instant.</p>;

  const choose = (o: PublicOffer) => {
    if (o.is_quote) navigate('/nfc/devis');
    else if (!o.available) document.getElementById('liste-attente')?.scrollIntoView({ behavior: 'smooth' });
    else navigate(`/nfc/commander/${o.code}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {data.offers.map((o) => {
          const hl = o.code === HIGHLIGHT;
          const soldOut = !o.is_quote && !o.available;
          return (
            <div key={o.code}
              className={`group relative rounded-3xl p-[1.5px] transition-all duration-300 hover:-translate-y-1.5 ${hl ? 'lg:-mt-3 lg:mb-3' : ''}`}
              style={{ background: hl ? 'linear-gradient(160deg,#1BC29A,#2E7D32 45%,#1B5E20)' : '#EEF0EE' }}>
              {hl && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-md whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
                  <Sparkles size={11} /> Le plus choisi
                </span>
              )}
              <div className="relative h-full flex flex-col rounded-[calc(1.5rem-1.5px)] bg-white p-5 shadow-sm group-hover:shadow-xl transition-shadow">
                {soldOut && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: '#FEF3C7', color: '#92400E' }}>Rupture</span>
                )}
                <div className="rounded-2xl mb-4" style={{ background: hl ? 'linear-gradient(135deg,#F0FFF4,#E6FFFA)' : '#F7F8F7' }}>
                  <OfferVisual code={o.code} />
                </div>
                <p className="text-lg font-extrabold text-gray-900">{o.name}</p>
                {o.tagline && <p className="text-[13px] text-gray-500 mt-0.5 leading-snug min-h-[2.4rem]">{o.tagline}</p>}

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[28px] leading-none font-black tracking-tight" style={{ color: '#1B5E20' }}>
                    {o.is_quote ? 'Sur devis' : formatFcfa(o.price || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 h-4">{o.is_quote ? 'tarif selon le nombre de cartes' : 'par carte, impression incluse'}</p>

                <div className="my-4 h-px bg-gray-100" />
                <ul className="space-y-2.5 flex-1">
                  {(o.options.features || []).map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px] text-gray-600 leading-snug">
                      <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center" style={{ background: '#E8F5E9' }}>
                        <Check size={11} strokeWidth={3} className="text-[#2E7D32]" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button onClick={() => choose(o)}
                  className="mt-6 h-11 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  style={soldOut
                    ? { border: '1.5px solid #F59E0B', color: '#92400E', background: '#FFFBEB' }
                    : hl
                      ? { background: 'linear-gradient(135deg,#2E7D32,#1BC29A)', color: '#fff', boxShadow: '0 8px 20px rgba(46,125,50,0.28)' }
                      : { border: '1.5px solid #2E7D32', color: '#1B5E20', background: '#fff' }}>
                  {soldOut && <Bell size={14} />}
                  {o.is_quote ? 'Demander un devis' : soldOut ? 'Me prévenir du retour' : 'Choisir cette carte'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparatif détaillé */}
      <div className="text-center">
        <button onClick={() => setShowCompare((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E7D32] hover:text-[#1B5E20]">
          {showCompare ? 'Masquer le comparatif' : 'Comparer les offres en détail'}
          <ChevronDown size={16} className={`transition-transform ${showCompare ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {showCompare && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-semibold text-gray-500 px-5 py-3 w-[34%]" />
                {data.offers.map((o) => (
                  <th key={o.code} className="px-3 py-3 text-center">
                    <span className={`font-extrabold ${o.code === HIGHLIGHT ? 'text-[#1B5E20]' : 'text-gray-900'}`}>{o.name}</span>
                    <span className="block text-xs font-semibold text-gray-400">{o.is_quote ? 'Sur devis' : formatFcfa(o.price || 0)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.label} className={i % 2 ? 'bg-gray-50/60' : ''}>
                  <td className="px-5 py-2.5 text-gray-700">{row.label}</td>
                  {data.offers.map((o) => (
                    <td key={o.code} className={`px-3 py-2.5 text-center ${o.code === HIGHLIGHT ? 'bg-[#F0FFF4]/60' : ''}`}>
                      {row.has(o)
                        ? <Check size={16} strokeWidth={3} className="inline text-[#2E7D32]" aria-label="inclus" />
                        : <Minus size={16} className="inline text-gray-300" aria-label="non inclus" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
