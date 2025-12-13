// src/pages/TemplatesAdminLogin.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Mail, Shield, ArrowLeft, LogIn } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

const TemplatesAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Read as text first to handle non-JSON responses (HTML error pages)
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_err) {
        data = null;
      }

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || text || 'Identifiants incorrects';
        throw new Error(msg);
      }

      if (data && data.token) {
        localStorage.setItem('templates_admin_token', data.token);
        // Petit délai pour l’animation puis redirection vers l'application Template-Portfolio
        setTimeout(() => {
          // Redirect to the Template-Portfolio app index (same origin)
          window.location.href = '/Tempate-Portefolio';
        }, 600);
      } else {
        throw new Error('Réponse inattendue du serveur');
      }
    } catch (err: any) {
      const message = err?.message || 'Erreur de connexion. Veuillez réessayer.';
      setError(message);
      console.error('Login error:', message, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center px-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#28A745]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Carte principale avec effet glassmorphism */}
        <Card className="backdrop-blur-xl bg-white/95 border-2 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="space-y-6 pb-8 pt-10 text-center bg-gradient-to-b from-[#28A745]/5 to-transparent">
            {/* Logo + Badge Admin */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#28A745] to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900">
                  Administration Templates
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Espace réservé aux administrateurs
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-red-100 text-red-700 font-semibold px-4 py-1">
                <Shield className="w-4 h-4 mr-1" />
                Accès sécurisé
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={submit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@votre-domaine.com"
                  className="h-12 text-base border-gray-300 focus:border-[#28A745] focus:ring-[#28A745]"
                  disabled={loading}
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="h-12 text-base border-gray-300 focus:border-[#28A745] focus:ring-[#28A745]"
                  disabled={loading}
                />
              </div>

              {/* Erreur */}
              {error && (
                <Alert variant="destructive" className="py-3">
                  <AlertDescription className="text-sm font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Bouton Connexion */}
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-14 text-lg font-bold bg-[#28A745] hover:bg-[#218838] text-white shadow-lg transition-all duration-200 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Se connecter
                  </>
                )}
              </Button>

              {/* Liens utiles */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600 pt-4 border-t border-gray-100">
                <a
                  href="/"
                  className="flex items-center gap-2 hover:text-[#28A745] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour au site
                </a>
                <button
                  type="button"
                  disabled
                  className="text-gray-400 cursor-not-allowed"
                  title="Contactez le support si vous avez perdu vos accès"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer discret */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            © 2025 <span className="font-semibold text-[#28A745]">Portefolia</span> • Administration Templates
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesAdminLogin;