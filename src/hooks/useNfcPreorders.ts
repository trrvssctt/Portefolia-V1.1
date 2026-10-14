import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NFC_API_BASE } from './useNfcConfig';

export type PreorderStatus = 'pending_payment' | 'payment_submitted' | 'paid' | 'rejected' | 'expired' | 'cancelled' | 'converted'
  | 'design_en_cours' | 'bat_envoye' | 'bat_valide' | 'en_impression' | 'prete' | 'livree';

export interface Preorder {
  id: number;
  reference: string;
  full_name: string;
  card_name: string;
  email: string;
  phone: string;
  city: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: PreorderStatus;
  wave_transaction_id: string | null;
  wave_sender_phone: string | null;
  payment_proof_url: string | null;
  offer_code?: string | null;
  offer_name?: string | null;
  stock_type?: 'logo_printed' | 'blank' | null;
  bat_comment?: string | null;
  bat_revision?: number;
  rejection_reason: string | null;
  client_reminder_count: number;
  payment_submitted_at: string | null;
  paid_at: string | null;
  commande_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface PreorderEvent { id: string; event: string; attempts: number; delivered_at: string | null; last_error: string | null; created_at: string }
export interface PreorderNotification { id: number; channel: string; audience: string; template: string; recipient: string; status: 'sent' | 'failed'; error: string | null; created_at: string }

export interface PreorderStats {
  paid_count: number;
  batch_threshold: number;
  paid_cards: number;
  paid_amount: number;
  print_queue?: number;
  print_batch_threshold?: number;
  by_status: Record<PreorderStatus, number>;
}

export interface NfcSettings {
  unit_price: number;
  currency: string;
  max_quantity: number;
  batch_threshold: number;
  expiry_hours: number;
  wave_number: string;
  wave_link: string;
  wave_link_supports_amount: boolean;
  stock_alert_logo_printed?: number;
  stock_alert_blank?: number;
  print_batch_threshold?: number;
}

export const STATUS_META: Record<PreorderStatus, { label: string; color: string; bg: string }> = {
  payment_submitted: { label: 'À valider',       color: '#B45309', bg: '#FEF3C7' },
  pending_payment:   { label: 'Attente paiement', color: '#1D4ED8', bg: '#DBEAFE' },
  paid:              { label: 'Payée',           color: '#1B5E20', bg: '#DCFCE7' },
  rejected:          { label: 'Refusée',         color: '#B91C1C', bg: '#FEE2E2' },
  converted:         { label: 'En fabrication',  color: '#6D28D9', bg: '#EDE9FE' },
  design_en_cours:   { label: 'Design en cours', color: '#7C3AED', bg: '#EDE9FE' },
  bat_envoye:        { label: 'BAT envoyé',      color: '#C2410C', bg: '#FFEDD5' },
  bat_valide:        { label: 'BAT validé',      color: '#0F766E', bg: '#CCFBF1' },
  en_impression:     { label: 'En impression',   color: '#6D28D9', bg: '#EDE9FE' },
  prete:             { label: 'Prête',           color: '#15803D', bg: '#DCFCE7' },
  livree:            { label: 'Livrée',          color: '#166534', bg: '#BBF7D0' },
  expired:           { label: 'Expirée',         color: '#6B7280', bg: '#F3F4F6' },
  cancelled:         { label: 'Annulée',         color: '#6B7280', bg: '#F3F4F6' },
};

const BASE = `${NFC_API_BASE}/api/admin/nfc-preorders`;

function authHeaders(json = false): Record<string, string> {
  const token = localStorage.getItem('token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Erreur serveur');
  return data as T;
}

export function useNfcPreorders(filters: { status?: string; q?: string; page: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit ?? 20));
  return useQuery<{ total: number; page: number; limit: number; liste: Preorder[] }>({
    queryKey: ['admin', 'nfc-preorders', 'list', filters],
    queryFn: () => call(`${BASE}?${params.toString()}`, { headers: authHeaders() }),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useNfcPreorderStats() {
  return useQuery<PreorderStats>({
    queryKey: ['admin', 'nfc-preorders', 'stats'],
    queryFn: () => call(`${BASE}/stats`, { headers: authHeaders() }),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useNfcPreorderDetail(id: number | null) {
  return useQuery<{ preorder: Preorder; items: OrderItem[]; events: PreorderEvent[]; notifications: PreorderNotification[] }>({
    queryKey: ['admin', 'nfc-preorders', 'detail', id],
    queryFn: () => call(`${BASE}/${id}`, { headers: authHeaders() }),
    enabled: !!id,
  });
}

export function useNfcSettings() {
  return useQuery<NfcSettings>({
    queryKey: ['admin', 'nfc-preorders', 'settings'],
    queryFn: () => call(`${BASE}/settings`, { headers: authHeaders() }),
  });
}

export function useUpdateNfcSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<NfcSettings>) =>
      call<NfcSettings>(`${BASE}/settings`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'nfc-preorders'] });
      qc.invalidateQueries({ queryKey: ['nfc-config'] });
    },
  });
}

export type PreorderAction =
  | 'validate' | 'reject' | 'cancel' | 'resend'
  | 'design' | 'send_bat' | 'approve_bat' | 'en_impression' | 'prete' | 'livree';

// action → requête HTTP
const ACTION_REQUEST: Record<PreorderAction, { path: string; method: 'PUT' | 'POST'; body?: Record<string, string> }> = {
  validate: { path: 'validate', method: 'PUT' },
  reject: { path: 'reject', method: 'PUT' },
  cancel: { path: 'cancel', method: 'PUT' },
  resend: { path: 'resend', method: 'POST' },
  design: { path: 'design', method: 'PUT' },
  send_bat: { path: 'bat/send', method: 'PUT' },
  approve_bat: { path: 'bat/approve', method: 'PUT' },
  en_impression: { path: 'production', method: 'PUT', body: { to: 'en_impression' } },
  prete: { path: 'production', method: 'PUT', body: { to: 'prete' } },
  livree: { path: 'production', method: 'PUT', body: { to: 'livree' } },
};

export function usePreorderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: PreorderAction; reason?: string }) => {
      const r = ACTION_REQUEST[action];
      return call<Record<string, unknown>>(`${BASE}/${id}/${r.path}`, {
        method: r.method,
        headers: authHeaders(true),
        body: JSON.stringify({ ...(r.body || {}), ...(reason !== undefined ? { reason } : {}) }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nfc-preorders'] }),
  });
}

export interface OrderItem {
  id: number;
  position: number;
  printed_info: { name?: string; title?: string; phone?: string; email?: string; profile_url?: string };
  design: { template?: string; finish?: string; logo_url?: string; photo_url?: string; notes?: string };
  preview_front_url: string | null;
  preview_back_url: string | null;
  print_front_url: string | null;
  print_back_url: string | null;
  bat_revision: number;
  card_code: string | null;
  card_statut: string | null;
}

// Dépôt du BAT (fichiers prêts à imprimer) pour toutes les cartes de la commande, ou une seule
export function useUploadBat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, front, back, itemId }: { id: number; front?: File | null; back?: File | null; itemId?: number | null }) => {
      const form = new FormData();
      if (front) form.append('front', front);
      if (back) form.append('back', back);
      if (itemId) form.append('item_id', String(itemId));
      return call<Record<string, unknown>>(`${BASE}/${id}/bat`, { method: 'POST', headers: authHeaders(), body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nfc-preorders'] }),
  });
}

export interface PrintQueueItem {
  item_id: number;
  order_id: number;
  reference: string;
  status: PreorderStatus;
  offer_name: string | null;
  position: number;
  quantity: number;
  card_code: string | null;
  stock_type: 'logo_printed' | 'blank' | null;
  print_faces: 'info' | 'both';
  holder_name: string;
}

export function usePrintQueue() {
  return useQuery<{ items: PrintQueueItem[] }>({
    queryKey: ['admin', 'nfc-preorders', 'print-queue'],
    queryFn: () => call(`${BASE}/print-batch?status=bat_valide`, { headers: authHeaders() }),
    staleTime: 15_000,
  });
}

export function useStartPrintBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<{ started: string[]; blocked: { reference: string; error: string }[] }>(
      `${BASE}/print-batch/start`, { method: 'POST', headers: authHeaders(true), body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nfc-preorders'] }),
  });
}

// PDF imprimeur (une page par face) ou récapitulatif CSV du lot
export async function downloadPrintSheet(format: 'pdf' | 'csv', status = 'bat_valide') {
  const res = await fetch(`${BASE}/print-batch/sheet?status=${status}${format === 'csv' ? '&format=csv' : ''}`, { headers: authHeaders() });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.error || 'Export impossible');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lot-impression-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPreordersCsv(filters: { status?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);
  return fetch(`${BASE}/export.csv?${params.toString()}`, { headers: authHeaders() }).then(async (res) => {
    if (!res.ok) throw new Error('Export échoué');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfc-precommandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
