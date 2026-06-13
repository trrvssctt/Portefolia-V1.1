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
  Check,
} from "lucide-react";

type Plan = {
  id: number | string;
  name: string;
  description?: string;
  subtitle?: string;
  price?: number;
  price_cents?: number;
  price_monthly_cents?: number;
  price_annual_cents?: number;
  original_price?: number;
  currency?: string;
  slug?: string;
  billing_interval?: string;
  features?: string[];
  is_active?: boolean | number;
  is_public?: boolean | number;
};

function PlansGrid(): JSX.Element {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
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
        // Safety filter: only display active & public plans (backend already filters, this is a safeguard)
        raw = raw.filter(p => p.is_active !== false && p.is_active !== 0 && p.is_public !== false && p.is_public !== 0);
        setPlans(raw);
      })
      .catch((err) => {
        console.error("Failed to load plans", err);
        setError("Impossible de charger les formules");
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, []);

  const getAmountCents = (p: Plan): number => {
    if (annual && p.price_annual_cents) return Math.round(p.price_annual_cents / 12);
    return p.price_monthly_cents ?? p.price_cents ?? p.price ?? 0;
  };

  const formatAmount = (cents: number): string =>
    Number(cents).toLocaleString('fr-FR');

  const hasAnnualOption = plans.some(p => p.price_annual_cents && p.price_annual_cents > 0);

  if (loading)
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="w-10 h-10 border-4 border-[#28A745]/30 border-t-[#28A745] rounded-full animate-spin" />
        <p className="text-gray-500">Chargement des formules…</p>
      </div>
    );
  if (error)
    return <div className="text-center py-12 text-red-500 font-medium">{error}</div>;
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-6">Aucune formule disponible pour le moment.</p>
        <Button onClick={() => navigate("/auth")} className="bg-[#28A745] hover:bg-green-700 text-white">
          Créer mon compte
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Toggle mensuel / annuel */}
      {hasAnnualOption && (
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium transition-colors ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>
            Mensuel
          </span>
          <button
            type="button"
            onClick={() => setAnnual(v => !v)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${annual ? 'bg-[#28A745]' : 'bg-gray-300'}`}
            aria-label="Basculer facturation annuelle"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${annual ? 'translate-x-8' : 'translate-x-1'}`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
            Annuel
            <span className="ml-2 inline-block bg-green-100 text-[#28A745] text-xs font-bold px-2 py-0.5 rounded-full">
              −20%
            </span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {plans.map((p) => {
          const isPopular = p.name?.toLowerCase().includes('professionnel') ||
            p.slug?.toLowerCase().includes('professionnel');
          const amountCents = getAmountCents(p);
          const isFree = amountCents === 0;
          const currency = p.currency === 'FCFA' ? 'F CFA' : (p.currency || 'F CFA');

          return (
            <div
              key={String(p.id)}
              className={`
                relative flex flex-col rounded-3xl border transition-all duration-300
                ${isPopular
                  ? 'border-[#28A745] shadow-2xl ring-2 ring-[#28A745]/30 -translate-y-2 bg-white'
                  : 'border-gray-200 bg-white shadow-md hover:shadow-xl hover:-translate-y-1'}
              `}
            >
              {/* Badge "Populaire" */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#28A745] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-white" />
                    Le plus populaire
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`pt-10 pb-6 px-8 text-center rounded-t-3xl ${isPopular ? 'bg-gradient-to-b from-green-50 to-white' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">{p.name}</h3>
                {p.subtitle && (
                  <p className="mt-1 text-sm text-gray-500">{p.subtitle}</p>
                )}

                {/* Prix */}
                <div className="mt-6">
                  {isFree ? (
                    <div>
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-6xl font-extrabold text-gray-900">0</span>
                        <span className="text-xl text-gray-500 mb-2">{currency}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Gratuit pour toujours</p>
                    </div>
                  ) : (
                    <div>
                      {p.original_price && (
                        <p className="text-sm text-gray-400 line-through mb-1">
                          {formatAmount(p.original_price)} {currency}
                        </p>
                      )}
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-6xl font-extrabold text-gray-900">
                          {formatAmount(amountCents)}
                        </span>
                        <span className="text-lg text-gray-500 mb-2">{currency}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        par mois{annual && p.price_annual_cents ? ', facturé annuellement' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="mx-8 border-t border-gray-100" />

              {/* Features */}
              <div className="flex-1 px-8 py-6">
                {p.description && (
                  <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">{p.description}</p>
                )}
                <ul className="space-y-3">
                  {(p.features && p.features.length > 0) ? p.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isPopular ? 'bg-[#28A745]/10' : 'bg-gray-100'}`}>
                        <Check className={`w-3 h-3 font-bold ${isPopular ? 'text-[#28A745]' : 'text-gray-600'}`} />
                      </span>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  )) : (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-gray-600" />
                        </span>
                        <span className="text-sm text-gray-700">Portfolio professionnel</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-gray-600" />
                        </span>
                        <span className="text-sm text-gray-700">Support par email</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* CTA */}
              <div className="px-8 pb-8">
                <Button
                  type="button"
                  size="lg"
                  className={`
                    w-full rounded-xl font-semibold text-base py-5 transition-all duration-200
                    ${isPopular
                      ? 'bg-[#28A745] hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                      : isFree
                      ? 'bg-gray-900 hover:bg-gray-800 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'}
                  `}
                  onClick={() => navigate(`/auth?plan=${p.slug || p.id}`)}
                >
                  {isFree ? "Commencer gratuitement" : isPopular ? "Choisir ce plan" : "Sélectionner"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
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
                <div className="w-16 md:w-24 h-10 md:h-12 rounded-lg overflow-hidden flex-shrink-0 transition-transform transform group-hover:scale-105">
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
                  <div className="w-16 md:w-20 h-8 md:h-10 rounded-lg overflow-hidden flex-shrink-0">
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