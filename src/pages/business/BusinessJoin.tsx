import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    { label: 'Un chiffre', ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="space-y-1 mt-2">
      {checks.map(c => (
        <div key={c.label} className="flex items-center gap-1.5">
          <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${c.ok ? 'bg-green-500' : 'bg-gray-200'}`}>
            {c.ok && <Check className="h-2 w-2 text-white stroke-[3]" />}
          </div>
          <span className={`text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

const BusinessJoin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reloadProfile } = useAuth();
  const token = searchParams.get('token') || '';

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  // New account form
  const [form, setForm] = useState({ nom: '', prenom: '', password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Existing account form
  const [existingPassword, setExistingPassword] = useState('');
  const [showExistingPwd, setShowExistingPwd] = useState(false);

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
          primary_color: data.primary_color || '#1a1a2e',
          secondary_color: data.secondary_color || '#16213e',
          accent_color: data.accent_color || '#0f3460',
          font_family: data.font_family || null,
          has_existing_account: !!data.has_existing_account,
        });
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const passwordOk = form.password.length >= 8;
  const newAccountCanSubmit = !!(form.prenom.trim() && form.nom.trim() && passwordOk && form.password === form.confirmPassword);
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

      const res = await fetch(`${API_BASE}/api/business/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
        return;
      }

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

  const primary = inviteInfo?.primary_color || '#1a1a2e';
  const secondary = inviteInfo?.secondary_color || '#16213e';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation invalide</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ce lien d'invitation est invalide ou a déjà été utilisé.<br />
            Contactez l'administrateur de votre entreprise.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="text-center">
          <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            {upgraded
              ? <Sparkles className="h-12 w-12 text-white stroke-[2]" />
              : <Check className="h-12 w-12 text-white stroke-[2.5]" />
            }
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {upgraded ? 'Compte lié avec succès !' : 'Bienvenue !'}
          </h2>
          <p className="text-white/70 text-sm">
            {upgraded
              ? 'Votre compte existant a été rattaché à l\'espace Business. Vos données sont préservées.'
              : 'Votre compte est créé. Redirection vers votre espace…'
            }
          </p>
        </div>
      </div>
    );
  }

  const isExisting = inviteInfo?.has_existing_account;

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: inviteInfo?.font_family || undefined }}>

      {/* Top gradient hero */}
      <div className="relative overflow-hidden py-12 px-4 flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white" />
          <div className="absolute -bottom-8 left-1/4 w-48 h-48 rounded-full bg-white" />
        </div>

        <div className="relative max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 rounded-full px-3 py-1 text-xs font-medium mb-5">
            <Gift className="h-3.5 w-3.5" />
            Invitation exclusive
          </div>

          {inviteInfo?.company_logo_url ? (
            <img
              src={inviteInfo.company_logo_url}
              alt={inviteInfo.company_name}
              className="h-16 w-auto object-contain mx-auto mb-4 rounded-xl bg-white/10 p-2"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-white mb-1">{inviteInfo?.company_name}</h1>
          <p className="text-white/70 text-sm">vous invite à rejoindre son espace sur Portefolia</p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-gray-50 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

            {/* Card header */}
            <div className="px-7 pt-7 pb-5 border-b border-gray-100">
              {isExisting ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Lier votre compte existant</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    Vous avez déjà un compte Portefolia avec cette adresse. Confirmez votre mot de passe pour rattacher votre compte à l'espace de{' '}
                    <span className="font-semibold text-gray-700">{inviteInfo?.company_name}</span>.
                    Vos données et portfolios existants seront préservés.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900">Créer votre compte</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-sm text-gray-400">{inviteInfo?.email}</p>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

              {isExisting ? (
                // ── Existing account: email (read-only) + password ──────────────
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Adresse e-mail</Label>
                    <Input
                      value={inviteInfo?.email || ''}
                      readOnly
                      className="h-11 bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="existing-password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Votre mot de passe Portefolia
                    </Label>
                    <div className="relative">
                      <Input
                        id="existing-password"
                        type={showExistingPwd ? 'text' : 'password'}
                        placeholder="Votre mot de passe actuel"
                        value={existingPassword}
                        onChange={e => setExistingPassword(e.target.value)}
                        required
                        autoFocus
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExistingPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showExistingPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3" />
                      Vérification de sécurité — votre compte reste inchangé
                    </p>
                  </div>
                </>
              ) : (
                // ── New account: nom + prenom + password + confirm ──────────────
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prenom" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Prénom</Label>
                      <Input
                        id="prenom"
                        placeholder="Jean"
                        value={form.prenom}
                        onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nom" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nom</Label>
                      <Input
                        id="nom"
                        placeholder="Dupont"
                        value={form.nom}
                        onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Minimum 8 caractères"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={form.password} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Répétez votre mot de passe"
                        value={form.confirmPassword}
                        onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        required
                        className={`h-11 pr-10 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>
                </>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || (isExisting ? !existingAccountCanSubmit : !newAccountCanSubmit)}
                className="w-full h-12 text-white font-semibold rounded-xl gap-2 transition-opacity disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />
                    {isExisting ? 'Liaison en cours…' : 'Création du compte…'}
                  </>
                ) : (
                  <>
                    {isExisting ? <UserCheck className="h-4 w-4" /> : null}
                    {isExisting ? 'Confirmer et rejoindre' : `Rejoindre ${inviteInfo?.company_name}`}
                    {!isExisting && <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            </form>

            {/* Card footer */}
            <div className="px-7 pb-6">
              <p className="text-xs text-center text-gray-400">
                En rejoignant, vous acceptez les{' '}
                <span className="underline cursor-pointer hover:text-gray-600">conditions d'utilisation</span>
                {' '}de Portefolia
              </p>
            </div>
          </div>

          <p className="text-xs text-center text-gray-400 mt-5">
            Propulsé par <strong className="text-gray-500">Portefolia</strong> — Plateforme de portfolios professionnels
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessJoin;
