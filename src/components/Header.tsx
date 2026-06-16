import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { label: 'Fonctionnalités', to: '/' },
  { label: 'Tarifs',          to: '/upgrade' },
  { label: 'Documentation',   to: '/docs' },
  { label: 'À propos',        to: '/apropos' },
  { label: 'Contact',         to: '/contact' },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img
            src="/lovable-uploads/logo_portefolia_remove_bg.png"
            alt="Portefolia"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`h-9 px-3.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? 'text-[#2E7D32] bg-[#E8F5E9]'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA — auth-aware */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button
              className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white h-9 px-4 text-sm rounded-lg"
              onClick={() => navigate('/dashboard')}
            >
              Mon espace
            </Button>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 h-9 flex items-center transition-colors"
              >
                Se connecter
              </Link>
              <Link to="/auth">
                <Button className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white h-9 px-4 text-sm rounded-lg">
                  Commencer
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-[#2E7D32] bg-[#E8F5E9]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              {user ? (
                <Button
                  className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-lg"
                  onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
                >
                  Mon espace
                </Button>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full border-[#2E7D32] text-[#2E7D32] hover:bg-[#E8F5E9] rounded-lg">
                      Se connecter
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-lg">
                      Commencer
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
