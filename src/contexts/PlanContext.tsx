import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

type Plan = any;

interface PlanContextValue {
  plans: Plan[];
  currentPlan: Plan | null;
  isFreePlan: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPlans([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        setPlans([]);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setPlans(json.plans || []);
    } catch (err) {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch plans when auth user changes
    if (user) {
      fetchPlans();
    } else {
      setPlans([]);
    }
  }, [user]);

  const currentPlan = plans.length > 0 ? plans[0] : null;
  const isFreePlan = !!(currentPlan && (Number(currentPlan.price_cents || 0) === 0 || (currentPlan.slug && String(currentPlan.slug).toLowerCase() === 'gratuit')));

  return (
    <PlanContext.Provider value={{ plans, currentPlan, isFreePlan, loading, refresh: fetchPlans }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within a PlanProvider');
  return ctx;
};

export default PlanContext;
