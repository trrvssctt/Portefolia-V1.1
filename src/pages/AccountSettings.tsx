import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import BusinessNav from '@/components/business/BusinessNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  PowerOff, Trash2, AlertTriangle, Users, Shield, Eye, EyeOff,
  Crown, ChevronRight, Info,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function AccountSettings() {
  const { user, profile, loading, signOut } = useAuth();
  const { isBusinessAdmin, isBusinessUser } = useBusiness();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deactivatePwd, setDeactivatePwd]       = useState('');
  const [showDeactivatePwd, setShowDeactivatePwd] = useState(false);
  const [deactivating, setDeactivating]           = useState(false);

  const [deletePwd, setDeletePwd]       = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting]               = useState(false);

  // Auth guard — redirect to /auth if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#28A745] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleDeactivate = async () => {
    if (!deactivatePwd) {
      toast({ title: 'Erreur', description: 'Veuillez saisir votre mot de passe', variant: 'destructive' });
      return;
    }
    setDeactivating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/me/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deactivatePwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur', description: data.error || 'Erreur inconnue', variant: 'destructive' });
        return;
      }
      toast({ title: 'Compte désactivé', description: 'Votre compte a été désactivé. Vous allez être déconnecté.' });
      setTimeout(() => { signOut(); }, 2000);
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setDeactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePwd) {
      toast({ title: 'Erreur', description: 'Veuillez saisir votre mot de passe', variant: 'destructive' });
      return;
    }
    if (!deleteConfirmed) {
      toast({ title: 'Erreur', description: 'Veuillez cocher la case de confirmation', variant: 'destructive' });
      return;
    }
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur', description: data.error || 'Erreur inconnue', variant: 'destructive' });
        return;
      }
      toast({ title: 'Compte supprimé', description: 'Votre compte a été définitivement supprimé.' });
      localStorage.removeItem('token');
      setTimeout(() => { navigate('/', { replace: true }); }, 2000);
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const BusinessImpactBanner = () => (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Impact sur votre espace Business</p>
        <p className="text-xs text-amber-700 mt-0.5">
          En tant qu'administrateur Business, cette action désactivera également votre compte entreprise.
          Tous les membres de votre organisation perdront immédiatement l'accès à leur espace.
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 font-medium">
          <Users className="w-3.5 h-3.5" />
          Tous les membres seront suspendus
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {isBusinessUser
        ? <BusinessNav onSignOut={signOut} />
        : <DashboardNav onSignOut={signOut} profile={profile} />
      }

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <button onClick={() => navigate(isBusinessUser ? '/business/dashboard' : '/dashboard')} className="hover:text-gray-700 transition-colors">
              Tableau de bord
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Paramètres du compte</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez la désactivation et la suppression de votre compte.</p>
        </div>

        {/* Infos compte */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {(profile?.prenom?.[0] || profile?.nom?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {[profile?.prenom, profile?.nom].filter(Boolean).join(' ') || 'Mon compte'}
            </p>
            <p className="text-sm text-gray-500">{profile?.email || user?.email}</p>
            {isBusinessAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> Administrateur Business
              </span>
            )}
          </div>
        </div>

        {/* ── Section 1 : Désactivation ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-100 bg-orange-50/60">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PowerOff className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Désactiver le compte</h2>
              <p className="text-xs text-gray-500 mt-0.5">Suspension temporaire — récupérable par notre support</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Ce qui se passe lorsque vous désactivez :</p>
                <ul className="space-y-0.5 text-xs text-blue-600">
                  <li>• Vous serez déconnecté immédiatement</li>
                  <li>• Votre profil et portfolios ne seront plus accessibles</li>
                  <li>• Vos données sont conservées et récupérables</li>
                  <li>• Contactez le support pour réactiver votre compte</li>
                </ul>
              </div>
            </div>

            {isBusinessAdmin && <BusinessImpactBanner />}

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Confirmez avec votre mot de passe
              </Label>
              <div className="relative">
                <Input
                  type={showDeactivatePwd ? 'text' : 'password'}
                  value={deactivatePwd}
                  onChange={e => setDeactivatePwd(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="pr-10 h-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowDeactivatePwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showDeactivatePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
                  disabled={!deactivatePwd || deactivating}
                >
                  <PowerOff className="w-4 h-4" />
                  {deactivating ? 'Désactivation…' : 'Désactiver mon compte'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Confirmer la désactivation
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous allez désactiver votre compte.
                    {isBusinessAdmin && ' Tous les membres de votre espace Business perdront immédiatement leur accès.'}
                    {' '}Vous serez déconnecté et ne pourrez plus vous connecter jusqu'à réactivation par le support.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeactivate}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Oui, désactiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── Section 2 : Suppression définitive ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50/60">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Supprimer définitivement le compte</h2>
              <p className="text-xs text-gray-500 mt-0.5">Zone de danger — action irréversible</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Cette action est permanente et irréversible :</p>
                <ul className="space-y-0.5 text-xs text-red-600">
                  <li>• Votre compte et tous vos portfolios seront supprimés</li>
                  <li>• Vos données analytiques et historiques seront perdues</li>
                  <li>• Vos abonnements actifs seront résiliés</li>
                  <li>• Aucune récupération ne sera possible</li>
                </ul>
              </div>
            </div>

            {isBusinessAdmin && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Impact sur votre espace Business</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    La suppression de votre compte entraînera la suppression définitive de votre compte entreprise.
                    Tous les membres de votre organisation perdront immédiatement et définitivement leur accès.
                    Leurs portfolios Business seront également supprimés.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    Tous les membres perdront leur accès définitivement
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Confirmez avec votre mot de passe
              </Label>
              <div className="relative">
                <Input
                  type={showDeletePwd ? 'text' : 'password'}
                  value={deletePwd}
                  onChange={e => setDeletePwd(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="pr-10 h-10 text-sm border-red-200 focus:ring-red-400"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showDeletePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={e => setDeleteConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-red-300 accent-red-600 cursor-pointer"
              />
              <span className="text-xs text-gray-600 group-hover:text-gray-800 leading-relaxed">
                Je comprends que la suppression de mon compte est <strong>définitive et irréversible</strong>.
                {isBusinessAdmin && ' Je comprends également que tous les membres de mon espace Business perdront leur accès.'}
              </span>
            </label>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={!deletePwd || !deleteConfirmed || deleting}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Suppression…' : 'Supprimer définitivement mon compte'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                    <Trash2 className="w-5 h-5" />
                    Dernière confirmation
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="block font-semibold text-red-600 mb-2">
                      Cette action est définitive et irréversible.
                    </span>
                    Votre compte, vos portfolios et toutes vos données seront supprimés.
                    {isBusinessAdmin && ' Votre compte Business et tous ses membres seront également supprimés.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Oui, supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-start gap-2 text-xs text-gray-400 pb-6">
          <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>Pour toute question sur vos données, contactez notre support à <strong>support@portefolia.tech</strong></p>
        </div>
      </div>
    </div>
  );
}
