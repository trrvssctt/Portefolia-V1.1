
import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PortfolioFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="w-8 h-8 object-cover" />
              </div>
              <span className="text-xl font-bold">Portofolia</span>
            </div>
            <p className="text-gray-400 text-sm">
              La nouvelle génération de cartes de visite professionnelles.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h3 className="font-semibold mb-4">Produit</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Fonctionnalités</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Tarifs</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Demo</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/" className="hover:text-[#28A745] transition-colors">FAQ</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Contact</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Documentation</a></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h3 className="font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="/" className="hover:text-[#28A745] transition-colors">À propos</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Blog</a></li>
              <li><a href="/" className="hover:text-[#28A745] transition-colors">Carrières</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 Portofolia. Tous droits réservés.
          </p>
          
          <div className="flex gap-4">
            <Button 
              asChild
              size="sm"
              className="bg-[#28A745] hover:bg-green-600 text-white"
            >
              <a 
                href="/" 
                className="flex items-center gap-2"
              >
                Créer mon portfolio
                <ExternalLink size={14} />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};
