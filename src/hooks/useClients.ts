import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://backend-v-card.onrender.com');

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiMutate<T>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? jsonHeaders() : authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientListItem {
  id: number;
  nom_complet: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  ville?: string;
  date_inscription: string;
  statut_compte: string;
  subscription_status: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'SUSPENDED' | 'NONE';
  plan_nom?: string;
  plan_id?: number;
  abonnement_statut?: string;
  date_echeance?: string;
  jours_restants?: number;
  nb_portfolios: number;
  ca_total: number;
  user_role?: string;
  business_account_id?: number;
  business_company?: string;
  business_plan_nom?: string;
  business_admin_nom?: string;
  business_admin_email?: string;
  business_admin_id?: number;
}

export interface ClientProfil360 {
  infos: ClientListItem & { last_payment_at?: string; next_billing_date?: string };
  abonnement: {
    id: number;
    plan_nom: string;
    prix: number;
    statut: string;
    date_debut: string;
    date_echeance: string;
    jours_restants: number;
    duree_mois: number;
    montant_paye: number;
    remise_appliquee: number;
    valide_par_nom?: string;
  } | null;
  paiements: {
    id: number;
    montant: number;
    statut: string;
    type_flux: string;
    reference_wave?: string;
    created_at: string;
    plan_nom?: string;
    duree_mois?: number;
    valide_par_nom?: string;
  }[];
  portfolios: {
    id: number;
    titre: string;
    slug?: string;
    statut: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
    theme?: string;
    nb_vues: number;
    created_at: string;
    updated_at: string;
  }[];
  timeline: {
    date: string;
    type: 'PAIEMENT' | 'ABONNEMENT' | 'STATUT_CHANGE' | 'RAPPEL_EMAIL' | 'PORTFOLIO' | 'COMPTE';
    libelle: string;
    detail?: string;
    couleur: string;
  }[];
  stats: {
    ca_total: number;
    nb_paiements_valides: number;
    nb_portfolios_publies: number;
    anciennete_jours: number;
  };
}

export interface ClientsFiltres {
  search?: string;
  statut?: string;
  plan_id?: number;
  sort?: 'date_desc' | 'date_asc' | 'nom_asc' | 'montant_desc';
  page?: number;
  limit?: number;
}

interface ClientsListResponse {
  clients: ClientListItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  compteurs: { total: number; actifs: number; en_attente: number; expires: number; bloques: number };
}

interface ActionResponse {
  success: boolean;
  message: string;
}

// ── HOOK 1 : useClientsList ───────────────────────────────────────────────────

export function useClientsList(filtres: ClientsFiltres = {}) {
  const params = new URLSearchParams();
  (Object.entries(filtres) as [string, unknown][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });

  return useQuery<ClientsListResponse>({
    queryKey: ['admin', 'clients', 'liste', filtres],
    queryFn: () => apiFetch<ClientsListResponse>(`${API_BASE}/api/admin/clients?${params}`),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    retry: 2,
  });
}

// ── HOOK 2 : useClientProfil360 ───────────────────────────────────────────────

export function useClientProfil360(id: number | null) {
  return useQuery<ClientProfil360>({
    queryKey: ['admin', 'clients', 'profil360', id],
    queryFn: async () => {
      const raw = await apiFetch<Omit<ClientProfil360, 'stats'>>(
        `${API_BASE}/api/admin/clients/${id}/profil360`
      );

      // stats calculées côté client (le backend ne renvoie pas ce bloc)
      const stats: ClientProfil360['stats'] = {
        ca_total: Number(raw.infos?.ca_total ?? 0),
        nb_paiements_valides: raw.paiements.filter(
          (p) => p.statut === 'RÉUSSI' || p.statut === 'SUCCESS'
        ).length,
        nb_portfolios_publies: raw.portfolios.filter((p) => p.statut === 'PUBLISHED').length,
        anciennete_jours: raw.infos?.date_inscription
          ? Math.floor(
              (Date.now() - new Date(raw.infos.date_inscription).getTime()) / 86_400_000
            )
          : 0,
      };

      return { ...raw, stats };
    },
    enabled: id !== null,
    staleTime: 60_000,
    retry: 2,
  });
}

// ── HOOK 3 : useClientActions ─────────────────────────────────────────────────

export function useClientActions(clientId: number) {
  const qc = useQueryClient();

  const invalidateClient = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'clients'] });
    qc.invalidateQueries({ queryKey: ['admin', 'clients', 'profil360', clientId] });
  };

  const bloquer = useMutation<ActionResponse, Error, string>({
    mutationFn: (motif) =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/bloquer`,
        'POST',
        { motif }
      ),
    onSuccess: invalidateClient,
  });

  const debloquer = useMutation<ActionResponse, Error, void>({
    mutationFn: () =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/debloquer`,
        'POST'
      ),
    onSuccess: invalidateClient,
  });

  const reactiver = useMutation<ActionResponse, Error, void>({
    mutationFn: () =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/reactiver`,
        'POST'
      ),
    onSuccess: invalidateClient,
  });

  const reinitialiserMotDePasse = useMutation<ActionResponse, Error, void>({
    mutationFn: () =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/reset-password`,
        'POST'
      ),
  });

  const envoyerEmail = useMutation<ActionResponse, Error, { sujet: string; message: string }>({
    mutationFn: (data) =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/envoyer-email`,
        'POST',
        data
      ),
  });

  const changerPlan = useMutation<
    ActionResponse,
    Error,
    { nouveau_plan_id: number; commentaire?: string }
  >({
    mutationFn: (data) =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/plan`,
        'PUT',
        data
      ),
    onSuccess: invalidateClient,
  });

  const modifierInfos = useMutation<ActionResponse, Error, Partial<ClientListItem>>({
    mutationFn: (data) =>
      apiMutate<ActionResponse>(
        `${API_BASE}/api/admin/clients/${clientId}/infos`,
        'PUT',
        data
      ),
    onSuccess: invalidateClient,
  });

  const forcerRenouvellement = useMutation<
    ActionResponse & { date_echeance?: string },
    Error,
    { duree_mois: 1 | 3 | 12; commentaire: string }
  >({
    mutationFn: (data) =>
      apiMutate<ActionResponse & { date_echeance?: string }>(
        `${API_BASE}/api/admin/clients/${clientId}/forcer-renouvellement`,
        'POST',
        data
      ),
    onSuccess: invalidateClient,
  });

  return { bloquer, debloquer, reactiver, reinitialiserMotDePasse, envoyerEmail, changerPlan, modifierInfos, forcerRenouvellement };
}

// ── Utilitaire : télécharger l'export CSV ─────────────────────────────────────

export function downloadClientsCSV(filtres: Omit<ClientsFiltres, 'page' | 'limit'> = {}) {
  const params = new URLSearchParams();
  (Object.entries(filtres) as [string, unknown][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });

  const url = `${API_BASE}/api/admin/clients/export?${params}`;

  return fetch(url, { headers: authHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `clients_portefolia_${date}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}
