import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Users, Briefcase, CreditCard, FileText,
  TrendingUp, UserCog, ShoppingBag, BarChart3,
  Shield, LogOut, Menu, X, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/users-admin', label: 'Administrateurs', icon: UserCog },
    { path: '/admin/users', label: 'Utilisateurs', icon: Users },
    { path: '/admin/portfolios', label: 'Portfolios', icon: Briefcase },
    { path: '/admin/paiements', label: 'Paiements', icon: CreditCard },
    { path: '/admin/invoices', label: 'Factures', icon: FileText },
    { path: '/admin/cartes', label: 'Cartes NFC', icon: CreditCard },
    { path: '/admin/plans', label: 'Plans', icon: ShoppingBag },
    { path: '/admin/upgrades', label: 'Upgrades', icon: TrendingUp },
    { path: '/admin/stats', label: 'Statistiques', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se déconnecter',
        variant: 'destructive',
      });
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <img
                src="/lovable-uploads/logo_portefolia_remove_bg.png"
                alt="Portefolia Admin"
                className="h-8 w-auto"
              />
              <div className="hidden md:block">
                <span className="text-lg font-semibold text-gray-900">Portefolia</span>
                <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Navigation
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-2 ${isActive(item.path) ? 'bg-blue-50 text-blue-700' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4 ml-4">
              <div className="text-sm text-gray-600 border-r pr-4">
                <span className="font-medium">Connecté:</span>{' '}
                {profile?.email || profile?.name || 'Admin'}
              </div>
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex flex-col items-start">
                  <span className="font-medium">{profile?.name || 'Administrateur'}</span>
                  <span className="text-sm text-gray-500">{profile?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-3">
            <div className="mb-4 pb-3 border-b">
              <div className="text-sm font-medium text-gray-900">
                {profile?.name || 'Administrateur'}
              </div>
              <div className="text-sm text-gray-500">{profile?.email}</div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 mt-4"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;