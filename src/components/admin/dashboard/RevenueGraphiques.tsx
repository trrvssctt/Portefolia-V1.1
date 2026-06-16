import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatFCFA, formatMilliers } from '@/utils/formatFinancial';

// ── Données flux ──────────────────────────────────────────────────────────────

type FluxEntry = { mois: string; abonnement: number; reabonnement: number; upgrade: number; nfc: number };
type FluxKey = 'reabonnement' | 'abonnement' | 'upgrade' | 'nfc';

const FLUX: { key: FluxKey; label: string; stroke: string; dashed?: boolean }[] = [
  { key: 'reabonnement', label: 'Réabo',       stroke: '#2E7D32' },
  { key: 'abonnement',   label: 'Abo initial', stroke: '#1565C0' },
  { key: 'upgrade',      label: 'Upgrade',     stroke: '#6A1B9A', dashed: true },
  { key: 'nfc',          label: 'NFC',         stroke: '#00695C', dashed: true },
];

const PIE_COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#00695C', '#E65100'];

// ── Formatage mois 'YYYY-MM' → 'Jan 26' ──────────────────────────────────────

function formatMois(raw: string): string {
  const [year, month] = raw.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// ── Tooltip AreaChart ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div
      className="bg-white rounded-xl py-3 px-4 min-w-[180px]"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #F1F5F9' }}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      {payload.map((p: any) => {
        const flux = FLUX.find((f) => f.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: flux?.stroke ?? p.color }} />
              <span className="text-[11px] text-gray-500">{flux?.label ?? p.dataKey}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-800">{formatFCFA(p.value)}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
        <span className="text-[11px] font-black text-gray-600">Total</span>
        <span className="text-[11px] font-black" style={{ color: '#2E7D32' }}>{formatFCFA(total)}</span>
      </div>
    </div>
  );
}

// ── Légende cliquable ─────────────────────────────────────────────────────────

function ClickableLegend({ hidden, onToggle }: { hidden: Set<FluxKey>; onToggle: (k: FluxKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {FLUX.map((f) => {
        const off = hidden.has(f.key);
        return (
          <button
            key={f.key}
            onClick={() => onToggle(f.key)}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all',
              off
                ? 'bg-gray-100 text-gray-400 line-through'
                : 'bg-white text-gray-700 shadow-sm border border-gray-200'
            )}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: off ? '#D1D5DB' : f.stroke }} />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonArea() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-48 bg-gray-200 rounded" />
      <div className="h-[200px] w-full bg-gray-100 rounded-xl" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-5 w-16 bg-gray-100 rounded-full" />)}
      </div>
    </div>
  );
}

function SkeletonDonut() {
  return <div className="animate-pulse h-[200px] w-full rounded-xl bg-gray-100" />;
}

// ── Tooltip donut ─────────────────────────────────────────────────────────────

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div
      className="bg-white rounded-lg py-2 px-3 text-[11px]"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #F1F5F9' }}
    >
      <p className="font-bold text-gray-800">{name}</p>
      <p className="text-gray-500">{value} abonné{value > 1 ? 's' : ''}</p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RevenueGraphiquesProps {
  evolution: FluxEntry[] | null | undefined;
  distribution: { name: string; nb_abonnes: number; pourcentage: number }[];
  isLoading?: boolean;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function RevenueGraphiques({ evolution, distribution, isLoading }: RevenueGraphiquesProps) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState<Set<FluxKey>>(new Set());

  function toggleFlux(key: FluxKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const chartData = (evolution ?? []).map((r) => ({
    mois:         formatMois(r.mois),
    reabonnement: hidden.has('reabonnement') ? 0 : r.reabonnement,
    abonnement:   hidden.has('abonnement')   ? 0 : r.abonnement,
    upgrade:      hidden.has('upgrade')      ? 0 : r.upgrade,
    nfc:          hidden.has('nfc')          ? 0 : r.nfc,
  }));

  return (
    <div className="flex flex-col xl:flex-row gap-4">

      {/* ── Gauche : AreaChart (flex 3) ───────────────────────────────────── */}
      <div
        className="bg-white rounded-xl p-5 flex-[3] min-w-0"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-gray-800">Évolution des revenus — 6 mois</h3>
          <button
            onClick={() => navigate('/admin/finance')}
            className="text-[11px] font-semibold hover:underline"
            style={{ color: '#1565C0' }}
          >
            Voir le détail →
          </button>
        </div>

        {isLoading ? (
          <SkeletonArea />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-gray-300 text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReabo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2E7D32" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAbo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1565C0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis
                  dataKey="mois"
                  tick={{ fontSize: 10, fill: '#9E9E9E' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatMilliers(v) + 'F'}
                  tick={{ fontSize: 10, fill: '#9E9E9E' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="reabonnement"
                  stroke="#2E7D32" fill="url(#gradReabo)" strokeWidth={2}
                  dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                  name="Réabo"
                />
                <Area
                  type="monotone" dataKey="abonnement"
                  stroke="#1565C0" fill="url(#gradAbo)" strokeWidth={1.5}
                  dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                  name="Abo initial"
                />
                <Area
                  type="monotone" dataKey="upgrade"
                  stroke="#6A1B9A" fill="none" strokeWidth={1} strokeDasharray="4 2"
                  dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                  name="Upgrade"
                />
                <Area
                  type="monotone" dataKey="nfc"
                  stroke="#00695C" fill="none" strokeWidth={1} strokeDasharray="2 3"
                  dot={false} activeDot={{ r: 3, strokeWidth: 0 }}
                  name="NFC"
                />
              </AreaChart>
            </ResponsiveContainer>

            <ClickableLegend hidden={hidden} onToggle={toggleFlux} />
          </>
        )}
      </div>

      {/* ── Droite : PieChart donut (flex 1) ─────────────────────────────── */}
      <div
        className="bg-white rounded-xl p-5 flex-1 min-w-0 flex flex-col items-center"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      >
        <h3 className="text-sm font-black text-gray-800 self-start mb-3">Plans actifs</h3>

        {isLoading ? (
          <SkeletonDonut />
        ) : distribution.every((p) => p.nb_abonnes === 0) ? (
          <div className="flex items-center justify-center h-[200px] text-[12px] text-gray-400">
            Aucun abonné actif
          </div>
        ) : (
          <>
            <PieChart width={140} height={140}>
              <Pie
                data={distribution}
                cx={70} cy={70}
                innerRadius={45} outerRadius={65}
                dataKey="nb_abonnes"
                nameKey="name"
                strokeWidth={0}
              >
                {distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>

            {/* Légende verticale */}
            <ul className="mt-3 w-full space-y-1.5">
              {distribution.map((plan, i) => (
                <li key={`${plan.name}-${i}`} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-[11px] text-gray-600 flex-1 truncate">{plan.name}</span>
                  <span className="text-[11px] font-semibold text-gray-800 shrink-0">
                    {plan.nb_abonnes}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0 w-9 text-right">
                    {plan.pourcentage}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

    </div>
  );
}
