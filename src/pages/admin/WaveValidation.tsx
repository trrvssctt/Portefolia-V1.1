import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Copy, Check,
  Eye, ChevronLeft, ChevronRight, Download, Search, Filter, Waves,
  Loader2, Shield, X, Banknote,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const REFRESH_INTERVAL = 60_000;

const MOTIF_PRESETS = [
  'Référence Wave introuvable dans les transactions',
  'Montant incorrect — différent du total attendu',
  'Référence déjà utilisée pour un autre compte',
  'Capture d\'écran illisible ou de mauvaise qualité',
  'Informations du compte Wave ne correspondent pas',
];

// ─── Types ──────────────────────────────────────────────────────────────────────
interface PendingPayment {
  id: number;
  utilisateur_id: number;
  nom: string;
  prenom: string;
  email: string;
  plan_name: string | null;
  montant_paye: number;
  duree_mois: number;
  reference_wave: string | null;
  preuve_paiement: string | null;
  created_at: string;
  heures_attente: number;
  urgent: boolean;
}

interface HistoryItem {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  plan_name: string | null;
  montant_paye: number;
  duree_mois: number;
  reference_wave: string | null;
  statut: string;
  created_at: string;
  date_validation: string | null;
  motif_refus: string | null;
  heures_attente: number;
}

// ─── Design tokens ───────────────────────────────────────────────────────────────
const CARD_STYLE = { borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as const;
const ADMIN_GRAD = 'linear-gradient(135deg, #1B5E20, #2E7D32)';
const WAVE_GRAD  = 'linear-gradient(140deg, #1DC1F2, #0A9FCC)';

// ─── Helpers ─────────────────────────────────────────────────────────────────────
const fmtXOF = (n: number | null) =>
  n != null ? `${Math.round(n).toLocaleString('fr-FR')} F CFA` : '—';

const fmtDate = (d: string | null) =>
  d ? format(new Date(d), 'dd MMM yyyy, HH:mm', { locale: fr }) : '—';

const fmtDuree = (m: number) =>
  m === 1 ? '1 mois' : m === 12 ? '1 an' : `${m} mois`;

const timeAgo = (d: string) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  if (h < 1) return 'Il y a < 1h';
  if (h < 24) return `Il y a ${h}h`;
  const days = Math.floor(h / 24);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
};

const initials = (prenom: string, nom: string) =>
  `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase() || 'U';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ─── Statut config ────────────────────────────────────────────────────────────────
const STATUT_CONFIG: Record<string, { label: string; c: string; bg: string }> = {
  ACTIVE:          { label: 'Validé',     c: '#2E7D32', bg: '#EAF5EB' },
  PENDING_PAYMENT: { label: 'En attente', c: '#B45309', bg: '#FEF3E2' },
  SUSPENDED:       { label: 'Refusé',     c: '#C62828', bg: '#FEECEC' },
  EXPIRED:         { label: 'Expiré',     c: '#52525B', bg: '#F4F4F5' },
};

function StatutPill({ statut }: { statut: string }) {
  const s = STATUT_CONFIG[statut] ?? { label: statut, c: '#52525B', bg: '#F4F4F5' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.c, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.c }} />
      {s.label}
    </span>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────────
function ModalShell({
  icon: Icon, title, subtitle, tone = 'accent', size = 'md', onClose, children, footer,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  tone?: 'accent' | 'danger' | 'wave';
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' };
  const tones = {
    accent: { bg: '#E8F5E9', fg: '#1B5E20' },
    danger: { bg: '#FEE2E2', fg: '#DC2626' },
    wave:   { bg: '#E0F2FE', fg: '#0284C7' },
  };
  const tn = tones[tone];
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(16,24,40,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white w-full ${widths[size]} sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#E7E7EA] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: tn.bg, color: tn.fg }}>
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-[#18181B] text-sm leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-[#71717A] mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E7E7EA] shrink-0 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending payment card ──────────────────────────────────────────────────────────
function PendingCard({
  payment, onValidate, onReject, onPreview,
}: {
  payment: PendingPayment;
  onValidate: (p: PendingPayment) => void;
  onReject:   (p: PendingPayment) => void;
  onPreview:  (url: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    if (!payment.reference_wave) return;
    navigator.clipboard.writeText(payment.reference_wave).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white flex" style={CARD_STYLE}>
      {/* Urgency bar */}
      <div className="w-1 shrink-0 rounded-l-[12px]"
        style={{ background: payment.urgent ? '#C62828' : '#B45309' }} />

      <div className="flex-1 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar + info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: WAVE_GRAD }}>
              <Waves size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="font-bold text-[#18181B] text-sm">{payment.prenom} {payment.nom}</p>
                {payment.plan_name && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                    {payment.plan_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A] truncate">{payment.email}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{fmtDuree(payment.duree_mois)} · {fmtDate(payment.created_at)}</p>
            </div>
          </div>

          {/* Amount + urgency */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
            <p className="text-xl font-extrabold text-[#18181B] leading-none tabular-nums">{fmtXOF(payment.montant_paye)}</p>
            {payment.urgent ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#FEECEC', color: '#C62828' }}>
                <AlertTriangle size={11} /> {payment.heures_attente}h — URGENT
              </span>
            ) : (
              <span className="text-xs text-zinc-400">{timeAgo(payment.created_at)}</span>
            )}
          </div>
        </div>

        {/* Reference + proof */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {payment.reference_wave ? (
            <button onClick={copyRef}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: '#E0F2FE', color: '#0284C7' }}
              title="Copier la référence">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {payment.reference_wave}
            </button>
          ) : (
            <span className="text-xs text-zinc-400 italic">Aucune référence</span>
          )}
          {payment.preuve_paiement && (
            <button onClick={() => onPreview(payment.preuve_paiement!)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E7E7EA] text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Eye size={12} /> Voir la preuve
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => onValidate(payment)}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#2E7D32' }}>
            <CheckCircle2 size={15} /> Valider
          </button>
          <button onClick={() => onReject(payment)}
            className="h-9 px-3 rounded-lg border text-sm font-semibold flex items-center gap-1.5 transition-colors hover:bg-red-50"
            style={{ borderColor: '#C62828', color: '#C62828' }}>
            <XCircle size={15} /> Refuser
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Validate modal ────────────────────────────────────────────────────────────────
function ValidateModal({
  item, onClose, onSuccess,
}: {
  item: PendingPayment;
  onClose: () => void;
  onSuccess: (email: string) => void;
}) {
  const { toast } = useToast();
  const [comment,   setComment]   = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/wave/validate/${item.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ commentaire: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de validation');
      onSuccess(data.utilisateur_email || item.email);
      onClose();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell icon={CheckCircle2} title="Confirmer la validation" subtitle="Vérifiez les informations avant de valider." tone="accent" size="sm"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={loading}
            className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={!confirmed || loading}
            className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            style={{ background: '#2E7D32' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Validation…</> : 'Confirmer'}
          </button>
        </>
      }>
      {/* Summary */}
      <div className="rounded-xl p-4 space-y-2 text-sm mb-4" style={{ background: '#E8F5E9' }}>
        {[
          ['Utilisateur', `${item.prenom} ${item.nom}`],
          ['Email',       item.email],
          ['Plan',        item.plan_name || '—'],
          ['Durée',       fmtDuree(item.duree_mois)],
          ['Montant',     fmtXOF(item.montant_paye)],
          ['Réf. Wave',   item.reference_wave || '—'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between">
            <span className="text-zinc-500">{l}</span>
            <span className="font-semibold text-[#18181B] text-right max-w-[60%] truncate">{v}</span>
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className="space-y-1.5 mb-4">
        <label className="text-xs font-semibold text-[#18181B] uppercase tracking-wide">
          Commentaire <span className="text-zinc-400 font-normal normal-case">(optionnel)</span>
        </label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
          placeholder="Note visible uniquement par les admins..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] resize-none focus:border-[#18181B]/30" />
      </div>

      {/* Confirm checkbox */}
      <div className="flex items-start gap-3 rounded-xl border p-3" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
        <input type="checkbox" id="val-confirm" checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 accent-[#2E7D32] w-4 h-4 shrink-0 cursor-pointer" />
        <label htmlFor="val-confirm" className="text-sm cursor-pointer leading-snug" style={{ color: '#92400E' }}>
          Je confirme avoir vérifié ce paiement Wave sur le compte Wave de Portefolia.
        </label>
      </div>
    </ModalShell>
  );
}

// ─── Reject modal ──────────────────────────────────────────────────────────────────
function RejectModal({
  item, onClose, onSuccess,
}: {
  item: PendingPayment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [motif,   setMotif]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (motif.trim().length < 20) {
      toast({ title: 'Motif trop court', description: 'Minimum 20 caractères requis.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/wave/reject/${item.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ motif: motif.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de refus');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tooShort = motif.trim().length < 20;

  return (
    <ModalShell icon={XCircle} title="Refuser le paiement"
      subtitle={`${item.prenom} ${item.nom} — ${fmtXOF(item.montant_paye)}`}
      tone="danger" size="sm" onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={loading}
            className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={tooShort || loading}
            className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: '#C62828' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Refus…</> : 'Confirmer le refus'}
          </button>
        </>
      }>
      {/* Preset select */}
      <div className="space-y-1.5 mb-4">
        <label className="text-xs font-semibold text-[#18181B] uppercase tracking-wide">
          Motif prédéfini <span className="text-zinc-400 font-normal normal-case">(optionnel)</span>
        </label>
        <select onChange={e => setMotif(e.target.value)} value=""
          className="w-full h-10 px-3 rounded-xl border border-[#E7E7EA] bg-zinc-50 outline-none text-sm text-[#18181B]">
          <option value="">Choisir un motif…</option>
          {MOTIF_PRESETS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Free text */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="motif-text" className="text-xs font-semibold text-[#18181B] uppercase tracking-wide">
            Motif de refus <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs font-normal ${tooShort ? 'text-red-400' : 'text-zinc-400'}`}>
            {motif.trim().length}/20 min
          </span>
        </div>
        <textarea id="motif-text" value={motif} onChange={e => setMotif(e.target.value)} rows={4}
          placeholder="Expliquez clairement le motif du refus à l'utilisateur..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] resize-none focus:border-[#18181B]/30" />
        {tooShort && motif.length > 0 && (
          <p className="text-xs text-red-500">Le motif doit faire au moins 20 caractères.</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
        <Shield size={13} /> L'utilisateur sera notifié par email avec ce motif.
      </div>
    </ModalShell>
  );
}

// ─── Proof preview modal ───────────────────────────────────────────────────────────
function PreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,24,40,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg text-zinc-600 hover:text-[#18181B]">
          <X size={17} />
        </button>
        <p className="text-xs font-bold text-white/70 mb-2 px-1">Preuve de paiement Wave</p>
        <img src={url} alt="Preuve de paiement"
          className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────────
export default function WaveValidation() {
  const { toast } = useToast();

  // Data
  const [pending, setPending]   = useState<PendingPayment[]>([]);
  const [history, setHistory]   = useState<HistoryItem[]>([]);
  const [validatedToday, setValidatedToday] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // UI
  const [tab, setTab]         = useState<'pending' | 'history'>('pending');
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [validateTarget, setValidateTarget] = useState<PendingPayment | null>(null);
  const [rejectTarget,   setRejectTarget]   = useState<PendingPayment | null>(null);

  // History filters
  const [search,   setSearch]   = useState('');
  const [statut,   setStatut]   = useState('');
  const [dateDeb,  setDateDeb]  = useState('');
  const [dateFin,  setDateFin]  = useState('');
  const [histPage, setHistPage] = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch pending ───────────────────────────────────────────────────────────────
  const loadPending = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/wave/pending`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setPending(data.pending || []);
    } catch (err: any) {
      if (!silent) toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Fetch validated today ────────────────────────────────────────────────────────
  const loadValidatedToday = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/wave/history?statut=ACTIVE&date_debut=${today}&date_fin=${today}&limit=1`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setValidatedToday(data.pagination?.total ?? 0);
    } catch { /* non-bloquant */ }
  }, []);

  // ── Fetch history ────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(histPage), limit: '20',
        ...(statut  && { statut }),
        ...(dateDeb && { date_debut: dateDeb }),
        ...(dateFin && { date_fin: dateFin }),
        ...(search  && { search }),
      });
      const res = await fetch(`${API_BASE}/api/admin/wave/history?${params}`, { headers: authHeaders() });
      const data = await res.json();
      setHistory(data.history || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setHistLoading(false);
    }
  }, [histPage, statut, dateDeb, dateFin, search]);

  // ── Init + auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadPending();
    loadValidatedToday();
    timerRef.current = setInterval(() => { loadPending(true); loadValidatedToday(); }, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, histPage, statut, dateDeb, dateFin]);

  const handleRefresh = () => {
    loadPending();
    loadValidatedToday();
    if (tab === 'history') loadHistory();
  };

  // ── Callbacks ────────────────────────────────────────────────────────────────────
  const onValidated = (email: string) => {
    toast({ title: '✓ Paiement validé', description: `Email d'activation envoyé à ${email}.` });
    loadPending(true);
    loadValidatedToday();
    if (tab === 'history') loadHistory();
  };

  const onRejected = () => {
    toast({ title: '✓ Paiement refusé', description: 'L\'utilisateur a été notifié par email.' });
    loadPending(true);
    if (tab === 'history') loadHistory();
  };

  // ── CSV Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Date', 'Nom', 'Email', 'Plan', 'Montant (FCFA)', 'Durée', 'Référence Wave', 'Statut'];
    const rows = history.map(h => [
      fmtDate(h.created_at),
      `${h.prenom} ${h.nom}`,
      h.email,
      h.plan_name || '',
      Math.round(h.montant_paye || 0),
      fmtDuree(h.duree_mois),
      h.reference_wave || '',
      STATUT_CONFIG[h.statut]?.label || h.statut,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────────────
  const urgentCount = pending.filter(p => p.urgent).length;
  const totalAmount = pending.reduce((s, p) => s + (p.montant_paye || 0), 0);

  const kpis = [
    { label: 'Montant en attente', value: loading ? '—' : fmtXOF(totalAmount), icon: Banknote, c: '#B45309', bg: '#FEF3E2', sub: 'À encaisser' },
    { label: 'Paiements à valider', value: loading ? '—' : pending.length, icon: Clock, c: pending.length > 0 ? '#1565C0' : '#52525B', bg: pending.length > 0 ? '#E8F1FD' : '#F4F4F5', sub: 'En attente de traitement' },
    { label: 'Urgents (> 24h)', value: loading ? '—' : urgentCount, icon: AlertTriangle, c: urgentCount > 0 ? '#C62828' : '#52525B', bg: urgentCount > 0 ? '#FEECEC' : '#F4F4F5', sub: 'Soumis depuis +24h' },
    { label: 'Validés aujourd\'hui', value: validatedToday, icon: CheckCircle2, c: '#2E7D32', bg: '#EAF5EB', sub: format(new Date(), 'HH:mm', { locale: fr }) },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>

      {/* ── AdminHeader ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: ADMIN_GRAD }}>
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
            <span className="w-12 h-12 rounded-2xl bg-white/[0.12] flex items-center justify-center text-white shrink-0">
              <Waves size={24} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Validation Wave</h1>
              <p className="text-white/65 text-sm mt-0.5">
                Confirmez les paiements mobile money reçus
                {pending.length > 0 && (
                  <span className="ml-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {pending.length} en attente
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={handleRefresh}
            className="h-10 px-4 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto">
            <RefreshCw size={15} /> Actualiser
          </button>
        </div>
      </div>

      {/* ── AdminBody ───────────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-7">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, c, bg, sub }) => (
            <div key={label} className="bg-white p-5" style={CARD_STYLE}>
              <div className="flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color: c }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[22px] font-extrabold text-[#18181B] leading-none tabular-nums">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-tight">{label}</p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 mt-3 pl-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1.5 w-fit" style={CARD_STYLE}>
          {([['pending', 'En attente'], ['history', 'Historique']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${tab === k ? 'text-white' : 'text-zinc-500 hover:text-[#18181B] hover:bg-zinc-50'}`}
              style={tab === k ? { background: '#1B5E20' } : undefined}>
              {label}
              {k === 'pending' && pending.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === 'pending' ? 'bg-white/25 text-white' : 'bg-[#FEF3E2] text-[#B45309]'}`}>
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Pending ────────────────────────────────────────────────────────── */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white h-36 animate-pulse" style={CARD_STYLE} />
              ))
            ) : pending.length === 0 ? (
              <div className="bg-white flex flex-col items-center justify-center py-20 text-center" style={CARD_STYLE}>
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: '#EAF5EB', color: '#2E7D32' }}>
                  <CheckCircle2 size={26} />
                </span>
                <h3 className="font-bold text-[#18181B]">Aucun paiement en attente</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-xs">Tous les paiements Wave ont été traités.</p>
              </div>
            ) : (
              pending.map(p => (
                <PendingCard
                  key={p.id}
                  payment={p}
                  onValidate={setValidateTarget}
                  onReject={setRejectTarget}
                  onPreview={setPreviewUrl}
                />
              ))
            )}
          </div>
        )}

        {/* ── Tab: History ─────────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white overflow-hidden" style={CARD_STYLE}>
            {/* Filters */}
            <div className="p-4 border-b border-[#E7E7EA] flex flex-col sm:flex-row flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input placeholder="Rechercher nom, email…" value={search}
                  onChange={e => { setSearch(e.target.value); setHistPage(1); }}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 border border-transparent focus:border-[#E7E7EA] outline-none text-sm text-[#18181B]" />
              </div>
              <select value={statut} onChange={e => { setStatut(e.target.value === 'ALL' ? '' : e.target.value); setHistPage(1); }}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none">
                <option value="ALL">Tous statuts</option>
                <option value="PENDING_PAYMENT">En attente</option>
                <option value="ACTIVE">Validé</option>
                <option value="SUSPENDED">Refusé</option>
                <option value="EXPIRED">Expiré</option>
              </select>
              <input type="date" value={dateDeb}
                onChange={e => { setDateDeb(e.target.value); setHistPage(1); }}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none w-36" />
              <input type="date" value={dateFin}
                onChange={e => { setDateFin(e.target.value); setHistPage(1); }}
                className="h-9 px-2 rounded-lg border border-[#E7E7EA] bg-zinc-50 text-xs text-[#18181B] outline-none w-36" />
              <button onClick={loadHistory}
                className="h-9 px-3 rounded-lg border border-[#E7E7EA] text-xs font-semibold text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors">
                <Filter size={13} /> Filtrer
              </button>
              <button onClick={exportCSV} disabled={history.length === 0}
                className="h-9 px-3 rounded-lg border border-[#E7E7EA] text-xs font-semibold text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors disabled:opacity-40">
                <Download size={13} /> CSV
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-[#E7E7EA]">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-3">Utilisateur</th>
                    <th className="py-3 px-3">Plan · Durée</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-3">Référence Wave</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-5">Attente</th>
                  </tr>
                </thead>
                <tbody>
                  {histLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#E7E7EA]">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="py-3 px-3">
                            <div className="h-3 bg-zinc-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-sm text-zinc-400">
                        Aucun résultat pour ces filtres
                      </td>
                    </tr>
                  ) : history.map(h => (
                    <tr key={h.id} className="border-b border-[#E7E7EA] last:border-0 hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-5 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(h.created_at)}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#18181B] text-sm whitespace-nowrap">{h.prenom} {h.nom}</p>
                        <p className="text-xs text-zinc-400 truncate max-w-[160px]">{h.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-sm text-[#18181B]">{h.plan_name || '—'}</p>
                        <p className="text-xs text-zinc-400">{fmtDuree(h.duree_mois)}</p>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-sm text-[#2E7D32] tabular-nums whitespace-nowrap">
                          {fmtXOF(h.montant_paye)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {h.reference_wave ? (
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md"
                            style={{ background: '#E0F2FE', color: '#0284C7' }}>
                            {h.reference_wave}
                          </span>
                        ) : <span className="text-zinc-400 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-3"><StatutPill statut={h.statut} /></td>
                      <td className="py-3 px-5 text-xs text-zinc-400 whitespace-nowrap">
                        {h.heures_attente != null ? `${h.heures_attente}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E7E7EA]">
                <p className="text-xs text-zinc-400">
                  {pagination.total} résultat{pagination.total > 1 ? 's' : ''} · page {pagination.page}/{pagination.pages}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setHistPage(p => Math.max(1, p - 1))}
                    disabled={histPage === 1 || histLoading}
                    className="w-8 h-8 rounded-lg border border-[#E7E7EA] flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  <button onClick={() => setHistPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={histPage === pagination.pages || histLoading}
                    className="w-8 h-8 rounded-lg border border-[#E7E7EA] flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}
      {validateTarget && (
        <ValidateModal
          item={validateTarget}
          onClose={() => setValidateTarget(null)}
          onSuccess={onValidated}
        />
      )}
      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={onRejected}
        />
      )}
      {previewUrl && <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
