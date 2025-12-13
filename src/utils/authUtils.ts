
const envBase = import.meta.env.VITE_API_BASE;
// If running on localhost, default to local backend. Otherwise use deployed backend.
const API_BASE = envBase || (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://backend-v-card.onrender.com');

export const loadProfile = async (token?: string) => {
  try {
    if (!token) return null;
    const res = await fetch(`${API_BASE}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
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
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error || 'Email ou mot de passe incorrect';
      return { error: { message } };
    }

    // Save token in localStorage
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return { error: null, token: data.token };
  } catch (error: any) {
    return { error: { message: 'Erreur de connexion' } };
  }
};

export const signUpUser = async (email: string, password: string, firstName: string, lastName: string, options?: { plan_id?: number | string, plan_slug?: string }) => {
  try {
    const body: any = { nom: lastName || ' ', prenom: firstName || ' ', email, password };
    if (options && options.plan_id) body.plan_id = options.plan_id;
    if (options && options.plan_slug) body.plan_slug = options.plan_slug;
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

    // If backend returns a token, save it so the user is authenticated immediately
    const token = data.token || null;
    if (token) localStorage.setItem('token', token);
    return { error: null, token, data };
  } catch (error: any) {
    return { error: { message: 'Erreur lors de l\'inscription' } };
  }
};

export const resetUserPassword = async (email: string) => {
  // Reset password backend endpoint not implemented yet.
  return { error: { message: "Fonctionnalité de réinitialisation non disponible pour l'instant" } };
};
