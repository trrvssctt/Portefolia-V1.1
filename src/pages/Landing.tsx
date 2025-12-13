import React, { useEffect, useState } from "react";
import { fetchJson } from '@/lib/api';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Smartphone,
  Users,
  Zap,
  Shield,
  QrCode,
  Globe,
  Star,
} from "lucide-react";

import { Sparkles, Check } from "lucide-react";

type Plan = {
  id: number | string;
  name: string;
  description?: string;
  subtitle?: string;
  price?: number;
  price_cents?: number;
  price_monthly_cents?: number;
  price_annual_cents?: number;
  currency?: string;
  slug?: string;
};

function PlansGrid(): JSX.Element {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchJson('/plans')
      .then((data) => {
        if (!mounted) return;
        let raw: Plan[] = [];
        if (Array.isArray(data)) raw = data as Plan[];
        else if (data && Array.isArray((data as any).plans)) raw = (data as any).plans as Plan[];
        else raw = [];

        // Keep only monthly plans: explicit monthly billing or a monthly price field
        const monthly = raw.filter((p) => {
          const interval = (p.billing_interval || '').toString().toLowerCase();
          const hasMonthlyPrice = p.price_monthly_cents !== undefined && p.price_monthly_cents !== null;
          return interval === 'monthly' || interval === 'month' || hasMonthlyPrice;
        });

        setPlans(monthly);
      })
      .catch((err) => {
        console.error("Failed to load plans", err);
        setError("Impossible de charger les formules");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const formatPrice = (p: Plan) => {
    const currency = p.currency || "FCFA";
    // Display monthly price only. Prefer explicit monthly field if present.
    const monthly = p.price_monthly_cents ?? p.price_cents ?? p.price ?? 0;
    const amount = Number(monthly).toLocaleString('fr-FR');
    const cur = currency === 'FCFA' ? 'F CFA' : currency;
    return `${amount} ${cur} par mois`;
  };

  if (loading)
    return <div className="text-center py-12">Chargement des formules...</div>;
  if (error)
    return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune formule disponible pour le moment.</p>
        <div className="mt-6">
          <Button onClick={() => navigate("/auth")}>Créer mon compte</Button>
        </div>
      </div>
    );
  }

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 py-12">
    {plans.map((p, index) => {
      const isPopular = (p.name?.toLowerCase().includes('professionnel') || 
                        p.slug?.toLowerCase().includes('professionnel'));
      const isFree = (p.price_monthly_cents ?? p.price_cents ?? p.price ?? 0) === 0;

      return (
        <Card
          key={String(p.id)}
          className={`
            relative flex flex-col overflow-hidden rounded-3xl border 
            ${isPopular 
              ? 'border-2 border-amber-500 shadow-2xl scale-105 lg:scale-110 z-10' 
              : 'border-gray-200 shadow-lg hover:shadow-2xl'}
            bg-white transition-all duration-500 hover:-translate-y-3
          `}
        >
          <CardHeader className="pt-6 pb-6 text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {p.name}
            </CardTitle>
            {p.subtitle && (
              <CardDescription className="mt-2 text-base text-gray-600">
                {p.subtitle}
              </CardDescription>
            )}
            {/* Ribbon-style badge under the plan name for better visibility */}
            {isPopular && (
              <div className="mt-4 flex justify-center">
                <div className="relative">
                  <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white px-8 py-2 rounded-full text-sm font-extrabold shadow-2xl transform -skew-x-6">
                    <span className="block skew-x-6">Meilleure vente</span>
                  </div>
                  {/* small triangle/point to give scarf effect */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-orange-500"></div>
                </div>
              </div>
            )}
            
            {/* Prix */}
            <div className="mt-6 flex flex-col items-center">
              {p.original_price && (
                <span className="text-lg text-gray-400 line-through mb-1">
                  {formatPrice({ ...p, price_monthly_cents: p.original_price })}
                </span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-gray-900">
                  {isFree ? '0' : formatPrice(p).replace('/mois', '').trim()}
                </span>
                {!isFree && <span className="text-xl text-gray-600"> FCFA/mois</span>}
              </div>
              {isFree && <span className="text-xl text-gray-600 mt-2">Gratuit pour toujours</span>}
            </div>
          </CardHeader>

          <CardContent className="flex-1 px-8">
            <p className="text-center text-gray-700 mb-8 min-h-[80px]">
              {p.description || "Aucune description disponible"}
            </p>

            {/* Liste des fonctionnalités (à adapter selon tes données) */}
            <ul className="space-y-4">
              {p.features?.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              )) || (
                <>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Fonctionnalité de base</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Support par email</span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>

          <div className="p-8 pt-6">
            <Button
              type="button"
              size="lg"
              className={`
                w-full rounded-xl font-bold text-lg py-6 transition-all duration-300
                ${isPopular
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl'
                  : isFree
                  ? 'bg-[#28A745] hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
              onClick={() => navigate(`/auth?plan=${p.slug || p.id}`)}
            >
              {isFree 
                ? "Commencer gratuitement" 
                : isPopular 
                ? "Choisir ce plan 🔥" 
                : `Commander ${formatPrice(p)}`}
            </Button>
          </div>
        </Card>
      );
    })}
  </div>
);
}

const Landing: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-20 h-42 md:w-36 md:h-12 rounded-lg overflow-hidden flex-shrink-0 transition-transform transform group-hover:scale-105">
                  <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="w-full h-full object-contain" />
                </div>
                <span className="hidden md:inline text-xl font-bold text-gray-900 transition-colors group-hover:text-[#28A745]">Portefolia</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/auth"
                className="text-gray-600 hover:text-[#28A745] transition-colors"
              >
                Connexion
              </Link>
              <Link to="/auth">
                <Button className="bg-[#28A745] hover:bg-green-600 text-white">
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Votre carrière. <span className="text-[#28A745]">En un scan.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Créez votre portfolio professionnel moderne et partagez-le instantanément avec une carte NFC. 
            Fini les cartes de visite perdues - votre réseau professionnel à portée de main.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-[#28A745] hover:bg-green-600 text-white px-8 py-3"
              >
                Créer mon portfolio
              </Button>
            </Link>
            <Link to="/nfc-types">
              <Button
                size="lg"
                variant="outline"
                className="border-[#28A745] text-[#28A745] hover:bg-green-50"
              >
                Créer une carte de visite NFC
              </Button>
            </Link>
          </div>
        </div>

        {/* Image carte NFC avec hover */}
        <div className="mt-16 flex justify-center">
          <div
            className={`relative transition-transform duration-500 ${
              isHovered ? "scale-105" : ""
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <img
              src="/lovable-uploads/2b1c44cd-67a7-47d6-92cf-41cc5e91e724.png"
              alt="Cartes NFC Portefolia"
              className="w-full max-w-2xl h-auto rounded-2xl shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir Portefolia ?
            </h2>
            <p className="text-xl text-gray-600">
              La solution complète pour moderniser votre networking professionnel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>NFC Instantané</CardTitle>
                <CardDescription>
                  Un simple scan et votre portfolio s'affiche. Plus de cartes perdues ou de contacts mal orthographiés.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>Portfolio Dynamique</CardTitle>
                <CardDescription>
                  Showcase complet avec projets, expériences, compétences et informations de contact actualisés en temps réel.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>Networking Efficace</CardTitle>
                <CardDescription>
                  Permettez aux contacts de sauvegarder automatiquement vos informations dans leur téléphone.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>Analytics Avancées</CardTitle>
                <CardDescription>
                  Suivez vos interactions, scans de carte et visualisations de portfolio en temps réel.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>Sécurisé & Privé</CardTitle>
                <CardDescription>
                  Contrôlez qui voit quoi avec des paramètres de confidentialité granulaires et une sécurité renforcée.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-green-100 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="text-[#28A745]" size={24} />
                </div>
                <CardTitle>Multi-Plateformes</CardTitle>
                <CardDescription>
                  Compatible tous appareils. QR code de secours si NFC indisponible. Toujours accessible.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24 bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Choisissez votre formule
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Des solutions adaptées à chaque étape de votre carrière
            </p>
          </div>
          <PlansGrid />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#28A745] py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à révolutionner votre networking ?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Rejoignez des milliers de professionnels qui ont déjà modernisé leur façon de networker.
          </p>
          <Link to="/auth?plan=gratuit">
            <Button
              size="lg"
              className="bg-white text-[#28A745] hover:bg-gray-100 px-8 py-3"
            >
              Créer mon compte gratuitement
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Link to="/" className="flex items-center gap-3">
                  <div className="w-20 h-42 md:w-30 md:h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="w-full h-full object-contain" />
                  </div>
                  <span className="hidden md:inline text-xl font-bold">Portefolia</span>
                </Link>
              </div>
              <p className="text-gray-400">
                La nouvelle génération de cartes de visite professionnelles.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white">Tarifs</a></li>
                <li><a href="#" className="hover:text-white">Demo</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">À propos</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carrières</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Portefolia. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;