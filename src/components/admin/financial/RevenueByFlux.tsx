import { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts';
import { Download, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboardKpi, useFluxDetail, useEvolutionKpi } from '@/hooks/useFinancialKpi';
import { formatFCFA, formatMilliers } from '@/utils/formatFinancial';

// ── Constantes ────────────────────────────────────────────────────────────────

const GREEN      = '#2E7D32';
const GREEN_LIGHT = '#E8F5E9';

const PERIODS = ['mois', 'trimestre', 'annee'] as const;
type Period   = typeof PERIODS[number];

const PERIOD_LABELS: Record<Period, string> = {
  mois:      'Ce mois',
  trimestre: 'Trimestre',
  annee:     'Cette année',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string) {
  try { return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
}

function exportCsv(rows: object[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).join(';');
  const body    = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob    = new Blob(['﻿' + headers + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sous-composants communs ───────────────────────────────────────────────────

function KpiMiniCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[120px] bg-white rounded-lg px-4 py-3 border border-gray-100"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-lg font-black mt-0.5" style={{ color: GREEN }}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    RÉUSSI:        { label: 'Validé',       bg: '#E8F5E9', color: GREEN },
    EN_ATTENTE:    { label: 'En attente',   bg: '#FFF3E0', color: '#E65100' },
    ÉCHOUÉ:        { label: 'Échoué',       bg: '#FFEBEE', color: '#C62828' },
    VALIDATED:     { label: 'Validé',       bg: '#E8F5E9', color: GREEN },
    PENDING:       { label: 'En attente',   bg: '#FFF3E0', color: '#E65100' },
    REJECTED:      { label: 'Rejeté',       bg: '#FFEBEE', color: '#C62828' },
    PAID:          { label: 'Payé',         bg: '#E8F5E9', color: GREEN },
    FAILED:        { label: 'Échoué',       bg: '#FFEBEE', color: '#C62828' },
    COMMANDÉ:      { label: 'Commandé',     bg: '#F1F5F9', color: '#475569' },
    EN_PRODUCTION: { label: 'En production',bg: '#FFF3E0', color: '#E65100' },
    EXPÉDIÉ:       { label: 'Expédié',      bg: '#EFF6FF', color: '#1565C0' },
    LIVRÉ:         { label: 'Livré',        bg: '#E8F5E9', color: GREEN },
  };
  const c = cfg[statut] ?? { label: statut, bg: '#F1F5F9', color: '#475569' };
  return (
    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function Pagination({
  page, pages, total, limit, onPage,
}: { page: number; pages: number; total: number; limit: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400">
      <span>{total} résultat{total > 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
        <span className="px-2 font-semibold text-gray-700">{page} / {pages || 1}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="animate-pulse space-y-2 mt-2">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-10 bg-gray-100 rounded" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2.5 px-3 text-[11px] font-black uppercase tracking-wider text-white whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2.5 px-3 text-xs text-gray-700 ${className ?? ''}`}>{children}</td>;
}

// ── Tab Abonnements ───────────────────────────────────────────────────────────

function TabAbonnements({ periode, kpi }: {
  periode: Period;
  kpi: ReturnType<typeof useDashboardKpi>['data'];
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFluxDetail('abonnement', periode, page);

  const rows = data?.transactions ?? [];
  const pg   = data?.pagination;

  const planCount: Record<string, number> = {};
  rows.forEach(r => { if ((r as any).plan) planCount[(r as any).plan] = (planCount[(r as any).plan] ?? 0) + 1; });
  const topPlan = Object.entries(planCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  function doExport() {
    exportCsv(rows.map(r => ({
      Date: fmt(r.created_at), Client: r.utilisateur.nom, Email: r.utilisateur.email,
      Montant: r.montant, Duree_mois: r.duree_mois ?? '—', Statut: r.statut,
    })), `abonnements_${periode}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <KpiMiniCard label="Nouveaux" value={String(pg?.total ?? '—')} sub={PERIOD_LABELS[periode]} />
        <KpiMiniCard label="Revenu"
          value={kpi ? formatFCFA(kpi.revenus_mois.par_flux.abonnement) : '—'}
          sub="Mois en cours" />
        <KpiMiniCard label="Plan populaire" value={topPlan} sub="Ce mois" />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-500">Transactions récentes</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doExport}
            className="h-7 text-xs gap-1.5"><Download size={12} /> Export CSV</Button>
          <Button size="sm" variant="outline"
            className="h-7 text-xs gap-1.5"><ArrowRight size={12} /> Voir tout</Button>
        </div>
      </div>

      {isLoading ? <TableSkeleton cols={6} /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full">
            <thead style={{ backgroundColor: GREEN }}>
              <tr><Th>Date</Th><Th>Client</Th><Th>Durée</Th><Th>Montant</Th><Th>Statut</Th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">Aucune transaction</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? GREEN_LIGHT : 'white' }}>
                  <Td>{fmt(r.created_at)}</Td>
                  <Td>
                    <div className="font-semibold">{r.utilisateur.nom || '—'}</div>
                    <div className="text-[10px] text-gray-400">{r.utilisateur.email}</div>
                  </Td>
                  <Td>{r.duree_mois ? `${r.duree_mois} mois` : '—'}</Td>
                  <Td className="font-bold" style={{ color: GREEN }}>{formatFCFA(r.montant)}</Td>
                  <Td><StatutBadge statut={r.statut} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pg && pg.pages > 1 && (
        <Pagination page={page} pages={pg.pages} total={pg.total} limit={pg.limit} onPage={setPage} />
      )}
    </div>
  );
}

// ── Tab Réabonnements ─────────────────────────────────────────────────────────

function TabReabonnements({ periode, kpi }: {
  periode: Period;
  kpi: ReturnType<typeof useDashboardKpi>['data'];
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFluxDetail('reabonnement', periode, page);
  const { data: evo }       = useEvolutionKpi(6);

  const pg  = data?.pagination;
  const rows = data?.transactions ?? [];

  const renouvellements = pg?.total ?? 0;
  const expirations     = kpi?.churn.comptes_perdus ?? 0;
  const tauxRetention   = expirations > 0
    ? ((renouvellements / (renouvellements + expirations)) * 100).toFixed(1) + '%'
    : '—';

  const barData = evo?.raw?.map((r: any) => ({ name: r.mois, v: r.reabonnement })) ?? [];

  function doExport() {
    exportCsv(rows.map(r => ({
      Date: fmt(r.created_at), Client: r.utilisateur.nom, Email: r.utilisateur.email,
      Duree_mois: r.duree_mois ?? '—', Montant: r.montant, Statut: r.statut,
    })), `reabonnements_${periode}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <KpiMiniCard label="Renouvellements" value={String(renouvellements)} sub={PERIOD_LABELS[periode]} />
        <KpiMiniCard label="Taux rétention" value={tauxRetention} sub="vs expirations" />
        <KpiMiniCard label="Revenu récurrent"
          value={kpi ? formatFCFA(kpi.revenus_mois.par_flux.reabonnement) : '—'} />
      </div>

      {barData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3">
            Réabonnements — 6 derniers mois
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => formatMilliers(v)} axisLine={false} tickLine={false} />
              <RechartsTip
                formatter={(v: number) => [formatFCFA(v), 'Réabonnements']}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="v" fill="#1565C0" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-500">Transactions récentes</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doExport} className="h-7 text-xs gap-1.5"><Download size={12} /> Export CSV</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><ArrowRight size={12} /> Voir tout</Button>
        </div>
      </div>

      {isLoading ? <TableSkeleton cols={5} /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full">
            <thead style={{ backgroundColor: GREEN }}>
              <tr><Th>Date</Th><Th>Client</Th><Th>Durée</Th><Th>Montant</Th><Th>Statut</Th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">Aucune transaction</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? GREEN_LIGHT : 'white' }}>
                  <Td>{fmt(r.created_at)}</Td>
                  <Td>
                    <div className="font-semibold">{r.utilisateur.nom || '—'}</div>
                    <div className="text-[10px] text-gray-400">{r.utilisateur.email}</div>
                  </Td>
                  <Td>{r.duree_mois ? `${r.duree_mois} mois` : '—'}</Td>
                  <Td className="font-bold" style={{ color: GREEN }}>{formatFCFA(r.montant)}</Td>
                  <Td><StatutBadge statut={r.statut} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pg && pg.pages > 1 && (
        <Pagination page={page} pages={pg.pages} total={pg.total} limit={pg.limit} onPage={setPage} />
      )}
    </div>
  );
}

// ── Tab Upgrades ──────────────────────────────────────────────────────────────

function TabUpgrades({ kpi }: { kpi: ReturnType<typeof useDashboardKpi>['data'] }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFluxDetail('upgrade', 'mois', page);

  const pg   = data?.pagination;
  const rows = data?.transactions ?? [];

  const upgrades = kpi?.upgrades;

  function doExport() {
    exportCsv(rows.map(r => ({
      Date: fmt(r.created_at), Client: r.utilisateur.nom, Email: r.utilisateur.email,
      Montant_delta: r.montant, Statut: r.statut,
    })), 'upgrades_mois.csv');
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <KpiMiniCard label="Validés ce mois"  value={String(upgrades?.valides_ce_mois ?? '—')} />
        <KpiMiniCard label="En attente"       value={String(upgrades?.en_attente ?? '—')}
          sub="Nécessitent validation" />
        <KpiMiniCard label="CA upgrades"
          value={upgrades ? formatFCFA(upgrades.ca_upgrades) : '—'}
          sub={upgrades?.chemin_le_plus_frequent ?? undefined} />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-500">Transactions récentes</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doExport} className="h-7 text-xs gap-1.5"><Download size={12} /> Export CSV</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><ArrowRight size={12} /> Voir tout</Button>
        </div>
      </div>

      {isLoading ? <TableSkeleton cols={5} /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full">
            <thead style={{ backgroundColor: GREEN }}>
              <tr><Th>Date</Th><Th>Client</Th><Th>Delta prix</Th><Th>Statut</Th><Th>Action</Th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">Aucun upgrade</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? GREEN_LIGHT : 'white' }}>
                  <Td>{fmt(r.created_at)}</Td>
                  <Td>
                    <div className="font-semibold">{r.utilisateur.nom || '—'}</div>
                    <div className="text-[10px] text-gray-400">{r.utilisateur.email}</div>
                  </Td>
                  <Td className="font-bold" style={{ color: '#6A1B9A' }}>+{formatFCFA(r.montant)}</Td>
                  <Td><StatutBadge statut={r.statut} /></Td>
                  <Td>
                    {r.statut === 'EN_ATTENTE' && (
                      <Button size="sm"
                        className="h-6 text-[11px] gap-1 px-2"
                        style={{ backgroundColor: GREEN }}
                      >
                        <CheckCircle2 size={11} /> Valider
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pg && pg.pages > 1 && (
        <Pagination page={page} pages={pg.pages} total={pg.total} limit={pg.limit} onPage={setPage} />
      )}
    </div>
  );
}

// ── Tab NFC ───────────────────────────────────────────────────────────────────

function TabNFC({ kpi }: { kpi: ReturnType<typeof useDashboardKpi>['data'] }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFluxDetail('nfc', 'mois', page);

  const pg   = data?.pagination;
  const rows = data?.transactions ?? [];
  const nfc  = kpi?.nfc;

  function doExport() {
    exportCsv(rows.map(r => ({
      Date: fmt(r.created_at), Client: r.utilisateur.nom, Email: r.utilisateur.email,
      Montant: r.montant, Statut: r.statut,
    })), 'commandes_nfc_mois.csv');
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <KpiMiniCard label="Commandes payées"  value={String(nfc?.commandes_payees ?? '—')} />
        <KpiMiniCard label="En attente livraison" value={String(nfc?.commandes_en_attente ?? '—')} />
        <KpiMiniCard label="CA NFC"
          value={nfc ? formatFCFA(nfc.ca_valide) : '—'}
          sub={nfc ? `Panier moyen : ${formatFCFA(nfc.panier_moyen)}` : undefined} />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-500">Commandes récentes</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={doExport} className="h-7 text-xs gap-1.5"><Download size={12} /> Export CSV</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><ArrowRight size={12} /> Voir tout</Button>
        </div>
      </div>

      {isLoading ? <TableSkeleton cols={5} /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full">
            <thead style={{ backgroundColor: GREEN }}>
              <tr><Th>Date</Th><Th>Client</Th><Th>Montant</Th><Th>Paiement</Th><Th>Livraison</Th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">Aucune commande</td></tr>
              ) : rows.map((r: any, i) => (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? GREEN_LIGHT : 'white' }}>
                  <Td>{fmt(r.created_at)}</Td>
                  <Td>
                    <div className="font-semibold">{r.utilisateur.nom || '—'}</div>
                    <div className="text-[10px] text-gray-400">{r.utilisateur.email}</div>
                  </Td>
                  <Td className="font-bold" style={{ color: GREEN }}>{formatFCFA(r.montant)}</Td>
                  <Td><StatutBadge statut={r.statut_paiement ?? r.statut} /></Td>
                  <Td><StatutBadge statut={r.statut_livraison ?? 'COMMANDÉ'} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pg && pg.pages > 1 && (
        <Pagination page={page} pages={pg.pages} total={pg.total} limit={pg.limit} onPage={setPage} />
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

const TABS = [
  { value: 'abonnement',   label: 'Abonnements'   },
  { value: 'reabonnement', label: 'Réabonnements' },
  { value: 'upgrade',      label: 'Upgrades'      },
  { value: 'nfc',          label: 'Cartes NFC'    },
] as const;

export default function RevenueByFlux() {
  const [periode, setPeriode] = useState<Period>('mois');
  const { data: kpi } = useDashboardKpi();

  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-black text-gray-800">Revenus par flux</h3>
          <p className="text-xs text-gray-400 mt-0.5">Transactions détaillées par type de revenu</p>
        </div>

        {/* Sélecteur période global */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriode(p)}
              className={[
                'px-3 py-1.5 font-semibold transition-colors',
                periode === p ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50',
              ].join(' ')}
              style={periode === p ? { backgroundColor: GREEN } : {}}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="abonnement">
        <TabsList className="w-full grid grid-cols-4 mb-5">
          {TABS.map(t => (
            <TabsTrigger
              key={t.value} value={t.value}
              className="text-xs font-semibold data-[state=active]:text-white"
              style={undefined}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="abonnement">
          <TabAbonnements periode={periode} kpi={kpi} />
        </TabsContent>

        <TabsContent value="reabonnement">
          <TabReabonnements periode={periode} kpi={kpi} />
        </TabsContent>

        <TabsContent value="upgrade">
          <TabUpgrades kpi={kpi} />
        </TabsContent>

        <TabsContent value="nfc">
          <TabNFC kpi={kpi} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
