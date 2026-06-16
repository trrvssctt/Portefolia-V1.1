import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Users, Settings, FolderOpen, User, LogOut, ChevronDown, CreditCard, BarChart3, SlidersHorizontal } from 'lucide-react';

interface BusinessNavProps {
  onSignOut: () => void;
}

const BusinessNav: React.FC<BusinessNavProps> = ({ onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, isBusinessAdmin } = useBusiness();
  const { user } = useAuth();

  const adminItems = [
    { title: 'Tableau de bord', path: '/business/dashboard', icon: LayoutDashboard },
    { title: 'Mes Portfolios', path: '/business/portfolios', icon: FolderOpen },
    { title: 'Analytics', path: '/business/analytics', icon: BarChart3 },
    { title: 'Membres', path: '/business/members', icon: Users },
    { title: 'Paiements', path: '/business/payments', icon: CreditCard },
    { title: 'Personnalisation', path: '/business/settings', icon: Settings },
  ];

  const memberItems = [
    { title: 'Tableau de bord', path: '/business/member', icon: LayoutDashboard },
    { title: 'Mes Portfolios', path: '/business/portfolios', icon: FolderOpen },
    { title: 'Analytics', path: '/business/analytics', icon: BarChart3 },
  ];

  const items = isBusinessAdmin ? adminItems : memberItems;

  const isActive = (path: string) => {
    if (path === '/business/dashboard' || path === '/business/member') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const primaryColor = account?.primary_color || '#1a1a2e';

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo entreprise ou Portefolia */}
          <div className="flex items-center space-x-8">
            <div
              className="cursor-pointer flex items-center gap-2"
              onClick={() => navigate(isBusinessAdmin ? '/business/dashboard' : '/business/member')}
            >
              {account?.company_logo_url ? (
                <img src={account.company_logo_url} alt={account.company_name} className="h-9 w-auto object-contain" />
              ) : (
                <span className="text-lg font-bold" style={{ color: primaryColor }}>
                  {account?.company_name || 'Espace Business'}
                </span>
              )}
            </div>

            {/* Navigation links */}
            <div className="hidden md:flex space-x-1">
              {items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant={active ? 'default' : 'ghost'}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 ${active ? 'text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    style={active ? { backgroundColor: primaryColor } : {}}
                  >
                    <Icon size={16} />
                    <span>{item.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-2 min-h-[44px] hover:bg-gray-100 transition-colors outline-none">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {(user as any)?.prenom?.[0]?.toUpperCase() || (user as any)?.nom?.[0]?.toUpperCase() || <User size={14} />}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown size={14} className="hidden md:block text-gray-400 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                {(user as any)?.email || '—'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/business/profile')}>
                <User className="mr-2 h-4 w-4" /> Mon profil
              </DropdownMenuItem>
              {isBusinessAdmin && (
                <DropdownMenuItem onClick={() => navigate('/dashboard/paiements')}>
                  <CreditCard className="mr-2 h-4 w-4" /> Mes paiements
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Paramètres du compte
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t">
        <div className="px-4 py-2 flex space-x-1 overflow-x-auto">
          {items.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant={active ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1 whitespace-nowrap ${active ? 'text-white' : 'text-gray-600'}`}
                style={active ? { backgroundColor: primaryColor } : {}}
              >
                <Icon size={14} />
                <span className="text-xs">{item.title}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BusinessNav;
