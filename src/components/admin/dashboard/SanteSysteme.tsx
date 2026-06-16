import { Server, Database, Mail, Clock } from 'lucide-react';
import type { DashboardData, SanteService } from '@/hooks/useAdminDashboard';
import { formatTimeAgo } from '@/utils/formatTimeAgo';

// ── Statut → couleur ──────────────────────────────────────────────────────────

const STATUT_COLOR: Record<SanteService['statut'], string> = {
  OK:             '#2E7D32',
  ATTENTION:      '#E65100',
  ERREUR:         '#C62828',
  'NON_SURVEILLÉ':'#9E9E9E',
};

const STATUT_LABEL: Record<SanteService['statut'], string> = {
  OK:             'OK',
  ATTENTION:      'Attention',
  ERREUR:         'Erreur',
  'NON_SURVEILLÉ':'Non surveillé',
};

// ── Sous-composants ───────────────────────────────────────────────────────────

function BadgeStatut({ statut }: { statut: SanteService['statut'] }) {
  const color = STATUT_COLOR[statut];
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: color + '18' }}
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}

function Detail({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-gray-400 mt-1 leading-tight">{children}</p>;
}

// ── Cards ─────────────────────────────────────────────────────────────────────

type SanteData = DashboardData['sante_systeme'];

interface CardProps {
  titre: string;
  statut: SanteService['statut'];
  icone: React.ReactNode;
  detail: React.ReactNode;
}

function ServiceCard({ titre, statut, icone, detail }: CardProps) {
  const color = STATUT_COLOR[statut];
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: '10px 12px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">{icone}</span>
          <span className="text-[11px] font-bold text-gray-700">{titre}</span>
        </div>
        <BadgeStatut statut={statut} />
      </div>
      {detail}
    </div>
  );
}

function CardServeur({ s }: { s: SanteData['serveur'] }) {
  const heures = s.uptime != null ? Math.floor(s.uptime / 3600) : null;
  return (
    <ServiceCard
      titre="Serveur"
      statut={s.statut}
      icone={<Server size={14} />}
      detail={
        heures != null && s.memory_mb != null
          ? <Detail>Uptime : {heures}h · {s.memory_mb}MB</Detail>
          : <Detail>—</Detail>
      }
    />
  );
}

function CardDB({ s }: { s: SanteData['db'] }) {
  return (
    <ServiceCard
      titre="Base de données"
      statut={s.statut}
      icone={<Database size={14} />}
      detail={
        s.latence_ms != null
          ? <Detail>Latence : {s.latence_ms}ms</Detail>
          : <Detail>—</Detail>
      }
    />
  );
}

function CardEmail({ s }: { s: SanteData['email'] }) {
  const echecs = s.echecs_24h ?? null;
  return (
    <ServiceCard
      titre="Email"
      statut={s.statut}
      icone={<Mail size={14} />}
      detail={
        echecs != null
          ? <Detail>{echecs > 0 ? `${echecs} échec(s) (24h)` : '0 échec (24h)'}</Detail>
          : <Detail>—</Detail>
      }
    />
  );
}

function CardCron({ s }: { s: SanteData['cron'] }) {
  return (
    <ServiceCard
      titre="Cron jobs"
      statut={s.statut}
      icone={<Clock size={14} />}
      detail={
        s.dernier_run
          ? <Detail>Dernier run : {formatTimeAgo(s.dernier_run)}</Detail>
          : <Detail>Jamais exécuté</Detail>
      }
    />
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="animate-pulse flex flex-col gap-2"
      style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid #E5E7EB' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="h-4 w-12 rounded-full bg-gray-200" />
      </div>
      <div className="h-2.5 w-28 rounded bg-gray-100" />
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  sante: DashboardData['sante_systeme'];
  isLoading?: boolean;
}

export default function SanteSysteme({ sante, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <CardServeur s={sante.serveur} />
      <CardDB      s={sante.db} />
      <CardEmail   s={sante.email} />
      <CardCron    s={sante.cron} />
    </div>
  );
}
