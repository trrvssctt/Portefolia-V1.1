import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInAdmin, loadProfile } from '@/utils/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reloadProfile } = useAuth();

  // Vérifier le verrouillage au chargement
  useEffect(() => {
    const lockTime = localStorage.getItem('adminLockUntil');
    if (lockTime) {
      const lockUntilTime = parseInt(lockTime, 10);
      if (Date.now() < lockUntilTime) {
        setIsLocked(true);
        setLockUntil(lockUntilTime);
      } else {
        localStorage.removeItem('adminLockUntil');
        localStorage.removeItem('adminAttempts');
      }
    }
  }, []);

  // Mettre à jour le compte à rebours
  useEffect(() => {
    if (!isLocked || !lockUntil) return;

    const interval = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setIsLocked(false);
        setLockUntil(null);
        setAttempts(0);
        localStorage.removeItem('adminLockUntil');
        localStorage.removeItem('adminAttempts');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockUntil]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!form.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Format d'email invalide";
    }
    
    if (!form.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (form.password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
    // Effacer l'erreur quand l'utilisateur commence à taper
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked && lockUntil) {
      const remainingTime = Math.ceil((lockUntil - Date.now()) / 1000 / 60);
      toast({
        title: 'Compte verrouillé',
        description: `Trop de tentatives. Réessayez dans ${remainingTime} minute(s)`,
        variant: 'destructive'
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await signInAdmin(form.email, form.password);
      
      if (res.error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        // Verrouiller après 5 tentatives échouées
        if (newAttempts >= 5) {
          const lockTime = Date.now() + 15 * 60 * 1000; // 15 minutes
          setIsLocked(true);
          setLockUntil(lockTime);
          localStorage.setItem('adminLockUntil', lockTime.toString());
          localStorage.setItem('adminAttempts', '5');
          
          toast({
            title: 'Compte verrouillé',
            description: 'Trop de tentatives échouées. Réessayez dans 15 minutes.',
            variant: 'destructive',
            duration: 5000
          });
        } else {
          localStorage.setItem('adminAttempts', newAttempts.toString());
          
          toast({
            title: 'Échec de connexion',
            description: res.error.message || 'Identifiants incorrects',
            variant: 'destructive'
          });
        }
        setLoading(false);
        return;
      }

      const token = res.token;
      if (!token) {
        toast({
          title: 'Erreur',
          description: 'Aucun token reçu du serveur',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Validate token and fetch admin profile to ensure account active
      let isAdmin = false;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const roleStr = (payload.role || payload.token_type || '').toString().toLowerCase();
          isAdmin = roleStr.includes('admin') || roleStr === 'super_admin';
          
          // Vérifier l'expiration du token
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            toast({
              title: 'Token expiré',
              description: 'Votre session a expiré. Veuillez vous reconnecter.',
              variant: 'destructive'
            });
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Erreur lors du décodage du token:', e);
      }

      // Fallback réseau si nécessaire
      if (!isAdmin) {
        try {
          const profile = await loadProfile(token);
          const roleStr = (profile?.role || profile?.token_type || '').toString().toLowerCase();
          isAdmin = roleStr.includes('admin') || roleStr === 'super_admin';
          // Deny access if admin account is inactive
          if (profile && typeof profile.is_active !== 'undefined' && profile.is_active === 0) {
            toast({ title: 'Accès refusé', description: 'Compte administrateur inactif. Contactez le super-admin.', variant: 'destructive' });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error);
        }
      }

      // If token decoded as admin but we still want to ensure account active, try loading profile
      if (isAdmin) {
        try {
          const profile = await loadProfile(token);
          if (profile && typeof profile.is_active !== 'undefined' && profile.is_active === 0) {
            toast({ title: 'Accès refusé', description: 'Compte administrateur inactif. Contactez le super-admin.', variant: 'destructive' });
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore; allow login to proceed if profile cannot be loaded, backend already enforces active
        }
      }

      if (!isAdmin) {
        toast({
          title: 'Accès refusé',
          description: 'Ce compte ne dispose pas des privilèges administrateur',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Réinitialiser les tentatives en cas de succès
      localStorage.removeItem('adminAttempts');
      localStorage.removeItem('adminLockUntil');
      setAttempts(0);
      setIsLocked(false);

      toast({
        title: '✅ Connexion réussie',
        description: 'Accès administrateur autorisé',
        duration: 3000
      });

      // Initialiser le contexte d'authentification
      try {
        if (reloadProfile) {
          await reloadProfile();
        }
        
        // Petit délai pour une meilleure UX
        setTimeout(() => {
          navigate('/admin/dashboard', { replace: true });
        }, 500);
      } catch (e) {
        console.error('Erreur lors du chargement du profil:', e);
        // Fallback vers le rechargement complet
        window.location.assign('/admin/dashboard');
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      toast({
        title: 'Erreur inattendue',
        description: 'Veuillez réessayer ou contacter le support',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = () => {
    if (!lockUntil) return 0;
    return Math.ceil((lockUntil - Date.now()) / 1000 / 60);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#28A745]/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/lovable-uploads/logo_portefolia_remove_bg.png')] opacity-[0.02] bg-center bg-no-repeat bg-[length:600px_600px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo et retour au site */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au site principal
          </Link>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src="/lovable-uploads/logo_portefolia_remove_bg.png"
              alt="Portefolia"
              className="h-16 mx-auto object-contain mb-4 drop-shadow-lg brightness-200 invert"
            />
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-[#28A745]" />
              <span className="text-sm font-semibold text-[#28A745] bg-[#28A745]/10 border border-[#28A745]/20 px-3 py-1 rounded-full">
                Espace Administrateur
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-0 shadow-2xl shadow-black/40 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-4 bg-gradient-to-b from-slate-50/80 to-transparent">
              <CardTitle className="text-xl text-center font-semibold text-gray-900">
                Connexion Administrateur
              </CardTitle>
              <CardDescription className="text-center text-sm text-gray-500">
                Accès réservé au personnel autorisé
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <AnimatePresence>
                {isLocked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <AlertDescription className="text-red-800">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>
                            Trop de tentatives échouées. Réessayez dans {getRemainingTime()} minute(s).
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {attempts > 0 && !isLocked && (
                <Alert className="mb-4 border-amber-200 bg-amber-50">
                  <AlertDescription className="text-amber-800">
                    {5 - attempts} tentatives restantes avant verrouillage
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-sm font-medium">
                    Email administrateur
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="admin@portefolia.tech"
                      className={`pl-10 ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
                      required
                      disabled={loading || isLocked}
                    />
                  </div>
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="admin-password" className="text-sm font-medium">
                      Mot de passe
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      disabled={loading || isLocked}
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-300 focus:ring-red-200' : ''}`}
                      required
                      disabled={loading || isLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      disabled={loading || isLocked}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#28A745] hover:bg-[#218838] text-white shadow-md shadow-green-200/50 hover:shadow-lg transition-all duration-200 font-semibold rounded-xl"
                    disabled={loading || isLocked}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs text-center text-gray-400">
                  Problème d'accès ?{' '}
                  <a
                    href="mailto:support@portefolia.tech"
                    className="text-[#28A745] hover:text-[#218838] font-medium"
                  >
                    Contactez le support
                  </a>
                </p>
                <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Accès strictement réservé aux administrateurs
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-slate-500">
          © 2025 <span className="text-[#28A745] font-medium">Portefolia</span> — Panel d'administration
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;