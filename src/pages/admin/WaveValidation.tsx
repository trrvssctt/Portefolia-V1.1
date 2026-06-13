import { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { Input }   from '@/components/ui/input';
import { Label }   from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle, Copy, Check,
  Eye, ChevronLeft, ChevronRight, Download, Search, Filter, Waves,
  Loader2, Shield, User,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const REFRESH_INTERVAL = 60_000;

const MOTIF_PRESETS = [
  'Référence Wave introuvable dans les transactions',
  'Montant incorrect — différent du total attendu',
  'Référence déjà utilisée pour un autre compte',
  'Capture d\'écran illisible ou de mauvaise qualité',
  'Informations du compte Wave ne correspondent pas',
];

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtXOF = (n: number | null) =>
  n != null ? `${Math.round(n).toLocaleString('fr-FR')} FCFA` : '—';

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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, bg, description,
}: {
  label: string; value: number | string; icon: any;
  color: string; bg: string; description?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-gray-900 leading-none mt-0.5">{value}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}

// ─── Pending Payment Card ────────────────────────────────────────────────────

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

  const accentColor = payment.urgent ? 'bg-red-500' : 'bg-orange-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
      {/* Accent bar */}
      <div className={`w-1.5 shrink-0 ${accentColor}`} />

      <div className="flex-1 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">

          {/* Avatar + info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {initials(payment.prenom, payment.nom)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">
                {payment.prenom} {payment.nom}
              </p>
              <p className="text-xs text-gray-500 truncate">{payment.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {payment.plan_name || '—'} · {fmtDuree(payment.duree_mois)}
              </p>
            </div>
          </div>

          {/* Montant + time badge */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
            <p className="text-xl font-black text-[#2E7D32]">{fmtXOF(payment.montant_paye)}</p>
            {payment.urgent ? (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {payment.heures_attente}h — URGENT
              </span>
            ) : (
              <span className="text-xs text-gray-400">{timeAgo(payment.created_at)}</span>
            )}
          </div>
        </div>

        {/* Wave reference + proof */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {payment.reference_wave ? (
            <button
              onClick={copyRef}
              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors"
              title="Copier la référence"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {payment.reference_wave}
            </button>
          ) : (
            <span className="text-xs text-gray-400">Aucune référence</span>
          )}

          {payment.preuve_paiement && (
            <button
              onClick={() => onPreview(payment.preuve_paiement!)}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Eye className="w-3 h-3" />
              Voir la preuve
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={() => onValidate(payment)}
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-lg gap-1.5 h-9"
          >
            <CheckCircle2 className="w-4 h-4" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(payment)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-lg gap-1.5 h-9"
          >
            <XCircle className="w-4 h-4" />
            Refuser
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Validate Dialog ─────────────────────────────────────────────────────────

function ValidateDialog({
  item, open, onClose, onSuccess,
}: {
  item: PendingPayment | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}) {
  const { toast } = useToast();
  const [comment,   setComment]   = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { if (!open) { setComment(''); setConfirmed(false); } }, [open]);

  const handleConfirm = async () => {
    if (!item || !confirmed) return;
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

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2E7D32]">
            <CheckCircle2 className="w-5 h-5" />
            Confirmer la validation
          </DialogTitle>
          <DialogDescription>
            Vérifiez les informations avant de valider ce paiement.
          </DialogDescription>
        </DialogHeader>

        {/* Récapitulatif */}
        <div className="bg-[#E8F5E9] rounded-xl p-4 space-y-2 text-sm">
          {[
            ['Utilisateur', `${item.prenom} ${item.nom}`],
            ['Email',       item.email],
            ['Plan',        item.plan_name || '—'],
            ['Durée',       fmtDuree(item.duree_mois)],
            ['Montant',     fmtXOF(item.montant_paye)],
            ['Réf. Wave',   item.reference_wave || '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-gray-500">{l}</span>
              <span className="font-semibold text-gray-900 text-right max-w-[60%] truncate">{v}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comment" className="text-sm font-semibold text-gray-700">
            Commentaire interne <span className="text-gray-400 font-normal">(optionnel)</span>
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Note visible uniquement par les admins..."
            className="rounded-xl resize-none text-sm"
            rows={2}
          />
        </div>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <Checkbox
            id="confirm-check"
            checked={confirmed}
            onCheckedChange={v => setConfirmed(!!v)}
            className="mt-0.5 data-[state=checked]:bg-[#2E7D32] data-[state=checked]:border-[#2E7D32]"
          />
          <Label htmlFor="confirm-check" className="text-sm text-amber-800 cursor-pointer leading-snug">
            Je confirme avoir vérifié ce paiement Wave sur le compte Wave de Portefolia.
          </Label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Validation…</> : 'Confirmer la validation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  item, open, onClose, onSuccess,
}: {
  item: PendingPayment | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [motif,   setMotif]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) setMotif(''); }, [open]);

  const handleConfirm = async () => {
    if (!item || motif.trim().length < 20) {
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

  if (!item) return null;
  const tooShort = motif.trim().length < 20;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Refuser le paiement
          </DialogTitle>
          <DialogDescription>
            {item.prenom} {item.nom} — {fmtXOF(item.montant_paye)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">
              Motif prédéfini <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            <Select onValueChange={v => setMotif(v)}>
              <SelectTrigger className="rounded-xl text-sm">
                <SelectValue placeholder="Choisir un motif..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIF_PRESETS.map(m => (
                  <SelectItem key={m} value={m} className="text-sm">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="motif-text" className="text-sm font-semibold text-gray-700 flex items-center justify-between mb-1.5">
              <span>Motif de refus <span className="text-red-500">*</span></span>
              <span className={`text-xs font-normal ${tooShort ? 'text-red-400' : 'text-gray-400'}`}>
                {motif.trim().length}/20 min
              </span>
            </Label>
            <Textarea
              id="motif-text"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Expliquez clairement le motif du refus à l'utilisateur..."
              className="rounded-xl resize-none text-sm"
              rows={4}
            />
            {tooShort && motif.length > 0 && (
              <p className="text-xs text-red-500 mt-1">Le motif doit faire au moins 20 caractères.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={tooShort || loading}
            variant="destructive"
            className="rounded-xl gap-2 font-bold"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Refus…</> : 'Confirmer le refus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Proof Preview Modal ─────────────────────────────────────────────────────

function PreviewModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl p-2">
        <DialogHeader className="px-4 pt-2">
          <DialogTitle className="text-sm font-bold text-gray-700">Preuve de paiement Wave</DialogTitle>
        </DialogHeader>
        {url && (
          <img
            src={url}
            alt="Preuve de paiement"
            className="w-full rounded-xl object-contain max-h-[70vh]"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE:          { label: 'Validé',     bg: 'bg-green-100',  text: 'text-green-800' },
  PENDING_PAYMENT: { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-800' },
  SUSPENDED:       { label: 'Refusé',     bg: 'bg-red-100',    text: 'text-red-800' },
  EXPIRED:         { label: 'Expiré',     bg: 'bg-gray-100',   text: 'text-gray-700' },
};

function StatutBadge({ statut }: { statut: string }) {
  const conf = STATUT_CONFIG[statut] ?? { label: statut, bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${conf.bg} ${conf.text}`}>
      {conf.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [search,     setSearch]     = useState('');
  const [statut,     setStatut]     = useState('');
  const [dateDeb,    setDateDeb]    = useState('');
  const [dateFin,    setDateFin]    = useState('');
  const [histPage,   setHistPage]   = useState(1);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch pending ─────────────────────────────────────────────────────────

  const loadPending = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/wave/pending`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setPending(data.pending || []);
    } catch (err: any) {
      if (!silent) toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ── Fetch validated today ─────────────────────────────────────────────────

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

  // ── Fetch history ─────────────────────────────────────────────────────────

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
      const res = await fetch(`${API_BASE}/api/admin/wave/history?${params}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setHistory(data.history || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setHistLoading(false);
    }
  }, [histPage, statut, dateDeb, dateFin, search]);

  // ── Init + auto-refresh ───────────────────────────────────────────────────

  useEffect(() => {
    loadPending();
    loadValidatedToday();

    timerRef.current = setInterval(() => {
      loadPending(true);
      loadValidatedToday();
    }, REFRESH_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, histPage, statut, dateDeb, dateFin]);

  const handleRefresh = () => {
    loadPending();
    loadValidatedToday();
    if (tab === 'history') loadHistory();
  };

  // ── Callbacks after action ────────────────────────────────────────────────

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

  // ── CSV Export ────────────────────────────────────────────────────────────

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
    const link = document.createElement('a');
    link.href     = url;
    link.download = `wave-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const urgentCount = pending.filter(p => p.urgent).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>


      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-[#2E7D32] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <Waves className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">
                Validation des Paiements Wave
              </h1>
              <p className="text-sm text-white/75 font-medium">Trésorerie &amp; Opérations Comptables</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {pending.length > 0 && (
              <span className="bg-white text-[#2E7D32] text-sm font-black px-3 py-1 rounded-full">
                {pending.length} en attente
              </span>
            )}
            <Button
              onClick={handleRefresh}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0 font-bold rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* ── KPI Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="En attente"
            value={loading ? '—' : pending.length}
            icon={Clock}
            color={pending.length > 0 ? 'text-orange-600' : 'text-gray-400'}
            bg={pending.length > 0 ? 'bg-orange-100' : 'bg-gray-100'}
            description="Paiements non encore validés"
          />
          <KpiCard
            label="Urgents (> 24h)"
            value={loading ? '—' : urgentCount}
            icon={AlertTriangle}
            color={urgentCount > 0 ? 'text-red-600' : 'text-gray-400'}
            bg={urgentCount > 0 ? 'bg-red-100' : 'bg-gray-100'}
            description="Soumis depuis plus de 24 heures"
          />
          <KpiCard
            label="Validés aujourd'hui"
            value={validatedToday}
            icon={CheckCircle2}
            color="text-[#2E7D32]"
            bg="bg-green-100"
            description={`Mise à jour : ${format(new Date(), 'HH:mm', { locale: fr })}`}
          />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-xl p-1.5 border border-gray-200 w-fit shadow-sm">
          {(['pending', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-[#2E7D32] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {t === 'pending' ? (
                <span className="flex items-center gap-2">
                  En attente
                  {pending.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === 'pending' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700'}`}>
                      {pending.length}
                    </span>
                  )}
                </span>
              ) : 'Historique'}
            </button>
          ))}
        </div>

        {/* ── Tab: Pending ───────────────────────────────────────────────── */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))
            ) : pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-16 flex flex-col items-center gap-3 text-center shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#2E7D32]" />
                </div>
                <h3 className="font-bold text-gray-900">Aucun paiement en attente</h3>
                <p className="text-sm text-gray-400">Tous les paiements Wave ont été traités.</p>
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

        {/* ── Tab: History ───────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher nom, email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setHistPage(1); }}
                  className="pl-9 rounded-xl h-9 text-sm border-gray-200"
                />
              </div>
              <Select value={statut} onValueChange={v => { setStatut(v === 'ALL' ? '' : v); setHistPage(1); }}>
                <SelectTrigger className="w-40 rounded-xl h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Tous statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous statuts</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">En attente</SelectItem>
                  <SelectItem value="ACTIVE">Validé</SelectItem>
                  <SelectItem value="SUSPENDED">Refusé</SelectItem>
                  <SelectItem value="EXPIRED">Expiré</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateDeb}
                onChange={e => { setDateDeb(e.target.value); setHistPage(1); }}
                className="w-36 rounded-xl h-9 text-sm border-gray-200"
              />
              <Input
                type="date"
                value={dateFin}
                onChange={e => { setDateFin(e.target.value); setHistPage(1); }}
                className="w-36 rounded-xl h-9 text-sm border-gray-200"
              />
              <Button
                onClick={loadHistory}
                size="sm"
                variant="outline"
                className="rounded-xl h-9 gap-1.5 shrink-0 border-gray-200"
              >
                <Filter className="w-3.5 h-3.5" />
                Filtrer
              </Button>
              <Button
                onClick={exportCSV}
                size="sm"
                variant="outline"
                className="rounded-xl h-9 gap-1.5 shrink-0 border-gray-200"
                disabled={history.length === 0}
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Utilisateur</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Montant</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Référence Wave</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                        Aucun résultat pour ces filtres
                      </TableCell>
                    </TableRow>
                  ) : history.map(h => (
                    <TableRow key={h.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(h.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{h.prenom} {h.nom}</p>
                          <p className="text-xs text-gray-400">{h.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">{h.plan_name || '—'}</p>
                        <p className="text-xs text-gray-400">{fmtDuree(h.duree_mois)}</p>
                      </TableCell>
                      <TableCell className="font-bold text-[#2E7D32] text-sm whitespace-nowrap">
                        {fmtXOF(h.montant_paye)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {h.reference_wave || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatutBadge statut={h.statut} />
                      </TableCell>
                      <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                        {h.heures_attente != null ? `${h.heures_attente}h` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {pagination.total} résultat{pagination.total > 1 ? 's' : ''} · page {pagination.page}/{pagination.pages}
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setHistPage(p => Math.max(1, p - 1))}
                    disabled={histPage === 1 || histLoading}
                    className="h-8 w-8 p-0 rounded-lg border-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setHistPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={histPage === pagination.pages || histLoading}
                    className="h-8 w-8 p-0 rounded-lg border-gray-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <ValidateDialog
        item={validateTarget}
        open={!!validateTarget}
        onClose={() => setValidateTarget(null)}
        onSuccess={onValidated}
      />
      <RejectDialog
        item={rejectTarget}
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSuccess={onRejected}
      />
      <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
