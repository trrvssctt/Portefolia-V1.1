import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface BusinessAccount {
  id: number;
  company_name: string;
  company_logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
}

interface BusinessMember {
  id: number;
  role: 'admin' | 'member';
  portfolio_limit: number;
  status: string;
}

interface BusinessContextValue {
  account: BusinessAccount | null;
  member: BusinessMember | null;
  isBusinessAdmin: boolean;
  isBusinessMember: boolean;
  isBusinessUser: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

// Decode JWT role without verification (role check only, server still validates)
function getJwtRole(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.role || '').toString().toUpperCase();
  } catch {
    return '';
  }
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentPlan, loading: planLoading } = usePlan();
  const [account, setAccount] = useState<BusinessAccount | null>(null);
  const [member, setMember] = useState<BusinessMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContext = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      setAccount(null);
      setMember(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Priorité : profile.role (après reloadProfile) → JWT décodé (immédiat)
    const profileRole = ((profile as any)?.role || '').toString().toUpperCase();
    const tokenRole = getJwtRole(token);
    const effectiveRole = profileRole || tokenRole;
    const hasBusinessRole = effectiveRole === 'BUSINESS_ADMIN' || effectiveRole === 'BUSINESS_MEMBER';

    const planSlug = (currentPlan?.slug || '').toString().toLowerCase();
    const hasBusinessPlan = !planLoading && currentPlan && planSlug.includes('business');

    if (!hasBusinessRole && !hasBusinessPlan) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/business/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setAccount(null);
        setMember(null);
        setIsAdmin(false);
        return;
      }
      const json = await res.json();
      setAccount(json.account || null);
      setMember(json.member || null);
      setIsAdmin(!!json.is_admin);
    } catch {
      setAccount(null);
      setMember(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, profile, currentPlan, planLoading]);

  useEffect(() => {
    if (!planLoading) fetchContext();
  }, [fetchContext, planLoading]);

  // Rôle effectif : profile (après reload) ou JWT décodé
  const token = localStorage.getItem('token') || '';
  const profileRole = ((profile as any)?.role || '').toString().toUpperCase();
  const tokenRole = getJwtRole(token);
  const effectiveRole = profileRole || tokenRole;

  const isBusinessAdmin = effectiveRole === 'BUSINESS_ADMIN' || (isAdmin && account !== null);
  const isBusinessMember = effectiveRole === 'BUSINESS_MEMBER' || (!isAdmin && member !== null && account !== null);
  const isBusinessUser = isBusinessAdmin || isBusinessMember;

  return (
    <BusinessContext.Provider value={{
      account,
      member,
      isBusinessAdmin,
      isBusinessMember,
      isBusinessUser,
      loading,
      refresh: fetchContext,
    }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
};

export default BusinessContext;
