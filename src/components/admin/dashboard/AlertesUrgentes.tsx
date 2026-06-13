import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import type { Alerte, NiveauAlerte } from '@/hooks/useAdminDashboard';

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE: Record<NiveauAlerte, { border: string; bg: string; text: string; badgeBg: string }> = {
  CRITIQUE: { border: '#C62828', bg: '#FFEBEE', text: '#C62828', badgeBg: '#FFCDD2' },
  ATTENTION: { border: '#E65100', bg: '#FFF3E0', text: '#E65100', badgeBg: '#FFE0B2' },
  INFO:      { border: '#1565C0', bg: '#E3F2FD', text: '#1565C0', badgeBg: '#BBDEFB' },
};

function niveauMax(alertes: Alerte[]): NiveauAlerte {
  if (alertes.some((a) => a.niveau === 'CRITIQUE')) return 'CRITIQUE';
  if (alertes.some((a) => a.niveau === 'ATTENTION')) return 'ATTENTION';
  return 'INFO';
}

function dateAujourdhui(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function AlertesUrgentesSkeleton() {
  return (
    <div className="bg-white rounded-xl animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #E5E7EB' }}>
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="ml-auto h-5 w-8 rounded-full bg-gray-200" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid #F3F4F6' }}>
          <div className="h-5 w-16 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-gray-200" />
            <div className="h-2.5 w-1/2 rounded bg-gray-100" />
          </div>
          <div className="h-3 w-20 rounded bg-gray-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Badge niveau ─────────────────────────────────────────────────────────────

function BadgeNiveau({ niveau }: { niveau: NiveauAlerte }) {
  const p = PALETTE[niveau];
  const labels: Record<NiveauAlerte, string> = { CRITIQUE: 'Critique', ATTENTION: 'Attention', INFO: 'Info' };
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide"
      style={{ color: p.text, backgroundColor: p.badgeBg }}
    >
      {labels[niveau]}
    </span>
  );
}

// ── Ligne alerte ─────────────────────────────────────────────────────────────

function LigneAlerte({ alerte, isLast }: { alerte: Alerte; isLast: boolean }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors cursor-default"
      style={isLast ? undefined : { borderBottom: '0.5px solid #F3F4F6' }}
    >
      <BadgeNiveau niveau={alerte.niveau} />

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-gray-800 leading-tight">{alerte.message}</p>
        {alerte.detail && (
          <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{alerte.detail}</p>
        )}
      </div>

      <button
        onClick={() => navigate(alerte.action_url)}
        className="shrink-0 text-[11px] font-semibold whitespace-nowrap hover:underline transition-colors"
        style={{ color: PALETTE[alerte.niveau].text }}
      >
        → {alerte.action_label}
      </button>
    </div>
  );
}

// ── État vide ─────────────────────────────────────────────────────────────────

function AlertesVide() {
  return (
    <div
      className="bg-white rounded-xl flex items-center gap-3 px-5 py-4"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #2E7D32' }}
    >
      <CheckCircle2 size={20} color="#2E7D32" className="shrink-0" />
      <p className="text-[13px] font-semibold" style={{ color: '#2E7D32' }}>
        Aucune action urgente — tout est opérationnel
      </p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  alertes: Alerte[];
  isLoading?: boolean;
  isError?: boolean;
}

export default function AlertesUrgentes({ alertes, isLoading, isError }: Props) {
  if (isLoading) return <AlertesUrgentesSkeleton />;

  if (isError) {
    return (
      <div className="bg-white rounded-xl px-5 py-3 text-[12px] text-gray-400" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #E5E7EB' }}>
        Impossible de charger les alertes
      </div>
    );
  }

  if (alertes.length === 0) return <AlertesVide />;

  const niveau = niveauMax(alertes);
  const palette = PALETTE[niveau];
  const nbNonInfo = alertes.filter((a) => a.niveau !== 'INFO').length;
  const HeaderIcon = niveau === 'INFO' ? Info : AlertTriangle;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${palette.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ backgroundColor: palette.bg, borderBottom: `1px solid ${palette.border}22` }}
      >
        <HeaderIcon size={16} color={palette.text} className="shrink-0" />
        <span className="text-[12px] font-semibold flex-1" style={{ color: palette.text }}>
          Actions requises — {dateAujourdhui()}
        </span>
        {nbNonInfo > 0 && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: palette.text, backgroundColor: palette.badgeBg }}
          >
            {nbNonInfo}
          </span>
        )}
      </div>

      {/* Liste */}
      {alertes.map((alerte, i) => (
        <LigneAlerte key={alerte.type} alerte={alerte} isLast={i === alertes.length - 1} />
      ))}
    </div>
  );
}
