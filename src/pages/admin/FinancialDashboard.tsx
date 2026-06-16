import { useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  RefreshCw, Download, TrendingUp, Clock, AlertTriangle,
  CheckCircle2, ChevronDown, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import FinancialKpiCards from '@/components/admin/financial/FinancialKpiCards';
import RevenueChart     from '@/components/admin/financial/RevenueChart';
import RevenueByFlux    from '@/components/admin/financial/RevenueByFlux';
import { useDashboardKpi, usePrevisionnelKpi } from '@/hooks/useFinancialKpi';
import { formatFCFA, formatMilliers } from '@/utils/formatFinancial';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number | undefined): string {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  return `il y a ${Math.floor(s / 3600)}h`;
}

function exportGlobalCsv(data: ReturnType<typeof useDashboardKpi>['data']) {
  if (!data) return;
  const rows = [
    { Métrique: 'MRR',              Valeur: data.mrr.valeur,                  Unité: 'FCFA' },
    { Métrique: 'ARR',              Valeur: data.mrr.arr,                     Unité: 'FCFA' },
    { Métrique: 'ARPU',             Valeur: data.mrr.arpu,                    Unité: 'FCFA' },
    { Métrique: 'Abonnés actifs',   Valeur: data.mrr.abonnes_actifs,          Unité: 'comptes' },
    { Métrique: 'Revenu total mois',Valeur: data.revenus_mois.total,          Unité: 'FCFA' },
    { Métrique: 'Abonnement',       Valeur: data.revenus_mois.par_flux.abonnement,   Unité: 'FCFA' },
    { Métrique: 'Réabonnement',     Valeur: data.revenus_mois.par_flux.reabonnement, Unité: 'FCFA' },
    { Métrique: 'Upgrade',          Valeur: data.revenus_mois.par_flux.upgrade,      Unité: 'FCFA' },
    { Métrique: 'NFC',              Valeur: data.revenus_mois.par_flux.nfc,          Unité: 'FCFA' },
    { Métrique: 'Pipeline total',   Valeur: data.pipeline.total_attendu,      Unité: 'FCFA' },
    { Métrique: 'Churn rate',       Valeur: data.churn.taux,                  Unité: '%' },
    { Métrique: 'Comptes perdus',   Valeur: data.churn.comptes_perdus,        Unité: 'comptes' },
    { Métrique: 'Revenu perdu',     Valeur: data.churn.revenu_perdu,          Unité: 'FCFA' },
    { Métrique: 'Upgrades validés', Valeur: data.upgrades.valides_ce_mois,    Unité: 'upgrades' },
    { Métrique: 'CA Upgrades',      Valeur: data.upgrades.ca_upgrades,        Unité: 'FCFA' },
  ];
  const headers = 'Métrique;Valeur;Unité';
  const body    = rows.map(r => `"${r.Métrique}";"${r.Valeur}";"${r.Unité}"`).join('\n');
  const blob    = new Blob(['﻿' + headers + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a'); a.href = url;
  a.download = `portefolia_kpi_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Donut PieChart ────────────────────────────────────────────────────────────

const PIE_COLORS = ['#2E7D32', '#1565C0', '#6A1B9A', '#00695C'];
const PIE_LABELS = ['Abonnement', 'Réabonnement', 'Upgrade', 'NFC'];

function DonutDistribution({ data }: { data: ReturnType<typeof useDashboardKpi>['data'] }) {
  if (!data) return <div className="flex items-center justify-center h-64 text-gray-300 text-sm">Chargement…</div>;

  const pf = data.revenus_mois.par_flux;
  const total = data.revenus_mois.total || 1;
  const pieData = [
    { name: 'Abonnement',   value: pf.abonnement },
    { name: 'Réabonnement', value: pf.reabonnement },
    { name: 'Upgrade',      value: pf.upgrade },
    { name: 'NFC',          value: pf.nfc },
  ].filter(d => d.value > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={pieData} cx="50%" cy="50%"
            innerRadius={50} outerRadius={78}
            dataKey="value" paddingAngle={2}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTip
            formatter={(v: number) => [formatFCFA(v), '']}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2 mt-2">
        {pieData.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-gray-600">{d.name}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-800">{formatMilliers(d.value)} F</span>
                <span className="text-gray-400 ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section Prévisionnel ──────────────────────────────────────────────────────

const HORIZON_OPTIONS = [1, 3, 6] as const;

function SectionPrevisionnel() {
  const [horizon, setHorizon] = useState<1 | 3 | 6>(3);
  const { data, isLoading } = usePrevisionnelKpi(horizon);

  const barData = data?.par_mois.map(m => ({ name: m.mois.split(' ')[0], v: m.montant })) ?? [];

  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-800">Revenus attendus</h3>
          <p className="text-xs text-gray-400 mt-0.5">{horizon} prochain{horizon > 1 ? 's' : ''} mois</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {HORIZON_OPTIONS.map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={[
                'px-2.5 py-1.5 font-semibold transition-colors',
                horizon === h ? 'bg-[#1565C0] text-white' : 'bg-white text-gray-500 hover:bg-gray-50',
              ].join(' ')}>
              {h}m
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />
      ) : barData.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
          Aucun abonnement à renouveler sur la période
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatMilliers(v) + ' F'}
                axisLine={false} tickLine={false} />
              <RechartsTip
                formatter={(v: number) => [formatFCFA(v), 'Prévisionnel']}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="v" fill="#1565C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
            <span className="text-xs text-gray-500">Total projeté</span>
            <span className="text-sm font-black text-[#1565C0]">
              {formatFCFA(data?.total_previsionnel ?? 0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section Pipeline ──────────────────────────────────────────────────────────

function SectionPipeline({ pipeline }: {
  pipeline: NonNullable<ReturnType<typeof useDashboardKpi>['data']>['pipeline']
}) {
  const navigate = useNavigate();
  const isEmpty  = pipeline.nb_transactions === 0;

  function initiales(nom: string) {
    return nom.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
  }

  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-800">Paiements en attente</h3>
          <p className="text-xs text-gray-400 mt-0.5">À valider manuellement</p>
        </div>
        {!isEmpty && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
            {pipeline.nb_transactions} en attente
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl"
          style={{ backgroundColor: '#E8F5E9' }}>
          <CheckCircle2 size={28} style={{ color: '#2E7D32' }} />
          <p className="text-sm font-semibold" style={{ color: '#2E7D32' }}>
            Aucun paiement en attente ✓
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pipeline.plus_anciens.map(p => {
              const urgent = p.heures_attente > 24;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg"
                  style={{ backgroundColor: urgent ? '#FFF3E0' : '#F8FAFC' }}
                >
                  <div
                    className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: urgent ? '#E65100' : '#475569' }}
                  >
                    {initiales(p.utilisateur_nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.utilisateur_nom}</p>
                    <p className="text-[10px] text-gray-400">
                      {p.type_flux} · {p.heures_attente}h d'attente
                      {urgent && <span className="text-orange-500 ml-1">⚠ Urgent</span>}
                    </p>
                  </div>
                  <span className="text-xs font-black shrink-0" style={{ color: '#2E7D32' }}>
                    {formatFCFA(p.montant)}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/admin/wave-validation')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#E65100' }}
          >
            <Clock size={13} /> Valider les paiements
            <ExternalLink size={12} className="ml-auto" />
          </button>
        </>
      )}
    </div>
  );
}

// ── Section métriques avancées ────────────────────────────────────────────────

function SectionMetriquesAvancees({ data }: { data: ReturnType<typeof useDashboardKpi>['data'] }) {
  if (!data) return null;

  const ltv = data.churn.taux > 0
    ? (data.mrr.arpu / (data.churn.taux / 100)).toFixed(0)
    : null;

  const nrr = data.mrr.variation_vs_mois_precedent !== null
    ? (100 + (data.mrr.variation_vs_mois_precedent ?? 0)).toFixed(1)
    : null;

  const arpu_par_flux = [
    { flux: 'Abonnement',   revenu: data.revenus_mois.par_flux.abonnement },
    { flux: 'Réabonnement', revenu: data.revenus_mois.par_flux.reabonnement },
    { flux: 'Upgrade',      revenu: data.upgrades.ca_upgrades },
    { flux: 'NFC',          revenu: data.nfc.ca_valide },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* LTV estimée */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">LTV estimée</p>
        <p className="text-xl font-black mt-1 text-[#2E7D32]">
          {ltv ? formatFCFA(Number(ltv)) : '—'}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          ARPU ÷ taux churn mensuel
          {data.churn.taux === 0 && <span className="text-green-500 ml-1">(churn nul)</span>}
        </p>
      </div>

      {/* NRR */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">NRR</p>
        <p className={[
          'text-xl font-black mt-1',
          nrr && Number(nrr) >= 100 ? 'text-[#2E7D32]' : 'text-[#C62828]',
        ].join(' ')}>
          {nrr ? nrr + '%' : '—'}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">Net Revenue Retention vs mois précédent</p>
      </div>

      {/* Breakdown revenus par flux */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 sm:col-span-2 lg:col-span-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Répartition revenus ce mois
        </p>
        <div className="space-y-2">
          {arpu_par_flux.map(r => {
            const pct = data.revenus_mois.total > 0
              ? (r.revenu / data.revenus_mois.total * 100).toFixed(1)
              : '0';
            return (
              <div key={r.flux}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-gray-600">{r.flux}</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2E7D32] rounded-full"
                    style={{ width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FinancialDashboard() {
  const { data, dataUpdatedAt, refetch, isFetching } = useDashboardKpi();
  const handleRefresh = useCallback(() => refetch(), [refetch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Section 1 : Header ─────────────────────────────────────── */}
      <div
        className="px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-white">Moteur Financier</h1>
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-200 px-2.5 py-1 rounded-full bg-white/10">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-green-200 text-sm">
                Revenus réels &amp; prévisionnels en temps réel
              </p>
              <p className="text-green-300/70 text-xs mt-1">
                Dernière mise à jour : {timeAgo(dataUpdatedAt)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm" variant="ghost"
                onClick={handleRefresh}
                disabled={isFetching}
                className="text-white hover:bg-white/10 border border-white/20 gap-1.5 h-8 text-xs"
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                Actualiser
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={() => exportGlobalCsv(data)}
                disabled={!data}
                className="text-white hover:bg-white/10 border border-white/20 gap-1.5 h-8 text-xs"
              >
                <Download size={13} />
                Exporter Intelligence
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Section 2 : KPI Cards */}
        <FinancialKpiCards />

        {/* Section 3 : Graphique + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <RevenueChart defaultView="area" nbMois={12} />
          </div>
          <div
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
          >
            <h3 className="text-sm font-black text-gray-800 mb-1">Distribution ce mois</h3>
            <p className="text-xs text-gray-400 mb-4">Répartition par flux de revenu</p>
            <DonutDistribution data={data} />
          </div>
        </div>

        {/* Section 4 : Prévisionnel + Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionPrevisionnel />
          {data?.pipeline
            ? <SectionPipeline pipeline={data.pipeline} />
            : <div className="bg-white rounded-xl p-5 animate-pulse"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <div className="h-48 bg-gray-100 rounded-lg" />
              </div>
          }
        </div>

        {/* Section 5 : Tableau par flux */}
        <RevenueByFlux />

        {/* Section 6 : Métriques avancées (accordion) */}
        <div className="bg-white rounded-xl" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="px-5 py-4 text-sm font-black text-gray-800 hover:no-underline">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: '#2E7D32' }} />
                  Métriques avancées
                  <span className="text-[10px] font-semibold text-gray-400 ml-1">LTV · NRR · Répartition</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <SectionMetriquesAvancees data={data} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

      </div>
    </div>
  );
}
