import { useQuery } from '@tanstack/react-query';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://backend-v-card.onrender.com');

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKpi {
  timestamp: string;
  mrr: {
    valeur: number;
    arr: number;
    arpu: number;
    abonnes_actifs: number;
    variation_vs_mois_precedent: number | null;
  };
  revenus_mois: {
    total: number;
    par_flux: { abonnement: number; reabonnement: number; upgrade: number; nfc: number };
    nb_transactions: number;
    montant_moyen: number;
    variation_vs_mois_precedent: number | null;
  };
  pipeline: {
    total_attendu: number;
    nb_transactions: number;
    par_flux: { abonnement: number; reabonnement: number; upgrade: number; nfc: number };
    plus_anciens: Array<{
      id: number;
      utilisateur_nom: string;
      montant: number;
      type_flux: string;
      heures_attente: number;
    }>;
  };
  churn: { taux: number; comptes_perdus: number; revenu_perdu: number };
  nfc: {
    commandes_payees: number;
    commandes_en_attente: number;
    ca_valide: number;
    ca_attendu: number;
    panier_moyen: number;
  };
  upgrades: {
    valides_ce_mois: number;
    en_attente: number;
    ca_upgrades: number;
    chemin_le_plus_frequent: string | null;
  };
}

export interface EvolutionKpi {
  nb_mois: number;
  labels: string[];
  series: {
    abonnement: number[];
    reabonnement: number[];
    upgrade: number[];
    nfc: number[];
    total: number[];
  };
}

export interface PrevisionnelKpi {
  horizon_mois: number;
  total_previsionnel: number;
  par_mois: Array<{
    mois: string;
    mois_iso: string;
    nb_renouvellements: number;
    montant: number;
  }>;
}

export type FluxType = 'abonnement' | 'reabonnement' | 'upgrade' | 'nfc';

export interface FluxDetail {
  type_flux: string;
  periode: string;
  date_debut: string;
  date_fin: string;
  pagination: { total: number; page: number; limit: number; pages: number };
  transactions: Array<{
    id: number;
    montant: number;
    montant_ht: number | null;
    remise: number;
    duree_mois: number | null;
    statut: string;
    created_at: string;
    utilisateur: { id: number; nom: string; email: string };
  }>;
}

// ── Hook 1 : Dashboard complet ───────────────────────────────────────────────

export function useDashboardKpi() {
  return useQuery<DashboardKpi>({
    queryKey: ['admin', 'kpi', 'dashboard'],
    queryFn: () => apiFetch<DashboardKpi>(`${API_BASE}/api/admin/kpi/dashboard`),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 25_000,
    retry: 2,
    retryDelay: 5_000,
  });
}

// ── Hook 2 : Évolution mensuelle ─────────────────────────────────────────────

export function useEvolutionKpi(nbMois: number = 12) {
  return useQuery<EvolutionKpi>({
    queryKey: ['admin', 'kpi', 'evolution', nbMois],
    queryFn: () => apiFetch<EvolutionKpi>(`${API_BASE}/api/admin/kpi/evolution?mois=${nbMois}`),
    refetchInterval: 120_000,
    staleTime: 60_000,
    retry: 2,
  });
}

// ── Hook 3 : Prévisionnel ────────────────────────────────────────────────────

export function usePrevisionnelKpi(horizon: number = 3) {
  return useQuery<PrevisionnelKpi>({
    queryKey: ['admin', 'kpi', 'previsionnel', horizon],
    queryFn: () =>
      apiFetch<PrevisionnelKpi>(`${API_BASE}/api/admin/kpi/previsionnel?horizon=${horizon}`),
    refetchInterval: 300_000,
    staleTime: 240_000,
    retry: 2,
  });
}

// ── Hook 4 : Détail par flux (paginé) ────────────────────────────────────────

export function useFluxDetail(
  type: FluxType,
  periode: string = 'mois',
  page: number = 1,
  limit: number = 20
) {
  return useQuery<FluxDetail>({
    queryKey: ['admin', 'kpi', 'flux', type, periode, page, limit],
    queryFn: () =>
      apiFetch<FluxDetail>(
        `${API_BASE}/api/admin/kpi/flux/${type}?periode=${periode}&page=${page}&limit=${limit}`
      ),
    placeholderData: (prev) => prev, // pas de flash entre pages (TanStack Query v5)
    staleTime: 30_000,
    retry: 2,
  });
}
