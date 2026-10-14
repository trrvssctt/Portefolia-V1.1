import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wifi, Copy, Check, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, ExternalLink, Home, MessageCircle, LayoutDashboard, Palette, Printer, FileCheck2 } from 'lucide-react';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';
import PaymentProofUpload from '@/components/payment/PaymentProofUpload';

type Status = 'pending_payment' | 'payment_submitted' | 'paid' | 'rejected' | 'expired' | 'cancelled' | 'converted'
  | 'design_en_cours' | 'bat_envoye' | 'bat_valide' | 'en_impression' | 'prete' | 'livree';

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
  offer_name?: string;
  previews?: { front: string | null; back: string | null } | null;
  bat_comment?: string | null;
  bat_revision?: number;
  team?: TeamData | null;
  rejection_reason: string | null;
  created_at: string;
  expiry_hours: number;
  payment: { wave_number: string; wave_link: string | null };
}

interface TeamInfo { name?: string; title?: string; phone?: string; email?: string }
interface TeamData {
  editable: boolean;
  items: { id: number; position: number; holder_user_id: number | null; info: TeamInfo }[];
  members: { user_id: number; name: string; email: string; poste: string }[];
}

const SUPPORT_WHATSAPP = '221781311371';

// Commande Entreprise : une carte par membre, modifiable jusqu'à l'envoi du bon à tirer
function TeamEditor({ reference, token, team, onSaved }: { reference: string; token: string; team: TeamData; onSaved: () => void }) {
  const [rows, setRows] = useState(() => team.items.map((i) => ({ ...i, info: { name: '', title: '', phone: '', email: '', ...i.info } })));
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);
  const filled = rows.filter((r) => (r.info.name || '').trim().length >= 2).length;

  const update = (id: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const pickMember = (id: number, userId: string) => {
    const m = team.members.find((x) => String(x.user_id) === userId);
    update(id, { holder_user_id: m ? m.user_id : null, info: m ? { ...rows.find((r) => r.id === id)!.info, name: m.name, title: m.poste, email: m.email } : rows.find((r) => r.id === id)!.info });
  };
  const save = async (id: number) => {
    const r = rows.find((x) => x.id === id)!;
    setSaving(id);
    setMsg(null);
    try {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders/${encodeURIComponent(reference)}/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, member_user_id: r.holder_user_id ?? null, info: r.info }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ id, ok: false, text: d?.error || 'Enregistrement impossible.' }); return; }
      setMsg({ id, ok: true, text: 'Enregistré' });
      onSaved();
    } catch {
      setMsg({ id, ok: false, text: 'Connexion impossible.' });
    } finally {
      setSaving(null);
    }
  };
  const field = 'h-9 px-3 rounded-lg border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32] w-full';

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold text-gray-900">Cartes de l'équipe</p>
        <p className="text-xs text-gray-500">{filled}/{rows.length} renseignée{filled > 1 ? 's' : ''}</p>
      </div>
      <p className="text-xs text-gray-500">{team.editable ? 'Choisissez le membre et vérifiez les infos imprimées de chaque carte. Modifiables jusqu\'à l\'envoi du bon à tirer.' : 'Les infos sont figées : le bon à tirer est en cours.'}</p>
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-700">Carte {r.position}</span>
            {team.members.length > 0 && (
              <select disabled={!team.editable} value={r.holder_user_id ?? ''} onChange={(e) => pickMember(r.id, e.target.value)} className="h-8 px-2 rounded-lg border border-gray-200 text-xs max-w-[220px]">
                <option value="">Personne hors compte</option>
                {team.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>)}
              </select>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {(['name', 'title', 'phone', 'email'] as const).map((k) => (
              <input key={k} disabled={!team.editable} className={field} value={r.info[k] || ''}
                placeholder={{ name: 'Nom à imprimer', title: 'Poste', phone: 'Téléphone', email: 'E-mail' }[k]}
                onChange={(e) => update(r.id, { info: { ...r.info, [k]: e.target.value } })} />
            ))}
          </div>
          {team.editable && (
            <div className="flex items-center justify-end gap-2">
              {msg && msg.id === r.id && <span className={`text-xs ${msg.ok ? 'text-[#2E7D32]' : 'text-red-600'}`}>{msg.text}</span>}
              <button onClick={() => save(r.id)} disabled={saving === r.id} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold">
                {saving === r.id ? <Loader2 size={12} className="animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

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

const STEPS = ['Paiement', 'Bon à tirer', 'Impression', 'Prête', 'Livrée'];

// Étape en cours dans la frise ; « done » si l'étape elle-même est terminée
function stepState(s: Status): { index: number; done: boolean } {
  switch (s) {
    case 'pending_payment': case 'rejected': case 'payment_submitted': return { index: 0, done: false };
    case 'paid': case 'design_en_cours': case 'bat_envoye': return { index: 1, done: false };
    case 'bat_valide': return { index: 1, done: true };
    case 'en_impression': case 'converted': return { index: 2, done: false };
    case 'prete': return { index: 3, done: true };
    case 'livree': return { index: 4, done: true };
    default: return { index: -1, done: false };
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
  const { index: current, done: currentDone } = stepState(status);
  if (current < 0) return null;
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {STEPS.map((label, i) => {
        const done = i < current || (i === current && currentDone);
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

// Validation du bon à tirer par le client
function BatReview({ reference, token, previews, revision, onDone }: {
  reference: string; token: string; previews: { front: string | null; back: string | null } | null; revision: number; onDone: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'changes'>('view');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async (path: 'approve' | 'changes') => {
    if (path === 'changes' && comment.trim().length < 3) { setError('Décrivez la correction souhaitée.'); return; }
    if (path === 'approve' && !window.confirm('Valider ce bon à tirer ? La carte sera imprimée telle quelle.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${NFC_API_BASE}/api/nfc/preorders/${encodeURIComponent(reference)}/bat/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || 'Action impossible, réessayez.'); return; }
      onDone();
    } catch {
      setError('Connexion impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-[#C2410C]/30 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><FileCheck2 size={17} className="text-[#C2410C]" /> Votre bon à tirer{revision > 0 ? ` (version ${revision + 1})` : ''}</p>
        <p className="text-xs text-gray-500 mt-1">Vérifiez attentivement l'orthographe, le numéro et les couleurs : la carte sera imprimée exactement ainsi.</p>
      </div>
      {previews && (
        <div className="space-y-2">
          {[previews.front, previews.back].filter(Boolean).map((src, i) => (
            <a key={i} href={src as string} target="_blank" rel="noopener noreferrer">
              <img src={src as string} alt={i === 0 ? 'Bon à tirer, face logo' : 'Bon à tirer, face infos'} className="w-full rounded-xl shadow" />
            </a>
          ))}
        </div>
      )}
      {mode === 'view' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={() => send('approve')} disabled={loading}
            className="h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Valider le BAT
          </button>
          <button onClick={() => setMode('changes')} disabled={loading}
            className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Demander une correction
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Ex. : corriger le numéro de téléphone, agrandir le logo…"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-[#FAFAFA] text-sm outline-none focus:border-[#2E7D32] resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('view')} disabled={loading} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Retour</button>
            <button onClick={() => send('changes')} disabled={loading}
              className="h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: '#C2410C' }}>
              {loading && <Loader2 size={14} className="animate-spin" />} Envoyer la demande
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
    </section>
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
                  ['Offre', `Carte ${p.offer_name || 'Standard'}`],
                  ['Nom imprimé sur la carte', p.card_name],
                  ['Quantité', `${p.quantity} carte${p.quantity > 1 ? 's' : ''}`],
                  ['Montant total', formatFcfa(p.total_amount)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2">
                    <dt className="text-gray-500">{k}</dt><dd className="font-semibold text-gray-900 text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {p.previews && (p.previews.front || p.previews.back) && (
                <div className="grid grid-cols-2 gap-2">
                  {[p.previews.front, p.previews.back].filter(Boolean).map((src, i) => (
                    <img key={i} src={src as string} alt={i === 0 ? 'Face logo de la carte' : 'Face infos de la carte'} className="w-full rounded-lg shadow-sm" loading="lazy" />
                  ))}
                </div>
              )}
            </section>

            {p.team && <TeamEditor reference={p.reference} token={token} team={p.team} onSaved={() => qc.invalidateQueries({ queryKey })} />}

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

            {(p.status === 'paid' || p.status === 'design_en_cours') && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-3">
                <Palette size={22} className="text-[#7C3AED] shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{p.bat_comment ? 'Correction en cours' : 'Paiement confirmé, design en cours'}</p>
                  <p className="text-gray-500 mt-0.5">
                    {p.bat_comment
                      ? 'Nous appliquons votre demande et vous renvoyons un nouveau bon à tirer très vite.'
                      : 'Notre équipe prépare le visuel final de votre carte. Vous recevrez un bon à tirer (BAT) à valider avant impression.'}
                  </p>
                  {p.bat_comment && <p className="mt-2 text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">Votre demande : « {p.bat_comment} »</p>}
                </div>
              </div>
            )}

            {p.status === 'bat_envoye' && (
              <BatReview reference={p.reference} token={token} previews={p.previews || null} revision={p.bat_revision || 0}
                onDone={() => qc.invalidateQueries({ queryKey })} />
            )}

            {(p.status === 'bat_valide' || p.status === 'en_impression' || p.status === 'converted') && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-3">
                <Printer size={22} className="text-[#6D28D9] shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{p.status === 'bat_valide' ? 'Bon à tirer validé' : 'En impression à Dakar'}</p>
                  <p className="text-gray-500 mt-0.5">
                    {p.status === 'bat_valide'
                      ? 'Merci ! Votre carte rejoint le prochain lot d\'impression. Nous vous prévenons dès qu\'elle est prête.'
                      : 'Votre carte est en cours d\'impression. Nous vous prévenons dès qu\'elle est prête.'}
                  </p>
                </div>
              </div>
            )}

            {(p.status === 'prete' || p.status === 'livree') && (
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-[#2E7D32]" />
                <p className="font-semibold text-gray-900">{p.status === 'prete' ? 'Votre carte est prête !' : 'Carte livrée'}</p>
                <p className="text-sm text-gray-500">
                  {p.status === 'prete'
                    ? 'Nous vous contactons sur WhatsApp pour la remise. Elle est déjà active : approchez un téléphone pour ouvrir votre portfolio.'
                    : 'Votre carte est active. Vous pouvez choisir le portfolio qu\'elle ouvre depuis votre espace, sans la réimprimer.'}
                </p>
                <Link to="/dashboard/nfc-cards" className="inline-flex h-11 px-6 rounded-xl text-sm font-bold text-white items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2E7D32, #1BC29A)' }}>
                  Gérer mes cartes
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
