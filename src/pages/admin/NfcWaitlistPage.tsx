import React, { useState, useMemo } from 'react';
import { Users, Download, Mail, Trash2, Wifi, Loader2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useNfcWaitlist,
  useDeleteFromWaitlist,
  useNotifyWaitlist,
  formatDateInscription,
  type WaitlistEntry,
} from '@/hooks/useNfcWaitlist';

const API_BASE = import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://portefolia.tech');

const PAGE_SIZE = 20;

// ── Sous-composants ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E8F5E9' }}>
        <Icon size={18} style={{ color: '#2E7D32' }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({ entry, onConfirm, onCancel, loading }: {
  entry: WaitlistEntry;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900">Confirmer la suppression</h3>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          Êtes-vous sûr de vouloir retirer cet email de la liste d'attente ?
        </p>
        <p className="text-sm font-semibold text-gray-900 bg-gray-50 rounded-lg px-3 py-2 mb-5 break-all">{entry.email}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifyDialog({ total, onClose }: { total: number; onClose: () => void }) {
  const [sujet, setSujet]       = useState('');
  const [message, setMessage]   = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const notify = useNotifyWaitlist();

  const handleSend = async () => {
    if (!sujet.trim() || !message.trim()) return;
    try {
      const r = await notify.mutateAsync({ sujet: sujet.trim(), message: message.trim() });
      if (r.echecs > 0) {
        toast({ title: `${r.envoyes} envoyés, ${r.echecs} échecs`, variant: 'destructive' });
      } else {
        toast({ title: `✓ ${r.envoyes} email${r.envoyes > 1 ? 's' : ''} envoyé${r.envoyes > 1 ? 's' : ''} avec succès` });
      }
      onClose();
    } catch {
      toast({ title: 'Erreur lors de l\'envoi', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32)', borderRadius: '16px 16px 0 0' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Notifier tout le monde</h2>
              <p className="text-white/70 text-xs">{total.toLocaleString('fr-FR')} inscrits</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Avertissement */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">
              Cette action enverra un email à <strong>TOUS les inscrits</strong> sur la liste ({total.toLocaleString('fr-FR')} personnes). Cette action est irréversible.
            </p>
          </div>

          {/* Champs */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sujet de l'email <span className="text-red-500">*</span></label>
            <input
              value={sujet}
              onChange={e => setSujet(e.target.value)}
              placeholder="🎉 Les cartes NFC Portefolia sont disponibles !"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
            <textarea
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Bonjour,\nNous avons le plaisir de vous annoncer que les cartes NFC Portefolia sont disponibles !\n...`}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] transition-colors resize-none"
            />
          </div>

          {/* Aperçu */}
          {message && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aperçu email</p>
              <div className="rounded-xl overflow-hidden border border-gray-100 text-xs shadow-sm">
                <div className="px-5 py-4 text-center" style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32)' }}>
                  <p className="text-white font-bold text-sm">Carte NFC Portefolia</p>
                </div>
                <div className="px-5 py-4 bg-white">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
                  <div className="mt-3 text-center">
                    <span className="inline-block px-4 py-2 rounded-lg text-white text-xs font-bold" style={{ background: '#2E7D32' }}>
                      Découvrir la carte NFC
                    </span>
                  </div>
                </div>
                <div className="px-5 py-3 bg-gray-50 text-center text-gray-400 text-[10px] border-t border-gray-100">
                  Portefolia · contact@portefolia.tech
                </div>
              </div>
            </div>
          )}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#2E7D32]" />
            <span className="text-xs text-gray-700 leading-relaxed">
              Je confirme vouloir envoyer cet email à <strong>tous les inscrits</strong>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSend}
            disabled={!confirmed || !sujet.trim() || !message.trim() || notify.isPending}
            className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}
          >
            {notify.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Envoyer les notifications
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function NfcWaitlistPage() {
  const { data, isLoading, isError } = useNfcWaitlist();
  const deleteEntry = useDeleteFromWaitlist();
  const { toast } = useToast();

  const [page, setPage]               = useState(1);
  const [toDelete, setToDelete]       = useState<WaitlistEntry | null>(null);
  const [showNotify, setShowNotify]   = useState(false);
  const [deletingId, setDeletingId]   = useState<number | null>(null);

  const liste = data?.liste ?? [];
  const total = data?.total ?? 0;

  const now   = new Date();
  const today = liste.filter(e => {
    const d = new Date(e.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;
  const week = liste.filter(e => (now.getTime() - new Date(e.created_at).getTime()) < 7 * 24 * 3600 * 1000).length;

  const totalPages = Math.max(1, Math.ceil(liste.length / PAGE_SIZE));
  const paginated  = useMemo(() => liste.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [liste, page]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeletingId(toDelete.id);
    try {
      await deleteEntry.mutateAsync(toDelete.id);
      toast({ title: 'Email retiré de la liste' });
    } catch {
      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const url   = `${API_BASE}/api/admin/nfc-waitlist/export`;
    const a     = document.createElement('a');
    a.href      = url + (token ? `?token=${token}` : '');
    a.click();
  };

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Wifi size={18} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Liste d'attente NFC</h1>
              {total > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.25)' }}>
                  {total.toLocaleString('fr-FR')} inscrits
                </span>
              )}
            </div>
            <p className="text-white/70 text-sm ml-12">Gestion des inscriptions et notifications</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="h-9 px-4 rounded-xl border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2">
              <Download size={15} /> Exporter CSV
            </button>
            <button onClick={() => setShowNotify(true)} disabled={total === 0}
              className="h-9 px-4 rounded-xl bg-white text-sm font-bold flex items-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
              style={{ color: '#2E7D32' }}>
              <Mail size={15} /> Notifier tout le monde
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Total inscrits"          value={total} icon={Users} />
          <KpiCard label="Inscrits cette semaine"  value={week}  icon={Wifi}  />
          <KpiCard label="Inscrits aujourd'hui"    value={today} icon={Mail}  />
        </div>

        {/* ── Tableau ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_180px_60px] gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white"
            style={{ background: '#2E7D32' }}>
            <span className="text-center">#</span>
            <span className="flex items-center gap-1.5"><Mail size={11} /> Email</span>
            <span>Date d'inscription</span>
            <span className="text-center">Action</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#2E7D32]" />
            </div>
          ) : isError ? (
            <div className="text-center py-16 text-red-500 text-sm">Erreur de chargement</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Wifi size={24} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700">Aucune inscription pour l'instant</p>
              <p className="text-sm text-gray-400 mt-1">La liste d'attente est vide.</p>
            </div>
          ) : (
            paginated.map((entry, idx) => {
              const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
              const isEven = idx % 2 === 1;
              return (
                <div key={entry.id}
                  className="grid grid-cols-[40px_1fr_180px_60px] gap-2 px-5 py-3.5 items-center border-t border-gray-50 transition-colors hover:bg-green-50/30"
                  style={{ background: isEven ? '#F0FFF4' : '#fff' }}>
                  <span className="text-center text-xs font-bold text-gray-400">{rowNum}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{entry.email}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{formatDateInscription(entry.created_at)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => setToDelete(entry)}
                      className="w-8 h-8 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {page} / {totalPages} · {liste.length} entrées
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {toDelete && (
        <ConfirmDeleteDialog
          entry={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deletingId === toDelete.id}
        />
      )}
      {showNotify && <NotifyDialog total={total} onClose={() => setShowNotify(false)} />}
    </div>
  );
}
