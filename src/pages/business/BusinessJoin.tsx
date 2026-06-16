import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2, AlertCircle, Eye, EyeOff, Check,
  ArrowRight, Loader2, Gift, ShieldCheck, UserCheck, Sparkles,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface InviteInfo {
  email: string;
  company_name: string;
  company_logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string | null;
  has_existing_account: boolean;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8 caractères minimum', ok: password.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre',   ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="space-y-1 mt-2.5">
      {checks.map(c => (
        <div key={c.label} className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: c.ok ? '#2E7D32' : '#E4E4E7' }}
          >
            {c.ok && <Check size={9} className="text-white" strokeWidth={3.5} />}
          </span>
          <span className="text-xs" style={{ color: c.ok ? '#1B5E20' : '#71717A' }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

const BusinessJoin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { toast }      = useToast();
  const { reloadProfile } = useAuth();
  const token          = searchParams.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [success, setSuccess]       = useState(false);
  const [upgraded, setUpgraded]     = useState(false);

  const [form, setForm] = useState({ nom: '', prenom: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [existingPassword, setExistingPassword] = useState('');
  const [showExistingPwd, setShowExistingPwd]   = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    fetch(`${API_BASE}/api/business/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.valid) { setInvalid(true); return; }
        setInviteInfo({
          email: data.email,
          company_name: data.company_name,
          company_logo_url: data.company_logo_url,
          primary_color: data.primary_color || '#15161D',
          secondary_color: data.secondary_color || '#15161D',
          accent_color: data.accent_color || '#2E7D32',
          font_family: data.font_family || null,
          has_existing_account: !!data.has_existing_account,
        });
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const passwordOk             = form.password.length >= 8;
  const newAccountCanSubmit    = !!(form.prenom.trim() && form.nom.trim() && passwordOk && form.password === form.confirmPassword);
  const existingAccountCanSubmit = existingPassword.length >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isExisting = inviteInfo?.has_existing_account;
    if (isExisting && !existingAccountCanSubmit) return;
    if (!isExisting && !newAccountCanSubmit) return;

    setSubmitting(true);
    try {
      const body = isExisting
        ? { token, password: existingPassword }
        : { token, nom: form.nom.trim(), prenom: form.prenom.trim(), password: form.password };

      const res  = await fetch(`${API_BASE}/api/business/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Erreur', description: data.error, variant: 'destructive' }); return; }

      localStorage.setItem('token', data.accessToken);
      await reloadProfile();

      setUpgraded(!!data.upgraded);
      setSuccess(true);
      setTimeout(() => navigate('/business/member', { replace: true }), 2500);
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const primary  = inviteInfo?.primary_color   || '#15161D';
  const secondary = inviteInfo?.secondary_color || '#15161D';
  const accent   = inviteInfo?.accent_color    || '#2E7D32';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
          <p className="text-white/70 text-sm">Vérification de l'invitation…</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ────────────────────────────────────────────────────────────
  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F8] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#FEE2E2' }}>
            <AlertCircle size={40} style={{ color: '#B91C1C' }} />
          </div>
          <h2 className="text-xl font-bold text-[#18181B] mb-2">Invitation invalide</h2>
          <p className="text-sm text-[#71717A] mb-6">
            Ce lien d'invitation est invalide ou a déjà été utilisé.<br />
            Contactez l'administrateur de votre entreprise.
          </p>
          <button onClick={() => navigate('/')} className="h-10 px-5 rounded-[10px] text-sm font-semibold text-[#18181B] border border-[#E7E7EA] bg-white hover:bg-zinc-50 transition-colors">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            {upgraded ? <Sparkles size={48} className="text-white" strokeWidth={2} /> : <Check size={48} className="text-white" strokeWidth={2.5} />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {upgraded ? 'Compte lié avec succès !' : 'Bienvenue !'}
          </h2>
          <p className="text-white/70 text-sm">
            {upgraded
              ? "Votre compte existant a été rattaché à l'espace Business. Vos données sont préservées."
              : 'Votre compte est créé. Redirection vers votre espace…'}
          </p>
        </div>
      </div>
    );
  }

  const isExisting = inviteInfo?.has_existing_account;

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: inviteInfo?.font_family || undefined }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden py-14 px-4 shrink-0" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div
          className="absolute inset-0 opacity-[0.16] pointer-events-none"
          style={{ background: `radial-gradient(50% 120% at 50% 0%, ${accent}, transparent 60%)` }}
        />
        <div className="relative max-w-md mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/12 text-white/90 rounded-full px-3 py-1 text-xs font-medium mb-5">
            <Gift size={13} /> Invitation exclusive
          </span>
          {inviteInfo?.company_logo_url ? (
            <img src={inviteInfo.company_logo_url} alt={inviteInfo.company_name} className="h-16 w-auto object-contain mx-auto mb-4 rounded-2xl bg-white/12 p-2" />
          ) : (
            <span className="w-16 h-16 rounded-2xl bg-white/12 flex items-center justify-center text-white mx-auto mb-4">
              <Building2 size={30} strokeWidth={1.8} />
            </span>
          )}
          <h1 className="text-2xl font-bold text-white mb-1">{inviteInfo?.company_name}</h1>
          <p className="text-white/55 text-sm">vous invite à rejoindre son espace sur Portefolia</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-10" style={{ background: '#F7F8F8' }}>
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#E7E7EA] shadow-[0_12px_40px_rgba(16,24,40,0.10)] overflow-hidden">

            {/* Card header */}
            <div className="px-7 pt-7 pb-5 border-b border-[#E7E7EA]">
              {isExisting ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                      <UserCheck size={15} style={{ color: '#1B5E20' }} />
                    </div>
                    <h2 className="text-lg font-bold text-[#18181B]">Lier votre compte existant</h2>
                  </div>
                  <p className="text-sm text-[#71717A] mt-2 leading-relaxed">
                    Vous avez déjà un compte Portefolia avec cette adresse. Confirmez votre mot de passe pour rattacher votre compte à l'espace de{' '}
                    <span className="font-semibold text-[#18181B]">{inviteInfo?.company_name}</span>.
                    Vos données et portfolios existants seront préservés.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-[#18181B]">Créer votre compte</h2>
                  <p className="text-sm text-[#71717A] mt-1 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> {inviteInfo?.email}
                  </p>
                </>
              )}
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

              {isExisting ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Adresse e-mail</label>
                    <input
                      value={inviteInfo?.email || ''}
                      readOnly
                      className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] bg-zinc-50 text-[#71717A] text-sm cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="existing-pwd" className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Votre mot de passe Portefolia</label>
                    <div className="relative mt-1.5">
                      <input
                        id="existing-pwd"
                        type={showExistingPwd ? 'text' : 'password'}
                        placeholder="Votre mot de passe actuel"
                        value={existingPassword}
                        onChange={e => setExistingPassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full h-11 px-3.5 pr-10 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] focus:border-[#18181B]/30"
                      />
                      <button type="button" onClick={() => setShowExistingPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors">
                        {showExistingPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-[#1B5E20] flex items-center gap-1 mt-1.5">
                      <ShieldCheck size={12} /> Vérification de sécurité — votre compte reste inchangé
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="prenom" className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Prénom</label>
                      <input
                        id="prenom"
                        placeholder="Jean"
                        value={form.prenom}
                        onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                        required
                        className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] focus:border-[#18181B]/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="nom" className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Nom</label>
                      <input
                        id="nom"
                        placeholder="Dupont"
                        value={form.nom}
                        onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                        required
                        className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] focus:border-[#18181B]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Mot de passe</label>
                    <div className="relative mt-1.5">
                      <input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Minimum 8 caractères"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        required
                        className="w-full h-11 px-3.5 pr-10 rounded-xl border border-[#E7E7EA] outline-none text-sm text-[#18181B] focus:border-[#18181B]/30"
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <PasswordStrength password={form.password} />
                  </div>

                  <div>
                    <label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">Confirmer le mot de passe</label>
                    <div className="relative mt-1.5">
                      <input
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Répétez votre mot de passe"
                        value={form.confirmPassword}
                        onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        required
                        className={`w-full h-11 px-3.5 pr-10 rounded-xl border outline-none text-sm text-[#18181B] focus:border-[#18181B]/30 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-[#EF4444]' : 'border-[#E7E7EA]'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] transition-colors">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-[#B91C1C] mt-1">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting || (isExisting ? !existingAccountCanSubmit : !newAccountCanSubmit)}
                className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: '#1B5E20' }}
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> {isExisting ? 'Liaison en cours…' : 'Création du compte…'}</>
                ) : (
                  <>
                    {isExisting && <UserCheck size={16} />}
                    {isExisting ? 'Confirmer et rejoindre' : `Rejoindre ${inviteInfo?.company_name}`}
                    {!isExisting && <ArrowRight size={16} />}
                  </>
                )}
              </button>
            </form>

            {/* Card footer */}
            <div className="px-7 pb-6">
              <p className="text-xs text-center text-[#71717A]">
                En rejoignant, vous acceptez les{' '}
                <span className="underline cursor-pointer hover:text-[#18181B]">conditions d'utilisation</span>{' '}
                de Portefolia.
              </p>
            </div>
          </div>

          <p className="text-xs text-center text-[#71717A] mt-5">
            Propulsé par <strong className="text-[#18181B]/70">Portefolia</strong> — Plateforme de portfolios professionnels
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessJoin;
