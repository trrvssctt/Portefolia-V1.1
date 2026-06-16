
import React from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, FolderOpen, CreditCard, BarChart3, ChevronDown, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface DashboardNavProps {
  onSignOut: () => void;
  profile: any;
}

export const DashboardNav = ({ onSignOut, profile }: DashboardNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFreePlan } = usePlan();

  const navigationItems = [
    {
      title: "Tableau de bord",
      path: "/dashboard",
      icon: BarChart3,
    },
    {
      title: "Mes Portfolios",
      path: "/dashboard/portfolios",
      icon: FolderOpen,
    },
    {
      title: "Formules",
      path: "/upgrade",
      icon: CreditCard,
    },
    {
      title: "Cartes NFC",
      path: "/dashboard/nfc-cards",
      icon: CreditCard,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div
              className="text-2xl font-bold text-[#2E7D32] cursor-pointer"
              onClick={() => navigate('/')}
            >
                <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="h-12 w-auto object-contain" />
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-1">
              {navigationItems.filter(it => !(it.paidOnly && isFreePlan)).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={`desktop-${item.path}`}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 ${
                      isActive(item.path) 
                        ? "bg-[#2E7D32] hover:bg-[#1B5E20] text-white" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-2 min-h-[44px] hover:bg-gray-100 transition-colors outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[#2E7D32] text-white text-xs font-bold">
                      {profile?.prenom?.[0]?.toUpperCase() || profile?.nom?.[0]?.toUpperCase() || <User size={14} />}
                    </AvatarFallback>
                  </Avatar>
                  {/* Email always visible on md+, truncated */}
                  <div className="hidden md:flex flex-col items-start max-w-[180px]">
                    {(profile?.prenom || profile?.nom) && (
                      <span className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-full">
                        {[profile?.prenom, profile?.nom].filter(Boolean).join(' ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 leading-tight truncate max-w-full">
                      {profile?.email || '—'}
                    </span>
                  </div>
                  <ChevronDown size={14} className="hidden md:block text-gray-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                {/* Identity header */}
                <DropdownMenuLabel className="flex flex-col gap-0.5 py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {[profile?.prenom, profile?.nom].filter(Boolean).join(' ') || 'Utilisateur'}
                  </span>
                  <span className="text-xs font-normal text-gray-500 break-all">
                    {profile?.email || '—'}
                  </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/paiements')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Mes paiements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres du compte
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-100">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {navigationItems.filter(it => !(it.paidOnly && isFreePlan)).map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={`mobile-${item.path}`}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-1 whitespace-nowrap ${
                    isActive(item.path)
                      ? "bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                      : "text-gray-600"
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-xs">{item.title}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
