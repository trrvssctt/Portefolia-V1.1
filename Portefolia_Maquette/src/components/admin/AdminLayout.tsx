import { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminNav from './AdminNav';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'admin_sidebar_collapsed';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const handleToggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { }
      return next;
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/admin/sama_connection_page');
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNav
        collapsed={collapsed}
        onToggle={handleToggle}
        profile={profile}
        onSignOut={handleSignOut}
      />
      <main
        className={`flex-1 min-h-screen transition-[margin-left] duration-300 ease-in-out ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
