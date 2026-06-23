import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://portefolia.tech');

export interface WaitlistEntry {
  id: number;
  email: string;
  created_at: string;
}

export interface WaitlistData {
  total: number;
  liste: WaitlistEntry[];
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function formatDateInscription(isoDate: string): string {
  const d     = new Date(isoDate);
  const now   = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffJ  = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffJ === 0) return "aujourd'hui";
  if (diffJ === 1) return 'il y a 1 jour';
  if (diffJ < 7)   return `il y a ${diffJ} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const QK = ['admin', 'nfc-waitlist'] as const;

export function useNfcWaitlist() {
  return useQuery<WaitlistData>({
    queryKey: QK,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/nfc-waitlist`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Impossible de charger la liste');
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useDeleteFromWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/admin/nfc-waitlist/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Suppression échouée');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useNotifyWaitlist() {
  return useMutation({
    mutationFn: async (payload: { sujet: string; message: string }) => {
      const res = await fetch(`${API_BASE}/api/admin/nfc-waitlist/notify-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Envoi échoué');
      return res.json() as Promise<{ success: boolean; envoyes: number; echecs: number }>;
    },
  });
}
