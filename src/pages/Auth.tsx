import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, signOut, user, profile, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });
  const [planData, setPlanData] = useState<any | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'mensuel' | 'annuel'>('mensuel');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      // prefer explicit admin dashboard when role === 'ADMIN'
      const isAdmin = (profile?.role || '').toString().toUpperCase() === 'ADMIN';
      if (isAdmin) {
        navigate('/admin');
        return;
      }
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      navigate(redirectTo);
    }
  }, [user, profile, loading, navigate, searchParams]);

  // Handle password recovery
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      toast({
        title: "Récupération de mot de passe",
        description: "Vous pouvez maintenant définir un nouveau mot de passe",
      });
    }
  }, [searchParams, toast]);

  // If a plan is passed in query, fetch plan details to show amount in signup
  useEffect(() => {
    const selected = searchParams.get('plan');
    if (!selected) return;
    let mounted = true;
    import('@/lib/api').then(({ fetchJson }) => {
      fetchJson('/plans')
        .then((data) => {
          const plans = Array.isArray(data) ? data : data.plans || [];
          const found = plans.find((pl: any) => String(pl.slug) === selected || String(pl.id) === selected);
          if (mounted) setPlanData(found || null);
        })
        .catch(() => {
          if (mounted) setPlanData(null);
        });
    }).catch(() => {
      if (mounted) setPlanData(null);
    });

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const unitMonthly = planData ? (planData.price_monthly_cents ?? planData.price_cents ?? planData.price ?? 0) : 0;
  const unitAnnual = planData ? (planData.price_annual_cents ?? unitMonthly * 12) : unitMonthly * 12;
  const formatAmount = (val: number) => `${Number(val).toLocaleString('fr-FR')} ${planData?.currency === 'FCFA' ? 'F CFA' : (planData?.currency || 'F CFA')}`;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Navigation will be handled by the effect that watches `user` and `profile`
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlan = searchParams.get('plan');
  const PLAN_NAMES: Record<string, string> = {
    simple: 'Portefolio Simple',
    standard: 'Standard',
    pro: 'Pro',
    premium: 'Premium'
  };
  const selectedPlanName = selectedPlan ? (PLAN_NAMES[selectedPlan] || selectedPlan) : null;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erreur d'inscription",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Pass selected plan info (if any) to signUp so backend can create paid checkout when needed
      const signUpOptions: any = {};
      if (planData && planData.id) signUpOptions.plan_id = planData.id;
      if (planData && planData.slug) signUpOptions.plan_slug = planData.slug;
      const result = await signUp(formData.email, formData.password, formData.firstName, formData.lastName, signUpOptions) as any;
      const { error, token, data } = result || {};
      if (error) {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // If backend returned a checkout token (paid plan), redirect to checkout page
      const checkoutToken = data && data.checkout && data.checkout.token ? data.checkout.token : null;
      if (checkoutToken) {
        toast({ title: 'Étape de paiement', description: 'Vous allez être redirigé vers la page de paiement sécurisé.' });
        navigate(`/checkout?token=${checkoutToken}`);
        return;
      }

      // If a token was returned (free plan), user is already logged in — navigation handled by auth effect
      if (token) {
        toast({ title: 'Bienvenue', description: 'Compte créé avec succès.' });
        return;
      }

      // Fallback: account created but no token and no checkout — user will need admin validation
      toast({
        title: "Inscription reçue",
        description: "Votre compte a été créé. Si un paiement est requis, il sera traité et un administrateur confirmera votre accès.",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(formData.email);
      
      if (error) {
        toast({
          title: "Erreur de réinitialisation",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email envoyé",
        description: "Un email de réinitialisation de mot de passe vous a été envoyé",
      });
      
      setShowResetForm(false);
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleTestAdminLogin = () => {
    setFormData({
      ...formData,
      email: 'ndiayemama868@gmail.com',
      password: 'Passer'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#28A745] rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-[#28A745]"
          >
            <ArrowLeft size={16} />
            Retour à l'accueil
          </Button>
        </div>

        <div className="text-center mb-3">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mx-auto">
            <img
              src="/lovable-uploads/logo_portefolia_remove_bg.png"
              alt="Portefolia"
              className="h-40 object-contain"
            />
          </Link>
          <p className="text-gray-600 mt-2 text-lg">Créez et partagez votre portfolio professionnel</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {showResetForm ? 'Réinitialiser le mot de passe' : 'Accéder à votre compte'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showResetForm ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="votre@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#28A745] hover:bg-green-600"
                >
                  {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowResetForm(false)}
                    className="text-sm text-gray-600 hover:text-[#28A745]"
                  >
                    Retour à la connexion
                  </Button>
                </div>
              </form>
            ) : (
              <Tabs defaultValue={selectedPlan ? 'signup' : 'signin'} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="votre@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signin-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Votre mot de passe"
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#28A745] hover:bg-green-600"
                    >
                      {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Button>

                    <div className="text-center space-y-2">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowResetForm(true)}
                        className="text-sm text-gray-600 hover:text-[#28A745]"
                      >
                        Mot de passe oublié ?
                      </Button>
                      
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  {selectedPlanName && (
                    <div className="p-3 mb-2 rounded-md bg-yellow-50 border border-yellow-100 text-yellow-800">
                      Formule choisie: <strong>{selectedPlanName}</strong>
                    </div>
                  )}
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="votre@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signup-firstName">Prénom</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="signup-firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            placeholder="Votre prénom"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="signup-lastName">Nom</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="signup-lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            placeholder="Votre nom"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Type de paiement</Label>
                      <div className="mt-2">
                        <select
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value as 'mensuel' | 'annuel')}
                          className="w-full border rounded-md px-3 py-2"
                        >
                          <option value="mensuel">Mensuel</option>
                          <option value="annuel">Annuel</option>
                        </select>
                        <div className="mt-2 text-sm text-gray-700">
                          Montant à payer : <strong>{formatAmount(billingPeriod === 'mensuel' ? unitMonthly : unitAnnual)}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Votre mot de passe"
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-confirmPassword">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirmer le mot de passe"
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#28A745] hover:bg-green-600"
                    >
                      {isLoading ? 'Inscription...' : 'S\'inscrire'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
