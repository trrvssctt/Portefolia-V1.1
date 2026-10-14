import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, X, Search, Send, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';

type QuoteStatus = 'devis_demande' | 'devis_envoye' | 'devis_accepte' | 'devis_refuse' | 'annule';

interface AdminQuote {
  id: number;
  reference: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  quantity: number;
  desired_date: string | null;
  message: string | null;
  status: QuoteStatus;
  stock_type: 'logo_printed' | 'blank' | null;
  dedicated_supplier: number;
  price_per_card: number | null;
  total_amount: number | null;
  valid_until: string | null;
  admin_message: string | null;
  decline_reason: string | null;
  order_reference: string | null;
  order_status: string | null;
  business_name: string | null;
  created_at: string;
}

const META: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  devis_demande: { label: 'À chiffrer', color: '#B45309', bg: '#FEF3C7' },
  devis_envoye: { label: 'Envoyé', color: '#1D4ED8', bg: '#DBEAFE' },
  devis_accepte: { label: 'Accepté', color: '#166534', bg: '#DCFCE7' },
  devis_refuse: { label: 'Refusé', color: '#B91C1C', bg: '#FEE2E2' },
  annule: { label: 'Annulé', color: '#6B7280', bg: '#F3F4F6' },
};
const BASE = `${NFC_API_BASE}/api/admin/nfc-quotes`;
const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32]';

function authHeaders(json = false): Record<string, string> {
  const t = localStorage.getItem('token');
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

function dateFr(d: string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function QuoteDetail({ quote, onClose }: { quote: AdminQuote; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const editable = quote.status === 'devis_demande' || quote.status === 'devis_envoye';
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [f, setF] = useState({
    price_per_card: quote.price_per_card ? String(quote.price_per_card) : '',
    valid_until: quote.valid_until ? String(quote.valid_until).slice(0, 10) : in30,
    admin_message: quote.admin_message || '',
    stock_type: quote.stock_type || 'blank',
    dedicated_supplier: !!quote.dedicated_supplier,
  });
  const total = (Number(f.price_per_card) || 0) * quote.quantity;

  const call = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) => {
      const r = await fetch(`${BASE}/${quote.id}/${path}`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(body || {}) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Action impossible');
      return d;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'nfc-quotes'] });
      toast({ title: v.path === 'send' ? `✓ Devis ${quote.reference} envoyé au client` : `✓ Devis ${quote.reference} annulé` });
      onClose();
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <aside className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{quote.reference} · {quote.company}</p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: META[quote.status].color, background: META[quote.status].bg }}>{META[quote.status].label}</span>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5 text-sm">
          <dl className="divide-y divide-gray-100 border-y border-gray-100">
            {([
              ['Contact', `${quote.contact_name} · ${quote.email} · ${quote.phone}`],
              ['Compte Business', quote.business_name || '—'],
              ['Nombre de cartes', String(quote.quantity)],
              ['Date souhaitée', dateFr(quote.desired_date)],
              ['Demandé le', dateFr(quote.created_at)],
              ...(quote.order_reference ? [['Commande', `${quote.order_reference} (${quote.order_status})`]] : []),
              ...(quote.decline_reason ? [['Motif du refus', quote.decline_reason]] : []),
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-gray-500 shrink-0">{k}</dt><dd className="font-medium text-right break-all">{v}</dd></div>
            ))}
          </dl>
          {quote.message && <p className="bg-gray-50 rounded-xl px-3 py-2 text-gray-700 whitespace-pre-line">« {quote.message} »</p>}
          {quote.order_reference && (
            <Link to={`/admin/nfc-preorders?ref=${quote.order_reference}`} className="inline-block font-semibold text-[#2E7D32]">Ouvrir la commande {quote.order_reference}</Link>
          )}

          {editable && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{quote.status === 'devis_envoye' ? 'Modifier et renvoyer le devis' : 'Chiffrer et envoyer le devis'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Prix par carte (F CFA)</label>
                  <input type="number" min={100} className={inputCls} value={f.price_per_card} onChange={(e) => setF({ ...f, price_per_card: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Valable jusqu'au</label>
                  <input type="date" className={inputCls} value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Type de carte</label>
                  <select className={inputCls} value={f.stock_type} onChange={(e) => setF({ ...f, stock_type: e.target.value as 'blank' | 'logo_printed' })}>
                    <option value="blank">Vierge (logo de l'entreprise)</option>
                    <option value="logo_printed">Logo Portefolia imprimé</option>
                  </select></div>
                <label className="flex items-end gap-2 text-xs text-gray-700 pb-2">
                  <input type="checkbox" className="accent-[#2E7D32]" checked={f.dedicated_supplier} onChange={(e) => setF({ ...f, dedicated_supplier: e.target.checked })} />
                  Commande fournisseur dédiée {quote.quantity >= 100 ? '(recommandé ≥ 100 cartes)' : ''}
                </label>
              </div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Message au client (optionnel)</label>
                <textarea rows={3} maxLength={2000} value={f.admin_message} onChange={(e) => setF({ ...f, admin_message: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] resize-none" placeholder="Délais, conditions, ce qui est inclus…" /></div>
              <p className="rounded-xl px-3 py-2 font-bold" style={{ background: '#F0FFF4', color: '#1B5E20' }}>Total : {formatFcfa(total)} ({quote.quantity} × {formatFcfa(Number(f.price_per_card) || 0)})</p>
              {f.dedicated_supplier && <p className="text-[11px] text-gray-500">Commande dédiée : générez un lot de codes « vierge » de {quote.quantity} cartes dans « Stock & codes NFC » pour le fournisseur.</p>}
              <div className="flex gap-2">
                <button onClick={() => call.mutate({ path: 'send', body: { ...f, price_per_card: Number(f.price_per_card) } })} disabled={call.isPending || !Number(f.price_per_card)}
                  className="flex-1 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
                  {call.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer le devis
                </button>
                <button onClick={() => { if (window.confirm('Annuler ce devis ?')) call.mutate({ path: 'cancel' }); }} disabled={call.isPending}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 flex items-center gap-1.5"><Ban size={14} /> Annuler</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function NfcQuotesPage() {
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const [status, setStatus] = useState<'' | QuoteStatus>('');
  const [search, setSearch] = useState(ref);
  const [q, setQ] = useState(ref);
  const [open, setOpen] = useState<AdminQuote | null>(null);

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const { data, isLoading, isError } = useQuery<{ total: number; by_status: Record<QuoteStatus, number>; liste: AdminQuote[] }>({
    queryKey: ['admin', 'nfc-quotes', status, q],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (q) p.set('q', q);
      const r = await fetch(`${BASE}?${p.toString()}`, { headers: authHeaders() });
      if (!r.ok) throw new Error('Chargement impossible');
      return r.json();
    },
  });

  // Lien « ?ref=PF-DEV-0001 » des e-mails admin : ouvre directement le devis
  useEffect(() => {
    if (!ref || open || !data) return;
    const hit = data.liste.find((x) => x.reference === ref);
    if (hit) setOpen(hit);
  }, [ref, data, open]);

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <div style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Building2 size={18} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Devis Entreprise</h1>
            <p className="text-white/70 text-sm">Demandes de cartes pour les équipes : chiffrage, envoi, suivi</p>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([['', 'Tous'], ...Object.entries(META).map(([k, m]) => [k, m.label])] as [string, string][]).map(([k, label]) => {
              const n = k ? data?.by_status?.[k as QuoteStatus] ?? 0 : undefined;
              return (
                <button key={k || 'all'} onClick={() => setStatus(k as '' | QuoteStatus)}
                  className="h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border"
                  style={status === k ? { background: '#2E7D32', color: '#fff', borderColor: '#2E7D32' } : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}>
                  {label}{n ? ` (${n})` : ''}
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Référence, entreprise, contact…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#2E7D32]" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="text-left text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#2E7D32' }}>
              <th className="px-4 py-3">Devis</th><th className="px-4 py-3">Entreprise</th><th className="px-4 py-3">Cartes</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Date</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="animate-spin inline text-[#2E7D32]" /></td></tr>
                : isError ? <tr><td colSpan={6} className="py-12 text-center text-red-500">Erreur de chargement</td></tr>
                : (data?.liste ?? []).length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-gray-500">Aucun devis.</td></tr>
                : data!.liste.map((x) => (
                  <tr key={x.id} onClick={() => setOpen(x)} className="border-t border-gray-50 hover:bg-green-50/40 cursor-pointer">
                    <td className="px-4 py-3 font-mono font-semibold">{x.reference}</td>
                    <td className="px-4 py-3"><p className="font-medium">{x.company}</p><p className="text-xs text-gray-400">{x.contact_name} · {x.email}</p></td>
                    <td className="px-4 py-3">{x.quantity}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{x.total_amount ? formatFcfa(x.total_amount) : '—'}</td>
                    <td className="px-4 py-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: META[x.status].color, background: META[x.status].bg }}>{META[x.status].label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{dateFr(x.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {open && <QuoteDetail quote={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
