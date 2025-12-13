
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { loadProfile, signInUser, signUpUser, resetUserPassword } from '@/utils/authUtils';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const profileData = await loadProfile(token);
        setProfile(profileData);
        setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
      }
      setLoading(false);
    };
    init();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await signInUser(email, password);
    if (!result.error && result.token) {
      const profileData = await loadProfile(result.token);
      setProfile(profileData);
      setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
    }
    return result;
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, options?: { plan_id?: number | string, plan_slug?: string }) => {
    const result = await signUpUser(email, password, firstName, lastName, options);
    if (!result.error && result.token) {
      const profileData = await loadProfile(result.token);
      setProfile(profileData);
      setUser(profileData ? { id: profileData.id, email: profileData.email } : null);
    }
    return result;
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('token');
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
      toast({ title: 'Erreur', description: "Impossible de se déconnecter", variant: 'destructive' });
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
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
