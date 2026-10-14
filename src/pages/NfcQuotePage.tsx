import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';

interface PublicQuote {
  reference: string;
  company: string;
  contact_name: string;
  quantity: number;
  status: 'devis_demande' | 'devis_envoye' | 'devis_accepte' | 'devis_refuse' | 'annule';
  price_per_card: number | null;
  total_amount: number | null;
  valid_until: string | null;
  admin_message: string | null;
  expired?: boolean;
  tracking_url?: string;
}

function pathOf(url: string) {
  try { const u = new URL(url); return u.pathname + u.search; } catch { return url; }
}

// Devis Entreprise : consultation, acceptation (→ commande et paiement Wave) ou refus
export default function NfcQuotePage() {
  const { reference = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const queryKey = ['nfc-quote', reference, token];

  const { data: q, isLoading, isError } = useQuery<PublicQuote>({
    queryKey,
    queryFn: async () => {
      const r = await fetch(`${NFC_API_BASE}/api/nfc/quotes/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`);
      if (!r.ok) throw new Error('not found');
      return r.json();
    },
    retry: false,
  });

  const act = async (path: 'accept' | 'decline') => {
    if (path === 'accept' && !window.confirm('Accepter ce devis ? La commande sera créée et vous recevrez les instructions de paiement Wave.')) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${NFC_API_BASE}/api/nfc/quotes/${encodeURIComponent(reference)}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason.trim() || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error || 'Action impossible.'); return; }
      if (path === 'accept' && d.tracking_url) { navigate(pathOf(d.tracking_url)); return; }
      qc.invalidateQueries({ queryKey });
    } catch {
      setError('Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1BC29A 100%)' }}>
        <div className="max-w-xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Building2 size={18} className="text-white" /></div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Devis cartes NFC Entreprise</h1>
            {q && <p className="text-white/80 text-xs font-mono">{q.reference}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#2E7D32]" /></div>
        ) : isError || !q ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
            <AlertTriangle className="mx-auto text-amber-500" />
            <p className="text-sm text-gray-600">Devis introuvable. Utilisez le lien reçu par e-mail.</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <dl className="text-sm divide-y divide-gray-100">
                {[
                  ['Entreprise', q.company],
                  ['Contact', q.contact_name],
                  ['Nombre de cartes', String(q.quantity)],
                  ...(q.price_per_card ? [['Prix par carte', formatFcfa(q.price_per_card)], ['Total', formatFcfa(q.total_amount || 0)]] : []),
                  ...(q.valid_until && q.status === 'devis_envoye' ? [['Valable jusqu\'au', new Date(q.valid_until).toLocaleDateString('fr-FR')]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-gray-500">{k}</dt><dd className="font-semibold text-gray-900 text-right">{v}</dd></div>
                ))}
              </dl>
              {q.admin_message && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 whitespace-pre-line">{q.admin_message}</p>}
            </section>

            {q.status === 'devis_demande' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-3 text-sm">
                <Clock size={20} className="text-amber-500 shrink-0" />
                <p className="text-gray-600">Votre demande est en cours de chiffrage. Vous recevrez le devis par e-mail sous 48 h ouvrées.</p>
              </div>
            )}

            {q.status === 'devis_envoye' && q.expired && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Ce devis a expiré. Écrivez-nous pour le renouveler : support@portefolia.tech.</div>
            )}

            {q.status === 'devis_envoye' && !q.expired && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-sm text-gray-600">En acceptant, la commande de {q.quantity} cartes est créée. Vous payez ensuite par Wave, puis renseignez les membres de l'équipe et validez le bon à tirer.</p>
                {!declining ? (
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button onClick={() => act('accept')} disabled={busy}
                      className="h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Accepter le devis
                    </button>
                    <button onClick={() => setDeclining(true)} disabled={busy} className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Refuser</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel) : budget, délai…"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDeclining(false)} disabled={busy} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold">Retour</button>
                      <button onClick={() => act('decline')} disabled={busy} className="h-10 rounded-xl bg-red-600 text-white text-sm font-bold">Confirmer le refus</button>
                    </div>
                  </div>
                )}
                {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
              </section>
            )}

            {q.status === 'devis_accepte' && (
              <div className="bg-white rounded-2xl border border-green-100 p-5 text-center space-y-3">
                <CheckCircle2 size={36} className="mx-auto text-[#2E7D32]" />
                <p className="font-semibold text-gray-900">Devis accepté</p>
                {q.tracking_url && (
                  <Link to={pathOf(q.tracking_url)} className="inline-flex h-11 px-6 rounded-xl text-sm font-bold text-white items-center" style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>Suivre la commande</Link>
                )}
              </div>
            )}

            {(q.status === 'devis_refuse' || q.status === 'annule') && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-3 text-sm">
                <XCircle size={20} className="text-gray-400 shrink-0" />
                <p className="text-gray-600">{q.status === 'devis_refuse' ? 'Vous avez refusé ce devis.' : 'Ce devis a été annulé.'} Une nouvelle demande reste possible à tout moment.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
