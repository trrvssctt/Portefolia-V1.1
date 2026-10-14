import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tags, Loader2, X, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NFC_API_BASE, formatFcfa } from '@/hooks/useNfcConfig';

interface OfferOptions {
  print_faces: 'info' | 'both';
  allow_templates: boolean;
  allow_colors: boolean;
  allow_photo: boolean;
  allow_logo: boolean;
  allow_notes: boolean;
  needs_design: boolean;
  block_without_stock: boolean;
  features: string[];
}
interface AdminOffer {
  id: number;
  code: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number | null;
  stock_type: 'logo_printed' | 'blank' | null;
  is_quote: boolean;
  is_active: boolean;
  sort_order: number;
  options: OfferOptions;
}

const BASE = `${NFC_API_BASE}/api/admin/nfc-offers`;
const STOCK_LABEL = { logo_printed: 'Carte « logo imprimé »', blank: 'Carte vierge' };
const FLAGS: { key: keyof OfferOptions; label: string }[] = [
  { key: 'allow_templates', label: 'Choix du gabarit' },
  { key: 'allow_colors', label: 'Choix des couleurs' },
  { key: 'allow_photo', label: 'Photo' },
  { key: 'allow_logo', label: 'Logo du client' },
  { key: 'allow_notes', label: 'Notes de design' },
  { key: 'needs_design', label: 'BAT préparé par un designer' },
  { key: 'block_without_stock', label: 'Bloquer sans stock' },
];
const inputCls = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32]';

function authHeaders(json = false): Record<string, string> {
  const t = localStorage.getItem('token');
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

function EditDialog({ offer, onClose }: { offer: AdminOffer; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({
    name: offer.name, tagline: offer.tagline || '', description: offer.description || '',
    price: offer.price === null ? '' : String(offer.price), is_active: offer.is_active, sort_order: String(offer.sort_order),
    features: (offer.options.features || []).join('\n'),
    flags: Object.fromEntries(FLAGS.map((x) => [x.key, !!offer.options[x.key]])) as Record<string, boolean>,
  });
  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}/${offer.id}`, {
        method: 'PUT', headers: authHeaders(true),
        body: JSON.stringify({
          name: f.name, tagline: f.tagline, description: f.description,
          price: offer.is_quote && f.price === '' ? null : Number(f.price),
          is_active: f.is_active, sort_order: Number(f.sort_order),
          options: { ...f.flags, features: f.features.split('\n').map((x) => x.trim()).filter(Boolean) },
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Enregistrement impossible');
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'nfc-offers'] });
      qc.invalidateQueries({ queryKey: ['nfc-offers'] });
      toast({ title: `✓ Offre ${f.name} enregistrée` });
      onClose();
    },
    onError: (e) => toast({ title: (e as Error).message, variant: 'destructive' }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Offre « {offer.code} »</h3>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nom</label><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-gray-700 mb-1">Prix (F CFA){offer.is_quote ? ' — vide = sur devis' : ''}</label><input type="number" className={inputCls} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        </div>
        <div><label className="block text-xs font-semibold text-gray-700 mb-1">Accroche</label><input className={inputCls} maxLength={160} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></div>
        <div><label className="block text-xs font-semibold text-gray-700 mb-1">Description</label><textarea rows={2} maxLength={500} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] resize-none" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><label className="block text-xs font-semibold text-gray-700 mb-1">Arguments affichés (un par ligne, 8 max)</label><textarea rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2E7D32] resize-none" value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          {FLAGS.map((x) => (
            <label key={x.key} className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" className="accent-[#2E7D32]" checked={f.flags[x.key]} onChange={(e) => setF({ ...f, flags: { ...f.flags, [x.key]: e.target.checked } })} />{x.label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="accent-[#2E7D32]" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Offre visible</label>
          <label className="flex items-center gap-2 text-sm text-gray-700">Ordre <input type="number" className="w-16 h-9 px-2 rounded-lg border border-gray-200" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></label>
        </div>
        <p className="text-[11px] text-gray-400">Le nouveau prix s'applique aux nouvelles commandes ; les commandes existantes gardent le leur.</p>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#2E7D32,#1BC29A)' }}>
          {save.isPending && <Loader2 size={14} className="animate-spin" />} Enregistrer
        </button>
      </div>
    </div>
  );
}

export default function NfcOffersPage() {
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const { data, isLoading, isError } = useQuery<{ offers: AdminOffer[] }>({
    queryKey: ['admin', 'nfc-offers'],
    queryFn: async () => {
      const r = await fetch(BASE, { headers: authHeaders() });
      if (!r.ok) throw new Error('Chargement impossible');
      return r.json();
    },
  });
  useEffect(() => { document.title = 'Offres NFC | Admin Portefolia'; }, []);

  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <div style={{ background: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 100%)' }} className="px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><Tags size={18} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Offres de cartes NFC</h1>
            <p className="text-white/70 text-sm">Prix, options et arguments affichés sur la page des offres</p>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? <Loader2 className="animate-spin mx-auto text-[#2E7D32]" /> : isError ? <p className="text-red-600 text-sm">Erreur de chargement (droit « nfc:read » requis).</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data!.offers.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col" style={{ opacity: o.is_active ? 1 : 0.6 }}>
                <div className="flex items-start justify-between">
                  <p className="text-lg font-bold text-gray-900">{o.name}</p>
                  {!o.is_active && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Masquée</span>}
                </div>
                <p className="text-2xl font-black mt-1" style={{ color: '#1B5E20' }}>{o.price === null ? 'Sur devis' : formatFcfa(o.price)}</p>
                <p className="text-xs text-gray-500 mt-1">{o.stock_type ? STOCK_LABEL[o.stock_type] : 'Selon le volume'} · {o.options.print_faces === 'both' ? '2 faces imprimées' : 'face infos imprimée'}</p>
                <ul className="mt-3 space-y-1 text-xs text-gray-600 flex-1">
                  {(o.options.features || []).map((x) => <li key={x}>• {x}</li>)}
                </ul>
                <button onClick={() => setEditing(o)} className="mt-4 h-9 rounded-lg border border-gray-200 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50"><Pencil size={13} /> Modifier</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {editing && <EditDialog offer={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
