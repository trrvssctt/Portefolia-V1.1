
const envBase = import.meta.env.VITE_API_BASE;
// If running on localhost, default to local backend. Otherwise use deployed backend.
const API_BASE = envBase || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://backend-v-card.onrender.com');

export const loadProfile = async (token?: string) => {
  try {
    if (!token) return null;
    const res = await fetch(`${API_BASE}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.user || null;
    }

    // If users/me failed, it may be an admin token — try the admin profile endpoint first
    try {
      const adminRes = await fetch(`${API_BASE}/api/auth/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminRes.ok) {
        const ad = await adminRes.json();
        const admin = ad.admin || ad.user || null;
        if (admin) return { id: admin.id, email: admin.email || null, role: admin.role || admin.token_type || 'admin', ...admin };
      }
    } catch (e) {
      // ignore and fallback to decode
    }

    // Fallback: try decode JWT payload client-side — only if token is not expired
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
          return null;
        }
        return { id: payload.sub, email: payload.email || payload.sub, role: payload.role || payload.token_type || null };
      }
    } catch (e) {
      // ignore
    }
    return null;
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include' as RequestCredentials,
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        error: {
          message:        data?.error         || 'Email ou mot de passe incorrect',
          code:           data?.code          || null,
          checkout_token: data?.checkout_token || null,
          checkout_url:   data?.checkout_url   || null,
        },
      };
    }

    // backend may return accessToken or token
    const token = data.accessToken || data.token || data.access_token || null;
    if (token) localStorage.setItem('token', token);
    return { error: null, token };
  } catch (error: any) {
    return { error: { message: 'Erreur de connexion', code: null, checkout_token: null, checkout_url: null } };
  }
};

export const signInAdmin = async (email: string, password: string) => {
  try {
    // Admin login uses dedicated admin endpoint
    const res = await fetch(`${API_BASE}/api/auth/admin/sama_connection_page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include' as RequestCredentials,
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error || 'Email ou mot de passe incorrect';
      return { error: { message } };
    }

    const token = data.accessToken || data.token || data.access_token || null;
    if (token) localStorage.setItem('token', token);
    return { error: null, token };
  } catch (error: any) {
    return { error: { message: 'Erreur de connexion' } };
  }
};

export const signUpUser = async (email: string, password: string, firstName: string, lastName: string, options?: { plan_id?: number | string, plan_slug?: string, duration_months?: number }) => {
  try {
    const body: any = { nom: lastName || ' ', prenom: firstName || ' ', email, password };
    if (options && options.plan_id) body.plan_id = options.plan_id;
    if (options && options.plan_slug) body.plan_slug = options.plan_slug;
    if (options && options.duration_months) body.duration_months = options.duration_months;
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error || 'Erreur lors de l\'inscription';
      return { error: { message } };
    }

    // If backend returns an access token, save it so the user is authenticated immediately
    const token = data.accessToken || data.token || data.access_token || null;
    if (token) localStorage.setItem('token', token);
    return { error: null, token, data };
  } catch (error: any) {
    return { error: { message: 'Erreur lors de l\'inscription' } };
  }
};

export const refreshAccessToken = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) return { error: true, data: null };
    const token = data.accessToken || data.token || data.access_token || null;
    if (token) localStorage.setItem('token', token);
    return { error: false, token };
  } catch (e) {
    return { error: true, data: null };
  }
};

export const signOutUser = async () => {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    // ignore
  }
  localStorage.removeItem('token');
};

export const resetUserPassword = async (email: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { error: { message: json.error || 'Erreur lors de la demande' } };
    }
    return { error: null };
  } catch {
    return { error: { message: 'Impossible de contacter le serveur.' } };
  }
};

// Roles qui correspondent à l'administration interne Portefolia (panel /admin/*)
const PLATFORM_ADMIN_ROLES = new Set(['admin', 'super_admin', 'moderateur', 'comptable', 'support']);

/**
 * Décode le JWT et retourne 'admin' (panel Portefolia), 'business_admin',
 * 'business_member' ou 'user'. Ne confond PAS les rôles Business avec l'admin plateforme.
 */
export const getTokenRole = (token?: string | null): 'admin' | 'business_admin' | 'business_member' | 'user' | null => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const r = (payload?.token_type || payload?.role || '').toString().toLowerCase();
    if (PLATFORM_ADMIN_ROLES.has(r)) return 'admin';
    if (r === 'business_admin') return 'business_admin';
    if (r === 'business_member') return 'business_member';
    return 'user';
  } catch {
    return null;
  }
};

/** Retourne true si le rôle est un rôle Business (admin ou membre) */
export const isBusinessRole = (role?: string | null): boolean => {
  const r = (role || '').toLowerCase();
  return r === 'business_admin' || r === 'business_member';
};

/**
 * Return the correct login page path based on the token stored in localStorage.
 * Platform admin → admin login; Business → /auth; everyone else → /auth.
 */
export const getLoginRedirectUrl = (): string => {
  const token = localStorage.getItem('token');
  return getTokenRole(token) === 'admin' ? '/admin/sama_connection_page' : '/auth';
};

// Secondes restantes avant expiration du token (négatif si déjà expiré)
export const getTokenSecondsLeft = (token?: string): number => {
  if (!token) return -1;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return -1;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload?.exp) return Math.floor(payload.exp - Date.now() / 1000);
    return 99999;
  } catch { return -1; }
};

// Tente un refresh silencieux via le cookie httpOnly refresh_token
// Retourne le nouveau token ou null en cas d'échec
export const silentRefresh = async (): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method:      'POST',
      credentials: 'include',   // envoie le cookie refresh_token
    });
    if (!res.ok) return null;
    const json = await res.json();
    const newToken = json.accessToken || json.token || null;
    if (newToken) localStorage.setItem('token', newToken);
    return newToken;
  } catch { return null; }
};

export const isTokenExpired = (token?: string) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload && payload.exp) {
      return Number(payload.exp) * 1000 < Date.now();
    }
    // No exp claim — treat as not-expired by default
    return false;
  } catch (e) {
    return true;
  }
};
