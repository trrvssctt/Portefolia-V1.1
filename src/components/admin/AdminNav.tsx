import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Briefcase, CreditCard,
  TrendingUp, Banknote, BarChart3, FileText, BookOpen,
  UserCog, LogOut, Waves, Receipt, Menu, X, Mail,
  PanelLeftClose, PanelLeftOpen, DollarSign, Wifi,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminRole = 'super_admin' | 'admin_technique' | 'admin_contenu' | 'admin_support' | string;

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
  group: string;
  badgeKey?: keyof AdminBadges;
  badgeColor?: string;
}

interface AdminBadges {
  pending_wave_payments: number;
  pending_upgrades: number;
  expired_accounts: number;
  nfc_waitlist: number;
}

export interface AdminNavProps {
  collapsed: boolean;
  onToggle: () => void;
  profile?: any;
  onSignOut?: () => void;
}

// ─── JWT decode ───────────────────────────────────────────────────────────────

function decodeTokenPayload(token?: string | null): Record<string, any> | null {
  if (!token) return null;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
  } catch { return null; }
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    to: '/admin/dashboard',      icon: LayoutDashboard, roles: ['super_admin', 'admin_technique'], group: 'Opérations' },
  { label: 'Clients',      to: '/admin/clients',        icon: UserCheck,       roles: ['super_admin', 'admin_technique', 'admin_support'], group: 'Opérations' },
  { label: 'Portfolios',   to: '/admin/portfolios',     icon: Briefcase,       roles: ['super_admin', 'admin_technique'], group: 'Opérations' },
  { label: 'Wave',         to: '/admin/wave-validation',icon: Waves,           roles: ['super_admin', 'admin_technique'], group: 'Opérations', badgeKey: 'pending_wave_payments' },
  { label: 'Paiements',    to: '/admin/paiements',      icon: Banknote,        roles: ['super_admin', 'admin_technique', 'admin_support'], group: 'Opérations' },
  { label: 'Factures',     to: '/admin/invoices',       icon: Receipt,         roles: ['super_admin', 'admin_technique'], group: 'Opérations' },
  { label: 'Formules',     to: '/admin/plans',          icon: CreditCard,      roles: ['super_admin', 'admin_technique'], group: 'Opérations' },
  { label: 'Cartes NFC',  to: '/admin/cartes',         icon: Wifi,            roles: ['super_admin', 'admin_technique', 'admin_support'], group: 'Opérations' },
  { label: 'NFC Waitlist', to: '/admin/nfc-waitlist',  icon: Mail,            roles: ['super_admin', 'admin_technique', 'admin_support'], group: 'Opérations', badgeKey: 'nfc_waitlist', badgeColor: '#F59E0B' },
  { label: 'Upgrades',     to: '/admin/upgrades',       icon: TrendingUp,      roles: ['super_admin', 'admin_technique', 'admin_support'], group: 'Opérations', badgeKey: 'pending_upgrades' },
  { label: 'Finance',      to: '/admin/finance',        icon: DollarSign,      roles: ['super_admin', 'admin_technique'], group: 'Analytique' },
  { label: 'Stats',        to: '/admin/stats',          icon: BarChart3,       roles: ['super_admin', 'admin_technique'], group: 'Analytique' },
  { label: 'Blog',         to: '/admin/blog',           icon: BookOpen,        roles: ['super_admin', 'admin_contenu'], group: 'Contenu' },
  { label: 'Pages',        to: '/admin/pages',          icon: FileText,        roles: ['super_admin', 'admin_contenu'], group: 'Contenu' },
  { label: 'Admins',       to: '/admin/users-admin',    icon: UserCog,         roles: ['super_admin'], group: 'Administration' },
];

const GROUPS = ['Opérations', 'Analytique', 'Contenu', 'Administration'];

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  super_admin:     { label: 'Super Admin', color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'bg-amber-50 border border-amber-200' },
  admin_technique: { label: 'Technique',   color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50 border border-blue-200' },
  admin_contenu:   { label: 'Contenu',     color: 'text-violet-700',  dot: 'bg-violet-500',  bg: 'bg-violet-50 border border-violet-200' },
  admin_support:   { label: 'Support',     color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border border-emerald-200' },
};

// ─── Real-time badges hook ────────────────────────────────────────────────────

function useAdminBadges(): AdminBadges {
  const [badges, setBadges] = useState<AdminBadges>({ pending_wave_payments: 0, pending_upgrades: 0, expired_accounts: 0, nfc_waitlist: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const [badgesRes, nfcRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/badges`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/admin/nfc-waitlist`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const d   = badgesRes.ok ? await badgesRes.json() : {};
        const nfc = nfcRes.ok   ? await nfcRes.json()    : {};
        setBadges({
          pending_wave_payments: d.pending_wave_payments ?? 0,
          pending_upgrades:      d.pending_upgrades ?? 0,
          expired_accounts:      d.expired_accounts ?? 0,
          nfc_waitlist:          nfc.total ?? 0,
        });
      } catch { /* non-bloquant */ }
    };
    fetch_();
    intervalRef.current = setInterval(fetch_, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return badges;
}

// ─── Badge pill ───────────────────────────────────────────────────────────────

function BadgePill({ count, color = '#C62828' }: { count: number; color?: string }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[16px] h-[16px] text-white text-[10px] font-black px-1 rounded-full leading-none flex items-center justify-center shrink-0" style={{ background: color }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function BadgeDot({ count, color = '#C62828' }: { count: number; color?: string }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-[5px] -right-[5px] min-w-[16px] h-[16px] text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none px-0.5" style={{ background: color }}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AdminNav = ({ collapsed, onToggle, profile, onSignOut }: AdminNavProps) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useAdminBadges();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const payload = decodeTokenPayload(token);
  const adminRole: AdminRole = payload?.role || '';
  const roleConf = ROLE_CONFIG[adminRole] ?? { label: adminRole || 'Admin', color: 'text-gray-600', dot: 'bg-gray-400', bg: 'bg-gray-50 border border-gray-200' };

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.length === 0 || item.roles.includes(adminRole)
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const navItemClass = ({ isActive }: { isActive: boolean }, isCollapsed: boolean) =>
    `relative flex items-center rounded-lg transition-all duration-150 select-none
     ${isCollapsed
       ? 'justify-center h-10 w-10 mx-auto'
       : `gap-2.5 px-3 py-2${isActive ? ' border-l-[3px] border-[#2E7D32] !pl-[9px]' : ''}`
     }
     ${isActive
       ? 'bg-[#E8F5E9] text-[#2E7D32]'
       : 'text-[#1A1A2E] hover:bg-[#E8F5E9] hover:text-[#2E7D32]'
     }`;

  const renderNavItems = (isCollapsed: boolean, onItemClick?: () => void) =>
    GROUPS.map(group => {
      const groupItems = visibleItems.filter(i => i.group === group);
      if (groupItems.length === 0) return null;
      return (
        <div key={group}>
          {isCollapsed
            ? <div className="my-2 mx-2 border-t border-gray-100" />
            : <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{group}</p>
          }
          {groupItems.map((item) => {
            const count = item.badgeKey ? badges[item.badgeKey] : 0;
            const bColor = item.badgeColor;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/dashboard'}
                title={isCollapsed ? item.label : undefined}
                onClick={onItemClick}
                className={(state) => navItemClass(state, isCollapsed)}
              >
                <item.icon className="h-[17px] w-[17px] shrink-0" />
                {!isCollapsed && <span className="text-[13px] font-semibold whitespace-nowrap flex-1">{item.label}</span>}
                {isCollapsed ? <BadgeDot count={count} color={bColor} /> : <BadgePill count={count} color={bColor} />}
              </NavLink>
            );
          })}
        </div>
      );
    });

  const renderFooter = (isCollapsed: boolean, onLogout?: () => void) => (
    <div className={`border-t border-gray-100 shrink-0 ${isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2'}`}>
      {!isCollapsed && adminRole && (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${roleConf.bg} ${roleConf.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${roleConf.dot}`} />
          {roleConf.label}
        </div>
      )}
      {!isCollapsed && profile && (
        <div className="flex items-center gap-2.5 px-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-[#E8F5E9] border border-[#A5D6A7] flex items-center justify-center text-sm font-bold text-[#2E7D32] shrink-0">
            {(profile?.first_name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1A1A2E] truncate">{profile?.first_name || 'Admin'}</p>
            <p className="text-[10px] text-gray-400 truncate">{profile?.email || ''}</p>
          </div>
        </div>
      )}
      <button
        onClick={onLogout}
        title="Se déconnecter"
        className={`flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-[13px] font-semibold
          ${isCollapsed ? 'p-2' : 'w-full px-3 py-2'}`}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span>Déconnexion</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* ── Mobile trigger ── */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-[#2E7D32]"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full flex-col bg-white border-r border-gray-200 shadow-sm transition-[width] duration-300 ease-in-out z-40 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center h-14 border-b-2 border-[#2E7D32] shrink-0 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          {!collapsed && (
            <button
              className="flex items-center gap-2 min-w-0"
              onClick={() => navigate('/admin/dashboard')}
            >
              <img
                src="/logo_portefolia.png"
                alt="Portefolia"
                className="h-10 w-auto object-contain shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest truncate">Admin</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-[#E8F5E9] text-[#2E7D32] transition-colors shrink-0"
            title={collapsed ? 'Développer la sidebar' : 'Réduire la sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
          {renderNavItems(collapsed)}
        </nav>

        {/* Footer */}
        {renderFooter(collapsed, onSignOut)}
      </aside>

      {/* ── Mobile overlay drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="relative w-[240px] h-full bg-white border-r-2 border-[#2E7D32] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between h-14 border-b-2 border-[#2E7D32] px-4 shrink-0">
              <button
                className="flex items-center gap-2"
                onClick={() => { navigate('/admin/dashboard'); setMobileOpen(false); }}
              >
                <img
                  src="/logo_portefolia.png"
                  alt="Portefolia"
                  className="h-10 w-auto object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[11px] font-black text-[#2E7D32] uppercase tracking-widest">Admin</span>
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {renderNavItems(false, () => setMobileOpen(false))}
            </nav>

            {/* Mobile footer */}
            {renderFooter(false, () => { onSignOut?.(); setMobileOpen(false); })}
          </aside>
        </div>
      )}
    </>
  );
};

export default AdminNav;
