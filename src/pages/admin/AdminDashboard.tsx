import { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import AlertesUrgentes from '@/components/admin/dashboard/AlertesUrgentes';
import KpiFinanciersCards from '@/components/admin/dashboard/KpiFinanciersCards';
import KpiPlateformeCards from '@/components/admin/dashboard/KpiPlateformeCards';
import RevenueGraphiques from '@/components/admin/dashboard/RevenueGraphiques';
import ActiviteRecente from '@/components/admin/dashboard/ActiviteRecente';
import SanteSysteme from '@/components/admin/dashboard/SanteSysteme';
import { formatTimeAgo } from '@/utils/formatTimeAgo';

// ── ErrorBoundary par section ─────────────────────────────────────────────────

interface EBState { hasError: boolean }

class SectionBoundary extends Component<{ children: ReactNode; label: string }, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[12px] bg-[#FFEBEE] border border-[#FFCDD2] px-4 py-3 text-[12px] text-[#C62828]">
          Erreur d'affichage — {this.props.label}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Label de section ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#9E9E9E] uppercase tracking-[0.06em] mb-2">
      {children}
    </p>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useAdminDashboard();

  const nbAlertesCritiques = data?.alertes.filter((a) => a.niveau !== 'INFO').length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER COCKPIT ───────────────────────────────────────────────── */}
      <div
        className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-white font-medium text-lg">Tableau de Bord</h1>

            <span className="flex items-center gap-1.5 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              Live
            </span>

            {nbAlertesCritiques > 0 && (
              <span className="text-xs bg-[#C62828] text-white px-2 py-0.5 rounded-full font-medium">
                {nbAlertesCritiques} alerte{nbAlertesCritiques > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <p className="text-white/60 text-xs mt-0.5">
            Portefolia · Super Admin ·{' '}
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-white/50 text-xs">
              Mis à jour {formatTimeAgo(new Date(dataUpdatedAt).toISOString())}
            </span>
          )}

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 disabled:opacity-40 transition-opacity"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>

          <button
            onClick={() => navigate('/admin/finance')}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-[8px] transition-colors font-medium"
          >
            Finance détaillée →
          </button>
        </div>
      </div>

      {/* ── BANNER ERREUR GLOBALE ────────────────────────────────────────── */}
      {isError && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-4 rounded-[12px] bg-[#FFEBEE] border-l-4 border-[#C62828] px-4 py-3">
          <p className="text-[13px] text-[#C62828] font-medium">
            Impossible de charger le dashboard — vérifiez votre connexion
          </p>
          <button
            onClick={() => refetch()}
            className="shrink-0 text-xs font-semibold text-[#C62828] hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── CONTENU ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-5">

        {/* Zone 1 — Alertes */}
        <section aria-label="Alertes et actions urgentes">
          <SectionLabel>Actions requises</SectionLabel>
          <SectionBoundary label="Alertes">
            <AlertesUrgentes
              alertes={data?.alertes ?? []}
              isLoading={isLoading}
              isError={isError}
            />
          </SectionBoundary>
        </section>

        {/* Zone 2 — KPI financiers */}
        <section aria-label="KPI financiers">
          <SectionLabel>Indicateurs financiers</SectionLabel>
          <SectionBoundary label="KPI financiers">
            {data
              ? <KpiFinanciersCards kpi={data.kpi_financiers} />
              : <KpiFinanciersCards kpi={null as any} isLoading />
            }
          </SectionBoundary>
        </section>

        {/* Zone 3 — Métriques plateforme */}
        <section aria-label="Métriques plateforme">
          <SectionLabel>Métriques produit</SectionLabel>
          <SectionBoundary label="KPI plateforme">
            {data
              ? <KpiPlateformeCards kpi={data.kpi_plateforme} />
              : <KpiPlateformeCards kpi={null as any} isLoading />
            }
          </SectionBoundary>
        </section>

        {/* Zone 4 — Graphiques */}
        <section aria-label="Graphiques et tendances">
          <SectionLabel>Tendances</SectionLabel>
          <SectionBoundary label="Graphiques">
            <RevenueGraphiques
              evolution={data?.evolution_revenus ?? null}
              distribution={data?.distribution_plans ?? []}
              isLoading={isLoading}
            />
          </SectionBoundary>
        </section>

        {/* Zone 5 — Activité récente */}
        <section aria-label="Activité récente">
          <SectionLabel>Activité récente</SectionLabel>
          <SectionBoundary label="Activité récente">
            <ActiviteRecente
              transactions={data?.transactions_recentes ?? []}
              nouveaux_inscrits={data?.nouveaux_inscrits ?? []}
              isLoading={isLoading}
            />
          </SectionBoundary>
        </section>

        {/* Zone 6 — Santé système */}
        <section aria-label="Santé système">
          <SectionLabel>Infrastructure</SectionLabel>
          <SectionBoundary label="Santé système">
            {data
              ? <SanteSysteme sante={data.sante_systeme} />
              : <SanteSysteme sante={null as any} isLoading />
            }
          </SectionBoundary>
        </section>

      </div>
    </div>
  );
}
