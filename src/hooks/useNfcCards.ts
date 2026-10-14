import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NFC_API_BASE } from './useNfcConfig';

export type StockType = 'logo_printed' | 'blank';
export type CardStatus = 'en_commande' | 'en_stock' | 'attribuee' | 'imprimee' | 'livree' | 'desactivee';

export interface StockByType {
  type_stock: StockType;
  label: string;
  threshold: number;
  total: number;
  available: number;
  low: boolean;
  en_commande: number;
  en_stock: number;
  attribuee: number;
  imprimee: number;
  livree: number;
  desactivee: number;
}

export interface CardBatch {
  id: number;
  type_stock: StockType;
  quantity: number;
  supplier: string | null;
  notes: string | null;
  status: 'en_commande' | 'recu';
  cards: number;
  used: number;
  received_at: string | null;
  created_at: string;
}

export interface PhysicalCard {
  id: number;
  code: string;
  url: string;
  type_stock: StockType;
  type_label: string;
  statut: CardStatus;
  statut_label: string;
  batch_id: number | null;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  portfolio_slug: string | null;
  portfolio_title: string | null;
  order_reference: string | null;
  deactivation_reason: string | null;
  tap_count: number;
  last_tap_at: string | null;
  created_at: string;
}

export const CARD_STATUS_META: Record<CardStatus, { label: string; color: string; bg: string }> = {
  en_commande: { label: 'En commande', color: '#6B7280', bg: '#F3F4F6' },
  en_stock:    { label: 'En stock',    color: '#1D4ED8', bg: '#DBEAFE' },
  attribuee:   { label: 'Attribuée',   color: '#B45309', bg: '#FEF3C7' },
  imprimee:    { label: 'Imprimée',    color: '#6D28D9', bg: '#EDE9FE' },
  livree:      { label: 'Livrée',      color: '#1B5E20', bg: '#DCFCE7' },
  desactivee:  { label: 'Désactivée',  color: '#B91C1C', bg: '#FEE2E2' },
};

export const STOCK_TYPE_LABELS: Record<StockType, string> = { logo_printed: 'Logo imprimé', blank: 'Vierge' };

const BASE = `${NFC_API_BASE}/api/admin/nfc-cards`;
const QK = ['admin', 'nfc-cards'] as const;

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

export function useNfcStock() {
  return useQuery<{ types: StockByType[]; print_batch_threshold: number }>({
    queryKey: [...QK, 'stock'],
    queryFn: () => call(`${BASE}/stock`, { headers: authHeaders() }),
    staleTime: 15_000,
  });
}

export function useNfcBatches() {
  return useQuery<{ batches: CardBatch[] }>({
    queryKey: [...QK, 'batches'],
    queryFn: () => call(`${BASE}/batches`, { headers: authHeaders() }),
  });
}

export function useNfcCardList(filters: { statut?: string; type_stock?: string; batch_id?: string; q?: string; page: number }) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  params.set('limit', '50');
  return useQuery<{ total: number; page: number; limit: number; liste: PhysicalCard[] }>({
    queryKey: [...QK, 'list', filters],
    queryFn: () => call(`${BASE}?${params.toString()}`, { headers: authHeaders() }),
    staleTime: 10_000,
  });
}

export function useNfcCardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'PUT', body }: { path: string; method?: string; body?: unknown }) =>
      call<Record<string, unknown>>(`${BASE}${path}`, { method, headers: authHeaders(true), body: JSON.stringify(body ?? {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

// Téléchargement authentifié (export fournisseur)
export async function downloadBatchExport(batch: CardBatch, format: 'csv') {
  const res = await fetch(`${BASE}/batches/${batch.id}/export.${format}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Export échoué');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portefolia-cartes-lot${batch.id}-${batch.type_stock}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
