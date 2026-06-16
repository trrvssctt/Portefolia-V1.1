import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, Layers } from 'lucide-react';
import { useEvolutionKpi } from '@/hooks/useFinancialKpi';
import { formatFCFA, formatMilliers } from '@/utils/formatFinancial';
import { cn } from '@/lib/utils';

// ── Configuration des flux ────────────────────────────────────────────────────

const FLUX = [
  { key: 'reabonnement', label: 'Réabonnement', stroke: '#2E7D32', fill: '#E8F5E9' },
  { key: 'abonnement',   label: 'Abonnement',   stroke: '#1565C0', fill: '#E3F2FD' },
  { key: 'upgrade',      label: 'Upgrade',      stroke: '#6A1B9A', fill: '#F3E5F5' },
  { key: 'nfc',          label: 'NFC',          stroke: '#00695C', fill: '#E0F2F1' },
] as const;

type FluxKey = typeof FLUX[number]['key'];
type ViewMode = 'area' | 'bar' | 'stacked';

const PERIODS = [
  { label: '3 mois',  value: 3 },
  { label: '6 mois',  value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
] as const;

// ── Tooltip personnalisé ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);

  return (
    <div
      className="bg-white rounded-xl py-3 px-4 min-w-[200px]"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #F1F5F9' }}
    >
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      {payload.map((p: any) => {
        const flux = FLUX.find(f => f.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: flux?.stroke ?? p.color }}
              />
              <span className="text-xs text-gray-500">{flux?.label ?? p.dataKey}</span>
            </div>
            <span className="text-xs font-semibold text-gray-800">{formatFCFA(p.value)}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
        <span className="text-xs font-black text-gray-600">Total</span>
        <span className="text-xs font-black" style={{ color: '#2E7D32' }}>{formatFCFA(total)}</span>
      </div>
    </div>
  );
}

// ── Légende cliquable ─────────────────────────────────────────────────────────

function ClickableLegend({
  hidden,
  onToggle,
}: {
  hidden: Set<FluxKey>;
  onToggle: (key: FluxKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      {FLUX.map(f => {
        const off = hidden.has(f.key);
        return (
          <button
            key={f.key}
            onClick={() => onToggle(f.key)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-all',
              off
                ? 'bg-gray-100 text-gray-400 line-through'
                : 'bg-white text-gray-700 shadow-sm border border-gray-200'
            )}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: off ? '#D1D5DB' : f.stroke }}
            />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-8 w-8 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
      <div className="h-80 w-full bg-gray-100 rounded-xl" />
    </div>
  );
}

// ── Switcher de vue ───────────────────────────────────────────────────────────

const VIEW_OPTIONS: { mode: ViewMode; icon: React.FC<{ size?: number }>; title: string }[] = [
  { mode: 'area',    icon: TrendingUp, title: 'Tendance (aires)' },
  { mode: 'bar',     icon: BarChart2,  title: 'Comparaison (barres)' },
  { mode: 'stacked', icon: Layers,     title: 'Contribution (empilé)' },
];

// ── Composant principal ───────────────────────────────────────────────────────

export interface RevenueChartProps {
  defaultView?: ViewMode;
  nbMois?: number;
}

export default function RevenueChart({
  defaultView = 'area',
  nbMois: initialMois = 12,
}: RevenueChartProps) {
  const [view,    setView]    = useState<ViewMode>(defaultView);
  const [nbMois,  setNbMois]  = useState(initialMois);
  const [hidden,  setHidden]  = useState<Set<FluxKey>>(new Set());

  const { data, isLoading } = useEvolutionKpi(nbMois);

  function toggleFlux(key: FluxKey) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Convertir raw en tableau Recharts
  const chartData = (data?.raw ?? []).map((r: any) => ({
    mois:         r.mois,          // 'YYYY-MM' → label déjà formaté dans labels[]
    reabonnement: hidden.has('reabonnement') ? 0 : r.reabonnement,
    abonnement:   hidden.has('abonnement')   ? 0 : r.abonnement,
    upgrade:      hidden.has('upgrade')      ? 0 : r.upgrade,
    nfc:          hidden.has('nfc')          ? 0 : r.nfc,
  }));

  // Aligner les labels formatés (ex: "Jan 2026")
  const labels = data?.labels ?? [];
  const chartDataLabeled = chartData.map((d, i) => ({ ...d, mois: labels[i] ?? d.mois }));

  const commonAxisProps = {
    tick:      { fontSize: 11, fill: '#9CA3AF' },
    axisLine:  { stroke: '#F1F5F9' },
    tickLine:  false,
  };

  const yAxisProps = {
    ...commonAxisProps,
    tickFormatter: (v: number) => formatMilliers(v) + ' F',
    width: 72,
  };

  const gridProps = {
    strokeDasharray: '3 3' as const,
    stroke: '#F1F5F9',
    vertical: false,
  };

  if (isLoading) return <ChartSkeleton />;

  const isEmpty = !chartDataLabeled.length;

  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-black text-gray-800">Évolution des revenus</h3>
          <p className="text-xs text-gray-400 mt-0.5">Par flux — {nbMois} derniers mois</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Sélecteur de période */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setNbMois(p.value)}
                className={cn(
                  'px-3 py-1.5 font-semibold transition-colors',
                  nbMois === p.value
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Switcher de vue */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {VIEW_OPTIONS.map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                title={title}
                onClick={() => setView(mode)}
                className={cn(
                  'p-2 transition-colors',
                  view === mode
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-white text-gray-400 hover:bg-gray-50'
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Graphique */}
      {isEmpty ? (
        <div className="flex items-center justify-center h-80 text-gray-300 text-sm">
          Aucune donnée sur la période sélectionnée
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            {view === 'area' ? (
              <AreaChart data={chartDataLabeled} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {FLUX.map(f => (
                    <linearGradient key={f.key} id={`grad_${f.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={f.stroke} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={f.stroke} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="mois" {...commonAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<CustomTooltip />} />
                {FLUX.map(f => (
                  <Area
                    key={f.key}
                    type="monotone"
                    dataKey={f.key}
                    stroke={f.stroke}
                    strokeWidth={2}
                    fill={`url(#grad_${f.key})`}
                    stackId="1"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart
                data={chartDataLabeled}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                barCategoryGap={view === 'stacked' ? '30%' : '20%'}
                barGap={2}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="mois" {...commonAxisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<CustomTooltip />} />
                {FLUX.map(f => (
                  <Bar
                    key={f.key}
                    dataKey={f.key}
                    name={f.label}
                    fill={f.stroke}
                    stackId={view === 'stacked' ? 'stack' : undefined}
                    radius={view === 'stacked' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>

          <ClickableLegend hidden={hidden} onToggle={toggleFlux} />
        </>
      )}
    </div>
  );
}
