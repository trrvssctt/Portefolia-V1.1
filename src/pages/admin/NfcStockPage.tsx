import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes, Plus, Download, PackageCheck, Search, Loader2, X, AlertTriangle, Settings,
  ChevronLeft, ChevronRight, Ban, RotateCcw, UserPlus, Copy, Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useNfcStock, useNfcBatches, useNfcCardList, useNfcCardMutation, downloadBatchExport,
  CARD_STATUS_META, STOCK_TYPE_LABELS, type CardBatch, type PhysicalCard, type StockType, type CardStatus,
} from '@/hooks/useNfcCards';
import { useNfcSettings, useUpdateNfcSettings } from '@/hooks/useNfcPreorders';

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function Badge({ statut }: { statut: CardStatus }) {
  const m = CARD_STATUS_META[statut];
  return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ color: m.color, background: m.bg }}>{m.label}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32]';

// ── Génération d'un lot ───────────────────────────────────────────────────────

function NewBatchDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<StockType>('logo_printed');
  const [quantity, setQuantity] = useState('200');
  const [supplier, setSupplier] = useState('Alibaba');
  const [notes, setNotes] = useState('');
  const m = useNfcCardMutation();
  const { toast } = useToast();

  const submit = async () => {
    try {
      await m.mutateAsync({ path: '/batches', method: 'POST', body: { type_stock: type, quantity: Number(quantity), supplier, notes } });
      toast({ title: `✓ ${quantity} codes générés`, description: "Exportez la liste des URL (CSV, s'ouvre dans Excel) pour le fournisseur." });
      onClose();
    } catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <Modal title="Générer un lot de codes" onClose={onClose}>
      <p className="text-xs text-gray-500">Chaque carte reçoit un code unique de 6 caractères, encodé dans la puce sous la forme <span className="font-mono">https://portefolia.tech/c/CODE</span>. Les cartes restent « en commande » jusqu'à la réception du lot.</p>
      <div className="grid grid-cols-2 gap-2">
        {(['logo_printed', 'blank'] as StockType[]).map((t) => (
          <button key={t} type="button" onClick={() => { setType(t); setQuantity(t === 'blank' ? '10' : '200'); }}
            className="h-11 rounded-xl border text-sm font-semibold"
            style={type === t ? { borderColor: '#2E7D32', background: '#F0FFF4', color: '#1B5E20' } : { borderColor: '#E5E7EB', color: '#374151' }}>
            {STOCK_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div><label className="block text-xs font-semibold text-gray-700 mb-1">Quantité (1 à 1000)</label>
        <input type="number" min={1} max={1000} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} /></div>
      <div><label className="block text-xs font-semibold text-gray-700 mb-1">Fournisseur</label>
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} /></div>
      <div><label className="block text-xs font-semibold text-gray-700 mb-1">Notes (n° de commande fournisseur…)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
      <button onClick={submit} disabled={m.isPending || !Number(quantity)}
        className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
        {m.isPending && <Loader2 size={14} className="animate-spin" />} Générer les codes
      </button>
    </Modal>
  );
}

// ── Seuils ────────────────────────────────────────────────────────────────────

function ThresholdsDialog({ onClose }: { onClose: () => void }) {
  const { data } = useNfcSettings();
  const update = useUpdateNfcSettings();
  const { toast } = useToast();
  const [f, setF] = useState({ stock_alert_logo_printed: '', stock_alert_blank: '', print_batch_threshold: '' });
  useEffect(() => {
    if (data) setF({
      stock_alert_logo_printed: String(data.stock_alert_logo_printed ?? 20),
      stock_alert_blank: String(data.stock_alert_blank ?? 3),
      print_batch_threshold: String(data.print_batch_threshold ?? 10),
    });
  }, [data]);
  const save = async () => {
    try {
      await update.mutateAsync({
        stock_alert_logo_printed: Number(f.stock_alert_logo_printed),
        stock_alert_blank: Number(f.stock_alert_blank),
        print_batch_threshold: Number(f.print_batch_threshold),
      });
      toast({ title: '✓ Seuils enregistrés' });
      onClose();
    } catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };
  const field = (k: keyof typeof f, label: string, hint: string) => (
    <div><label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <input type="number" min={1} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={inputCls} />
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p></div>
  );
  return (
    <Modal title="Seuils d'alerte" onClose={onClose}>
      {field('stock_alert_logo_printed', 'Alerte stock « logo imprimé »', 'Alerte quand le stock disponible passe sous ce nombre.')}
      {field('stock_alert_blank', 'Alerte stock « vierge »', 'Les commandes Premium sont bloquées à 0.')}
      {field('print_batch_threshold', "Lot d'impression locale", 'Alerte admin dès que ce nombre de cartes a un BAT validé.')}
      <button onClick={save} disabled={update.isPending}
        className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
        {update.isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
      </button>
    </Modal>
  );
}

// ── Actions sur une carte ─────────────────────────────────────────────────────

function CardActionDialog({ card, onClose }: { card: PhysicalCard; onClose: () => void }) {
  const m = useNfcCardMutation();
  const { toast } = useToast();
  const [email, setEmail] = useState(card.user_email || '');
  const [reason, setReason] = useState('');
  const run = async (path: string, body: unknown, ok: string) => {
    try { await m.mutateAsync({ path, body }); toast({ title: ok }); onClose(); }
    catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };
  const disabled = card.statut === 'desactivee';

  return (
    <Modal title={`Carte ${card.code}`} onClose={onClose}>
      <div className="text-sm space-y-1">
        <p><Badge statut={card.statut} /> <span className="text-gray-500 ml-1">{card.type_label}</span></p>
        <p className="font-mono text-xs text-gray-500 break-all">{card.url}</p>
        {card.user_email && <p>Titulaire : <strong>{card.user_name || card.user_email}</strong> ({card.user_email})</p>}
        {card.portfolio_slug && <p>Portfolio : /portfolio/{card.portfolio_slug}</p>}
        <p className="text-gray-500">{card.tap_count} tap{card.tap_count > 1 ? 's' : ''}{card.last_tap_at ? ` · dernier le ${fmtDate(card.last_tap_at)}` : ''}</p>
        {card.deactivation_reason && <p className="text-red-700">Motif : {card.deactivation_reason}</p>}
      </div>

      {disabled ? (
        <button onClick={() => run(`/${card.id}/reactivate`, {}, '✓ Carte réactivée')} disabled={m.isPending}
          className="w-full h-10 rounded-xl border border-gray-200 text-sm font-semibold flex items-center justify-center gap-2"><RotateCcw size={14} /> Réactiver</button>
      ) : (
        <>
          {card.statut !== 'en_commande' && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-700">{card.user_id ? 'Réattribuer à un autre compte' : 'Attribuer manuellement'}</p>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@client.com" className={inputCls} />
              <button onClick={() => run(`/${card.id}/assign`, { email }, '✓ Carte attribuée')} disabled={m.isPending || !email.trim()}
                className="w-full h-9 rounded-lg border border-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"><UserPlus size={13} /> Attribuer</button>
            </div>
          )}
          {card.user_id && (
            <div className="flex gap-2 flex-wrap border-t border-gray-100 pt-3">
              {(['attribuee', 'imprimee', 'livree'] as CardStatus[]).filter((s) => s !== card.statut).map((s) => (
                <button key={s} onClick={() => run(`/${card.id}/status`, { statut: s }, `✓ ${CARD_STATUS_META[s].label}`)} disabled={m.isPending}
                  className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Passer « {CARD_STATUS_META[s].label} »</button>
              ))}
              <button onClick={() => run(`/${card.id}/status`, { statut: 'en_stock' }, '✓ Carte remise en stock')} disabled={m.isPending}
                className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Remettre en stock</button>
            </div>
          )}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-red-700">Désactiver (perte, vol, remplacement)</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif" className={inputCls} />
            <button onClick={() => run(`/${card.id}/deactivate`, { reason }, '✓ Carte désactivée')} disabled={m.isPending || reason.trim().length < 3}
              className="w-full h-9 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"><Ban size={13} /> Désactiver</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(code).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }); }}
      className="inline-flex items-center gap-1 font-mono font-bold text-gray-900 hover:text-[#2E7D32]">
      {code}{done ? <Check size={12} /> : <Copy size={12} className="text-gray-300" />}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NfcStockPage() {
  const [params] = useSearchParams();
  const { data: stock } = useNfcStock();
  const { data: batchData } = useNfcBatches();
  const receive = useNfcCardMutation();
  const { toast } = useToast();

  const [showNew, setShowNew] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [selected, setSelected] = useState<PhysicalCard | null>(null);
  const [statut, setStatut] = useState('');
  const [type, setType] = useState('');
  const [batchId, setBatchId] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');
  const [q, setQ] = useState(params.get('q') || '');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const { data: list, isLoading } = useNfcCardList({ statut, type_stock: type, batch_id: batchId, q, page });
  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / 50));

  const exportBatch = (b: CardBatch, f: 'csv') => downloadBatchExport(b, f).catch(() => toast({ title: 'Export échoué', variant: 'destructive' }));
  const receiveBatch = async (b: CardBatch) => {
    if (!window.confirm(`Confirmer la réception du lot n°${b.id} (${b.quantity} cartes « ${STOCK_TYPE_LABELS[b.type_stock]} ») ? Les cartes passeront en stock.`)) return;
    try { await receive.mutateAsync({ path: `/batches/${b.id}/receive` }); toast({ title: `✓ Lot n°${b.id} en stock` }); }
    catch (e) { toast({ title: (e as Error).message, variant: 'destructive' }); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <div style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Boxes size={18} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">Stock & codes NFC</h1>
              <p className="text-white/70 text-sm">Cartes physiques, lots fournisseur et URL à encoder</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowThresholds(true)} className="h-9 px-4 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10 flex items-center gap-2"><Settings size={15} /> Seuils</button>
            <button onClick={() => setShowNew(true)} className="h-9 px-4 rounded-xl bg-white text-sm font-bold flex items-center gap-2" style={{ color: '#2E7D32' }}><Plus size={15} /> Générer un lot</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stock par type */}
        <div className="grid sm:grid-cols-2 gap-4">
          {(stock?.types ?? []).map((t) => (
            <div key={t.type_stock} className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: t.low ? '#FCA5A5' : '#F3F4F6' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t.label}</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">{t.available}<span className="text-sm font-semibold text-gray-400"> disponibles</span></p>
                </div>
                {t.low && <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full"><AlertTriangle size={12} /> Sous le seuil ({t.threshold})</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                <span>En commande : <strong className="text-gray-800">{t.en_commande}</strong></span>
                <span>Attribuées : <strong className="text-gray-800">{t.attribuee}</strong></span>
                <span>Imprimées : <strong className="text-gray-800">{t.imprimee}</strong></span>
                <span>Livrées : <strong className="text-gray-800">{t.livree}</strong></span>
                <span>Désactivées : <strong className="text-gray-800">{t.desactivee}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Lots */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-100 font-bold text-sm text-gray-900">Lots fournisseur</div>
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-5 py-2">Lot</th><th className="px-5 py-2">Type</th><th className="px-5 py-2">Cartes</th><th className="px-5 py-2">Fournisseur</th><th className="px-5 py-2">Statut</th><th className="px-5 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {(batchData?.batches ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">Aucun lot. Générez les codes avant de passer commande au fournisseur.</td></tr>
              ) : batchData!.batches.map((b) => (
                <tr key={b.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-semibold">n°{b.id}<span className="block text-xs text-gray-400 font-normal">{fmtDate(b.created_at)}</span></td>
                  <td className="px-5 py-3">{STOCK_TYPE_LABELS[b.type_stock]}</td>
                  <td className="px-5 py-3">{b.cards}{b.used > 0 && <span className="text-xs text-gray-400"> · {b.used} utilisées</span>}</td>
                  <td className="px-5 py-3">{b.supplier || '—'}{b.notes && <span className="block text-xs text-gray-400">{b.notes}</span>}</td>
                  <td className="px-5 py-3">{b.status === 'recu'
                    ? <span className="text-xs font-bold text-[#1B5E20]">Reçu le {fmtDate(b.received_at)}</span>
                    : <span className="text-xs font-bold text-amber-700">En commande</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => exportBatch(b, 'csv')} title="Fichier CSV, s'ouvre dans Excel" className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1"><Download size={12} /> Export Excel (CSV)</button>
                      {b.status !== 'recu' && (
                        <button onClick={() => receiveBatch(b)} className="h-8 px-2.5 rounded-lg text-white text-xs font-bold flex items-center gap-1" style={{ background: '#2E7D32' }}><PackageCheck size={12} /> Marquer reçu</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cartes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-2 justify-between">
            <p className="font-bold text-sm text-gray-900">Cartes ({list?.total ?? 0})</p>
            <div className="flex flex-wrap gap-2">
              <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Tous les statuts</option>
                {(Object.keys(CARD_STATUS_META) as CardStatus[]).map((s) => <option key={s} value={s}>{CARD_STATUS_META[s].label}</option>)}
              </select>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Tous les types</option>
                <option value="logo_printed">Logo imprimé</option>
                <option value="blank">Vierge</option>
              </select>
              <select value={batchId} onChange={(e) => { setBatchId(e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Tous les lots</option>
                {(batchData?.batches ?? []).map((b) => <option key={b.id} value={b.id}>Lot n°{b.id}</option>)}
              </select>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, e-mail, commande…" className="h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm w-56" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead><tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-5 py-2">Code</th><th className="px-5 py-2">Type</th><th className="px-5 py-2">Statut</th><th className="px-5 py-2">Titulaire</th><th className="px-5 py-2">Commande</th><th className="px-5 py-2">Taps</th><th className="px-5 py-2">Lot</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="animate-spin inline text-[#2E7D32]" /></td></tr>
                ) : (list?.liste ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-500">Aucune carte.</td></tr>
                ) : list!.liste.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="border-t border-gray-50 hover:bg-green-50/40 cursor-pointer">
                    <td className="px-5 py-2.5"><CopyCode code={c.code} /></td>
                    <td className="px-5 py-2.5 text-gray-600">{c.type_label}</td>
                    <td className="px-5 py-2.5"><Badge statut={c.statut} /></td>
                    <td className="px-5 py-2.5">{c.user_email ? <><span className="font-medium">{c.user_name || c.user_email}</span><span className="block text-xs text-gray-400">{c.user_email}</span></> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{c.order_reference || '—'}</td>
                    <td className="px-5 py-2.5">{c.tap_count}</td>
                    <td className="px-5 py-2.5 text-gray-500">{c.batch_id ? `n°${c.batch_id}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} / {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((x) => Math.max(1, x - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage((x) => Math.min(totalPages, x + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewBatchDialog onClose={() => setShowNew(false)} />}
      {showThresholds && <ThresholdsDialog onClose={() => setShowThresholds(false)} />}
      {selected && <CardActionDialog card={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
