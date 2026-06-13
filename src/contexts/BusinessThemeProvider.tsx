import React, { useEffect } from 'react';
import { useBusiness } from './BusinessContext';

// Injecte les couleurs/police de l'entreprise en CSS variables sur :root
// quand l'utilisateur est dans un compte Business.
const BusinessThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, isBusinessUser } = useBusiness();

  useEffect(() => {
    if (!isBusinessUser || !account) return;

    const root = document.documentElement;
    root.style.setProperty('--brand-primary', account.primary_color || '#1a1a2e');
    root.style.setProperty('--brand-secondary', account.secondary_color || '#16213e');
    root.style.setProperty('--brand-accent', account.accent_color || '#0f3460');
    root.style.setProperty('--brand-font', account.font_family || 'Inter');

    // Appliquer la police sur le body
    document.body.style.fontFamily = `'${account.font_family || 'Inter'}', sans-serif`;

    return () => {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-accent');
      root.style.removeProperty('--brand-font');
      document.body.style.fontFamily = '';
    };
  }, [account, isBusinessUser]);

  return <>{children}</>;
};

export default BusinessThemeProvider;
