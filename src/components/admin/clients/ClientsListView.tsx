import { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, AlertCircle, XCircle,
  MoreVertical, Mail, Edit2, RefreshCw,
  Lock, Unlock, Eye, ChevronLeft, ChevronRight,
  Briefcase, Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientsList, downloadClientsCSV, type ClientListItem, type ClientsFiltres } from '@/hooks/useClients';
import { formatFCFA } from '@/utils/formatFinancial';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const GREEN  = '#2E7D32';
const ORANGE = '#E65100';
const RED    = '#C62828';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initiales(prenom: string, nom: string): string {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

function rowBg(status: ClientListItem['subscription_status'], statut_compte: string, index: number): string {
  if (statut_compte === 'BLOQUÉ' || statut_compte === 'inactif') return '#F5F5F5';
  if (status === 'PENDING_PAYMENT') return '#FFFDE7';
  if (status === 'EXPIRED') return '#FFF5F5';
  return index % 2 === 1 ? '#E8F5E9' : '#FFFFFF';
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── KPI Row ───────────────────────────────────────────────────────────────────

interface KpiRowProps {
  compteurs: { total: number; actifs: number; en_attente: number; expires: number; bloques: number };
  isLoading: boolean;
}

function KpiRow({ compteurs, isLoading }: KpiRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg p-4" style={{ backgroundColor: '#F5F5F5' }}>
            <div className="h-4 w-16 rounded bg-gray-200 mb-2" />
            <div className="h-7 w-12 rounded bg-gray-300" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="rounded-lg p-4 flex flex-col gap-1" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="flex items-center gap-2 text-gray-500">
          <Users size={14} />
          <span className="text-xs font-medium">Total clients</span>
        </div>
        <p className="text-2xl font-bold text-gray-700">{compteurs.total.toLocaleString('fr-FR')}</p>
      </div>

      <div className="rounded-lg p-4 flex flex-col gap-1" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="flex items-center gap-2 text-gray-500">
          <Users size={14} />
          <span className="text-xs font-medium">Actifs</span>
        </div>
        <p className="text-2xl font-bold" style={{ color: GREEN }}>{compteurs.actifs.toLocaleString('fr-FR')}</p>
      </div>

      <div className="rounded-lg p-4 flex flex-col gap-1" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={14} />
            <span className="text-xs font-medium">En attente</span>
          </div>
          {compteurs.en_attente > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
              style={{ color: ORANGE, backgroundColor: ORANGE + '20' }}
            >
              À valider
            </span>
          )}
        </div>
        <p className="text-2xl font-bold" style={{ color: ORANGE }}>{compteurs.en_attente.toLocaleString('fr-FR')}</p>
      </div>

      <div className="rounded-lg p-4 flex flex-col gap-1" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="flex items-center gap-2 text-gray-500">
          <XCircle size={14} />
          <span className="text-xs font-medium">Expirés</span>
        </div>
        <p className="text-2xl font-bold" style={{ color: RED }}>{compteurs.expires.toLocaleString('fr-FR')}</p>
      </div>
    </div>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter: '#1565C0',
  pro:     '#6A1B9A',
  business:'#E65100',
  free:    '#757575',
};

function PlanBadge({ name }: { name?: string }) {
  if (!name) return <span className="text-xs text-gray-400">—</span>;
  const key = name.toLowerCase();
  const color = Object.entries(PLAN_COLORS).find(([k]) => key.includes(k))?.[1] ?? '#424242';
  return (
    <span
      className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: color + '18' }}
    >
      {name}
    </span>
  );
}

// ── Statut badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut, jours }: { statut?: string; jours?: number }) {
  if (!statut) return null;

  const map: Record<string, { label: string; color: string }> = {
    ACTIVE:          { label: 'Actif',       color: GREEN     },
    PENDING_PAYMENT: { label: 'En attente',  color: ORANGE    },
    GRACE_PERIOD:    { label: 'Délai grâce', color: ORANGE    },
    EXPIRED:         { label: 'Expiré',      color: RED       },
    SUSPENDED:       { label: 'Suspendu',    color: RED       },
    inactif:         { label: 'Inactif',     color: '#9CA3AF' },
    BLOQUÉ:          { label: 'Bloqué',      color: RED       },
  };

  const cfg = map[statut] ?? { label: statut, color: '#757575' };

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit"
        style={{ color: cfg.color, backgroundColor: cfg.color + '18' }}
      >
        {cfg.label}
      </span>
      {statut === 'ACTIVE' && jours !== undefined && jours >= 0 && (
        <span className="text-[10px] text-gray-400">J-{jours}</span>
      )}
    </div>
  );
}

// ── Bouton contextuel ─────────────────────────────────────────────────────────

function ContextButton({
  client,
  onSelectClient,
}: {
  client: ClientListItem;
  onSelectClient: (id: number) => void;
}) {
  const s = client.subscription_status;
  const bloque = client.statut_compte === 'BLOQUÉ';

  if (bloque) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelectClient(client.id); }}
        className="text-[11px] font-semibold px-2.5 py-1 rounded border"
        style={{ color: RED, borderColor: RED + '60' }}
      >
        Débloquer
      </button>
    );
  }
  if (s === 'PENDING_PAYMENT') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelectClient(client.id); }}
        className="text-[11px] font-semibold px-2.5 py-1 rounded text-white"
        style={{ backgroundColor: GREEN }}
      >
        Valider →
      </button>
    );
  }
  if (s === 'EXPIRED') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelectClient(client.id); }}
        className="text-[11px] font-semibold px-2.5 py-1 rounded border"
        style={{ color: ORANGE, borderColor: ORANGE + '60' }}
      >
        Relancer →
      </button>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelectClient(client.id); }}
      className="text-[11px] font-semibold px-2.5 py-1 rounded border border-gray-300 text-gray-600"
    >
      Vue 360°
    </button>
  );
}

// ── Menu ⋮ ────────────────────────────────────────────────────────────────────

interface RowMenuProps {
  client: ClientListItem;
  onSelectClient: (id: number) => void;
}

function RowMenu({ client, onSelectClient }: RowMenuProps) {
  const bloque   = client.statut_compte === 'BLOQUÉ';
  const expired  = client.subscription_status === 'EXPIRED';
  const active   = client.subscription_status === 'ACTIVE';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
          <Eye size={14} className="mr-2 text-gray-500" />
          Voir le profil 360°
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
          <Mail size={14} className="mr-2 text-gray-500" />
          Envoyer un email
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
          <Edit2 size={14} className="mr-2 text-gray-500" />
          Modifier les informations
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
          <Briefcase size={14} className="mr-2 text-gray-500" />
          Changer de plan
        </DropdownMenuItem>

        {(expired || active || bloque) && <DropdownMenuSeparator />}

        {expired && (
          <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
            <RefreshCw size={14} className="mr-2" style={{ color: ORANGE }} />
            <span style={{ color: ORANGE }}>Forcer renouvellement</span>
          </DropdownMenuItem>
        )}
        {active && (
          <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
            <Lock size={14} className="mr-2" style={{ color: RED }} />
            <span style={{ color: RED }}>Bloquer le compte</span>
          </DropdownMenuItem>
        )}
        {bloque && (
          <DropdownMenuItem onSelect={() => onSelectClient(client.id)}>
            <Unlock size={14} className="mr-2" style={{ color: GREEN }} />
            <span style={{ color: GREEN }}>Débloquer le compte</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Skeleton table ────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse flex gap-3 px-4 py-3 rounded-lg bg-gray-50">
          <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-gray-200" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
          <div className="h-5 w-20 rounded-full bg-gray-200 self-center" />
          <div className="h-5 w-16 rounded-full bg-gray-200 self-center" />
          <div className="h-5 w-12 rounded bg-gray-200 self-center" />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <Users size={28} className="text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-600 mb-1">Aucun client trouvé</p>
      <p className="text-sm text-gray-400 mb-4">Essayez de modifier vos critères de recherche.</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Réinitialiser les filtres
      </Button>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total_pages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}

function Pagination({ page, total_pages, total, limit, onChange }: PaginationProps) {
  const debut = (page - 1) * limit + 1;
  const fin   = Math.min(page * limit, total);

  const pages: (number | '...')[] = [];
  if (total_pages <= 7) {
    for (let i = 1; i <= total_pages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(total_pages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < total_pages - 2) pages.push('...');
    pages.push(total_pages);
  }

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500 text-xs">
        Résultats {debut}–{fin} sur {total.toLocaleString('fr-FR')}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className="min-w-[28px] h-7 rounded text-xs font-medium"
              style={
                p === page
                  ? { backgroundColor: GREEN, color: '#fff' }
                  : { color: '#374151' }
              }
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === total_pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  onSelectClient: (id: number) => void;
  selectedClientId: number | null;
}

type TabKey = 'ALL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'BLOQUÉ';

const TAB_CONFIG: { key: TabKey; label: string; compteurKey: string }[] = [
  { key: 'ALL',             label: 'Tous',       compteurKey: 'total'      },
  { key: 'ACTIVE',          label: 'Actifs',     compteurKey: 'actifs'     },
  { key: 'PENDING_PAYMENT', label: 'En attente', compteurKey: 'en_attente' },
  { key: 'EXPIRED',         label: 'Expirés',    compteurKey: 'expires'    },
  { key: 'BLOQUÉ',          label: 'Bloqués',    compteurKey: 'bloques'    },
];

const SORT_OPTIONS = [
  { value: 'date_desc',    label: 'Plus récents' },
  { value: 'date_asc',     label: 'Plus anciens' },
  { value: 'nom_asc',      label: 'Nom A→Z'      },
  { value: 'montant_desc', label: 'CA décroissant'},
];

export default function ClientsListView({ onSelectClient, selectedClientId }: Props) {
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<TabKey>('ALL');
  const [planId, setPlanId]             = useState<number | undefined>();
  const [sort, setSort]                 = useState<ClientsFiltres['sort']>('date_desc');
  const [page, setPage]                 = useState(1);

  // Debounce recherche 300ms
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtres: ClientsFiltres = {
    ...(search   ? { search }  : {}),
    ...(activeTab !== 'ALL' ? { statut: activeTab } : {}),
    ...(planId   ? { plan_id: planId } : {}),
    ...(sort     ? { sort }    : {}),
    page,
    limit: 20,
  };

  const { data, isLoading } = useClientsList(filtres);

  const clients   = data?.clients    ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, total_pages: 1 };
  const _c        = data?.compteurs;
  const compteurs  = {
    total:      _c?.total      ?? 0,
    actifs:     _c?.actifs     ?? 0,
    en_attente: _c?.en_attente ?? 0,
    expires:    _c?.expires    ?? 0,
    bloques:    _c?.bloques    ?? 0,
  };

  const resetFiltres = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setActiveTab('ALL');
    setPlanId(undefined);
    setSort('date_desc');
    setPage(1);
  }, []);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleExport = () => {
    downloadClientsCSV({
      search: search || undefined,
      statut: activeTab !== 'ALL' ? activeTab : undefined,
      plan_id: planId,
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. KPI Row ──────────────────────────────────────────────────────── */}
      <KpiRow compteurs={compteurs} isLoading={isLoading} />

      {/* ── 2. Barre de recherche & filtres ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Rechercher nom, email, téléphone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-[220px] h-9 text-sm"
        />

        <Select
          value={activeTab}
          onValueChange={(v) => handleTabChange(v as TabKey)}
        >
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actifs</SelectItem>
            <SelectItem value="PENDING_PAYMENT">En attente</SelectItem>
            <SelectItem value="EXPIRED">Expirés</SelectItem>
            <SelectItem value="BLOQUÉ">Bloqués</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => { setSort(v as ClientsFiltres['sort']); setPage(1); }}
        >
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={handleExport}
        >
          <Download size={13} />
          Exporter CSV
        </Button>
      </div>

      {/* ── 3. Onglets ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {TAB_CONFIG.map((tab) => {
          const count = compteurs[tab.compteurKey as keyof typeof compteurs] ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderRadius: 6,
                backgroundColor: isActive ? GREEN : 'transparent',
                color: isActive ? '#fff' : '#6B7280',
              }}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab.key === 'PENDING_PAYMENT' && count > 0 && !isActive && 'animate-pulse'
                )}
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.25)'
                    : tab.key === 'PENDING_PAYMENT' && count > 0
                      ? ORANGE + '20'
                      : '#E5E7EB',
                  color: isActive
                    ? '#fff'
                    : tab.key === 'PENDING_PAYMENT' && count > 0
                      ? ORANGE
                      : '#6B7280',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Tableau ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div
          className="grid text-white text-[11px] font-semibold uppercase tracking-wide px-4 py-2.5"
          style={{
            backgroundColor: GREEN,
            gridTemplateColumns: '22% 18% 10% 13% 8% 10% 14% auto',
          }}
        >
          <span>Client</span>
          <span>Contact</span>
          <span>Plan</span>
          <span>Abonnement</span>
          <span>Portfolios</span>
          <span>CA total</span>
          <span>Actions</span>
          <span />
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-3">
            <SkeletonTable />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState onReset={resetFiltres} />
        ) : (
          clients.map((client, index) => {
            const isSelected  = client.id === selectedClientId;
            const isBloque    = client.statut_compte === 'BLOQUÉ';
            const isInactif   = client.statut_compte === 'inactif';
            const bg          = rowBg(client.subscription_status, client.statut_compte, index);

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className="grid items-center px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors hover:brightness-95"
                style={{
                  backgroundColor: bg,
                  gridTemplateColumns: '22% 18% 10% 13% 8% 10% 14% auto',
                  borderLeft: isSelected ? `3px solid ${GREEN}` : '3px solid transparent',
                  opacity: (isBloque || isInactif) ? 0.65 : 1,
                }}
              >
                {/* Client */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-white text-xs font-bold"
                    style={{ backgroundColor: (isBloque || isInactif) ? '#9E9E9E' : GREEN }}
                  >
                    {initiales(client.prenom, client.nom)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{client.nom_complet}</p>
                    <p className="text-[10px] text-gray-400">{formatDateCourte(client.date_inscription)}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 truncate" title={client.email}>{client.email}</p>
                  {client.telephone && (
                    <p className="text-[10px] text-gray-400">{client.telephone}</p>
                  )}
                </div>

                {/* Plan */}
                <div>
                  <PlanBadge name={client.plan_nom} />
                </div>

                {/* Abonnement */}
                <div>
                  <StatutBadge
                    statut={isInactif ? 'inactif' : isBloque ? 'BLOQUÉ' : (client.abonnement_statut ?? client.subscription_status)}
                    jours={client.jours_restants ?? undefined}
                  />
                </div>

                {/* Portfolios */}
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <AlertCircle size={12} className="text-gray-400" />
                  {client.nb_portfolios}
                </div>

                {/* CA total */}
                <div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: client.ca_total > 0 ? GREEN : '#9E9E9E' }}
                  >
                    {formatFCFA(client.ca_total)}
                  </span>
                </div>

                {/* Actions */}
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                  <ContextButton client={client} onSelectClient={onSelectClient} />
                </div>

                {/* Menu ⋮ */}
                <div className="flex justify-end">
                  <RowMenu client={client} onSelectClient={onSelectClient} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. Pagination ───────────────────────────────────────────────────── */}
      {!isLoading && pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          total_pages={pagination.total_pages}
          total={pagination.total}
          limit={pagination.limit}
          onChange={setPage}
        />
      )}
    </div>
  );
}
