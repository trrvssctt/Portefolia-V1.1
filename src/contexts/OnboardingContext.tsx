import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { API_BASE } from '@/lib/api';
import { TOURS, TourDef, TourKey } from '@/onboarding/tours';

export type TourStatus = 'in_progress' | 'completed' | 'skipped';

interface TourRecord {
  tour_key: string;
  status: TourStatus;
  current_step: number;
  current_step_id: string | null;
}

interface OnboardingContextValue {
  /** Visite correspondant au plan / rôle de l'utilisateur (null tant que non déterminée) */
  tour: TourDef | null;
  /** Progression enregistrée (null = jamais commencée) */
  record: TourRecord | null;
  ready: boolean;
  active: boolean;
  stepIndex: number;
  /** Étape à laquelle la visite reprendra */
  resumeIndex: number;
  /** Lance la visite : reprend là où l'utilisateur s'était arrêté, sauf si restart */
  start: (opts?: { restart?: boolean }) => void;
  next: () => void;
  prev: () => void;
  /** Ferme la visite en gardant l'étape courante */
  pause: () => void;
  finish: () => void;
  /** « Ne plus me proposer » */
  skip: () => void;
  /** Masque les invitations (bienvenue / reprise) jusqu'à la fin de la session */
  dismissForSession: () => void;
  dismissedForSession: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const sessionKey = (userId: string, tourKey: string) => `onboarding_dismissed_${userId}_${tourKey}`;

function readSession(key: string) {
  try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentPlan, isFreePlan, loading: planLoading } = usePlan();
  const { isBusinessAdmin, isBusinessMember, loading: businessLoading } = useBusiness();

  const userId = user?.id != null ? String(user.id) : null;

  const [records, setRecords] = useState<TourRecord[] | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  const tourKey: TourKey | null = useMemo(() => {
    if (!userId || planLoading || businessLoading) return null;
    if (isBusinessAdmin) return 'business_admin';
    if (isBusinessMember) return 'business_member';
    if (isFreePlan || !currentPlan) return 'personal_free';
    // Même détection que la page Analytics : un plan payant non reconnu est traité comme Starter
    const slug = String(currentPlan.slug || '').toLowerCase();
    if (['pro', 'professionnel', 'professional', 'premium', 'business', 'enterprise'].some(k => slug.includes(k))) return 'personal_pro';
    return 'personal_starter';
  }, [userId, planLoading, businessLoading, isBusinessAdmin, isBusinessMember, isFreePlan, currentPlan]);

  const tour = tourKey ? TOURS[tourKey] : null;
  const record = useMemo(
    () => (records && tourKey ? records.find(r => r.tour_key === tourKey) || null : null),
    [records, tourKey],
  );

  // Chargement de la progression à la connexion
  useEffect(() => {
    setRecords(null);
    setActive(false);
    if (!userId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    fetch(`${API_BASE}/onboarding`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : { tours: [] }))
      .then(json => { if (!cancelled) setRecords(json.tours || []); })
      .catch(() => { if (!cancelled) setRecords([]); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    setDismissedForSession(userId && tourKey ? readSession(sessionKey(userId, tourKey)) : false);
  }, [userId, tourKey]);

  const persist = useCallback((status: TourStatus, index: number) => {
    if (!tour) return;
    const next: TourRecord = {
      tour_key: tour.key,
      status,
      current_step: index,
      current_step_id: tour.steps[index]?.id ?? null,
    };
    // Mise à jour optimiste : l'UI ne dépend pas de la réponse du serveur
    setRecords(prev => [...(prev || []).filter(r => r.tour_key !== tour.key), next]);
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE}/onboarding/${tour.key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, current_step: next.current_step, current_step_id: next.current_step_id }),
    }).catch(() => {});
  }, [tour]);

  const resumeIndex = useMemo(() => {
    if (!tour || !record || record.status !== 'in_progress') return 0;
    const byId = record.current_step_id ? tour.steps.findIndex(s => s.id === record.current_step_id) : -1;
    if (byId >= 0) return byId;
    return Math.min(Math.max(record.current_step || 0, 0), tour.steps.length - 1);
  }, [tour, record]);

  const goTo = useCallback((index: number) => {
    setStepIndex(index);
    persist('in_progress', index);
  }, [persist]);

  const start = useCallback((opts?: { restart?: boolean }) => {
    if (!tour) return;
    const index = opts?.restart || record?.status !== 'in_progress' ? 0 : resumeIndex;
    setActive(true);
    goTo(index);
  }, [tour, record, resumeIndex, goTo]);

  const next = useCallback(() => {
    if (!tour) return;
    if (stepIndex >= tour.steps.length - 1) {
      setActive(false);
      persist('completed', stepIndex);
      return;
    }
    goTo(stepIndex + 1);
  }, [tour, stepIndex, goTo, persist]);

  const prev = useCallback(() => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }, [stepIndex, goTo]);

  const dismissForSession = useCallback(() => {
    setDismissedForSession(true);
    if (userId && tourKey) {
      try { sessionStorage.setItem(sessionKey(userId, tourKey), '1'); } catch { /* stockage indisponible */ }
    }
  }, [userId, tourKey]);

  const pause = useCallback(() => {
    setActive(false);
    // La progression est déjà enregistrée à chaque changement d'étape ;
    // on évite juste de relancer l'invitation de reprise dans la même session.
    dismissForSession();
  }, [dismissForSession]);

  const finish = useCallback(() => {
    setActive(false);
    persist('completed', stepIndex);
  }, [persist, stepIndex]);

  const skip = useCallback(() => {
    setActive(false);
    persist('skipped', record?.status === 'in_progress' ? resumeIndex : 0);
  }, [persist, record, resumeIndex]);

  // Déconnexion : on ferme la visite
  useEffect(() => { if (!userId) setActive(false); }, [userId]);

  const value: OnboardingContextValue = {
    tour,
    record,
    ready: !!tour && records !== null,
    active,
    stepIndex,
    resumeIndex,
    start,
    next,
    prev,
    pause,
    finish,
    skip,
    dismissForSession,
    dismissedForSession,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
};

export default OnboardingContext;
