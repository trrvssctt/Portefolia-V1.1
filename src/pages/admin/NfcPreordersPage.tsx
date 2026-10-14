import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Download, Settings, Search, X, Loader2, Copy, Check, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Ban, PackageCheck, Send, AlertTriangle, MessageCircle,
  Palette, FileCheck2, Printer, Truck, Upload, FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFcfa } from '@/hooks/useNfcConfig';
import {
  useNfcPreorders, useNfcPreorderStats, useNfcPreorderDetail, useNfcSettings, useUpdateNfcSettings,
  usePreorderAction, exportPreordersCsv, STATUS_META, useUploadBat, usePrintQueue, useStartPrintBatch, downloadPrintSheet,
  type Preorder, type PreorderStatus, type PreorderAction, type OrderItem,
} from '@/hooks/useNfcPreorders';

const PAGE_SIZE = 20;
const TABS: { key: '' | PreorderStatus; label: string }[] = [
  { key: 'payment_submitted', label: 'Paiements à valider' },
  { key: 'pending_payment', label: 'Attente paiement' },
  { key: 'design_en_cours', label: 'Design' },
  { key: 'bat_envoye', label: 'BAT envoyé' },
  { key: 'bat_valide', label: 'BAT validé' },
  { key: 'en_impression', label: 'En impression' },
  { key: 'prete', label: 'Prêtes' },
  { key: 'livree', label: 'Livrées' },
  { key: 'rejected', label: 'Refusées' },
  { key: 'expired', label: 'Expirées' },
  { key: 'cancelled', label: 'Annulées' },
  { key: '', label: 'Toutes' },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function StatusBadge({ status }: { status: PreorderStatus }) {
  const m = STATUS_META[status];
  return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ color: m.color, background: m.bg }}>{m.label}</span>;
}

function CopyText({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title="Copier"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }).catch(() => {}); }}
      className="inline-flex items-center gap-1 font-mono text-xs text-gray-700 hover:text-[#2E7D32]">
      <span className="truncate max-w-[140px]">{value}</span>{done ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ── Dialogue de confirmation (avec motif pour refus / annulation) ─────────────

const ACTION_META: Record<PreorderAction, { title: string; text: string; confirm: string; color: string; reason?: 'required' | 'optional' }> = {
  validate: { title: 'Valider le paiement', text: 'Vous confirmez avoir trouvé cette transaction dans Wave Business, avec le bon montant. Le client recevra un e-mail de confirmation ; la commande et le paiement sont enregistrés (finances, statistiques, historique du client).', confirm: 'Valider le paiement', color: '#2E7D32' },
  reject: { title: 'Refuser le paiement', text: 'Le client recevra un e-mail avec le motif et pourra déclarer à nouveau son paiement.', confirm: 'Refuser', color: '#DC2626', reason: 'required' },
  cancel: { title: 'Annuler la commande', text: 'Le client recevra un e-mail d\'annulation.', confirm: 'Annuler la commande', color: '#DC2626', reason: 'optional' },
  design: { title: 'Passer en design', text: 'La commande part chez le designer. Le client est prévenu qu\'un bon à tirer arrive.', confirm: 'Passer en design', color: '#7C3AED' },
  send_bat: { title: 'Envoyer le BAT', text: 'Le client reçoit le bon à tirer par e-mail et le valide (ou demande une correction) depuis son lien de suivi.', confirm: 'Envoyer le BAT', color: '#C2410C' },
  approve_bat: { title: 'Valider le BAT pour le client', text: 'À utiliser si le client a donné son accord par un autre canal (WhatsApp, téléphone). Un code de carte est attribué à chaque carte.', confirm: 'Valider le BAT', color: '#0F766E' },
  en_impression: { title: 'Passer en impression', text: 'Chaque carte doit avoir un code (stock suffisant). Le client est prévenu que sa carte est en impression.', confirm: 'Passer en impression', color: '#6D28D9' },
  prete: { title: 'Carte prête', text: 'Les cartes deviennent actives (le tap ouvre le portfolio) et le client est prévenu qu\'elles sont prêtes.', confirm: 'Marquer prête', color: '#15803D' },
  livree: { title: 'Carte livrée', text: 'La commande est terminée ; le client reçoit la confirmation de livraison.', confirm: 'Marquer livrée', color: '#166534' },
  resend: { title: 'Renvoyer la dernière notification', text: 'Le dernier e-mail envoyé pour cette précommande sera renvoyé au client (et à l\'admin si concerné).', confirm: 'Renvoyer', color: '#2E7D32' },
};

function ConfirmAction({ action, preorder, onClose }: { action: PreorderAction; preorder: Preorder; onClose: () => void }) {
  const meta = ACTION_META[action];
  const [reason, setReason] = useState('');
  const mutation = usePreorderAction();
  const { toast } = useToast();
  const disabled = mutation.isPending || (meta.reason === 'required' && reason.trim().length < 3);

  const run = async () => {
    try {
      const r = await mutation.mutateAsync({ id: preorder.id, action, reason: meta.reason ? reason.trim() : undefined });
      const missing = r && typeof (r as { missing?: number }).missing === 'number' ? (r as { missing: number }).missing : 0;
      toast({ title: `✓ ${meta.title} : ${preorder.reference}`, description: missing ? `${missing} carte(s) sans code : stock insuffisant.` : undefined });
      onClose();
    } catch (e) {
      toast({ title: (e as Error).message || 'Action impossible', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} style={{ color: meta.color }} />
          <h3 className="font-bold text-gray-900">{meta.title}</h3>
        </div>
        <p className="text-sm text-gray-600">{meta.text}</p>
        <p className="text-sm font-semibold bg-gray-50 rounded-lg px-3 py-2">{preorder.reference} · {preorder.full_name} · {formatFcfa(preorder.total_amount)}</p>
        {meta.reason && (
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255}
            placeholder={meta.reason === 'required' ? 'Motif (obligatoire) : ex. transaction introuvable, montant différent…' : 'Motif (optionnel)'}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] resize-none" />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={mutation.isPending} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Retour</button>
          <button onClick={run} disabled={disabled}
            className="flex-1 h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: meta.color }}>
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />} {meta.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cartes de la commande et dépôt du BAT ─────────────────────────────────────

function ItemsBlock({ order, items }: { order: Preorder; items: OrderItem[] }) {
  const upload = useUploadBat();
  const { toast } = useToast();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [itemId, setItemId] = useState<number | ''>('');
  const canUpload = ['paid', 'design_en_cours', 'bat_envoye'].includes(order.status);
  const design = items[0]?.design || {};

  const submit = async () => {
    try {
      await upload.mutateAsync({ id: order.id, front, back, itemId: itemId || null });
      toast({ title: '✓ BAT déposé', description: order.status === 'bat_envoye' ? undefined : 'Cliquez sur « Envoyer le BAT » pour le soumettre au client.' });
      setFront(null); setBack(null);
    } catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Cartes ({items.length})</p>
      {(design.logo_url || design.photo_url || design.notes) && (
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
          {design.logo_url && <p>Logo client : <a href={design.logo_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2E7D32] underline">ouvrir</a></p>}
          {design.photo_url && <p>Photo : <a href={design.photo_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2E7D32] underline">ouvrir</a></p>}
          {design.notes && <p>Notes : « {design.notes} »</p>}
          {design.template && <p>Gabarit : {design.template}{design.finish ? ` · ${design.finish}` : ''}</p>}
        </div>
      )}
      {items.map((it) => (
        <div key={it.id} className="rounded-xl border border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800">Carte {it.position}/{items.length} · {it.printed_info?.name || '—'}</span>
            <span className="font-mono">{it.card_code ? <>Code <b>{it.card_code}</b></> : <span className="text-gray-400">code attribué au BAT validé</span>}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[it.preview_front_url, it.preview_back_url].map((src, i) => src
              ? <a key={i} href={(i === 0 ? it.print_front_url : it.print_back_url) || src} target="_blank" rel="noopener noreferrer" title="Fichier d'impression"><img src={src} alt={i === 0 ? 'Face logo' : 'Face infos'} className="w-full rounded-lg border border-gray-100" loading="lazy" /></a>
              : <div key={i} className="aspect-[1.585] rounded-lg bg-gray-50 text-[11px] text-gray-400 flex items-center justify-center">Visuel manquant</div>)}
          </div>
          {it.bat_revision > 0 && <p className="text-[11px] text-gray-400">BAT déposé · révision {it.bat_revision}</p>}
        </div>
      ))}
      {canUpload && (
        <div className="rounded-xl border border-dashed border-gray-300 p-3 space-y-2">
          <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Upload size={13} /> Déposer le BAT (PNG ou JPG, 600 dpi, 3 mm de fond perdu : 91,6 × 60 mm)</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1"><span className="text-gray-500">Face logo (recto)</span>
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => setFront(e.target.files?.[0] || null)} className="block w-full text-[11px]" /></label>
            <label className="space-y-1"><span className="text-gray-500">Face infos (verso)</span>
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => setBack(e.target.files?.[0] || null)} className="block w-full text-[11px]" /></label>
          </div>
          {items.length > 1 && (
            <select value={itemId} onChange={(e) => setItemId(e.target.value ? Number(e.target.value) : '')} className="w-full h-9 px-2 rounded-lg border border-gray-200 text-xs">
              <option value="">Appliquer à toutes les cartes de la commande</option>
              {items.map((it) => <option key={it.id} value={it.id}>Seulement la carte {it.position} ({it.printed_info?.name || '—'})</option>)}
            </select>
          )}
          <button onClick={submit} disabled={upload.isPending || (!front && !back)}
            className="w-full h-9 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: '#7C3AED' }}>
            {upload.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Déposer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Lot d'impression locale ───────────────────────────────────────────────────

function PrintBatchBlock({ queue, threshold, summary }: { queue: number; threshold: number; summary: string }) {
  const start = useStartPrintBatch();
  const { data } = usePrintQueue();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'' | 'pdf' | 'csv'>('');
  const items = data?.items ?? [];
  const missingCodes = items.filter((i) => !i.card_code).length;

  const download = async (format: 'pdf' | 'csv') => {
    setBusy(format);
    try { await downloadPrintSheet(format); } catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
    finally { setBusy(''); }
  };
  const launch = async () => {
    if (!window.confirm(`Passer en impression les ${queue} carte(s) au BAT validé ? Les clients seront prévenus.`)) return;
    try {
      const r = await start.mutateAsync();
      toast({
        title: `✓ ${r.started.length} commande(s) en impression`,
        description: r.blocked.length ? `${r.blocked.length} bloquée(s) : ${r.blocked.map((b) => b.reference).join(', ')} (stock insuffisant)` : undefined,
        variant: r.blocked.length ? 'destructive' : undefined,
      });
    } catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className="bg-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-white">
        <p className="text-sm font-semibold">Lot d'impression : <span className="text-xl font-black">{queue} / {threshold}</span> carte(s) au BAT validé</p>
        <p className="text-xs text-white/70">{summary}</p>
      </div>
      <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, (queue / Math.max(1, threshold)) * 100)}%` }} />
      </div>
      {queue > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => download('pdf')} disabled={!!busy} className="h-8 px-3 rounded-lg bg-white text-xs font-bold flex items-center gap-1.5" style={{ color: '#1B5E20' }}>
            {busy === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF imprimeur
          </button>
          <button onClick={() => download('csv')} disabled={!!busy} className="h-8 px-3 rounded-lg border border-white/40 text-white text-xs font-semibold flex items-center gap-1.5">
            {busy === 'csv' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Récapitulatif (CSV)
          </button>
          <button onClick={launch} disabled={start.isPending} className="h-8 px-3 rounded-lg border border-white/40 text-white text-xs font-semibold flex items-center gap-1.5">
            {start.isPending ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Lancer l'impression du lot
          </button>
          {missingCodes > 0 && <span className="text-xs text-amber-200">{missingCodes} carte(s) sans code : recevez un lot de cartes dans « Stock & codes ».</span>}
        </div>
      )}
    </div>
  );
}

// ── Panneau de détail ─────────────────────────────────────────────────────────

function DetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useNfcPreorderDetail(id);
  const [action, setAction] = useState<PreorderAction | null>(null);
  const p = data?.preorder;

  const buttons: { action: PreorderAction; label: string; icon: React.ElementType; show: boolean; color: string }[] = p ? [
    { action: 'validate', label: 'Valider le paiement', icon: CheckCircle2, show: p.status === 'payment_submitted', color: '#2E7D32' },
    { action: 'reject', label: 'Refuser', icon: XCircle, show: p.status === 'payment_submitted', color: '#DC2626' },
    { action: 'design', label: 'Passer en design', icon: Palette, show: p.status === 'paid', color: '#7C3AED' },
    { action: 'send_bat', label: 'Envoyer le BAT', icon: Send, show: ['paid', 'design_en_cours'].includes(p.status), color: '#C2410C' },
    { action: 'approve_bat', label: 'Valider le BAT (accord client)', icon: FileCheck2, show: p.status === 'bat_envoye', color: '#0F766E' },
    { action: 'en_impression', label: 'Passer en impression', icon: Printer, show: p.status === 'bat_valide', color: '#6D28D9' },
    { action: 'prete', label: 'Carte prête', icon: PackageCheck, show: p.status === 'en_impression', color: '#15803D' },
    { action: 'livree', label: 'Livrée', icon: Truck, show: p.status === 'prete', color: '#166534' },
    { action: 'cancel', label: 'Annuler', icon: Ban, show: ['pending_payment', 'payment_submitted', 'rejected'].includes(p.status), color: '#6B7280' },
    { action: 'resend', label: 'Renvoyer la dernière notification', icon: Send, show: true, color: '#2E7D32' },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <aside className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{p?.reference || 'Précommande'}</p>
            {p && <StatusBadge status={p.status} />}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        {isLoading || !p ? (
          <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-[#2E7D32]" /></div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="flex flex-wrap gap-2">
              {buttons.filter((b) => b.show).map((b) => (
                <button key={b.action} onClick={() => setAction(b.action)}
                  className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border"
                  style={b.action === 'validate' ? { background: b.color, color: '#fff', borderColor: b.color } : { color: b.color, borderColor: '#E5E7EB' }}>
                  <b.icon size={14} /> {b.label}
                </button>
              ))}
            </div>

            {p.bat_comment && ['design_en_cours', 'paid'].includes(p.status) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-bold text-xs uppercase tracking-wide mb-0.5">Correction demandée par le client</p>
                « {p.bat_comment} »
              </div>
            )}

            <ItemsBlock order={p} items={data.items || []} />

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Preuve de paiement Wave</p>
              {p.payment_proof_url ? (
                /\.pdf($|\?)/i.test(p.payment_proof_url) ? (
                  <a href={p.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#2E7D32] underline">Ouvrir la preuve (PDF)</a>
                ) : (
                  <a href={p.payment_proof_url} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                    <img src={p.payment_proof_url} alt="Capture du paiement Wave" className="max-h-72 rounded-xl border border-gray-200 object-contain bg-gray-50" />
                  </a>
                )
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Aucune capture envoyée par le client.</p>
              )}
              {p.status === 'payment_submitted' && (
                <p className="text-[11px] text-gray-500 mt-1.5">Comparez le montant, la date et l'identifiant de transaction avec Wave Business avant de valider.</p>
              )}
            </div>

            <dl className="text-sm divide-y divide-gray-100 border-y border-gray-100">
              {([
                ['Client', p.full_name],
                ['Nom sur la carte', p.card_name],
                ['E-mail', p.email],
                ['Téléphone', p.phone],
                ['Ville', p.city || '—'],
                ['Quantité', String(p.quantity)],
                ['Offre', p.offer_name || 'Standard'],
                ['Montant', `${formatFcfa(p.total_amount)} (${formatFcfa(p.unit_price)} / carte)`],
                ['Transaction Wave', p.wave_transaction_id || '—'],
                ['Numéro Wave payeur', p.wave_sender_phone || '—'],
                ['Motif', p.rejection_reason || '—'],
                ['Rappels envoyés', String(p.client_reminder_count)],
                ['Créée le', fmtDate(p.created_at)],
                ['Paiement déclaré le', fmtDate(p.payment_submitted_at)],
                ['Payée le', fmtDate(p.paid_at)],
                ['Commande', p.commande_id ? `#${p.commande_id}` : '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-gray-500 shrink-0">{k}</dt>
                  <dd className="font-medium text-gray-900 text-right break-all">
                    {k === 'Transaction Wave' && p.wave_transaction_id ? <CopyText value={p.wave_transaction_id} /> : v}
                  </dd>
                </div>
              ))}
            </dl>
            <a href={waLink(p.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E7D32]">
              <MessageCircle size={15} /> Écrire au client sur WhatsApp
            </a>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">E-mails envoyés</p>
              {data.notifications.length === 0 ? <p className="text-sm text-gray-400">Aucun e-mail journalisé.</p> : (
                <ul className="space-y-1.5">
                  {data.notifications.map((n) => (
                    <li key={n.id} className="text-xs flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                      <span><span className="font-semibold">{n.template}</span> → {n.audience === 'admin' ? 'admin' : n.recipient}{n.error && <span className="block text-red-600">{n.error}</span>}</span>
                      <span className="shrink-0 text-right">
                        <span className={n.status === 'sent' ? 'text-[#2E7D32] font-bold' : 'text-red-600 font-bold'}>{n.status === 'sent' ? 'envoyé' : 'échec'}</span>
                        <span className="block text-gray-400">{fmtDate(n.created_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Événements transmis à n8n</p>
              <ul className="space-y-1.5">
                {data.events.map((e) => (
                  <li key={e.id} className="text-xs flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span><span className="font-semibold">{e.event}</span>{e.last_error && !e.delivered_at && <span className="block text-red-600">{e.last_error} ({e.attempts} essai{e.attempts > 1 ? 's' : ''})</span>}</span>
                    <span className="shrink-0 text-right">
                      <span className={e.delivered_at ? 'text-[#2E7D32] font-bold' : 'text-amber-600 font-bold'}>{e.delivered_at ? 'reçu' : 'en attente'}</span>
                      <span className="block text-gray-400">{fmtDate(e.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>
      {action && p && <ConfirmAction action={action} preorder={p} onClose={() => setAction(null)} />}
    </div>
  );
}

// ── Réglages (prix, numéro Wave…) ─────────────────────────────────────────────

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useNfcSettings();
  const update = useUpdateNfcSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (data) setForm({
      wave_number: data.wave_number, batch_threshold: String(data.batch_threshold),
      max_quantity: String(data.max_quantity), expiry_hours: String(data.expiry_hours), wave_link: data.wave_link,
      wave_link_supports_amount: data.wave_link_supports_amount,
    });
  }, [data]);

  const save = async () => {
    try {
      await update.mutateAsync({
        wave_number: String(form.wave_number), batch_threshold: Number(form.batch_threshold),
        max_quantity: Number(form.max_quantity), expiry_hours: Number(form.expiry_hours), wave_link: String(form.wave_link || ''),
        wave_link_supports_amount: !!form.wave_link_supports_amount,
      });
      toast({ title: '✓ Réglages enregistrés' });
      onClose();
    } catch (e) {
      toast({ title: (e as Error).message || 'Enregistrement impossible', variant: 'destructive' });
    }
  };

  const field = (key: string, label: string, hint?: string, type = 'text') => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <input type={type} value={String(form[key] ?? '')} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32]" />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Réglages de la carte NFC</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {isLoading ? <Loader2 className="animate-spin mx-auto text-[#2E7D32]" /> : (
          <>
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Les prix se modifient par offre, dans <a href="/admin/nfc-offers" className="font-semibold text-[#2E7D32] underline">Offres NFC</a>.</p>
            {field('wave_number', 'Numéro Wave marchand')}
            <div className="grid grid-cols-3 gap-3">
              {field('batch_threshold', 'Taille d\'un lot', undefined, 'number')}
              {field('max_quantity', 'Qté max', undefined, 'number')}
              {field('expiry_hours', 'Délai (h)', undefined, 'number')}
            </div>
            {field('wave_link', 'Lien de paiement Wave (optionnel)', 'Lien marchand Wave Business. Laisser vide pour n\'afficher que le numéro.')}
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={!!form.wave_link_supports_amount}
                onChange={(e) => setForm((f) => ({ ...f, wave_link_supports_amount: e.target.checked }))} className="accent-[#2E7D32]" />
              Le lien accepte le montant en paramètre (?amount=)
            </label>
            <button onClick={save} disabled={update.isPending}
              className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
              {update.isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NfcPreordersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const refParam = searchParams.get('ref') || '';
  const { data: stats } = useNfcPreorderStats();
  const { toast } = useToast();

  const [tab, setTab] = useState<'' | PreorderStatus | null>(
    refParam ? '' : (searchParams.get('status') && searchParams.get('status')! in STATUS_META ? searchParams.get('status') as PreorderStatus : null));
  const [search, setSearch] = useState(refParam);
  const [q, setQ] = useState(refParam);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Onglet par défaut : « À valider » s'il y en a, sinon « Toutes »
  useEffect(() => {
    if (tab === null && stats) setTab(stats.by_status.payment_submitted > 0 ? 'payment_submitted' : '');
  }, [stats, tab]);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const status = tab ?? '';
  const { data, isLoading, isError } = useNfcPreorders({ status: status || undefined, q: q || undefined, page, limit: PAGE_SIZE });
  const liste = data?.liste ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  // ?ref=PF-NFC-0007 (lien des e-mails admin) ouvre directement la précommande
  useEffect(() => {
    if (!refParam || openId) return;
    const hit = liste.find((p) => p.reference === refParam);
    if (hit) setOpenId(hit.id);
  }, [refParam, liste, openId]);

  const closeDetail = () => {
    setOpenId(null);
    if (refParam) { searchParams.delete('ref'); setSearchParams(searchParams, { replace: true }); }
  };

  const handleExport = () => {
    exportPreordersCsv({ status: status || undefined, q: q || undefined }).catch(() => toast({ title: 'Export échoué', variant: 'destructive' }));
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <div style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><ShoppingBag size={18} className="text-white" /></div>
              <div>
                <h1 className="text-2xl font-bold text-white">Commandes de cartes NFC</h1>
                <p className="text-white/70 text-sm">Paiements Wave, bons à tirer, impression et livraison</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSettings(true)} className="h-9 px-4 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10 flex items-center gap-2">
                <Settings size={15} /> Réglages
              </button>
              <button onClick={handleExport} className="h-9 px-4 rounded-xl bg-white text-sm font-bold flex items-center gap-2 hover:bg-white/90" style={{ color: '#2E7D32' }}>
                <Download size={15} /> Exporter CSV
              </button>
            </div>
          </div>

          <PrintBatchBlock queue={stats?.print_queue ?? 0} threshold={stats?.print_batch_threshold ?? 10}
            summary={`${stats?.paid_count ?? 0} commande(s) payée(s) · ${stats?.paid_cards ?? 0} carte(s) · ${formatFcfa(stats?.paid_amount ?? 0)}`} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const count = t.key ? stats?.by_status[t.key] ?? 0 : undefined;
              const active = status === t.key;
              return (
                <button key={t.label} onClick={() => { setTab(t.key); setPage(1); }}
                  className="h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors"
                  style={active ? { background: '#2E7D32', color: '#fff', borderColor: '#2E7D32' } : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}>
                  {t.label}{count !== undefined && count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
          <div className="relative w-full lg:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Référence, nom, e-mail, téléphone, transaction…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#2E7D32]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#2E7D32' }}>
                <th className="px-4 py-3">Référence</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3 text-center">Qté</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Transaction Wave</th><th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 size={26} className="animate-spin text-[#2E7D32] inline" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={8} className="py-16 text-center text-red-500">Erreur de chargement</td></tr>
              ) : liste.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-500">Aucune précommande{status ? ' dans cet onglet' : ''}.</td></tr>
              ) : liste.map((p) => (
                <tr key={p.id} onClick={() => setOpenId(p.id)} className="border-t border-gray-50 hover:bg-green-50/40 cursor-pointer">
                  <td className="px-4 py-3"><span className="font-mono font-semibold text-gray-900">{p.reference}</span><span className="block text-[11px] text-gray-500">{p.offer_name || 'Standard'}</span></td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{p.full_name}</p><p className="text-xs text-gray-400">{p.email}</p></td>
                  <td className="px-4 py-3">
                    <a href={waLink(p.phone)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#2E7D32] hover:underline">{p.phone}</a>
                  </td>
                  <td className="px-4 py-3 text-center">{p.quantity}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatFcfa(p.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">{p.wave_transaction_id ? <CopyText value={p.wave_transaction_id} /> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} / {totalPages} · {data?.total ?? 0} précommandes</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((x) => Math.max(1, x - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage((x) => Math.min(totalPages, x + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {openId && <DetailPanel id={openId} onClose={closeDetail} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}
