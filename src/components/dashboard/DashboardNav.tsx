
import React from 'react';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, FolderOpen, CreditCard, BarChart3 } from "lucide-react";
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
    // Cartes NFC is only available for paid plans; filter at render time
    {
      title: "Cartes NFC",
      path: "/dashboard/nfc-cards",
      icon: CreditCard,
      paidOnly: true,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div
              className="text-2xl font-bold text-[#28A745] cursor-pointer"
              onClick={() => navigate('/')}
            >
                <img src="/lovable-uploads/logo_portefolia_remove_bg.png" alt="Portefolia" className="w-25 h-25 object-cover" />
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex space-x-1">
              {navigationItems.filter(it => !(it.paidOnly && isFreePlan)).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 ${
                      isActive(item.path) 
                        ? "bg-[#28A745] hover:bg-green-600 text-white" 
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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#28A745] text-white">
                  <User size={16} />
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t px-4 py-2">
        <div className="flex space-x-1 overflow-x-auto">
          {navigationItems.filter(it => !(it.paidOnly && isFreePlan)).map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1 whitespace-nowrap ${
                  isActive(item.path) 
                    ? "bg-[#28A745] hover:bg-green-600 text-white" 
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
    </nav>
  );
};
