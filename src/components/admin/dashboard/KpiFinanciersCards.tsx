import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Banknote, UserMinus } from 'lucide-react';
import type { KpiFinanciers } from '@/hooks/useAdminDashboard';
import { formatFCFA, formatVariation } from '@/utils/formatFinancial';

// ── Helpers ──────────────────────────────────────────────────────────────────

function churnColor(taux: number): string {
  if (taux > 5) return '#C62828';
  if (taux > 2) return '#E65100';
  return '#2E7D32';
}

// ── Sous-composants partagés ─────────────────────────────────────────────────

function IconBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center h-10 w-10 rounded-[8px] shrink-0"
      style={{ backgroundColor: color + '1F' }}
    >
      <span style={{ color }}>{children}</span>
    </div>
  );
}

function VariationBadge({ value }: { value: number | null }) {
  const { texte, couleur, icone } = formatVariation(value);
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: couleur, backgroundColor: couleur + '18' }}
    >
      {icone} {texte}
    </span>
  );
}

function SubLine({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[#5C5C5C] mt-0.5">{children}</p>;
}

const cardBase: React.CSSProperties = {
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  borderRadius: 12,
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="bg-white animate-pulse p-5"
      style={{ ...cardBase, borderLeft: '4px solid #E8F5E9', minHeight: 100 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-[8px] bg-[#E8F5E9]" />
        <div className="h-5 w-16 rounded-full bg-[#E8F5E9]" />
      </div>
      <div className="h-7 w-32 rounded bg-[#E8F5E9] mb-2" />
      <div className="h-3.5 w-28 rounded bg-[#F5F5F5] mb-1.5" />
      <div className="h-3.5 w-24 rounded bg-[#F5F5F5]" />
    </div>
  );
}

// ── Card 1 : MRR ─────────────────────────────────────────────────────────────

const COLOR_MRR = '#2E7D32';

function CardMRR({ mrr, variation }: { mrr: KpiFinanciers['mrr']; variation: number }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white p-5 flex flex-col gap-3" style={{ ...cardBase, borderLeft: `4px solid ${COLOR_MRR}` }}>
      <div className="flex items-start justify-between">
        <IconBox color={COLOR_MRR}><TrendingUp size={20} /></IconBox>
        <VariationBadge value={variation} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">MRR</p>
        <p className="text-2xl font-medium mt-0.5" style={{ color: COLOR_MRR }}>
          {formatFCFA(mrr.valeur)}
        </p>
        <SubLine>{mrr.abonnes_actifs} abonné{mrr.abonnes_actifs > 1 ? 's' : ''} actif{mrr.abonnes_actifs > 1 ? 's' : ''}</SubLine>
        <SubLine>ARPU : {formatFCFA(mrr.arpu)}</SubLine>
      </div>

      <button
        onClick={() => navigate('/admin/finance')}
        className="mt-auto text-[11px] font-semibold text-left hover:underline"
        style={{ color: COLOR_MRR }}
      >
        → Voir le détail finance
      </button>
    </div>
  );
}

// ── Card 2 : Pipeline ─────────────────────────────────────────────────────────

const COLOR_PIPELINE = '#E65100';

function CardPipeline({ pipeline }: { pipeline: KpiFinanciers['pipeline'] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white p-5 flex flex-col gap-3" style={{ ...cardBase, borderLeft: `4px solid ${COLOR_PIPELINE}` }}>
      <div className="flex items-start justify-between">
        <IconBox color={COLOR_PIPELINE}><Clock size={20} /></IconBox>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">
          Pipeline en attente
        </p>
        <p
          className="text-2xl font-medium mt-0.5"
          style={{ color: pipeline.nb > 0 ? COLOR_PIPELINE : '#1A1A2E' }}
        >
          {formatFCFA(pipeline.total)}
        </p>
        <SubLine>
          {pipeline.nb} paiement{pipeline.nb > 1 ? 's' : ''} à valider
        </SubLine>
      </div>

      {pipeline.nb > 0 && (
        <button
          onClick={() => navigate('/admin/wave/validation')}
          className="mt-auto text-[11px] font-bold px-3 py-1 rounded-[8px] self-start transition-opacity hover:opacity-80"
          style={{ backgroundColor: COLOR_PIPELINE + '18', color: COLOR_PIPELINE }}
        >
          Valider →
        </button>
      )}
    </div>
  );
}

// ── Card 3 : CA ce mois ───────────────────────────────────────────────────────

const COLOR_CA = '#1565C0';

function CardCA({ revenus_mois }: { revenus_mois: KpiFinanciers['revenus_mois'] }) {
  return (
    <div className="bg-white p-5 flex flex-col gap-3" style={{ ...cardBase, borderLeft: `4px solid ${COLOR_CA}` }}>
      <div className="flex items-start justify-between">
        <IconBox color={COLOR_CA}><Banknote size={20} /></IconBox>
        <VariationBadge value={revenus_mois.variation} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">
          CA ce mois
        </p>
        <p className="text-2xl font-medium mt-0.5" style={{ color: COLOR_CA }}>
          {formatFCFA(revenus_mois.total)}
        </p>
        <SubLine>Paiements validés uniquement</SubLine>
      </div>
    </div>
  );
}

// ── Card 4 : Churn ────────────────────────────────────────────────────────────

function CardChurn({ churn }: { churn: KpiFinanciers['churn'] }) {
  const color = churnColor(churn.taux);
  return (
    <div className="bg-white p-5 flex flex-col gap-3" style={{ ...cardBase, borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <IconBox color={color}><UserMinus size={20} /></IconBox>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9E9E9E]">Churn</p>
        <p className="text-2xl font-medium mt-0.5" style={{ color }}>
          {churn.taux.toFixed(1)}%
        </p>
        <SubLine>
          {churn.comptes_perdus} compte{churn.comptes_perdus > 1 ? 's' : ''} perdu{churn.comptes_perdus > 1 ? 's' : ''} ce mois
        </SubLine>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  kpi: KpiFinanciers;
  isLoading?: boolean;
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.3 } }),
};

export default function KpiFinanciersCards({ kpi, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards = [
    <CardMRR key="mrr" mrr={kpi.mrr} variation={kpi.revenus_mois.variation} />,
    <CardPipeline key="pipeline" pipeline={kpi.pipeline} />,
    <CardCA key="ca" revenus_mois={kpi.revenus_mois} />,
    <CardChurn key="churn" churn={kpi.churn} />,
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={fadeIn}>
          {card}
        </motion.div>
      ))}
    </div>
  );
}
