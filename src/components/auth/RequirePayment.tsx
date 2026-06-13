import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

type SubscriptionStatus = {
  status: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'SUSPENDED' | 'GRACE_PERIOD' | 'NONE';
  message?: string | null;
  next_billing_date?: string | null;
  plan_name?: string | null;
};

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');
  const res = await fetch(`${API_BASE}/api/auth/subscription-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading, isError } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status'],
    queryFn: fetchSubscriptionStatus,
    enabled: !!user && !!localStorage.getItem('token'),
    staleTime: 60_000,
    retry: 1,
  });

  if (authLoading || (user && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-[#28A745]/20 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-[#28A745] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 animate-pulse">Vérification de votre abonnement…</p>
        </div>
      </div>
    );
  }

  // Fail open on API error — ne pas bloquer les utilisateurs sur une erreur réseau
  if (isError || !data) return <>{children}</>;

  const { status } = data;

  if (status === 'ACTIVE' || status === 'GRACE_PERIOD' || status === 'NONE') return <>{children}</>;
  if (status === 'PENDING_PAYMENT') return <Navigate to="/pending-validation" replace />;
  if (status === 'EXPIRED') return <Navigate to="/renouveler" replace />;
  if (status === 'SUSPENDED') return <Navigate to="/compte-suspendu" replace />;

  return <>{children}</>;
};

/**
 * Protège les routes qui nécessitent un abonnement actif.
 * - Non connecté → /auth
 * - Connecté sans plan payé (ou plan gratuit) → /upgrade
 * - Compte désactivé → /upgrade
 * - Utilisateurs Business (BUSINESS_ADMIN / BUSINESS_MEMBER) → accès direct, leur espace est /business/*
 * - Sinon → rendu normal
 */
export const RequirePayment = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const { currentPlan, isFreePlan, loading: planLoading } = usePlan();

  if (authLoading || (user && planLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#28A745] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Les utilisateurs Business ont leur propre espace — ne pas les bloquer ici
  const role = (profile?.role || '').toString().toLowerCase();
  if (role === 'business_admin') return <Navigate to="/business/dashboard" replace />;
  if (role === 'business_member') return <Navigate to="/business/member" replace />;

  // Fallback: plan-based detection for users whose role hasn't been updated yet by admin
  const planSlug = (currentPlan?.slug || '').toString().toLowerCase();
  if (!planLoading && currentPlan && planSlug.includes('business')) {
    return <Navigate to="/business/dashboard" replace />;
  }

  // Compte désactivé (paiement en attente de validation admin)
  if (profile?.is_active === false || profile?.is_active === 0) {
    return <Navigate to="/upgrade" replace />;
  }

  // Pas de plan ou plan gratuit → page de choix d'abonnement
  if (!currentPlan || isFreePlan) {
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
};
