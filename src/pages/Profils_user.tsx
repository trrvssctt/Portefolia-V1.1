import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { isTokenExpired } from '@/utils/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  User, Camera, Shield, Mail, Phone, Edit3, Check, X, Eye, EyeOff,
  LogOut, CreditCard, FolderOpen, TrendingUp, Calendar, Star, Zap,
  Sparkles, Crown, AlertTriangle, ArrowRight, Lock, CheckCircle2,
  Upload,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Très faible', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Faible', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Moyen', color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Fort', color: 'bg-blue-500' };
  return { score, label: 'Très fort', color: 'bg-green-500' };
};

const planMeta: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  free:     { label: 'Gratuit',  icon: <Star className="w-3 h-3" />,     bg: 'bg-gray-100',   text: 'text-gray-600' },
  starter:  { label: 'Starter',  icon: <Zap className="w-3 h-3" />,      bg: 'bg-blue-100',   text: 'text-blue-700' },
  pro:      { label: 'Pro',      icon: <Sparkles className="w-3 h-3" />,  bg: 'bg-purple-100', text: 'text-purple-700' },
  business: { label: 'Business', icon: <Crown className="w-3 h-3" />,    bg: 'bg-amber-100',  text: 'text-amber-700' },
};

function getPlanKey(plan: any): string {
  if (!plan) return 'free';
  const slug = String(plan.slug || '').toLowerCase();
  if (slug.includes('business')) return 'business';
  if (slug.includes('pro') || slug.includes('professionnel')) return 'pro';
  if (slug.includes('starter')) return 'starter';
  return 'free';
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
function StatMini({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string | number; accent: string;
}) {
  return (
    <div className={`${accent} rounded-xl p-3 flex items-center gap-3`}>
      <div className="p-2 bg-white/60 rounded-lg shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs opacity-70 font-medium truncate">{label}</p>
        <p className="text-lg font-bold leading-none mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilsUserPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const { currentPlan } = usePlan();
  const planKey = getPlanKey(currentPlan);
  const currentPlanMeta = planMeta[planKey];

  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '',
    photo_profil: '', biographie: '', email: '',
  });
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [isEditing, setIsEditing]         = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [abonnements, setAbonnements]     = useState<any[]>([]);
  const [portfoliosCount, setPortfoliosCount] = useState<number | null>(null);
  const [totalViews, setTotalViews]       = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const navigate  = useNavigate();

  const pwdStrength = getPasswordStrength(password);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      navigate('/auth');
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // ── Remplissage du formulaire ────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setForm({
        prenom:      profile.prenom      || '',
        nom:         profile.nom         || '',
        telephone:   profile.phone       || '',
        photo_profil: profile.photo_profil || profile.avatar_url || '',
        biographie:  profile.biographie  || profile.bio || '',
        email:       profile.email       || user?.email || '',
      });
    }
  }, [profile, user]);

  // ── Chargement des données annexes ──────────────────────────────────────────
  useEffect(() => {
    loadAbonnements();
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const pRes = await fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pRes.ok) return;
      const { portfolios = [] } = await pRes.json();
      setPortfoliosCount(portfolios.length);
      const views = await Promise.all(portfolios.map(async (p: any) => {
        try {
          const r = await fetch(`${API_BASE}/api/analytics/summary?portfolio_id=${p.id}&range=365`, { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) return 0;
          const j = await r.json();
          return Number(j.totals?.total_visits || 0);
        } catch { return 0; }
      }));
      setTotalViews(views.reduce((s, v) => s + v, 0));
    } catch { /* ignore */ }
  };

  const loadAbonnements = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/abonnements/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const { abonnements: rows = [] } = await res.json();
      const enriched = await Promise.all(rows.map(async (a: any) => {
        const item = { ...a };
        try {
          if (item.metadata && typeof item.metadata === 'string') item.metadata = JSON.parse(item.metadata);
        } catch { /* ignore */ }
        if (item.plan_id) {
          try {
            const pr = await fetch(`${API_BASE}/api/plans/${item.plan_id}`);
            if (pr.ok) item.plan = (await pr.json()).plan || null;
          } catch { /* ignore */ }
        }
        return item;
      }));
      setAbonnements(enriched);
    } catch { /* ignore */ }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setIsEditing(false);
    if (profile) setForm({
      prenom:      profile.prenom      || '',
      nom:         profile.nom         || '',
      telephone:   profile.phone       || '',
      photo_profil: profile.photo_profil || profile.avatar_url || '',
      biographie:  profile.biographie  || profile.bio || '',
      email:       profile.email       || user?.email || '',
    });
  };

  const cancelPwd = () => {
    setIsChangingPwd(false);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/auth'); return; }
      const payload: any = {
        first_name: form.prenom,
        last_name:  form.nom,
        avatar_url: form.photo_profil,
        bio:        form.biographie,
        phone:      form.telephone,
      };
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur de mise à jour');
      toast({ title: 'Profil mis à jour' });
      setIsEditing(false);
      try { await refreshProfile?.(); } catch { /* ignore */ }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (password.length < 8) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 8 caractères', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast({ title: 'Mot de passe mis à jour' });
      cancelPwd();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erreur', description: 'Image trop lourde (max 5 Mo)', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/uploads/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'upload");
      if (json.url) {
        setForm(s => ({ ...s, photo_profil: json.url }));
        toast({ title: 'Photo mise à jour' });
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePayAbonnement = (ab: any) => {
    const token = ab?.metadata?.payment_token || ab?.metadata?.paymentToken || null;
    window.location.href = token
      ? `${window.location.origin}/checkout?token=${token}`
      : '/checkout';
  };

  const getInitials = () =>
    `${form.prenom?.[0] || ''}${form.nom?.[0] || ''}`.toUpperCase() || 'U';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <div className="h-16 bg-white border-b" />
        <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <DashboardNav onSignOut={signOut} profile={profile} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Hero card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Bandeau */}
          <div className="h-28 bg-gradient-to-r from-[#28A745] via-emerald-500 to-teal-500 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar + infos principales */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-4">
              {/* Avatar avec bouton upload */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {form.photo_profil
                    ? <img src={form.photo_profil} alt="Avatar" className="w-full h-full object-cover" />
                    : getInitials()
                  }
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors"
                  title="Changer la photo"
                >
                  {uploading
                    ? <Upload className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
                    : <Camera className="w-3.5 h-3.5 text-gray-600" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleUploadPhoto(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Nom + email + plan */}
              <div className="flex-1 sm:mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {form.prenom || form.nom
                      ? `${form.prenom} ${form.nom}`.trim()
                      : 'Mon profil'}
                  </h1>
                  <Badge className={`${currentPlanMeta.bg} ${currentPlanMeta.text} border-0 flex items-center gap-1 text-xs font-semibold`}>
                    {currentPlanMeta.icon} {currentPlanMeta.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{form.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Membre depuis {profile?.date_inscription
                    ? format(new Date(profile.date_inscription), 'MMMM yyyy', { locale: fr })
                    : '—'}
                </p>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatMini
                icon={<FolderOpen className="w-4 h-4 text-green-600" />}
                label="Portfolios"
                value={portfoliosCount ?? '—'}
                accent="bg-green-50 text-green-900"
              />
              <StatMini
                icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
                label="Vues totales"
                value={totalViews !== null ? totalViews.toLocaleString('fr-FR') : '—'}
                accent="bg-blue-50 text-blue-900"
              />
              <StatMini
                icon={<Calendar className="w-4 h-4 text-purple-600" />}
                label="Connexion"
                value={profile?.dernier_login
                  ? format(new Date(profile.dernier_login), 'dd MMM', { locale: fr })
                  : '—'}
                accent="bg-purple-50 text-purple-900"
              />
              <StatMini
                icon={<CreditCard className="w-4 h-4 text-amber-600" />}
                label="Abonnements"
                value={abonnements.length}
                accent="bg-amber-50 text-amber-900"
              />
            </div>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : formulaires ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Informations personnelles */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900 text-sm">Informations personnelles</h2>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 h-8 text-xs">
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit} className="h-8 text-xs gap-1">
                      <X className="w-3.5 h-3.5" /> Annuler
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving}
                      className="bg-[#28A745] hover:bg-green-600 text-white h-8 text-xs gap-1">
                      {saving
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-3.5 h-3.5" />
                      }
                      Enregistrer
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-5">
                {/* Prénom + Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Prénom</Label>
                    {isEditing ? (
                      <Input value={form.prenom} onChange={e => setForm(s => ({ ...s, prenom: e.target.value }))} className="h-10 text-sm" placeholder="Votre prénom" />
                    ) : (
                      <div className="h-10 flex items-center px-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                        {form.prenom || <span className="text-gray-400 italic">Non renseigné</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nom</Label>
                    {isEditing ? (
                      <Input value={form.nom} onChange={e => setForm(s => ({ ...s, nom: e.target.value }))} className="h-10 text-sm" placeholder="Votre nom" />
                    ) : (
                      <div className="h-10 flex items-center px-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                        {form.nom || <span className="text-gray-400 italic">Non renseigné</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email (non modifiable) */}
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Adresse email</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <div className="h-10 flex items-center pl-9 pr-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200">
                        {form.email}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-0 gap-1 text-xs shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Vérifié
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">L'adresse email ne peut pas être modifiée.</p>
                </div>

                {/* Téléphone */}
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Téléphone</Label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={form.telephone}
                        onChange={e => setForm(s => ({ ...s, telephone: e.target.value }))}
                        className="pl-9 h-10 text-sm"
                        placeholder="+221 77 000 00 00"
                        type="tel"
                      />
                    </div>
                  ) : (
                    <div className="h-10 flex items-center gap-2 px-3 bg-gray-50 rounded-lg text-sm">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-900">{form.telephone || <span className="text-gray-400 italic">Non renseigné</span>}</span>
                    </div>
                  )}
                </div>

                {/* Biographie */}
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Biographie</Label>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={form.biographie}
                        onChange={e => setForm(s => ({ ...s, biographie: e.target.value }))}
                        placeholder="Parlez de votre parcours, vos compétences, ce qui vous distingue..."
                        rows={4}
                        className="text-sm resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">Apparaît sur vos portfolios publics.</p>
                    </>
                  ) : (
                    <div className="min-h-[80px] p-3 bg-gray-50 rounded-lg text-sm text-gray-900 leading-relaxed">
                      {form.biographie || <span className="text-gray-400 italic">Aucune biographie renseignée</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900 text-sm">Sécurité</h2>
                </div>
                {!isChangingPwd ? (
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPwd(true)} className="gap-1.5 h-8 text-xs">
                    <Lock className="w-3.5 h-3.5" /> Changer le mot de passe
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelPwd} className="h-8 text-xs gap-1">
                      <X className="w-3.5 h-3.5" /> Annuler
                    </Button>
                    <Button size="sm" onClick={handleSavePassword} disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs gap-1">
                      {saving
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-3.5 h-3.5" />
                      }
                      Confirmer
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!isChangingPwd ? (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-xl">
                      <Shield className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Mot de passe configuré</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Défini le {profile?.date_inscription
                          ? format(new Date(profile.date_inscription), 'dd MMMM yyyy', { locale: fr })
                          : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Nouveau mot de passe */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nouveau mot de passe</Label>
                      <div className="relative">
                        <Input
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Minimum 8 caractères"
                          className="pr-10 h-10 text-sm"
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Barre de force */}
                      {password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < pwdStrength.score ? pwdStrength.color : 'bg-gray-100'}`} />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${
                            pwdStrength.score <= 1 ? 'text-red-600' :
                            pwdStrength.score === 2 ? 'text-orange-600' :
                            pwdStrength.score === 3 ? 'text-amber-600' :
                            pwdStrength.score === 4 ? 'text-blue-600' : 'text-green-600'
                          }`}>{pwdStrength.label}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirmation */}
                    <div>
                      <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Retapez le mot de passe"
                          className={`pr-10 h-10 text-sm ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:ring-red-400' : ''}`}
                          autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <X className="w-3 h-3" /> Les mots de passe ne correspondent pas
                        </p>
                      )}
                      {confirmPassword && confirmPassword === password && password.length >= 8 && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Les mots de passe correspondent
                        </p>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">Conseils pour un bon mot de passe :</p>
                      <ul className="space-y-0.5 text-blue-600">
                        {[
                          ['Au moins 8 caractères', password.length >= 8],
                          ['Au moins une majuscule', /[A-Z]/.test(password)],
                          ['Au moins un chiffre', /[0-9]/.test(password)],
                          ['Au moins un symbole (!@#...)', /[^A-Za-z0-9]/.test(password)],
                        ].map(([tip, ok]) => (
                          <li key={tip as string} className="flex items-center gap-1.5">
                            {ok
                              ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                              : <div className="w-3 h-3 rounded-full border border-blue-300 shrink-0" />
                            }
                            {tip as string}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Colonne droite ── */}
          <div className="space-y-5">

            {/* Abonnements */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900 text-sm">Mes abonnements</h2>
                </div>
              </div>

              <div className="p-4">
                {abonnements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Aucun abonnement actif</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/upgrade')}
                      className="text-[#28A745] border-[#28A745] hover:bg-green-50 gap-1.5 text-xs font-semibold">
                      Voir les formules <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {abonnements.map(a => {
                      const isActive  = a.statut === 'active';
                      const isPending = a.statut === 'pending';
                      return (
                        <div key={a.id} className={`rounded-xl border p-4 ${isActive ? 'border-green-200 bg-green-50/50' : isPending ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {a.plan?.name || `Plan #${a.plan_id}`}
                              </p>
                              <Badge className={`mt-1 text-xs ${isActive ? 'bg-green-100 text-green-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'} border-0`}>
                                {isActive ? '● Actif' : isPending ? '⏱ En attente' : a.statut}
                              </Badge>
                            </div>
                            {a.montant > 0 && (
                              <p className="text-sm font-bold text-gray-900 shrink-0">
                                {Number(a.montant).toLocaleString('fr-FR')} {a.currency || 'F CFA'}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            {a.start_date && (
                              <div className="flex justify-between">
                                <span>Début</span>
                                <span className="font-medium text-gray-700">
                                  {format(new Date(a.start_date), 'dd MMM yyyy', { locale: fr })}
                                </span>
                              </div>
                            )}
                            {a.end_date && (
                              <div className="flex justify-between">
                                <span>Échéance</span>
                                <span className="font-medium text-gray-700">
                                  {format(new Date(a.end_date), 'dd MMM yyyy', { locale: fr })}
                                </span>
                              </div>
                            )}
                          </div>

                          {isPending && (
                            <div className="mt-3 pt-3 border-t border-amber-200">
                              <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">Paiement requis pour activer cet abonnement.</p>
                              </div>
                              <Button size="sm" onClick={() => handlePayAbonnement(a)}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs font-semibold">
                                Payer maintenant
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Button size="sm" variant="outline" onClick={() => navigate('/upgrade')}
                      className="w-full text-xs gap-1.5 border-dashed text-gray-500 hover:text-[#28A745] hover:border-[#28A745]">
                      <ArrowRight className="w-3.5 h-3.5" /> Voir toutes les formules
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Compte */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">À propos du compte</h2>
              </div>
              <div className="p-4">
                <InfoRow label="Membre depuis" value={profile?.date_inscription ? format(new Date(profile.date_inscription), 'dd MMM yyyy', { locale: fr }) : '—'} />
                <InfoRow label="Dernière connexion" value={profile?.dernier_login ? format(new Date(profile.dernier_login), 'dd MMM yyyy', { locale: fr }) : '—'} />
                <InfoRow label="Portfolios" value={portfoliosCount !== null ? String(portfoliosCount) : '—'} />
                <InfoRow label="Vues totales" value={totalViews !== null ? totalViews.toLocaleString('fr-FR') : '—'} />
                <InfoRow label="Plan actuel" value={currentPlanMeta.label} />
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Actions rapides</h2>
              </div>
              <div className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start h-9 text-sm gap-2" onClick={() => navigate('/dashboard')}>
                  <FolderOpen className="w-4 h-4 text-gray-400" /> Tableau de bord
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-sm gap-2" onClick={() => navigate('/dashboard/portfolios')}>
                  <FolderOpen className="w-4 h-4 text-gray-400" /> Mes portfolios
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-sm gap-2" onClick={() => navigate('/upgrade')}>
                  <Sparkles className="w-4 h-4 text-gray-400" /> Changer de formule
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 text-sm gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4" /> Se déconnecter
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
