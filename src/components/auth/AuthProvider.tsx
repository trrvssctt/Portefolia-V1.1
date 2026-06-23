
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { loadProfile, signInUser, signUpUser, resetUserPassword, signOutUser, isTokenExpired, getTokenSecondsLeft, silentRefresh } from '@/utils/authUtils';
import { useNavigate } from 'react-router-dom';

const PLATFORM_ADMIN_ROLES = new Set(['admin', 'super_admin', 'moderateur', 'comptable', 'support']);
import { LogoutDialog } from './LogoutDialog';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Ref always points to the latest auto-logout closure (avoids stale captures)
  const autoLogoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const profileData = await loadProfile(token);
        if (profileData) {
          setProfile(profileData);
          setUser({ id: profileData.id, email: profileData.email });
        } else {
          // Token invalid or expired — clear and redirect to login
          localStorage.removeItem('token');
          setProfile(null);
          setUser(null);
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              const roleStr = (payload.role || payload.token_type || '').toString().toLowerCase();
              navigate(PLATFORM_ADMIN_ROLES.has(roleStr) ? '/admin/sama_connection_page' : '/auth');
            } else {
              navigate('/auth');
            }
          } catch (e) {
            navigate('/auth');
          }
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Keep ref in sync with latest state every render
  useEffect(() => {
    autoLogoutRef.current = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const roleStr = (() => {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return (payload.role || payload.token_type || '').toString().toLowerCase();
          }
        } catch { /* ignore */ }
        return '';
      })();
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
      toast({ title: 'Session expirée', description: 'Votre session a expiré. Veuillez vous reconnecter.', variant: 'destructive' });
      navigate(PLATFORM_ADMIN_ROLES.has(roleStr) ? '/admin/sama_connection_page' : '/auth');
    };
  });

  // Interval + visibilitychange : refresh proactif si < 10 min restantes, logout si refresh impossible
  useEffect(() => {
    const checkExpiry = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const secsLeft = getTokenSecondsLeft(token);
      if (secsLeft > 600) return;                       // > 10 min → rien à faire
      // Token expiré ou < 10 min restantes → tenter un refresh silencieux
      const newToken = await silentRefresh();
      if (!newToken) {
        // Refresh impossible (cookie absent ou révoqué) → déconnecter
        if (isTokenExpired(token)) autoLogoutRef.current();
      }
      // Si refresh réussi, le token est déjà mis à jour dans localStorage
    };
    const id = setInterval(checkExpiry, 60_000);        // vérifier toutes les 60 s
    document.addEventListener('visibilitychange', checkExpiry);
    checkExpiry();                                       // vérifier immédiatement au montage
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, []);

  // Intercepteur global fetch : sur 401, tenter un refresh silencieux avant de déconnecter
  useEffect(() => {
    const AUTH_PATHS = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/register', '/sama_connection_page'];
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function (...args) {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const token = localStorage.getItem('token');
        if (token) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '';
          const isAuthEndpoint = AUTH_PATHS.some(p => url.includes(p));
          if (!isAuthEndpoint) {
            // Tenter un refresh silencieux avant de déconnecter
            const newToken = await silentRefresh();
            if (!newToken) {
              // Refresh impossible → déconnecter
              autoLogoutRef.current();
            }
            // Si refresh réussi, la prochaine requête utilisera le nouveau token
          }
        }
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const reloadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setProfile(null);
        setUser(null);
        return null;
      }
      const profileData = await loadProfile(token);
      if (profileData) {
        setProfile(profileData);
        setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
        return profileData;
      }

      // If profile couldn't be reloaded, token may be expired/invalid.
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const roleStr = (payload.role || payload.token_type || '').toString().toLowerCase();
          const wasAdmin = roleStr.includes('admin') || roleStr === 'super_admin' || roleStr === 'admin';
          localStorage.removeItem('token');
          setProfile(null);
          setUser(null);
          try {
            if (wasAdmin) navigate('/admin/sama_connection_page'); else navigate('/auth');
          } catch (e) { }
        }
      } catch (e) {
        // ignore
      }
      return null;
    } catch (e) {
      console.error('reloadProfile error', e);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await signInUser(email, password);
    if (!result.error && result.token) {
      const profileData = await loadProfile(result.token);
      setProfile(profileData);
      setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
    }
    return result;
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, options?: { plan_id?: number | string, plan_slug?: string, duration_months?: number }) => {
    const result = await signUpUser(email, password, firstName, lastName, options);
    if (!result.error && result.token) {
      const profileData = await loadProfile(result.token);
      setProfile(profileData);
      setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
    }
    return result;
  };

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const signOut = async () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      // determine role before clearing profile
      const roleStr = (profile?.role || profile?.token_type || '').toString().toLowerCase();
      const wasAdmin = PLATFORM_ADMIN_ROLES.has(roleStr);

      await signOutUser();
      setUser(null);
      setProfile(null);
      localStorage.removeItem('token'); // Double check clearing

      setShowLogoutDialog(false);
      setIsLoggingOut(false);

      // Redirect to appropriate login page
      try {
        if (wasAdmin) {
          navigate('/admin/sama_connection_page');
        } else {
          navigate('/auth');
        }
      } catch (e) {
        // navigation may fail in non-router contexts; ignore
      }
    } catch (err) {
      console.error('Error signing out:', err);
      toast({ title: 'Erreur', description: "Impossible de se déconnecter", variant: 'destructive' });
      setIsLoggingOut(false);
    }
  };

  const resetPassword = async (email: string) => {
    return await resetUserPassword(email);
  };

  const value = {
    user,
    session: null,
    profile,
    loading,
    reloadProfile,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
    </AuthContext.Provider>
  );
};
