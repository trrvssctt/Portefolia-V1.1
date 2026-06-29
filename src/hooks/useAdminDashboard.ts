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

export type NiveauAlerte = 'CRITIQUE' | 'ATTENTION' | 'INFO';

export interface Alerte {
  type: string;
  niveau: NiveauAlerte;
  message: string;
  detail?: string;
  action_label: string;
  action_url: string;
  count: number;
}

export interface KpiFinanciers {
  mrr: { valeur: number; abonnes_actifs: number; arpu: number };
  revenus_mois: { total: number; variation: number };
  pipeline: { total: number; nb: number };
  churn: { taux: number; comptes_perdus: number };
}

export interface KpiPlateforme {
  total_users: number;
  users_actifs: number;
  portfolios_publies: number;
  portfolios_brouillon: number;
  nfc_en_cours: number;
  nfc_livrees_mois: number;
  vues_7j: number;
  variation_vues: number;
}

export interface Transaction {
  id: number;
  client_nom: string;
  client_email: string;
  montant: number;
  statut: string;
  type_flux: string;
  plan_nom: string;
  created_at: string;
}

export interface NouvelInscrit {
  id: number;
  nom: string;
  email: string;
  subscription_status: string;
  plan_nom: string;
  created_at: string;
  user_role?: string;
  business_account_id?: number;
  business_company?: string;
  business_plan_nom?: string;
  business_admin_nom?: string;
  business_admin_id?: number;
}

export interface SanteService {
  statut: 'OK' | 'ATTENTION' | 'ERREUR' | 'NON_SURVEILLÉ';
  detail?: string | number;
}

export interface DashboardData {
  timestamp: string;
  alertes: Alerte[];
  kpi_financiers: KpiFinanciers;
  kpi_plateforme: KpiPlateforme;
  evolution_revenus: Array<{
    mois: string;
    abonnement: number;
    reabonnement: number;
    upgrade: number;
    nfc: number;
  }>;
  distribution_plans: { name: string; nb_abonnes: number; pourcentage: number }[];
  transactions_recentes: Transaction[];
  nouveaux_inscrits: NouvelInscrit[];
  sante_systeme: {
    serveur: SanteService & { uptime?: number; memory_mb?: number };
    db: SanteService & { latence_ms?: number };
    email: SanteService & { echecs_24h?: number };
    cron: SanteService & { dernier_run?: string };
  };
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiFetch<DashboardData>(`${API_BASE}/api/admin/dashboard`),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 25_000,
    retry: 2,
    retryDelay: 5_000,
  });
}

// ── Badge alertes (exclut les INFO) ─────────────────────────────────────────

export function useAlertesCount(): number {
  const { data } = useAdminDashboard();
  if (!data) return 0;
  return data.alertes.filter((a) => a.niveau !== 'INFO').length;
}
