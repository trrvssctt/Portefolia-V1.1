import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NFC_API_BASE } from './useNfcConfig';

export type PreorderStatus = 'pending_payment' | 'payment_submitted' | 'paid' | 'rejected' | 'expired' | 'cancelled' | 'converted';

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
}

export const STATUS_META: Record<PreorderStatus, { label: string; color: string; bg: string }> = {
  payment_submitted: { label: 'À valider',       color: '#B45309', bg: '#FEF3C7' },
  pending_payment:   { label: 'Attente paiement', color: '#1D4ED8', bg: '#DBEAFE' },
  paid:              { label: 'Payée',           color: '#1B5E20', bg: '#DCFCE7' },
  rejected:          { label: 'Refusée',         color: '#B91C1C', bg: '#FEE2E2' },
  converted:         { label: 'En fabrication',  color: '#6D28D9', bg: '#EDE9FE' },
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
  return useQuery<{ preorder: Preorder; events: PreorderEvent[]; notifications: PreorderNotification[] }>({
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

export type PreorderAction = 'validate' | 'reject' | 'cancel' | 'convert' | 'resend';

export function usePreorderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: PreorderAction; reason?: string }) => {
      const method = action === 'convert' || action === 'resend' ? 'POST' : 'PUT';
      return call<Record<string, unknown>>(`${BASE}/${id}/${action}`, {
        method,
        headers: authHeaders(true),
        body: JSON.stringify(reason !== undefined ? { reason } : {}),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'nfc-preorders'] }),
  });
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
