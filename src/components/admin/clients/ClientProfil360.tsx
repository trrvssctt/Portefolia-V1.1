import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mail, Phone, MapPin, Calendar, CreditCard, Clock,
  RefreshCw, TrendingUp, Edit2, Lock, Unlock, Send,
  Copy, X, Check, ExternalLink, Briefcase, AlertTriangle,
  FileText, LayoutTemplate,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useClientProfil360, useClientActions,
  type ClientProfil360 as TProfil360,
} from '@/hooks/useClients';
import { formatFCFA } from '@/utils/formatFinancial';
import { cn } from '@/lib/utils';

// ── Config ─────────────────────────────────────────────────────────────────────

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://backend-v-card.onrender.com');

const GREEN  = '#2E7D32';
const ORANGE = '#E65100';
const RED    = '#C62828';
const BLUE   = '#1565C0';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeDate(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)  return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

function initiales(prenom: string, nom: string): string {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`;
}

// ── Badge statut ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut?: string }) {
  if (!statut) return null;
  const map: Record<string, { label: string; color: string }> = {
    ACTIVE:          { label: 'Actif',       color: GREEN  },
    PENDING_PAYMENT: { label: 'En attente',  color: ORANGE },
    GRACE_PERIOD:    { label: 'Délai grâce', color: ORANGE },
    EXPIRED:         { label: 'Expiré',      color: RED    },
    SUSPENDED:       { label: 'Suspendu',    color: RED    },
    BLOQUÉ:          { label: 'Bloqué',      color: RED    },
  };
  const cfg = map[statut] ?? { label: statut, color: '#757575' };
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.color + '18' }}
    >
      {cfg.label}
    </span>
  );
}

// ── Dialog type union ─────────────────────────────────────────────────────────

type DialogType = 'email' | 'renew' | 'plan' | 'edit' | 'block' | null;

// ── DIALOG 1 — EmailDialog ────────────────────────────────────────────────────

function EmailDialog({
  open, onClose, clientEmail, mutation,
}: {
  open: boolean;
  onClose: () => void;
  clientEmail: string;
  mutation: ReturnType<typeof useClientActions>['envoyerEmail'];
}) {
  const [sujet, setSujet]     = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!sujet.trim() || !message.trim()) {
      toast.error('Sujet et message sont obligatoires');
      return;
    }
    mutation.mutate(
      { sujet, message },
      {
        onSuccess: () => {
          toast.success(`Email envoyé à ${clientEmail}`);
          setSujet('');
          setMessage('');
          onClose();
        },
        onError: (err) => toast.error(err.message || 'Erreur lors de l\'envoi'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={16} style={{ color: GREEN }} />
            Envoyer un email
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Destinataire</label>
            <p className="text-sm text-gray-800">{clientEmail}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Sujet *</label>
            <Input
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Objet de l'email"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Message *</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Corps du message…"
              rows={6}
              className="text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            style={{ backgroundColor: GREEN }}
            className="text-white"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG 2 — ForceRenewDialog ───────────────────────────────────────────────

function ForceRenewDialog({
  open, onClose, mutation,
}: {
  open: boolean;
  onClose: () => void;
  mutation: ReturnType<typeof useClientActions>['forcerRenouvellement'];
}) {
  const [duree, setDuree]         = useState<'1' | '3' | '12'>('1');
  const [commentaire, setCommentaire] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = () => {
    if (!commentaire.trim()) { toast.error('Commentaire / motif obligatoire'); return; }
    if (!confirmed)           { toast.error('Veuillez cocher la case de confirmation'); return; }

    mutation.mutate(
      { duree_mois: Number(duree) as 1 | 3 | 12, commentaire },
      {
        onSuccess: (data) => {
          const echeance = data.date_echeance ? formatDate(String(data.date_echeance)) : '';
          toast.success(`Abonnement renouvelé — échéance : ${echeance}`);
          setCommentaire('');
          setConfirmed(false);
          onClose();
        },
        onError: (err) => toast.error(err.message || 'Erreur lors du renouvellement'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw size={16} style={{ color: ORANGE }} />
            Forcer le renouvellement
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Durée</label>
            <Select value={duree} onValueChange={(v) => setDuree(v as '1' | '3' | '12')}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mois</SelectItem>
                <SelectItem value="3">3 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Commentaire / motif *</label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex : offre commerciale, correction erreur de paiement…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div
            className="rounded-lg p-3 flex gap-2 text-xs"
            style={{ backgroundColor: ORANGE + '12', color: ORANGE }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>
              Cette action crée un abonnement sans paiement Wave.
              À utiliser uniquement pour correction ou offre commerciale.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(!!v)}
            />
            Je confirme cette action administrative
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            style={{ backgroundColor: ORANGE }}
            className="text-white"
            onClick={handleSubmit}
            disabled={mutation.isPending || !confirmed}
          >
            {mutation.isPending ? 'En cours…' : 'Confirmer le renouvellement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG 3 — ChangePlanDialog ───────────────────────────────────────────────

interface Plan {
  id: number;
  name: string;
  prix: number;
  description?: string;
  features?: string[];
}

function ChangePlanDialog({
  open, onClose, currentPlanId, currentPrix, mutation,
}: {
  open: boolean;
  onClose: () => void;
  currentPlanId?: number;
  currentPrix?: number;
  mutation: ReturnType<typeof useClientActions>['changerPlan'];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [commentaire, setCommentaire]       = useState('');

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/plans`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('Impossible de charger les plans');
      const data = await res.json();
      return data.plans ?? data ?? [];
    },
    staleTime: 120_000,
    enabled: open,
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const delta = selectedPlan ? (selectedPlan.prix ?? 0) - (currentPrix ?? 0) : 0;
  const isUpgrade = delta > 0;

  const handleSubmit = () => {
    if (!selectedPlanId) { toast.error('Sélectionnez un plan'); return; }
    mutation.mutate(
      { nouveau_plan_id: selectedPlanId, commentaire: commentaire || undefined },
      {
        onSuccess: (data) => {
          toast.success(data.message || 'Plan modifié avec succès');
          setSelectedPlanId(null);
          setCommentaire('');
          onClose();
        },
        onError: (err) => toast.error(err.message || 'Erreur lors du changement de plan'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: GREEN }} />
            Changer de plan
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-2">
            {plans
              .filter((p) => p.id !== currentPlanId)
              .map((plan) => {
                const diff = (plan.prix ?? 0) - (currentPrix ?? 0);
                const isUp = diff > 0;
                return (
                  <label
                    key={plan.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedPlanId === plan.id ? 'border-green-700' : 'border-gray-200 hover:border-gray-300'
                    )}
                    style={selectedPlanId === plan.id ? { borderColor: GREEN, backgroundColor: GREEN + '08' } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="plan"
                        checked={selectedPlanId === plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="accent-green-700"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                        <p className="text-xs text-gray-500">{formatFCFA(plan.prix ?? 0)}</p>
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: isUp ? GREEN : RED,
                        backgroundColor: (isUp ? GREEN : RED) + '15',
                      }}
                    >
                      {isUp ? '+' : ''}{formatFCFA(Math.abs(diff))}
                    </span>
                  </label>
                );
              })}
          </div>

          {selectedPlan && (
            <div
              className="rounded-lg p-3 text-xs"
              style={{
                backgroundColor: isUpgrade ? GREEN + '10' : RED + '10',
                color: isUpgrade ? GREEN : RED,
              }}
            >
              {isUpgrade
                ? `Différence à payer : ${formatFCFA(delta)} — un paiement Wave sera créé en attente`
                : `Aucun remboursement — changement effectif immédiatement`}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Commentaire (facultatif)</label>
            <Input
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Raison du changement…"
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            style={{ backgroundColor: GREEN }}
            className="text-white"
            onClick={handleSubmit}
            disabled={mutation.isPending || !selectedPlanId}
          >
            {mutation.isPending ? 'En cours…' : 'Appliquer le changement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG 4 — EditClientDialog ───────────────────────────────────────────────

function EditClientDialog({
  open, onClose, infos, mutation,
}: {
  open: boolean;
  onClose: () => void;
  infos: TProfil360['infos'];
  mutation: ReturnType<typeof useClientActions>['modifierInfos'];
}) {
  const [form, setForm] = useState({
    prenom: infos.prenom ?? '',
    nom:    infos.nom    ?? '',
    email:  infos.email  ?? '',
    telephone: infos.telephone ?? '',
    ville:     infos.ville     ?? '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.prenom || !form.nom || !form.email) {
      toast.error('Prénom, nom et email sont obligatoires');
      return;
    }
    mutation.mutate(form, {
      onSuccess: () => {
        toast.success('Informations mises à jour');
        onClose();
      },
      onError: (err) => toast.error(err.message || 'Erreur lors de la mise à jour'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 size={16} style={{ color: GREEN }} />
            Modifier les informations
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {([ ['prenom', 'Prénom *'], ['nom', 'Nom *'], ['email', 'Email *'], ['telephone', 'Téléphone'], ['ville', 'Ville'] ] as [keyof typeof form, string][]).map(([key, label]) => (
            <div key={key} className={key === 'email' ? 'col-span-2' : ''}>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
              <Input
                value={form[key]}
                onChange={set(key)}
                type={key === 'email' ? 'email' : 'text'}
                className="text-sm"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            style={{ backgroundColor: GREEN }}
            className="text-white"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DIALOG 5 — BlockDialog ────────────────────────────────────────────────────

function BlockDialog({
  open, onClose, clientEmail, mutation,
}: {
  open: boolean;
  onClose: () => void;
  clientEmail: string;
  mutation: ReturnType<typeof useClientActions>['bloquer'];
}) {
  const [motif, setMotif]         = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = () => {
    if (motif.trim().length < 20) { toast.error('Motif minimum 20 caractères'); return; }
    if (!confirmed) { toast.error('Veuillez cocher la case de confirmation'); return; }
    mutation.mutate(motif, {
      onSuccess: () => {
        toast.success(`Compte ${clientEmail} bloqué`);
        setMotif('');
        setConfirmed(false);
        onClose();
      },
      onError: (err) => toast.error(err.message || 'Erreur lors du blocage'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Lock size={16} />
            Bloquer le compte
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Motif du blocage * (min. 20 caractères)
            </label>
            <Textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Décrivez la raison du blocage de manière précise…"
              rows={4}
              className="text-sm resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">{motif.length}/20 min</p>
          </div>
          <div className="rounded-lg p-3 flex gap-2 text-xs" style={{ backgroundColor: RED + '12', color: RED }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>Le client sera déconnecté immédiatement et recevra un email de notification.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
            Je confirme vouloir bloquer ce compte
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            style={{ backgroundColor: RED }}
            className="text-white"
            onClick={handleSubmit}
            disabled={mutation.isPending || !confirmed || motif.trim().length < 20}
          >
            {mutation.isPending ? 'Blocage…' : 'Bloquer le compte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab Abonnement ────────────────────────────────────────────────────────────

function TabAbonnement({
  abonnement,
  onRenew,
}: {
  abonnement: TProfil360['abonnement'];
  onRenew: () => void;
}) {
  if (!abonnement) {
    return (
      <div className="flex flex-col items-center py-10 gap-3">
        <FileText size={28} className="text-gray-300" />
        <p className="text-sm text-gray-500">Aucun abonnement actif</p>
        <Button size="sm" style={{ backgroundColor: GREEN }} className="text-white" onClick={onRenew}>
          Créer un abonnement
        </Button>
      </div>
    );
  }

  const debut = new Date(abonnement.date_debut || new Date());
  const fin   = new Date(abonnement.date_echeance);
  const totalMs  = fin.getTime() - debut.getTime();
  const elapsed  = Date.now() - debut.getTime();
  const pct      = Math.max(0, Math.min(100, totalMs > 0 ? (elapsed / totalMs) * 100 : 0));
  const low      = abonnement.jours_restants < 5;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Plan actuel',       value: abonnement.plan_nom },
          { label: 'Jours restants',    value: `${abonnement.jours_restants} j`, color: low ? RED : GREEN },
          { label: 'Prochaine échéance',value: formatDate(abonnement.date_echeance) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: '#F9FAFB' }}>
            <p className="text-[10px] text-gray-500 mb-0.5">{kpi.label}</p>
            <p className="text-sm font-bold" style={{ color: kpi.color ?? '#1F2937' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">
          Période : du {formatDate(abonnement.date_debut)} au {formatDate(abonnement.date_echeance)}
        </p>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: low ? RED : GREEN }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">{Math.round(pct)}% écoulé</p>
      </div>

      {/* Infos paiement */}
      <div className="rounded-lg border border-gray-100 p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Détails du paiement</p>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          {[
            ['Montant payé',      formatFCFA(abonnement.montant_paye ?? 0)],
            ['Durée',             `${abonnement.duree_mois} mois`],
            ['Remise appliquée',  abonnement.remise_appliquee ? formatFCFA(abonnement.remise_appliquee) : '—'],
            ['Validé par',        abonnement.valide_par_nom ?? 'Automatique'],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-gray-500">{k} : </span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab Paiements ─────────────────────────────────────────────────────────────

const FLUX_COLORS: Record<string, string> = {
  ABONNEMENT:   GREEN,
  REABONNEMENT: BLUE,
  UPGRADE:      '#6A1B9A',
  NFC:          '#00897B',
};

const STATUT_COLORS: Record<string, string> = {
  'RÉUSSI':      GREEN,
  SUCCESS:       GREEN,
  EN_ATTENTE:    ORANGE,
  'ÉCHOUÉ':      RED,
  FAILED:        RED,
  REMBOURSÉ:     BLUE,
};

function TabPaiements({ paiements }: { paiements: TProfil360['paiements'] }) {
  const [copied, setCopied] = useState<number | null>(null);

  const copyRef = (id: number, ref?: string) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const total = paiements
    .filter((p) => p.statut === 'RÉUSSI' || p.statut === 'SUCCESS')
    .reduce((acc, p) => acc + Number(p.montant ?? 0), 0);

  if (!paiements.length) {
    return <p className="text-sm text-gray-400 py-8 text-center">Aucun paiement enregistré</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Date</th>
              <th className="text-left pb-2 font-medium">Type</th>
              <th className="text-left pb-2 font-medium">Plan</th>
              <th className="text-right pb-2 font-medium">Montant</th>
              <th className="text-left pb-2 font-medium">Réf. Wave</th>
              <th className="text-left pb-2 font-medium">Statut</th>
              <th className="text-left pb-2 font-medium">Validé</th>
            </tr>
          </thead>
          <tbody>
            {paiements.map((p) => {
              const fluxColor   = FLUX_COLORS[p.type_flux]   ?? '#757575';
              const statutColor = STATUT_COLORS[p.statut]    ?? '#757575';
              return (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-600">{formatDate(p.created_at)}</td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ color: fluxColor, backgroundColor: fluxColor + '18' }}>
                      {p.type_flux}
                    </span>
                  </td>
                  <td className="py-2 text-gray-600">{p.plan_nom ?? '—'}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{formatFCFA(p.montant ?? 0)}</td>
                  <td className="py-2">
                    {p.reference_wave ? (
                      <button
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
                        onClick={() => copyRef(p.id, p.reference_wave)}
                      >
                        <span className="font-mono text-[10px]">{p.reference_wave.slice(0, 12)}…</span>
                        {copied === p.id
                          ? <Check size={10} style={{ color: GREEN }} />
                          : <Copy size={10} />
                        }
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ color: statutColor, backgroundColor: statutColor + '18' }}>
                      {p.statut}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{p.valide_par_nom ?? 'Auto'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pt-2 border-t border-gray-100 text-right">
        <span className="text-xs text-gray-500">CA total validé : </span>
        <span className="text-sm font-bold" style={{ color: GREEN }}>{formatFCFA(total)}</span>
      </div>
    </div>
  );
}

// ── Tab Portfolios ────────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, string> = {
  dark:     '#1F2937',
  light:    '#F9FAFB',
  green:    '#E8F5E9',
  blue:     '#E3F2FD',
  purple:   '#F3E5F5',
  minimal:  '#FAFAFA',
};

function TabPortfolios({ portfolios }: { portfolios: TProfil360['portfolios'] }) {
  if (!portfolios.length) {
    return (
      <div className="flex flex-col items-center py-10 gap-2">
        <LayoutTemplate size={28} className="text-gray-300" />
        <p className="text-sm text-gray-500">Aucun portfolio créé</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {portfolios.map((p) => {
        const bg = THEME_COLORS[p.theme?.toLowerCase() ?? ''] ?? '#F9FAFB';
        const statusColor =
          p.statut === 'PUBLISHED' ? GREEN :
          p.statut === 'DRAFT'     ? ORANGE : '#9E9E9E';

        return (
          <div
            key={p.id}
            className="rounded-lg border border-gray-100 overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: bg === '#F9FAFB' ? '#E5E7EB' : bg }} />
            <div className="p-3">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.titre}</p>
                  {p.slug && <p className="text-[10px] text-gray-400 font-mono">/{p.slug}</p>}
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: statusColor, backgroundColor: statusColor + '18' }}
                >
                  {p.statut}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {p.nb_vues} vues · Créé le {formatDate(p.created_at)} · Modifié le {formatDate(p.updated_at)}
              </p>
              {p.slug && (
                <div className="flex gap-2 mt-2">
                  <a
                    href={`${window.location.origin}/p/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    Voir →
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function TimelineColumn({ timeline }: { timeline: TProfil360['timeline'] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? timeline : timeline.slice(0, 15);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-gray-700 mb-2">Activité du compte</p>
      {shown.length === 0 && (
        <p className="text-xs text-gray-400">Aucune activité enregistrée</p>
      )}
      <div className="relative">
        {shown.map((evt, i) => (
          <div key={i} className="flex gap-2.5 relative">
            {/* Ligne verticale */}
            {i < shown.length - 1 && (
              <div
                className="absolute left-[5px] top-[14px] w-px"
                style={{ height: 'calc(100% - 4px)', backgroundColor: '#E5E7EB' }}
              />
            )}
            {/* Dot */}
            <div
              className="mt-1 h-3 w-3 rounded-full shrink-0 z-10"
              style={{ backgroundColor: evt.couleur }}
            />
            {/* Contenu */}
            <div className="pb-3 min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-gray-700 leading-tight">{evt.libelle}</p>
              {evt.detail && (
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{evt.detail}</p>
              )}
              <p className="text-[9px] text-gray-300 mt-0.5">{relativeDate(evt.date)}</p>
            </div>
          </div>
        ))}
      </div>
      {timeline.length > 15 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[11px] text-gray-400 hover:text-gray-700 text-left mt-1"
        >
          Voir tout ({timeline.length} événements)
        </button>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfilSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-0.5 w-full mb-3" style={{ backgroundColor: GREEN }} />
      <div className="flex items-center gap-3 mb-4 px-4">
        <div className="h-11 w-11 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-40 rounded bg-gray-200 mb-1.5" />
          <div className="h-3 w-52 rounded bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 px-4">
        <div className="col-span-1 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-6 rounded bg-gray-100" />)}
        </div>
        <div className="col-span-2 h-64 rounded-lg bg-gray-100" />
        <div className="col-span-1 space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 rounded bg-gray-100" />)}
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  clientId: number;
  onClose: () => void;
}

export default function ClientProfil360({ clientId, onClose }: Props) {
  const { data: profil, isLoading } = useClientProfil360(clientId);
  const actions = useClientActions(clientId);

  const [dialog, setDialog]   = useState<DialogType>(null);
  const [centerTab, setCenterTab] = useState<'abonnement' | 'paiements' | 'portfolios'>('abonnement');

  if (isLoading || !profil) {
    return (
      <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 pb-4">
        <ProfilSkeleton />
      </div>
    );
  }

  const { infos, abonnement, paiements, portfolios, timeline, stats } = profil;
  const bloque  = infos.statut_compte === 'BLOQUÉ';
  const expired = infos.subscription_status === 'EXPIRED';
  const active  = infos.subscription_status === 'ACTIVE';

  const handleDebloquer = () => {
    actions.debloquer.mutate(undefined, {
      onSuccess: () => toast.success('Compte débloqué avec succès'),
      onError: (err) => toast.error(err.message || 'Erreur'),
    });
  };

  return (
    <>
      <div
        className="bg-white rounded-b-xl border border-t-0 border-gray-200 overflow-hidden"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        {/* Bande verte de connexion */}
        <div className="h-0.5 w-full" style={{ backgroundColor: GREEN }} />

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div
            className="flex items-center justify-center h-11 w-11 rounded-full shrink-0 text-white text-sm font-bold"
            style={{ backgroundColor: bloque ? '#9E9E9E' : GREEN }}
          >
            {initiales(infos.prenom, infos.nom)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{infos.nom_complet}</p>
              <StatutBadge statut={bloque ? 'BLOQUÉ' : infos.subscription_status} />
            </div>
            <p className="text-xs text-gray-500">
              {infos.email} &nbsp;·&nbsp;
              Client depuis <strong>{stats.anciennete_jours}</strong> jours &nbsp;·&nbsp;
              CA total <strong style={{ color: GREEN }}>{formatFCFA(stats.ca_total)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Grille 3 colonnes ─────────────────────────────────────────────── */}
        <div className="grid p-4 gap-4" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>

          {/* ── Colonne gauche : identité + actions ─────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Fiche identité */}
            <div className="rounded-lg border border-gray-100 p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Coordonnées</p>
              {[
                { icon: <Mail size={12} />,     val: infos.email,     href: `mailto:${infos.email}` },
                { icon: <Phone size={12} />,    val: infos.telephone  },
                { icon: <MapPin size={12} />,   val: infos.ville      },
                { icon: <Calendar size={12} />, val: formatDate(infos.date_inscription) },
                { icon: <CreditCard size={12} />, val: infos.plan_nom },
                { icon: <Clock size={12} />,    val: infos.next_billing_date ? `Éch. ${formatDate(infos.next_billing_date)}` : null },
              ].filter((row) => !!row.val).map(({ icon, val, href }, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-gray-400 shrink-0">{icon}</span>
                  {href
                    ? <a href={href} className="truncate hover:underline">{val}</a>
                    : <span className="truncate">{val}</span>
                  }
                </div>
              ))}
            </div>

            {/* Actions rapides */}
            <div className="rounded-lg border border-gray-100 p-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Actions</p>
              {[
                {
                  icon: <Mail size={13} />, label: 'Envoyer un email',
                  onClick: () => setDialog('email'), color: '#374151',
                },
                {
                  icon: <RefreshCw size={13} />, label: 'Forcer renouvellement',
                  onClick: () => setDialog('renew'), color: '#374151',
                },
                {
                  icon: <TrendingUp size={13} />, label: 'Changer de plan',
                  onClick: () => setDialog('plan'), color: '#374151',
                },
                {
                  icon: <Edit2 size={13} />, label: 'Modifier les infos',
                  onClick: () => setDialog('edit'), color: '#374151',
                },
                ...(active ? [{
                  icon: <Lock size={13} />, label: 'Bloquer le compte',
                  onClick: () => setDialog('block'), color: RED,
                }] : []),
                ...(bloque ? [{
                  icon: <Unlock size={13} />, label: 'Débloquer',
                  onClick: handleDebloquer, color: GREEN,
                }] : []),
                ...(expired ? [{
                  icon: <Send size={13} />, label: 'Email de relance',
                  onClick: () => setDialog('email'), color: ORANGE,
                }] : []),
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors w-full"
                  style={{ color: btn.color }}
                >
                  <span className="shrink-0">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Colonne centre : tabs ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Tabs header */}
            <div className="flex items-center gap-1 border-b border-gray-100">
              {(['abonnement', 'paiements', 'portfolios'] as const).map((tab) => {
                const labels = { abonnement: 'Abonnement', paiements: 'Paiements', portfolios: 'Portfolios' };
                const counts = {
                  abonnement: '',
                  paiements: ` (${paiements.length})`,
                  portfolios: ` (${portfolios.length})`,
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setCenterTab(tab)}
                    className="text-xs font-medium pb-2 px-1 border-b-2 transition-colors"
                    style={{
                      borderBottomColor: centerTab === tab ? GREEN : 'transparent',
                      color: centerTab === tab ? GREEN : '#6B7280',
                    }}
                  >
                    {labels[tab]}{counts[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '420px' }}>
              {centerTab === 'abonnement' && (
                <TabAbonnement abonnement={abonnement} onRenew={() => setDialog('renew')} />
              )}
              {centerTab === 'paiements' && <TabPaiements paiements={paiements} />}
              {centerTab === 'portfolios' && <TabPortfolios portfolios={portfolios} />}
            </div>
          </div>

          {/* ── Colonne droite : timeline ────────────────────────────────────── */}
          <div
            className="overflow-y-auto rounded-lg border border-gray-100 p-3"
            style={{ maxHeight: '480px' }}
          >
            <TimelineColumn timeline={timeline} />
          </div>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}
      <EmailDialog
        open={dialog === 'email'}
        onClose={() => setDialog(null)}
        clientEmail={infos.email}
        mutation={actions.envoyerEmail}
      />
      <ForceRenewDialog
        open={dialog === 'renew'}
        onClose={() => setDialog(null)}
        mutation={actions.forcerRenouvellement}
      />
      <ChangePlanDialog
        open={dialog === 'plan'}
        onClose={() => setDialog(null)}
        currentPlanId={infos.plan_id}
        currentPrix={abonnement?.prix}
        mutation={actions.changerPlan}
      />
      <EditClientDialog
        open={dialog === 'edit'}
        onClose={() => setDialog(null)}
        infos={infos}
        mutation={actions.modifierInfos}
      />
      <BlockDialog
        open={dialog === 'block'}
        onClose={() => setDialog(null)}
        clientEmail={infos.email}
        mutation={actions.bloquer}
      />
    </>
  );
}
