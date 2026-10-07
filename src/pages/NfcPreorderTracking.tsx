import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wifi, Copy, Check, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, ExternalLink, Home, MessageCircle, LayoutDashboard } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';
import PaymentProofUpload from '@/components/payment/PaymentProofUpload';

type Status = 'pending_payment' | 'payment_submitted' | 'paid' | 'rejected' | 'expired' | 'cancelled' | 'converted';

interface PublicPreorder {
  reference: string;
  status: Status;
  full_name: string;
  card_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  wave_transaction_id: string | null;
  has_proof: boolean;
  rejection_reason: string | null;
  created_at: string;
  expiry_hours: number;
  payment: { wave_number: string; wave_link: string | null };
}

const SUPPORT_WHATSAPP = '221781311371';

function waSupportLink(reference?: string) {
  const text = reference ? `Bonjour, je vous contacte au sujet de ma précommande ${reference}.` : 'Bonjour, une question sur la carte NFC Portefolia.';
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

// Actions toujours disponibles en bas de page : le client n'est jamais bloqué
function PageActions({ reference }: { reference?: string }) {
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Link to="/" className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
        <Home size={15} /> Accueil
      </Link>
      <Link to={loggedIn ? '/dashboard' : '/auth'} className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
        <LayoutDashboard size={15} /> {loggedIn ? 'Mon espace' : 'Créer mon portfolio'}
      </Link>
      <a href={waSupportLink(reference)} target="_blank" rel="noopener noreferrer"
        className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-[#2E7D32] hover:bg-green-50 flex items-center justify-center gap-2">
        <MessageCircle size={15} /> Nous écrire
      </a>
    </div>
  );
}

const STEPS = ['Précommande reçue', 'Paiement déclaré', 'Paiement confirmé', 'Fabrication & livraison'];

function stepIndex(s: Status): number {
  switch (s) {
    case 'pending_payment': return 0;
    case 'rejected': return 0;
    case 'payment_submitted': return 1;
    case 'paid': return 2;
    case 'converted': return 3;
    default: return -1;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label={`Copier ${label}`}
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}
      className="shrink-0 h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1">
      {done ? <Check size={13} className="text-[#2E7D32]" /> : <Copy size={13} />} {done ? 'Copié' : 'Copier'}
    </button>
  );
}

function Timeline({ status }: { status: Status }) {
  const current = stepIndex(status);
  if (current < 0) return null;
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((label, i) => {
        const done = i < current || (i === current && (status === 'paid' || status === 'converted'));
        const active = i === current;
        return (
          <li key={label} className="flex flex-col items-center text-center gap-1.5">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={done ? { background: '#2E7D32', color: '#fff' } : active ? { background: '#E8F5E9', color: '#1B5E20', border: '2px solid #2E7D32' } : { background: '#F3F4F6', color: '#9CA3AF' }}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight ${active || done ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PaymentForm({ reference, token, hasProof, onDone }: { reference: string; token: string; hasProof: boolean; onDone: () => void }) {
  const [proofOk, setProofOk] = useState(hasProof);
  const [tx, setTx] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (tx.trim().length < 6) { setError("Saisissez l'identifiant de la transaction Wave."); return; }
    if (!proofOk) { setError("Ajoutez la capture d'écran de votre paiement Wave."); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders/${encodeURIComponent(reference)}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, wave_transaction_id: tx.trim(), wave_sender_phone: phone.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || 'Une erreur est survenue. Veuillez réessayer.'); return; }
      onDone();
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-gray-900">J'ai payé avec Wave</p>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Identifiant de la transaction Wave</label>
        <input value={tx} onChange={(e) => { setTx(e.target.value); setError(''); }} placeholder="Ex. T_ABCD1234EFGH"
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm font-mono uppercase outline-none focus:border-[#2E7D32]" />
        <p className="text-[11px] text-gray-400 mt-1">Dans l'application Wave : ouvrez le transfert dans l'historique, l'identifiant y figure.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Numéro Wave utilisé (optionnel)</label>
        <input type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} placeholder="77 123 45 67"
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32]" />
      </div>
      <PaymentProofUpload
        uploadUrl={`${NFC_API_BASE}/api/nfc/preorders/${encodeURIComponent(reference)}/proof`}
        extraFields={{ token }}
        alreadyUploaded={hasProof}
        onUploaded={() => { setProofOk(true); setError(''); }}
      />
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
      <button type="submit" disabled={loading || !proofOk}
        className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70"
        style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
        {loading && <Loader2 size={16} className="animate-spin" />} Déclarer mon paiement
      </button>
    </form>
  );
}

export default function NfcPreorderTracking() {
  const { reference = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const qc = useQueryClient();
  const queryKey = ['nfc-preorder', reference, token];

  const { data: p, isLoading, isError } = useQuery<PublicPreorder>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error('not found');
      return res.json();
    },
    retry: false,
  });

  return (
    <div className="min-h-screen" style={{ background: '#F9F9F9', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #1BC29A 100%)' }}>
        <div className="max-w-xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Wifi size={18} className="text-white" /></div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white leading-tight">Ma précommande NFC</h1>
            {p && <p className="text-white/80 text-xs font-mono">{p.reference}</p>}
          </div>
          <Link to="/" className="h-9 px-3 rounded-xl border border-white/40 text-white text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5">
            <Home size={14} /> Accueil
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#2E7D32]" /></div>
        ) : isError || !p ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-amber-500" />
            <p className="font-semibold text-gray-900">Précommande introuvable</p>
            <p className="text-sm text-gray-500">Le lien est incomplet ou invalide. Utilisez le bouton de l'e-mail de confirmation que nous vous avons envoyé.</p>
            <Link to="/nfc-types#precommande" className="inline-block text-sm font-semibold text-[#2E7D32]">Faire une précommande</Link>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
              <Timeline status={p.status} />
              <dl className="text-sm divide-y divide-gray-100 border-y border-gray-100">
                {[
                  ['Référence', p.reference],
                  ['Nom imprimé sur la carte', p.card_name],
                  ['Quantité', `${p.quantity} carte${p.quantity > 1 ? 's' : ''}`],
                  ['Montant total', formatFcfa(p.total_amount)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2">
                    <dt className="text-gray-500">{k}</dt><dd className="font-semibold text-gray-900 text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {p.status === 'rejected' && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex gap-3">
                <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800">Paiement non confirmé</p>
                  <p className="text-red-700 mt-0.5">Motif : {p.rejection_reason || 'transaction introuvable ou montant différent'}. Vérifiez votre transaction puis déclarez-la à nouveau.</p>
                </div>
              </div>
            )}

            {(p.status === 'pending_payment' || p.status === 'rejected') && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-900">Payer avec Wave</p>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Payez <strong className="text-gray-900">{formatFcfa(p.total_amount)}</strong> en scannant le QR code, ou par transfert au numéro ci-dessous.</li>
                    <li>Mettez la référence <strong className="text-gray-900">{p.reference}</strong> en note si possible.</li>
                    <li>Faites une capture d'écran du reçu Wave, puis remplissez le formulaire.</li>
                  </ol>
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative">
                      <div className="bg-white rounded-2xl shadow-md border-4 border-[#1DC4FF]/30 p-3">
                        <img src="/qr_code_marchant_wave.png" alt="QR code marchand Wave Portefolia" className="w-44 h-44 object-contain" />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white border border-gray-200 pl-1 pr-3 py-1 rounded-full shadow">
                        <img src="/logo_wave.png" alt="" className="w-6 h-6 rounded-full" />
                        <span className="text-xs font-bold text-gray-800">Wave</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">Scannez avec l'application Wave (onglet <strong>Scanner</strong>), puis saisissez <strong>{formatFcfa(p.total_amount)}</strong>.</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: '#EEF6FF' }}>
                    <div><p className="text-[11px] text-gray-500">Numéro Wave</p><p className="font-bold text-gray-900">{p.payment.wave_number}</p></div>
                    <CopyButton value={p.payment.wave_number.replace(/\s/g, '')} label="le numéro Wave" />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 bg-gray-50">
                    <div><p className="text-[11px] text-gray-500">Référence à mettre en note</p><p className="font-bold font-mono text-gray-900">{p.reference}</p></div>
                    <CopyButton value={p.reference} label="la référence" />
                  </div>
                  {p.payment.wave_link && (
                    <a href={p.payment.wave_link} target="_blank" rel="noopener noreferrer"
                      className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: '#1DC4FF' }}>
                      Payer avec Wave <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <PaymentForm reference={p.reference} token={token} hasProof={p.has_proof} onDone={() => qc.invalidateQueries({ queryKey })} />
                </div>
                {p.status === 'pending_payment' && (
                  <p className="text-[11px] text-gray-400 text-center">Sans paiement sous {Math.round(p.expiry_hours / 24)} jours, la précommande est annulée automatiquement.</p>
                )}
              </section>
            )}

            {p.status === 'payment_submitted' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex gap-3">
                  <Clock size={22} className="text-amber-500 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Merci, votre paiement est en cours de vérification</p>
                    <p className="text-gray-500 mt-0.5">Transaction Wave déclarée : <span className="font-mono font-semibold text-gray-700">{p.wave_transaction_id}</span>. Vous recevrez une confirmation par e-mail sous 24 h ouvrées. Vous pouvez fermer cette page : le lien de l'e-mail permet d'y revenir à tout moment.</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                  Erreur dans l'identifiant de transaction ? <a href={waSupportLink(p.reference)} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2E7D32] underline">Écrivez-nous sur WhatsApp</a>, nous corrigerons.
                </p>
                <p className="text-sm text-gray-600">En attendant, préparez le portfolio qui s'affichera quand on approchera un téléphone de votre carte.</p>
              </div>
            )}

            {(p.status === 'paid' || p.status === 'converted') && (
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-[#2E7D32]" />
                <p className="font-semibold text-gray-900">Paiement confirmé, votre carte est réservée !</p>
                <p className="text-sm text-gray-500">Nous lançons la fabrication par lots et vous informons à chaque étape. En attendant, préparez le portfolio qui s'affichera quand on approchera un téléphone de votre carte.</p>
                <Link to="/dashboard" className="inline-flex h-11 px-6 rounded-xl text-sm font-bold text-white items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
                  Préparer mon portfolio
                </Link>
              </div>
            )}

            {(p.status === 'expired' || p.status === 'cancelled') && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center space-y-3">
                <XCircle size={36} className="mx-auto text-gray-400" />
                <p className="font-semibold text-gray-900">
                  {p.status === 'expired' ? 'Précommande annulée : paiement non reçu à temps' : 'Précommande annulée'}
                </p>
                {p.status === 'cancelled' && p.rejection_reason && <p className="text-sm text-gray-500">Motif : {p.rejection_reason}</p>}
                <Link to="/nfc-types#precommande" className="inline-flex h-11 px-6 rounded-xl text-sm font-bold text-white items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
                  Refaire une précommande
                </Link>
              </div>
            )}

          </>
        )}

        <PageActions reference={p?.reference} />
        <p className="text-xs text-center text-gray-400">Une question ? WhatsApp +221 78 131 13 71 · support@portefolia.tech</p>
      </main>
    </div>
  );
}
