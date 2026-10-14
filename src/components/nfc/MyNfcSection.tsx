import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wifi, Loader2, ShieldOff, ChevronRight } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';
import { orderStatusMeta } from './orderStatus';

interface MyOrder {
  id: number;
  reference: string;
  offer_name: string | null;
  status: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  tracking_url: string;
  items: { preview_back_url: string | null }[];
}
interface MyCard {
  id: number;
  code: string;
  statut: string;
  portfolio_id: number | null;
  portfolio_title: string | null;
  tap_count: number;
  last_tap_at: string | null;
  deactivation_reason: string | null;
}
interface Portfolio { id: number; titre: string; url_slug: string }

const CARD_LABEL: Record<string, string> = {
  attribuee: 'En préparation', imprimee: 'Active', livree: 'Active', desactivee: 'Désactivée',
};

function authHeaders(json = false): Record<string, string> {
  const t = localStorage.getItem('token');
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

// Chemin relatif d'un lien de suivi absolu (même site)
function trackingPath(url: string) {
  try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
}

// Commandes de cartes par offre et cartes physiques du client (page Cartes NFC)
export default function MyNfcSection() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const orders = useQuery<{ orders: MyOrder[] }>({
    queryKey: ['nfc', 'my-orders'],
    queryFn: async () => {
      const r = await fetch(`${NFC_API_BASE}/api/nfc/orders/mine`, { headers: authHeaders() });
      if (!r.ok) throw new Error('commandes indisponibles');
      return r.json();
    },
  });
  const cards = useQuery<{ cards: MyCard[]; portfolios: Portfolio[] }>({
    queryKey: ['nfc', 'my-cards'],
    queryFn: async () => {
      const r = await fetch(`${NFC_API_BASE}/api/nfc/cards/mine`, { headers: authHeaders() });
      if (!r.ok) throw new Error('cartes indisponibles');
      return r.json();
    },
  });

  const act = async (cardId: number, path: string, body: unknown, method = 'PUT') => {
    setBusy(cardId);
    setError('');
    try {
      const r = await fetch(`${NFC_API_BASE}/api/nfc/cards/mine/${cardId}${path}`, { method, headers: authHeaders(true), body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Action impossible');
      await qc.invalidateQueries({ queryKey: ['nfc', 'my-cards'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const declareLost = (c: MyCard) => {
    if (!window.confirm(`Désactiver la carte ${c.code} ? Elle n'ouvrira plus votre portfolio. Contactez-nous pour la réactiver ou la remplacer.`)) return;
    act(c.id, '/lost', { reason: 'Perte ou vol déclaré par le titulaire' }, 'POST');
  };

  const myOrders = orders.data?.orders ?? [];
  const myCards = cards.data?.cards ?? [];
  const portfolios = cards.data?.portfolios ?? [];
  if (orders.isLoading || cards.isLoading) return null;
  if (!myOrders.length && !myCards.length) return null;

  return (
    <div className="space-y-4">
      {myCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Mes cartes NFC</p>
          {myCards.map((c) => (
            <div key={c.id} className="bg-white border border-[#E4E4E7] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.statut === 'desactivee' ? '#FEE2E2' : '#E8F5E9' }}>
                {c.statut === 'desactivee' ? <ShieldOff size={18} className="text-red-600" /> : <Wifi size={18} className="text-[#2E7D32]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#09090B]">Carte <span className="font-mono">{c.code}</span> · {CARD_LABEL[c.statut] || c.statut}</p>
                <p className="text-xs text-[#71717A]">{c.tap_count} tap{c.tap_count > 1 ? 's' : ''}{c.last_tap_at ? ` · dernier le ${new Date(c.last_tap_at).toLocaleDateString('fr-FR')}` : ''}</p>
              </div>
              {c.statut !== 'desactivee' && (
                <div className="flex items-center gap-2">
                  <select value={c.portfolio_id ?? ''} disabled={busy === c.id}
                    onChange={(e) => act(c.id, '', { portfolio_id: Number(e.target.value) })}
                    className="h-9 px-2 rounded-lg border border-[#E4E4E7] text-xs max-w-[180px]" title="Portfolio ouvert par la carte">
                    {portfolios.map((p) => <option key={p.id} value={p.id}>{p.titre || p.url_slug}</option>)}
                  </select>
                  <button onClick={() => declareLost(c)} disabled={busy === c.id}
                    className="h-9 px-2.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50">
                    {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : 'Perdue ?'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {myOrders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">Mes commandes de cartes</p>
          {myOrders.map((o) => {
            const m = orderStatusMeta(o.status);
            return (
              <Link key={o.id} to={trackingPath(o.tracking_url)}
                className="bg-white border border-[#E4E4E7] rounded-xl p-3 flex items-center gap-3 hover:border-[#2E7D32] transition-colors">
                {o.items[0]?.preview_back_url
                  ? <img src={o.items[0].preview_back_url} alt="" className="w-16 h-10 rounded object-cover shrink-0" loading="lazy" />
                  : <div className="w-16 h-10 rounded bg-gray-100 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#09090B]">Carte {o.offer_name || 'Standard'} · <span className="font-mono text-xs">{o.reference}</span></p>
                  <p className="text-xs text-[#71717A]">{o.quantity} carte{o.quantity > 1 ? 's' : ''} · {formatFcfa(o.total_amount)}</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: m.color, background: m.bg }}>{m.client}</span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
