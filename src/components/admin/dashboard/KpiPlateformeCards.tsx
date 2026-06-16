import { Users, LayoutTemplate, CreditCard, Eye } from 'lucide-react';
import type { KpiPlateforme } from '@/hooks/useAdminDashboard';
import { formatVariation } from '@/utils/formatFinancial';

// ── Sous-composants ───────────────────────────────────────────────────────────

function VariationBadge({ value }: { value: number }) {
  const { texte, couleur, icone } = formatVariation(value);
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ color: couleur, backgroundColor: couleur + '18' }}
    >
      {icone} {texte}
    </span>
  );
}

function CompactCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white flex flex-col gap-3 p-5"
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {children}
    </div>
  );
}

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
      {children}
    </span>
  );
}

function CardValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[26px] font-extrabold text-gray-900 leading-none tabular-nums">{children}</p>
  );
}

function CardSub({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-400 leading-tight">{children}</p>;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="animate-pulse bg-white p-5 flex flex-col gap-3"
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      <div className="h-9 w-9 rounded-xl bg-gray-100" />
      <div className="h-7 w-20 rounded bg-gray-200" />
      <div className="h-3 w-28 rounded bg-gray-100" />
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function CardUtilisateurs({ kpi }: { kpi: KpiPlateforme }) {
  const autres = kpi.total_users - kpi.users_actifs;
  return (
    <CompactCard>
      <CardIcon><Users size={20} /></CardIcon>
      <CardValue>{kpi.total_users.toLocaleString('fr-FR')}</CardValue>
      <CardSub>{kpi.users_actifs} actifs · {autres} autres</CardSub>
    </CompactCard>
  );
}

function CardPortfolios({ kpi }: { kpi: KpiPlateforme }) {
  return (
    <CompactCard>
      <CardIcon><LayoutTemplate size={20} /></CardIcon>
      <CardValue>{kpi.portfolios_publies.toLocaleString('fr-FR')}</CardValue>
      <CardSub>{kpi.portfolios_brouillon} en brouillon</CardSub>
    </CompactCard>
  );
}

function CardNFC({ kpi }: { kpi: KpiPlateforme }) {
  return (
    <CompactCard>
      <div className="flex items-center justify-between">
        <CardIcon><CreditCard size={20} /></CardIcon>
        {kpi.nfc_en_cours > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ color: '#E65100', backgroundColor: '#E6510018' }}
          >
            À suivre
          </span>
        )}
      </div>
      <CardValue>{kpi.nfc_en_cours.toLocaleString('fr-FR')}</CardValue>
      <CardSub>en production/transit</CardSub>
    </CompactCard>
  );
}

function CardVues({ kpi }: { kpi: KpiPlateforme }) {
  return (
    <CompactCard>
      <div className="flex items-center justify-between">
        <CardIcon><Eye size={20} /></CardIcon>
        <VariationBadge value={kpi.variation_vues} />
      </div>
      <CardValue>{kpi.vues_7j.toLocaleString('fr-FR')}</CardValue>
      <CardSub>vues portfolios (7j)</CardSub>
    </CompactCard>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  kpi: KpiPlateforme;
  isLoading?: boolean;
}

export default function KpiPlateformeCards({ kpi, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <CardUtilisateurs kpi={kpi} />
      <CardPortfolios kpi={kpi} />
      <CardNFC kpi={kpi} />
      <CardVues kpi={kpi} />
    </div>
  );
}
