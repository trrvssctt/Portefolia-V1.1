import { useNavigate } from 'react-router-dom';
import type { Transaction, NouvelInscrit } from '@/hooks/useAdminDashboard';
import { formatFCFA } from '@/utils/formatFinancial';
import { formatTimeAgo } from '@/utils/formatTimeAgo';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initiales(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase();
}

function safeName(nom: string | null | undefined, id: number): string {
  const trimmed = (nom ?? '').trim();
  return trimmed.length > 0 ? trimmed : `Utilisateur #${id}`;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  nom: string;
  bg: string;
  color: string;
}

function Avatar({ nom, bg, color }: AvatarProps) {
  return (
    <div
      className="flex items-center justify-center h-8 w-8 rounded-full shrink-0 text-[11px] font-bold"
      style={{ backgroundColor: bg, color }}
    >
      {initiales(nom)}
    </div>
  );
}

// ── Flux → couleur avatar ─────────────────────────────────────────────────────

function fluxAvatar(type_flux: string): { bg: string; color: string } {
  const flux = (type_flux ?? '').toUpperCase();
  if (flux === 'UPGRADE')                        return { bg: '#F3E5F5', color: '#6A1B9A' };
  if (flux === 'NFC')                            return { bg: '#E0F2F1', color: '#00695C' };
  return                                                { bg: '#E8F5E9', color: '#2E7D32' }; // ABONNEMENT / REABONNEMENT
}

// ── Badge statut transaction ──────────────────────────────────────────────────

const STATUT_TX: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: '#E65100' },
  RÉUSSI:     { label: 'Réussi',     color: '#2E7D32' },
  REMBOURSÉ:  { label: 'Remboursé', color: '#1565C0' },
  ÉCHOUÉ:     { label: 'Échoué',     color: '#C62828' },
};

function BadgeStatutTx({ statut }: { statut: string }) {
  const s = STATUT_TX[statut] ?? { label: statut, color: '#757575' };
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: s.color, backgroundColor: s.color + '18' }}
    >
      {s.label}
    </span>
  );
}

// ── Badge statut abonné ───────────────────────────────────────────────────────

function BadgeStatutAbonne({ status, plan }: { status: string; plan: string | null }) {
  let label: string;
  let color: string;

  switch (status) {
    case 'ACTIVE':
      label = plan ? `Actif · ${plan}` : 'Actif';
      color = '#2E7D32';
      break;
    case 'PENDING_PAYMENT':
      label = 'En attente';
      color = '#E65100';
      break;
    case 'EXPIRED':
      label = 'Expiré';
      color = '#C62828';
      break;
    default:
      label = 'Gratuit';
      color = '#757575';
  }

  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: color + '18' }}
    >
      {label}
    </span>
  );
}

// ── Ligne séparateur ──────────────────────────────────────────────────────────

function Separator() {
  return <div style={{ borderBottom: '0.5px solid #F3F4F6' }} />;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonLigne() {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 rounded bg-gray-200" />
        <div className="h-2.5 w-24 rounded bg-gray-100" />
      </div>
      <div className="h-3 w-16 rounded bg-gray-100" />
    </div>
  );
}

function SkeletonColonne() {
  return (
    <div className="space-y-0">
      {[0, 1, 2, 3].map((i, idx, arr) => (
        <div key={i}>
          <SkeletonLigne />
          {idx < arr.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

// ── Colonne 1 : Transactions ──────────────────────────────────────────────────

function LigneTransaction({ tx, isLast }: { tx: Transaction; isLast: boolean }) {
  const nom = safeName(tx.client_nom, tx.id);
  const { bg, color } = fluxAvatar(tx.type_flux);
  const typeLabel = (tx.type_flux ?? '').charAt(0).toUpperCase() + (tx.type_flux ?? '').slice(1).toLowerCase();

  return (
    <div>
      <div className="flex items-center gap-3 py-2.5">
        <Avatar nom={nom} bg={bg} color={color} />

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-gray-800 leading-tight truncate">{nom}</p>
          <p className="text-[10px] text-gray-400 leading-tight truncate">
            {typeLabel}{tx.plan_nom ? ` · ${tx.plan_nom}` : ''}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-[12px] font-bold text-gray-800">{formatFCFA(tx.montant)}</p>
          <BadgeStatutTx statut={tx.statut} />
          <p className="text-[9px] text-gray-400">{formatTimeAgo(tx.created_at)}</p>
        </div>
      </div>
      {!isLast && <Separator />}
    </div>
  );
}

function ColonneTransactions({ transactions }: { transactions: Transaction[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-black text-gray-800">Dernières transactions</h3>
        <button
          onClick={() => navigate('/admin/paiements')}
          className="text-[11px] font-semibold hover:underline"
          style={{ color: '#1565C0' }}
        >
          Voir tout →
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-4 text-center">Aucune transaction récente</p>
      ) : (
        <div>
          {transactions.map((tx, i) => (
            <LigneTransaction key={tx.id} tx={tx} isLast={i === transactions.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Colonne 2 : Nouveaux inscrits ─────────────────────────────────────────────

function LigneInscrit({ inscrit, isLast }: { inscrit: NouvelInscrit; isLast: boolean }) {
  const nom = safeName(inscrit.nom, inscrit.id);

  return (
    <div>
      <div className="flex items-center gap-3 py-2.5">
        <Avatar nom={nom} bg="#F3F4F6" color="#6B7280" />

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-gray-800 leading-tight truncate">{nom}</p>
          <p className="text-[10px] text-gray-400 leading-tight truncate">{inscrit.email}</p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <BadgeStatutAbonne status={inscrit.subscription_status} plan={inscrit.plan_nom} />
          <p className="text-[9px] text-gray-400">{formatTimeAgo(inscrit.created_at)}</p>
        </div>
      </div>
      {!isLast && <Separator />}
    </div>
  );
}

function ColonneInscrits({ nouveaux_inscrits }: { nouveaux_inscrits: NouvelInscrit[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-black text-gray-800">Nouveaux inscrits</h3>
        <button
          onClick={() => navigate('/admin/users')}
          className="text-[11px] font-semibold hover:underline"
          style={{ color: '#1565C0' }}
        >
          Gérer →
        </button>
      </div>

      {nouveaux_inscrits.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-4 text-center">Aucun inscrit récent</p>
      ) : (
        <div>
          {nouveaux_inscrits.map((inscrit, i) => (
            <LigneInscrit key={inscrit.id} inscrit={inscrit} isLast={i === nouveaux_inscrits.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[];
  nouveaux_inscrits: NouvelInscrit[];
  isLoading?: boolean;
}

export default function ActiviteRecente({ transactions, nouveaux_inscrits, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="h-4 w-40 rounded bg-gray-200 mb-4 animate-pulse" />
            <SkeletonColonne />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ColonneTransactions transactions={transactions} />
      <ColonneInscrits nouveaux_inscrits={nouveaux_inscrits} />
    </div>
  );
}
