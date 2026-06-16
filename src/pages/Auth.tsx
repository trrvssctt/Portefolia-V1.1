import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { loadProfile, isBusinessRole } from '@/utils/authUtils';
const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://backend-v-card.onrender.com');
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Lock, User, Eye, EyeOff, ArrowLeft,
  CreditCard, Smartphone, Check, ChevronRight, Shield,
  Loader2, RotateCcw, X,
} from "lucide-react";

const DRAFT_KEY = 'portefolia_signup_draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type PaymentMethod = 'wave';

const AUTH_DURATIONS = [
  { months: 1,  label: '1 mois',  discount: 0 },
  { months: 3,  label: '3 mois',  discount: 15, badge: '-15%' },
  { months: 12, label: '1 an',    discount: 20, badge: '-20%' },
] as const;
type AuthDurIdx = 0 | 1 | 2;

function addMonths(d: Date, m: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + m); return r;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Client-side email format check (mirrors backend regex)
const EMAIL_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const isEmailFormatValid = (e: string) => EMAIL_REGEX.test(e.trim());

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, signOut, user, profile, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  // Signup multi-step state
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');
  const [durationIdx, setDurationIdx] = useState<AuthDurIdx>(() => {
    const d = Number(new URLSearchParams(window.location.search).get('duration'));
    if (d === 3) return 1;
    if (d === 12) return 2;
    return 0;
  });
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });
  const [planData, setPlanData] = useState<any | null>(null);

  // Draft session restoration
  const [draftBanner, setDraftBanner] = useState<{ firstName: string; email: string; planSlug: string | null } | null>(null);

  // Bannière plan expiré / suspendu / email non vérifié
  const [expiredBanner, setExpiredBanner] = useState<{
    code: 'SUBSCRIPTION_EXPIRED' | 'BUSINESS_SUSPENDED' | 'PAYMENT_PENDING' | 'PAYMENT_REQUIRED' | 'ACCOUNT_INACTIVE' | 'EMAIL_NOT_VERIFIED';
    message: string;
    checkout_token: string | null;
    email?: string;
  } | null>(null);
  // Bannière "vérifiez votre email" après inscription
  const [verificationSent, setVerificationSent] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      const roleStr = (profile?.role || profile?.token_type || '').toString().toLowerCase();
      // Seuls les admins plateforme (panel /admin/*) sont bloqués ici
      const isPlatformAdmin = roleStr === 'admin' || roleStr === 'super_admin' || roleStr === 'moderateur' || roleStr === 'comptable';
      if (isPlatformAdmin) {
        try { signOut(); } catch (e) {}
        toast({ title: 'Accès administrateur', description: 'Veuillez utiliser la page de connexion administrateur.', variant: 'destructive' });
        navigate('/auth');
        return;
      }
      // Redirection spécifique selon le rôle Business
      if (roleStr === 'business_admin') { navigate('/business/dashboard'); return; }
      if (roleStr === 'business_member') { navigate('/business/member'); return; }

      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo);
    }
  }, [user, profile, loading, navigate, searchParams]);

  // Handle password recovery
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      toast({ title: "Récupération de mot de passe", description: "Vous pouvez maintenant définir un nouveau mot de passe" });
    }
  }, [searchParams, toast]);

  // Load plan details from API
  useEffect(() => {
    const selected = searchParams.get('plan');
    if (!selected) return;
    let mounted = true;
    import('@/lib/api').then(({ fetchJson }) => {
      fetchJson('/plans')
        .then((data) => {
          const plans = Array.isArray(data) ? data : (data as any).plans || [];
          const found = plans.find((pl: any) => String(pl.slug) === selected || String(pl.id) === selected);
          if (mounted) setPlanData(found || null);
        })
        .catch(() => { if (mounted) setPlanData(null); });
    }).catch(() => { if (mounted) setPlanData(null); });
    return () => { mounted = false; };
  }, [searchParams]);

  // ── Draft restoration on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Default tab to signup when plan is selected via URL
    if (searchParams.get('plan')) setActiveTab('signup');

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft.savedAt || Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (draft.firstName || draft.email) {
        setDraftBanner({ firstName: draft.firstName || '', email: draft.email || '', planSlug: draft.planSlug || null });
        setActiveTab('signup');
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // ── Auto-save draft on form changes (immédiat, pas de debounce) ─────────────
  useEffect(() => {
    if (!formData.firstName && !formData.lastName && !formData.email) return;
    saveDraft();
  }, [formData.firstName, formData.lastName, formData.email, paymentMethod, durationIdx]);

  // ── Sauvegarde aussi quand l'utilisateur quitte la page ──────────────────────
  useEffect(() => {
    const handleUnload = () => saveDraft();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [formData, paymentMethod, durationIdx]);

  const saveDraft = () => {
    if (!formData.firstName && !formData.lastName && !formData.email) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        paymentMethod,
        durationIdx,
        planSlug: searchParams.get('plan'),
        savedAt: Date.now(),
      }));
    } catch {}
  };

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setFormData(prev => ({
        ...prev,
        firstName: draft.firstName || '',
        lastName: draft.lastName || '',
        email: draft.email || '',
      }));
      if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
      if (draft.durationIdx !== undefined) setDurationIdx(draft.durationIdx as AuthDurIdx);
      if (draft.planSlug && draft.planSlug !== searchParams.get('plan')) {
        navigate(`/auth?plan=${draft.planSlug}`, { replace: true });
      }
    } catch {}
    setActiveTab('signup');
    setSignupStep(1);
    setDraftBanner(null);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedPlanSlug = searchParams.get('plan');
  const hasPlanSelected = !!selectedPlanSlug;
  const unitMonthly = planData ? Number(planData.price_monthly_cents ?? planData.price_cents ?? planData.price ?? 0) : 0;
  const isFree = unitMonthly === 0;
  const currency = (planData?.currency === 'FCFA' || planData?.currency === 'XOF') ? 'F CFA' : (planData?.currency || 'F CFA');
  const formatAmount = (val: number) => `${Number(val).toLocaleString('fr-FR')} ${currency}`;
  const { months: durMonths, discount: durDiscount } = AUTH_DURATIONS[durationIdx];
  const totalAmount = isFree ? 0 : Math.round(unitMonthly * durMonths * (1 - durDiscount / 100));
  const perMonthAmount = durMonths > 1 ? Math.round(totalAmount / durMonths) : totalAmount;
  const savings = Math.round(unitMonthly * durMonths - totalAmount);
  const newEndDate = addMonths(new Date(), durMonths);

  // ── Step 1 → Step 2 navigation ──────────────────────────────────────────────
  const goToStep2 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({ title: "Champs requis", description: "Veuillez renseigner votre prénom et nom.", variant: "destructive" });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: "Email requis", description: "Veuillez renseigner votre adresse email.", variant: "destructive" });
      return;
    }
    if (!isEmailFormatValid(formData.email)) {
      toast({ title: "Email invalide", description: "Le format de cette adresse email est incorrect.", variant: "destructive" });
      return;
    }
    if (!formData.password) {
      toast({ title: "Mot de passe requis", description: "Veuillez choisir un mot de passe.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: "Mot de passe trop court", description: "Le mot de passe doit contenir au moins 8 caractères.", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Mots de passe incorrects", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setSignupStep(2);
  };

  // ── Sign in ─────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result: any = await signIn(formData.email, formData.password);
      if (result?.error) {
        const code = result.error.code as string | null;

        // Plan expiré (admin) → bannière avec bouton Renouveler
        if (code === 'SUBSCRIPTION_EXPIRED') {
          setExpiredBanner({
            code: 'SUBSCRIPTION_EXPIRED',
            message: result.error.message,
            checkout_token: result.error.checkout_token || null,
          });
          return;
        }

        // Membre Business dont le plan est suspendu
        if (code === 'BUSINESS_SUSPENDED') {
          setExpiredBanner({
            code: 'BUSINESS_SUSPENDED',
            message: result.error.message,
            checkout_token: null,
          });
          return;
        }

        // Paiement en cours de validation admin (référence déjà soumise)
        if (code === 'PAYMENT_PENDING') {
          setExpiredBanner({
            code: 'PAYMENT_PENDING',
            message: result.error.message,
            checkout_token: null,
          });
          return;
        }

        // Paiement Wave pas encore soumis → renvoyer vers le checkout
        if (code === 'PAYMENT_REQUIRED') {
          setExpiredBanner({
            code: 'PAYMENT_REQUIRED',
            message: result.error.message,
            checkout_token: result.error.checkout_token || null,
          });
          return;
        }

        // Compte inactif pour raison administrative
        if (code === 'ACCOUNT_INACTIVE') {
          setExpiredBanner({
            code: 'ACCOUNT_INACTIVE',
            message: result.error.message,
            checkout_token: null,
          });
          return;
        }

        // Email non vérifié → afficher bannière avec info
        if (code === 'EMAIL_NOT_VERIFIED') {
          setExpiredBanner({
            code: 'EMAIL_NOT_VERIFIED',
            message: result.error.message,
            checkout_token: null,
            email: result.error.email || formData.email,
          });
          return;
        }

        toast({ title: "Erreur de connexion", description: result.error.message, variant: "destructive" });
        return;
      }
      const token = result?.token;
      if (token) {
        const p = await loadProfile(token);
        const roleStr = (p?.role || p?.token_type || '').toString().toLowerCase();
        // Bloquer uniquement les admins plateforme
        const isPlatformAdmin = roleStr === 'admin' || roleStr === 'super_admin' || roleStr === 'moderateur' || roleStr === 'comptable';
        if (isPlatformAdmin) {
          try { await signOut(); } catch (e) {}
          toast({ title: 'Accès administrateur', description: 'Veuillez utiliser la page de connexion administrateur.', variant: 'destructive' });
          navigate('/auth');
          return;
        }
        // Redirection Business
        if (roleStr === 'business_admin') { navigate('/business/dashboard'); return; }
        if (roleStr === 'business_member') { navigate('/business/member'); return; }

        const redirectTo = searchParams.get('redirect') || '/dashboard';
        navigate(redirectTo);
      }
    } catch {
      toast({ title: "Erreur", description: "Une erreur inattendue s'est produite", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign up ─────────────────────────────────────────────────────────────────
  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const signUpOptions: any = {};
      if (planData?.id) signUpOptions.plan_id = planData.id;
      if (planData?.slug) signUpOptions.plan_slug = planData.slug;
      if (!signUpOptions.plan_id && !signUpOptions.plan_slug && selectedPlanSlug) {
        signUpOptions.plan_slug = selectedPlanSlug;
      }
      signUpOptions.duration_months = durMonths;

      const result = await signUp(formData.email, formData.password, formData.firstName, formData.lastName, signUpOptions) as any;
      const { error, token, data } = result || {};

      if (error) {
        toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
        return;
      }

      // Paid plan → redirect to checkout with chosen payment method
      const checkoutToken = data?.checkout?.token ?? null;
      if (checkoutToken) {
        clearDraft();
        toast({ title: 'Étape de paiement', description: 'Vous allez être redirigé vers la page de paiement sécurisé.' });
        navigate(`/checkout?token=${checkoutToken}&method=${paymentMethod}`);
        return;
      }

      // Vérification email requise (plan gratuit ou payant)
      if (data?.requiresVerification) {
        clearDraft();
        setVerificationSent(formData.email);
        setActiveTab('signin');
        return;
      }

      clearDraft();
      toast({
        title: "Inscription reçue",
        description: "Votre compte a été créé. Un administrateur confirmera votre accès sous peu.",
      });
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Une erreur inattendue s'est produite", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset password ──────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await resetPassword(formData.email);
      if (error) {
        toast({ title: "Erreur de réinitialisation", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Email envoyé", description: "Un email de réinitialisation vous a été envoyé." });
      setShowResetForm(false);
    } catch {
      toast({ title: "Erreur", description: "Une erreur inattendue s'est produite", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-white to-green-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-[#28A745] rounded-xl animate-pulse mx-auto mb-4 shadow-lg shadow-green-200"></div>
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Step indicator component ────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {/* Step 1 */}
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${signupStep >= 1 ? 'bg-[#28A745] text-white' : 'bg-gray-200 text-gray-500'}`}>
          {signupStep > 1 ? <Check className="w-4 h-4" /> : '1'}
        </div>
        <span className={`text-xs font-medium hidden sm:inline ${signupStep === 1 ? 'text-gray-900' : 'text-gray-400'}`}>
          Vos informations
        </span>
      </div>

      {/* Connector */}
      <div className={`flex-1 max-w-[60px] h-0.5 transition-colors ${signupStep > 1 ? 'bg-[#28A745]' : 'bg-gray-200'}`} />

      {/* Step 2 */}
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${signupStep >= 2 ? 'bg-[#28A745] text-white' : 'bg-gray-200 text-gray-500'}`}>
          2
        </div>
        <span className={`text-xs font-medium hidden sm:inline ${signupStep === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
          {isFree ? 'Confirmation' : 'Paiement'}
        </span>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-white to-green-50/40 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#28A745]/6 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-300/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Back button */}
        <div className="mb-5">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-[#28A745] hover:bg-white/70 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
            Retour à l'accueil
          </Button>
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mx-auto">
            <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="h-16 md:h-20 object-contain drop-shadow-sm" />
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Créez et partagez votre portfolio professionnel</p>
        </div>

        <Card className="shadow-xl shadow-slate-200/60 border-slate-200/80 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/95">
          <CardHeader className="pb-4 bg-gradient-to-b from-slate-50/60 to-transparent">
            <CardTitle className="text-center text-lg font-semibold text-gray-800">
              {showResetForm ? 'Réinitialiser le mot de passe' : 'Accéder à votre compte'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showResetForm ? (
              /* ── Reset password form ──────────────────────────────────────── */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="reset-email" type="email" value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="votre@email.com" className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-[#28A745] hover:bg-[#218838] h-11 font-semibold shadow-md shadow-green-100 rounded-xl">
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi en cours...</>
                  ) : 'Envoyer le lien de réinitialisation'}
                </Button>
                <div className="text-center">
                  <Button type="button" variant="link" onClick={() => setShowResetForm(false)}
                    className="text-sm text-gray-500 hover:text-[#28A745]">
                    ← Retour à la connexion
                  </Button>
                </div>
              </form>
            ) : (
              <>
              {/* ── Bannières état compte ─────────────────────────────── */}
              {expiredBanner && (() => {
                const cfg = {
                  SUBSCRIPTION_EXPIRED: { bg: 'bg-red-50 border-red-200',     iconBg: 'bg-red-100',    icon: <CreditCard className="w-4 h-4 text-red-600" />,    title: 'Abonnement expiré',              titleColor: 'text-red-800',    msgColor: 'text-red-700' },
                  BUSINESS_SUSPENDED:   { bg: 'bg-amber-50 border-amber-200',  iconBg: 'bg-amber-100',  icon: <CreditCard className="w-4 h-4 text-amber-600" />,  title: 'Compte suspendu',                titleColor: 'text-amber-800',  msgColor: 'text-amber-700' },
                  PAYMENT_PENDING:      { bg: 'bg-blue-50 border-blue-200',    iconBg: 'bg-blue-100',   icon: <Mail className="w-4 h-4 text-blue-600" />,         title: 'Paiement en cours de validation',titleColor: 'text-blue-800',   msgColor: 'text-blue-700' },
                  PAYMENT_REQUIRED:     { bg: 'bg-orange-50 border-orange-200',iconBg: 'bg-orange-100', icon: <CreditCard className="w-4 h-4 text-orange-600" />, title: 'Paiement requis',                titleColor: 'text-orange-800', msgColor: 'text-orange-700' },
                  ACCOUNT_INACTIVE:     { bg: 'bg-slate-50 border-slate-200',  iconBg: 'bg-slate-100',  icon: <Shield className="w-4 h-4 text-slate-500" />,     title: 'Compte inactif',                 titleColor: 'text-slate-800',  msgColor: 'text-slate-600' },
                  EMAIL_NOT_VERIFIED:   { bg: 'bg-amber-50 border-amber-200',  iconBg: 'bg-amber-100',  icon: <Mail className="w-4 h-4 text-amber-600" />,        title: 'Email non vérifié',              titleColor: 'text-amber-800',  msgColor: 'text-amber-700' },
                }[expiredBanner.code];
                return (
                  <div className={`mb-4 rounded-xl border p-4 ${cfg.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${cfg.titleColor}`}>{cfg.title}</p>
                        <p className={`text-xs mt-0.5 leading-relaxed ${cfg.msgColor}`}>{expiredBanner.message}</p>
                        {expiredBanner.code === 'PAYMENT_PENDING' && (
                          <p className="text-xs mt-2 text-blue-600 font-medium">
                            Un email vous sera envoyé par <strong>comptabilite@portefolia.tech</strong> dès que votre paiement sera confirmé.
                          </p>
                        )}
                        {expiredBanner.code === 'EMAIL_NOT_VERIFIED' && (
                          <div className="mt-3">
                            <p className="text-xs text-amber-600 mb-2">
                              Vérifiez votre boîte mail (y compris les spams) et cliquez sur le lien reçu de <strong>support@portefolia.tech</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await fetch(`${API_BASE}/api/auth/resend-verification`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: expiredBanner.email || formData.email }),
                                  });
                                  toast({ title: 'Email renvoyé', description: 'Vérifiez votre boîte mail.' });
                                } catch {
                                  toast({ title: 'Erreur', description: 'Impossible de renvoyer l\'email.', variant: 'destructive' });
                                }
                              }}
                              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                            >
                              Renvoyer l'email de vérification
                            </button>
                          </div>
                        )}
                        {expiredBanner.code === 'PAYMENT_REQUIRED' && expiredBanner.checkout_token && (
                          <button
                            type="button"
                            onClick={() => navigate(`/checkout?token=${expiredBanner!.checkout_token}`)}
                            className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Finaliser mon paiement Wave
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        {expiredBanner.code === 'SUBSCRIPTION_EXPIRED' && expiredBanner.checkout_token && (
                          <button
                            type="button"
                            onClick={() => navigate(`/checkout?token=${expiredBanner!.checkout_token}`)}
                            className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Renouveler mon abonnement
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button type="button" onClick={() => setExpiredBanner(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Bannière "vérifiez votre email" après inscription */}
              {verificationSent && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-green-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-green-800">Vérifiez votre email !</p>
                      <p className="text-xs mt-0.5 leading-relaxed text-green-700">
                        Un lien de vérification a été envoyé à <strong>{verificationSent}</strong>.
                        Cliquez sur ce lien pour accéder à votre compte.
                      </p>
                      <p className="text-xs mt-1.5 text-green-600">
                        Expéditeur : <strong>support@portefolia.tech</strong> — vérifiez aussi vos spams.
                      </p>
                    </div>
                    <button type="button" onClick={() => setVerificationSent(null)} className="text-green-400 hover:text-green-600 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Draft restoration banner — always visible above the tabs */}
              {draftBanner && (
                <div className="mb-4 flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Inscription non terminée</p>
                    <p className="text-xs text-amber-600 mt-0.5 truncate">
                      {draftBanner.firstName
                        ? `Bonjour ${draftBanner.firstName}, reprenez là où vous en étiez.`
                        : `Reprenez votre inscription (${draftBanner.email}).`}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={restoreDraft}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                      >
                        Reprendre
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDraftBanner(null); clearDraft(); }}
                        className="text-xs text-amber-500 hover:text-amber-700"
                      >
                        Recommencer
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDraftBanner(null); clearDraft(); }}
                    className="text-amber-400 hover:text-amber-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'signin' | 'signup'); if (v === 'signup') setSignupStep(1); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100/80 rounded-xl p-1">
                  <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#28A745] font-medium transition-all">Connexion</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#28A745] font-medium transition-all">Inscription</TabsTrigger>
                </TabsList>

                {/* ── Signin tab ──────────────────────────────────────────── */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input id="signin-email" type="email" value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="votre@email.com" className="pl-10" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input id="signin-password" type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Votre mot de passe" className="pl-10 pr-10" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full bg-[#28A745] hover:bg-[#218838] h-11 text-sm font-semibold shadow-md shadow-green-100 transition-all duration-200 rounded-xl">
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
                      ) : 'Se connecter'}
                    </Button>
                    <div className="text-center">
                      <Button type="button" variant="link" onClick={() => setShowResetForm(true)}
                        className="text-sm text-gray-500 hover:text-[#28A745]">
                        Mot de passe oublié ?
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* ── Signup tab ──────────────────────────────────────────── */}
                <TabsContent value="signup">

                  {hasPlanSelected && <StepIndicator />}

                  {/* ── STEP 1 : Informations personnelles ──────────────── */}
                  {signupStep === 1 && (
                    <div className="space-y-4">
                      {/* Plan badge */}
                      {planData && (
                        <div className="rounded-xl border border-green-100 bg-green-50 overflow-hidden">
                          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                            <div className="w-8 h-8 bg-[#28A745]/15 rounded-lg flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4 text-[#28A745]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Formule sélectionnée</p>
                              <p className="text-sm font-bold text-gray-900 truncate">{planData.name}</p>
                            </div>
                            {!isFree && savings > 0 && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800 shrink-0">
                                −{durDiscount}%
                              </span>
                            )}
                          </div>
                          {!isFree && (
                            <div className="px-3 pb-3 flex items-baseline gap-1.5">
                              <span className="text-xl font-extrabold text-gray-900">{formatAmount(totalAmount)}</span>
                              <span className="text-xs text-gray-400">
                                {durMonths === 1 ? '/ mois' : durMonths === 12 ? '/ an' : `pour ${durMonths} mois`}
                              </span>
                              {savings > 0 && (
                                <span className="text-xs text-gray-400 line-through ml-1">
                                  {formatAmount(unitMonthly * durMonths)}
                                </span>
                              )}
                            </div>
                          )}
                          {isFree && (
                            <p className="px-3 pb-3 text-sm font-semibold text-green-600">Gratuit pour toujours</p>
                          )}
                        </div>
                      )}

                      {/* Prénom + Nom */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="signup-firstName">Prénom</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input id="signup-firstName" type="text" value={formData.firstName}
                              onChange={(e) => handleInputChange('firstName', e.target.value)}
                              placeholder="Prénom" className="pl-10" required />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="signup-lastName">Nom</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input id="signup-lastName" type="text" value={formData.lastName}
                              onChange={(e) => handleInputChange('lastName', e.target.value)}
                              placeholder="Nom" className="pl-10" required />
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <Label htmlFor="signup-email">Adresse email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="signup-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="votre@email.com"
                            className={`pl-10 transition-colors ${
                              formData.email.trim() && !isEmailFormatValid(formData.email)
                                ? 'border-red-400 focus-visible:ring-red-300'
                                : ''
                            }`}
                            required
                          />
                        </div>
                        {formData.email.trim() && !isEmailFormatValid(formData.email) && (
                          <p className="mt-1.5 text-xs text-red-600">
                            Format d'adresse email invalide.
                          </p>
                        )}
                      </div>

                      {/* Mot de passe */}
                      <div>
                        <Label htmlFor="signup-password">Mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input id="signup-password" type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="8 caractères minimum" className="pl-10 pr-10" required />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirmer mot de passe */}
                      <div>
                        <Label htmlFor="signup-confirmPassword">Confirmer le mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input id="signup-confirmPassword" type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            placeholder="Confirmer le mot de passe" className="pl-10 pr-10" required />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* CTA Step 1 */}
                      {hasPlanSelected ? (
                        <Button
                          type="button"
                          onClick={goToStep2}
                          disabled={isLoading}
                          className="w-full bg-[#28A745] hover:bg-[#218838] h-11 gap-2 font-semibold shadow-md shadow-green-100 rounded-xl disabled:opacity-60 transition-all"
                        >
                          Continuer <ChevronRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleSignUp()}
                          className="w-full bg-[#28A745] hover:bg-[#218838] h-11 font-semibold shadow-md shadow-green-100 rounded-xl disabled:opacity-60 transition-all"
                        >
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inscription...</> : "Créer mon compte"}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* ── STEP 2 : Paiement ──────────────────────────────── */}
                  {signupStep === 2 && (
                    <div className="space-y-5">

                      {/* Plan summary card */}
                      <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#28A745] to-emerald-500 px-5 py-4">
                          <p className="text-green-100 text-xs font-medium mb-0.5">Formule choisie</p>
                          <h3 className="text-white text-xl font-extrabold">
                            {planData?.name || selectedPlanSlug}
                          </h3>
                        </div>
                        <div className="px-5 py-4 bg-white space-y-4">
                          {isFree ? (
                            <div className="flex items-end gap-1">
                              <span className="text-4xl font-extrabold text-gray-900">0</span>
                              <span className="text-gray-500 text-sm mb-1">{currency}</span>
                              <span className="text-gray-400 text-sm mb-1 ml-1">— Gratuit pour toujours</span>
                            </div>
                          ) : (
                            <>
                              {/* Duration selector */}
                              <div className="flex gap-2">
                                {AUTH_DURATIONS.map((d, i) => (
                                  <button
                                    key={d.months}
                                    type="button"
                                    onClick={() => setDurationIdx(i as AuthDurIdx)}
                                    className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all relative ${
                                      durationIdx === i
                                        ? 'border-[#28A745] bg-green-50 text-[#28A745]'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {'badge' in d && d.badge && (
                                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                                        {d.badge}
                                      </span>
                                    )}
                                    <span className="block mt-1">{d.label}</span>
                                  </button>
                                ))}
                              </div>

                              {/* Price breakdown */}
                              <div>
                                <div className="flex items-end gap-1.5">
                                  <span className="text-3xl font-extrabold text-gray-900">
                                    {totalAmount.toLocaleString('fr-FR')}
                                  </span>
                                  <span className="text-gray-500 text-sm mb-1">{currency}</span>
                                  {durMonths > 1 && (
                                    <span className="text-gray-400 text-xs mb-1.5">
                                      · soit {perMonthAmount.toLocaleString('fr-FR')} {currency}/mois
                                    </span>
                                  )}
                                  {durMonths === 1 && (
                                    <span className="text-gray-400 text-sm mb-1">/mois</span>
                                  )}
                                </div>
                                {savings > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400 line-through">
                                      {(unitMonthly * durMonths).toLocaleString('fr-FR')} {currency}
                                    </span>
                                    <span className="text-xs font-bold text-green-600">
                                      Économie : {savings.toLocaleString('fr-FR')} {currency}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1.5">
                                  Accès jusqu'au <strong className="text-gray-600">{fmtDate(newEndDate)}</strong>
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Payment method info (Wave uniquement) */}
                      {!isFree && (
                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#1BC29A] bg-[#1BC29A]/5">
                          <div className="w-10 h-10 rounded-xl bg-[#1BC29A] flex items-center justify-center shrink-0">
                            <Smartphone className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">Wave / Mobile Money</p>
                            <p className="text-xs text-gray-500">Wave, Orange Money, Free Money</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 border-[#1BC29A] bg-[#1BC29A] flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        </div>
                      )}

                      {/* Submit button */}
                      <Button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleSignUp()}
                        className={`w-full font-semibold h-12 rounded-xl shadow-md transition-all ${isFree ? 'bg-[#28A745] hover:bg-[#218838] shadow-green-100' : 'bg-[#1BC29A] hover:bg-[#17a884] shadow-teal-100'} text-white`}
                      >
                        {isLoading
                          ? 'Création du compte...'
                          : isFree
                          ? 'Créer mon compte gratuitement'
                          : 'Créer mon compte et payer via Wave'}
                      </Button>

                      {/* Back link */}
                      <button
                        type="button"
                        onClick={() => setSignupStep(1)}
                        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Modifier mes informations
                      </button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
