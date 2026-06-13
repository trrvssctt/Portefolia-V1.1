import { useState, useEffect, useRef } from 'react';

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://backend-v-card.onrender.com');

/** Statuts qui signifient "upgrade validé, reconnexion nécessaire" */
const APPROVED_STATUSES = ['approved', 'confirmed'];

/**
 * Polling du statut d'un checkout.
 *
 * - Interroge /api/checkout/:token/status toutes les 5 s
 * - Après 60 polls (5 min), passe à 30 s pour ne pas spam le serveur
 * - S'arrête automatiquement quand le statut est approuvé
 * - `enabled = false` désactive le polling (ex: Stripe dont on n'a pas besoin)
 */
export function useCheckoutPolling(token: string | null, enabled = true) {
  const [status, setStatus] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const approvedRef = useRef(false);

  useEffect(() => {
    if (!token || !enabled) return;

    const poll = async () => {
      if (approvedRef.current) return;
      try {
        const res = await fetch(`${API_BASE}/api/checkout/${token}/status`);
        if (!res.ok) return;
        const data: { status: string; plan_name: string | null } = await res.json();

        setStatus(data.status);
        if (data.plan_name) setPlanName(data.plan_name);

        if (APPROVED_STATUSES.includes(data.status)) {
          approvedRef.current = true;
          setIsApproved(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // erreur réseau passagère — on continue
      }

      pollCountRef.current += 1;

      // Après 5 min (60 × 5 s), passe à une vérification toutes les 30 s
      if (pollCountRef.current === 60 && intervalRef.current && !approvedRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(poll, 30_000);
      }
    };

    // Première vérification immédiate
    poll();
    intervalRef.current = setInterval(poll, 5_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, enabled]);

  return { status, planName, isApproved };
}
