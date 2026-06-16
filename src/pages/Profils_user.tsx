import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { isTokenExpired } from '@/utils/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import BusinessNav from '@/components/business/BusinessNav';
import { User, Shield, Sliders, Eye, EyeOff, Sparkles, Star, Zap, Crown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Très faible', color: '#EF4444' };
  if (score === 2) return { score, label: 'Faible', color: '#F97316' };
  if (score === 3) return { score, label: 'Moyen', color: '#F59E0B' };
  if (score === 4) return { score, label: 'Fort', color: '#3B82F6' };
  return { score, label: 'Très fort', color: '#22C55E' };
};

const planMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  free:     { label: 'Gratuit',  icon: <Star className="w-3 h-3" /> },
  starter:  { label: 'Starter',  icon: <Zap className="w-3 h-3" /> },
  pro:      { label: 'Pro',      icon: <Sparkles className="w-3 h-3" /> },
  business: { label: 'Business', icon: <Crown className="w-3 h-3" /> },
};

function getPlanKey(plan: any): string {
  if (!plan) return 'free';
  const slug = String(plan.slug || '').toLowerCase();
  if (slug.includes('business')) return 'business';
  if (slug.includes('pro') || slug.includes('professionnel')) return 'pro';
  if (slug.includes('starter')) return 'starter';
  return 'free';
}

function Field({ label, value, editing, onChange }: {
  label: string; value: string; editing?: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">{label}</label>
      {editing && onChange ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] transition-colors"
        />
      ) : (
        <div className="mt-1.5 h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-white flex items-center text-sm text-[#18181B]">
          {value || <span className="text-[#71717A]">—</span>}
        </div>
      )}
    </div>
  );
}

function PwdField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#71717A] uppercase tracking-wide">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-[#E7E7EA] bg-white text-sm text-[#18181B] outline-none focus:border-[#2E7D32] transition-colors"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative w-12 h-7 rounded-full transition-colors shrink-0"
      style={{ background: on ? '#2E7D32' : '#D4D4D8' }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? '26px' : '4px' }}
      />
    </button>
  );
}

export default function ProfilsUserPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const { currentPlan } = usePlan();
  const role = (profile?.role || '').toString().toLowerCase();
  const isBusiness = role === 'business_admin' || role === 'business_member';
  const planKey = isBusiness ? 'business' : getPlanKey(currentPlan);
  const planInfo = planMeta[planKey];

  const [tab, setTab]             = useState<'infos' | 'security' | 'prefs'>('infos');
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    prenom: '', nom: '', telephone: '',
    photo_profil: '', biographie: '', email: '',
    localisation: '', metier: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showPwd, setShowPwd]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [abonnements, setAbonnements]         = useState<any[]>([]);
  const [portfoliosCount, setPortfoliosCount] = useState<number | null>(null);
  const [totalViews, setTotalViews]           = useState<number | null>(null);
  const [prefs, setPrefs] = useState({
    emailsPerf: true, nouveauxContacts: true, indexable: false, newsletter: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const pwdStrength  = getPasswordStrength(password);

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
        prenom:       profile.prenom      || '',
        nom:          profile.nom         || '',
        telephone:    profile.phone       || '',
        photo_profil: profile.photo_profil || profile.avatar_url || '',
        biographie:   profile.biographie  || profile.bio || '',
        email:        profile.email       || user?.email || '',
        localisation: (profile as any).location    || (profile as any).localisation || '',
        metier:       (profile as any).job_title   || (profile as any).metier || (profile as any).profession || '',
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
      prenom:       profile.prenom      || '',
      nom:          profile.nom         || '',
      telephone:    profile.phone       || '',
      photo_profil: profile.photo_profil || profile.avatar_url || '',
      biographie:   profile.biographie  || profile.bio || '',
      email:        profile.email       || user?.email || '',
      localisation: (profile as any).location    || (profile as any).localisation || '',
      metier:       (profile as any).job_title   || (profile as any).metier || (profile as any).profession || '',
    });
  };

  const cancelPwd = () => {
    setCurrentPassword('');
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
      <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
        <div className="h-16 bg-white border-b border-[#E7E7EA]" />
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-6">
          <div className="h-9 w-44 rounded-xl bg-zinc-100 animate-pulse" />
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
            <div className="space-y-5">
              <div className="h-60 rounded-2xl bg-zinc-100 animate-pulse" />
              <div className="h-32 rounded-2xl bg-zinc-100 animate-pulse" />
            </div>
            <div className="h-96 rounded-2xl bg-zinc-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // suppress unused-variable warnings for preserved business logic
  void abonnements; void portfoliosCount; void totalViews; void handlePayAbonnement;

  const navTabs = [
    { key: 'infos'    as const, label: 'Informations', icon: <User className="w-4 h-4" /> },
    { key: 'security' as const, label: 'Sécurité',     icon: <Shield className="w-4 h-4" /> },
    { key: 'prefs'    as const, label: 'Préférences',  icon: <Sliders className="w-4 h-4" /> },
  ];

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      {isBusiness
        ? <BusinessNav onSignOut={signOut} />
        : <DashboardNav onSignOut={signOut} profile={profile} />
      }

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight">Mon profil</h1>
        <p className="text-[#71717A] text-sm mt-1">Gérez vos informations personnelles et la sécurité de votre compte.</p>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 mt-8 items-start">

          {/* ── Colonne gauche ── */}
          <div className="space-y-5">

            {/* Carte identité */}
            <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6 text-center">
              <div
                className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
                style={{ background: 'linear-gradient(140deg, #2E7D32, #1B5E20)' }}
              >
                {form.photo_profil
                  ? <img src={form.photo_profil} alt="Avatar" className="w-full h-full object-cover" />
                  : getInitials()
                }
              </div>
              <h2 className="mt-4 font-semibold text-[#18181B] text-lg">
                {(form.prenom || form.nom) ? `${form.prenom} ${form.nom}`.trim() : 'Mon profil'}
              </h2>
              <p className="text-sm text-[#71717A]">{form.email}</p>
              <span
                className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: '#E8F5E9', color: '#1B5E20' }}
              >
                {planInfo.icon} Formule {planInfo.label}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-5 w-full h-10 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {uploading && (
                  <span className="w-3.5 h-3.5 border-2 border-[#71717A] border-t-transparent rounded-full animate-spin" />
                )}
                Changer la photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUploadPhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Navigation onglets */}
            <div className="bg-white rounded-2xl border border-[#E7E7EA] p-2">
              {navTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${tab !== t.key ? 'text-[#18181B]/70 hover:bg-zinc-50' : ''}`}
                  style={tab === t.key ? { background: '#E8F5E9', color: '#1B5E20' } : undefined}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Panneau de contenu ── */}
          <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6 sm:p-7">

            {/* Onglet Informations */}
            {tab === 'infos' && (
              <div>
                <h3 className="font-semibold text-[#18181B]">Informations personnelles</h3>
                <p className="text-sm text-[#71717A] mt-0.5 mb-6">Ces informations apparaissent sur vos portfolios.</p>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Prénom"       value={form.prenom}       editing={isEditing} onChange={v => setForm(s => ({ ...s, prenom: v }))} />
                  <Field label="Nom"          value={form.nom}          editing={isEditing} onChange={v => setForm(s => ({ ...s, nom: v }))} />
                  <Field label="Email"        value={form.email} />
                  <Field label="Téléphone"    value={form.telephone}    editing={isEditing} onChange={v => setForm(s => ({ ...s, telephone: v }))} />
                  <Field label="Localisation" value={form.localisation} editing={isEditing} onChange={v => setForm(s => ({ ...s, localisation: v }))} />
                  <Field label="Métier"       value={form.metier}       editing={isEditing} onChange={v => setForm(s => ({ ...s, metier: v }))} />
                </div>
                <div className="flex justify-end gap-2 mt-7 pt-6 border-t border-[#E7E7EA]">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 transition-colors"
                        style={{ background: '#2E7D32' }}
                      >
                        {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Enregistrer
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white transition-colors"
                      style={{ background: '#2E7D32' }}
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Onglet Sécurité */}
            {tab === 'security' && (
              <div>
                <h3 className="font-semibold text-[#18181B]">Sécurité</h3>
                <p className="text-sm text-[#71717A] mt-0.5 mb-6">Modifiez votre mot de passe et gérez la connexion.</p>
                <div className="space-y-5 max-w-md">
                  <PwdField label="Mot de passe actuel"      value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
                  <PwdField label="Nouveau mot de passe"     value={password}        onChange={setPassword}        show={showPwd}     onToggle={() => setShowPwd(v => !v)} />
                  {password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex-1 h-1.5 rounded-full"
                            style={{ background: i < pwdStrength.score ? pwdStrength.color : '#F4F4F5' }} />
                        ))}
                      </div>
                      <p className="text-xs font-medium" style={{ color: pwdStrength.color }}>{pwdStrength.label}</p>
                    </div>
                  )}
                  <PwdField label="Confirmer le mot de passe" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                </div>
                <div className="mt-7 pt-6 border-t border-[#E7E7EA] space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: '#E8F5E9', color: '#1B5E20' }}>
                        <Shield className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[#18181B]">Double authentification</p>
                        <p className="text-xs text-[#71717A]">Recommandée pour sécuriser votre compte</p>
                      </div>
                    </div>
                    <Toggle on={false} onChange={() => {}} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelPwd}
                      className="h-10 px-4 rounded-[10px] border border-[#E7E7EA] text-sm font-medium text-[#18181B] hover:bg-zinc-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSavePassword}
                      disabled={saving}
                      className="h-10 px-5 rounded-[10px] text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                      style={{ background: '#2E7D32' }}
                    >
                      {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Préférences */}
            {tab === 'prefs' && (
              <div>
                <h3 className="font-semibold text-[#18181B]">Préférences</h3>
                <p className="text-sm text-[#71717A] mt-0.5 mb-6">Notifications et confidentialité.</p>
                <div className="divide-y divide-[#E7E7EA]">
                  {([
                    ['emailsPerf',       'Emails de performance', 'Recevoir un résumé hebdomadaire des vues'],
                    ['nouveauxContacts', 'Nouveaux contacts',     'Être notifié quand un contact est collecté'],
                    ['indexable',        'Profil indexable',      'Autoriser les moteurs de recherche'],
                    ['newsletter',       'Newsletter Portefolia', 'Conseils et nouveautés produit'],
                  ] as [keyof typeof prefs, string, string][]).map(([key, title, subtitle]) => (
                    <div key={key} className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-[#18181B]">{title}</p>
                        <p className="text-xs text-[#71717A]">{subtitle}</p>
                      </div>
                      <Toggle on={prefs[key]} onChange={v => setPrefs(s => ({ ...s, [key]: v }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
