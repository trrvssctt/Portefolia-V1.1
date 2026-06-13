import { useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  TrendingUp, Clock, Calendar, TrendingDown,
  RefreshCw, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardKpi, useEvolutionKpi, usePrevisionnelKpi } from '@/hooks/useFinancialKpi';
import { formatFCFA, formatVariation, formatMilliers } from '@/utils/formatFinancial';
import { cn } from '@/lib/utils';

// ── Palette par flux ──────────────────────────────────────────────────────────

const COLORS = {
  mrr:         '#2E7D32',
  pipeline:    '#E65100',
  previsionnel:'#1565C0',
  churn:       '#C62828',
} as const;

// ── Sous-composants ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 animate-pulse"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #E5E7EB' }}>
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-xl bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-8 w-32 rounded bg-gray-200 mb-2" />
      <div className="h-4 w-24 rounded bg-gray-100 mb-1" />
      <div className="h-4 w-20 rounded bg-gray-100 mb-4" />
      <div className="h-16 w-full rounded bg-gray-100" />
    </div>
  );
}

function IconBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0"
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
  return <p className="text-xs text-gray-500 mt-0.5">{children}</p>;
}

// ── Carte 1 : MRR ─────────────────────────────────────────────────────────────

function CardMRR({ mrr }: { mrr: NonNullable<ReturnType<typeof useDashboardKpi>['data']>['mrr'] }) {
  const { data: evo } = useEvolutionKpi(6);

  const sparkData = evo?.raw?.map((r: { mois: string; abonnement: number; reabonnement: number }) => ({
    name: r.mois,
    v: r.abonnement + r.reabonnement,
  })) ?? [];

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${COLORS.mrr}` }}
    >
      <div className="flex items-start justify-between">
        <IconBox color={COLORS.mrr}><TrendingUp size={20} /></IconBox>
        <VariationBadge value={mrr.variation_vs_mois_precedent} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">MRR</p>
        <p className="text-2xl font-black mt-0.5" style={{ color: COLORS.mrr }}>
          {formatFCFA(mrr.valeur)}
        </p>
        <SubLine>ARPU : {formatFCFA(mrr.arpu)}</SubLine>
        <SubLine>{mrr.abonnes_actifs} abonnés actifs</SubLine>
      </div>

      {sparkData.length > 0 && (
        <ResponsiveContainer width="100%" height={52}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.mrr} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.mrr} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              formatter={(v: number) => [formatMilliers(v), 'MRR']}
              contentStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone" dataKey="v"
              stroke={COLORS.mrr} strokeWidth={2}
              fill="url(#gradMrr)" dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Carte 2 : Pipeline ────────────────────────────────────────────────────────

function CardPipeline({
  pipeline,
}: {
  pipeline: NonNullable<ReturnType<typeof useDashboardKpi>['data']>['pipeline'];
}) {
  const navigate = useNavigate();
  const hasItems = pipeline.nb_transactions > 0;

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${COLORS.pipeline}` }}
    >
      <div className="flex items-start justify-between">
        <IconBox color={COLORS.pipeline}><Clock size={20} /></IconBox>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: COLORS.pipeline, backgroundColor: COLORS.pipeline + '18' }}
        >
          {pipeline.nb_transactions} paiement{pipeline.nb_transactions > 1 ? 's' : ''}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Pipeline en attente
        </p>
        <p className="text-2xl font-black mt-0.5" style={{ color: COLORS.pipeline }}>
          {formatFCFA(pipeline.total_attendu)}
        </p>
        <div className="mt-1 space-y-0.5">
          {Object.entries(pipeline.par_flux).map(([flux, montant]) =>
            montant > 0 ? (
              <SubLine key={flux}>
                {flux.charAt(0).toUpperCase() + flux.slice(1)} :{' '}
                <span className="font-semibold text-gray-700">{formatFCFA(montant as number)}</span>
              </SubLine>
            ) : null
          )}
        </div>
      </div>

      {hasItems && (
        <button
          onClick={() => navigate('/admin/wave/validation')}
          className="flex items-center gap-1.5 text-xs font-semibold mt-auto pt-2 border-t border-gray-100"
          style={{ color: COLORS.pipeline }}
        >
          <AlertTriangle size={13} />
          À valider
          <ExternalLink size={12} className="ml-auto" />
        </button>
      )}
    </div>
  );
}

// ── Carte 3 : Prévisionnel ────────────────────────────────────────────────────

function CardPrevisionnel() {
  const { data } = usePrevisionnelKpi(3);

  if (!data) {
    return (
      <div
        className="bg-white rounded-xl p-5 flex flex-col gap-3"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${COLORS.previsionnel}` }}
      >
        <IconBox color={COLORS.previsionnel}><Calendar size={20} /></IconBox>
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    );
  }

  const nbRenouvellements = data.par_mois.reduce((s, m) => s + m.nb_renouvellements, 0);
  const barData = data.par_mois.map(m => ({ name: m.mois.split(' ')[0], v: m.montant }));

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${COLORS.previsionnel}` }}
    >
      <div className="flex items-start justify-between">
        <IconBox color={COLORS.previsionnel}><Calendar size={20} /></IconBox>
        <span className="text-xs text-gray-400 font-medium">{data.horizon_mois} mois</span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Prévisionnel
        </p>
        <p className="text-2xl font-black mt-0.5" style={{ color: COLORS.previsionnel }}>
          {formatFCFA(data.total_previsionnel)}
        </p>
        <SubLine>Basé sur {nbRenouvellements} renouvellements attendus</SubLine>
      </div>

      {barData.length > 0 && (
        <ResponsiveContainer width="100%" height={52}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={18}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number) => [formatMilliers(v), '']}
              contentStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="v" fill={COLORS.previsionnel} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Carte 4 : Churn ───────────────────────────────────────────────────────────

function churnColor(taux: number): string {
  if (taux > 5) return COLORS.churn;
  if (taux > 2) return '#E65100';
  return COLORS.mrr;
}

function CardChurn({
  churn,
}: {
  churn: NonNullable<ReturnType<typeof useDashboardKpi>['data']>['churn'];
}) {
  const color = churnColor(churn.taux);

  return (
    <div
      className="bg-white rounded-xl p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <IconBox color={color}><TrendingDown size={20} /></IconBox>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: color + '18' }}
        >
          {churn.taux > 5 ? 'Élevé' : churn.taux > 2 ? 'Modéré' : 'Sain'}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Churn Rate
        </p>
        <p className="text-2xl font-black mt-0.5" style={{ color }}>
          {churn.taux.toFixed(1)}%
        </p>
        <SubLine>{churn.comptes_perdus} compte{churn.comptes_perdus > 1 ? 's' : ''} perdu{churn.comptes_perdus > 1 ? 's' : ''} ce mois</SubLine>
        <SubLine>
          Revenu perdu :{' '}
          <span className="font-semibold text-gray-700">{formatFCFA(churn.revenu_perdu)}</span>
        </SubLine>
      </div>

      {/* Jauge visuelle */}
      <div className="mt-auto">
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(churn.taux * 10, 100)}%`, backgroundColor: color }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Objectif : &lt; 2%</p>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function FinancialKpiCards() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useDashboardKpi();

  const secondsAgo = dataUpdatedAt
    ? Math.floor((Date.now() - dataUpdatedAt) / 1000)
    : null;

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-gray-600 font-medium">Impossible de charger les KPI financiers</p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CardMRR      mrr={data.mrr} />
        <CardPipeline pipeline={data.pipeline} />
        <CardPrevisionnel />
        <CardChurn    churn={data.churn} />
      </div>

      {/* Ligne de fraîcheur des données */}
      <div className="flex items-center justify-end gap-2">
        <p className={cn('text-[11px] text-gray-400', isFetching && 'text-blue-400')}>
          {isFetching
            ? 'Actualisation…'
            : secondsAgo !== null
            ? `Mis à jour il y a ${secondsAgo}s`
            : ''}
        </p>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
          title="Actualiser"
        >
          <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}
