// AdminShell.jsx — collapsible grouped sidebar + page header. window.AdminShell, window.AdminHeader
const ADMIN_NAV = [
  { group: 'Opérations', items: [
    { key: 'admin', label: 'Dashboard', icon: 'grid' },
    { key: 'admin-clients', label: 'Clients', icon: 'user' },
    { key: 'admin-portfolios', label: 'Portfolios', icon: 'brief' },
    { key: 'admin-wave', label: 'Wave', icon: 'waves', badge: 'wave' },
    { key: 'admin-paiements', label: 'Paiements', icon: 'banknote' },
    { key: 'admin-factures', label: 'Factures', icon: 'receipt' },
    { key: 'admin-formules', label: 'Formules', icon: 'card' },
    { key: 'admin-upgrades', label: 'Upgrades', icon: 'trending', badge: 'upgrades' },
  ]},
  { group: 'Analytique', items: [
    { key: 'admin-finance', label: 'Finance', icon: 'dollar' },
    { key: 'admin-stats', label: 'Stats', icon: 'bar' },
  ]},
  { group: 'Contenu', items: [
    { key: 'admin-blog', label: 'Blog', icon: 'book' },
    { key: 'admin-pages', label: 'Pages', icon: 'file' },
  ]},
  { group: 'Administration', items: [
    { key: 'admin-team', label: 'Admins', icon: 'usercog' },
  ]},
];

function AdminShell({ active, go, children }) {
  const A = window.ADMIN;
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const role = A.roles[A.me.role];
  const W = collapsed ? 76 : 248;

  const NavList = ({ onItem, isCollapsed }) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1">
      {ADMIN_NAV.map(grp => (
        <div key={grp.group} className="mb-1">
          {isCollapsed
            ? <div className="my-2 mx-2 border-t border-white/10"></div>
            : <p className="text-[10px] font-bold text-white/35 uppercase tracking-[0.14em] px-3 pt-3 pb-1.5">{grp.group}</p>}
          {grp.items.map(it => {
            const on = active === it.key;
            const count = it.badge ? A.badges[it.badge] : 0;
            return (
              <button key={it.key} onClick={() => { go(it.key); onItem && onItem(); }}
                title={isCollapsed ? it.label : undefined}
                className={`relative w-full flex items-center rounded-[10px] transition-colors ${isCollapsed ? 'justify-center h-10' : 'gap-2.5 px-3 h-10'} ${on ? 'bg-white/12 text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.07]'}`}>
                {on && !isCollapsed && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: 'var(--accent-2)' }}></span>}
                <span className="relative shrink-0">
                  <Icon name={it.icon} size={18} stroke={on ? 2.3 : 2} />
                  {isCollapsed && count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
                </span>
                {!isCollapsed && <span className="text-[13px] font-semibold flex-1 text-left whitespace-nowrap">{it.label}</span>}
                {!isCollapsed && count > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{count > 99 ? '99+' : count}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const Brand = ({ isCollapsed }) => (
    <div className={`flex items-center h-16 shrink-0 border-b border-white/10 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
      {!isCollapsed && (
        <button onClick={() => go('admin')} className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}><Icon name="layout" size={17} stroke={2.2} /></span>
          <span className="flex flex-col items-start leading-none min-w-0">
            <span className="text-[15px] font-bold text-white truncate">Portefolia</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5" style={{ color: 'var(--accent-2)' }}>Admin</span>
          </span>
        </button>
      )}
      <button onClick={() => setCollapsed(c => !c)} className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0">
        <Icon name="panelLeft" size={17} />
      </button>
      <button onClick={() => setMobileOpen(false)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10">
        <Icon name="x" size={18} />
      </button>
    </div>
  );

  const Footer = ({ isCollapsed }) => (
    <div className={`border-t border-white/10 shrink-0 ${isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2.5'}`}>
      {!isCollapsed && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: role.tint, color: role.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: role.color }}></span> {role.label}
        </div>
      )}
      <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: 'var(--accent-2)' }}>{A.me.name[0]}</span>
        {!isCollapsed && <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-white truncate">{A.me.name}</p><p className="text-[10px] text-white/40 truncate">{A.me.email}</p></div>}
      </div>
      <button onClick={() => go('landing')} className={`flex items-center gap-2 text-white/55 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-[13px] font-semibold ${isCollapsed ? 'w-9 h-9 justify-center' : 'w-full px-3 h-9'}`}>
        <Icon name="logout" size={16} /> {!isCollapsed && 'Déconnexion'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full flex-col z-40 transition-[width] duration-300" style={{ width: W, background: '#15161D' }}>
        <Brand isCollapsed={collapsed} />
        <NavList isCollapsed={collapsed} />
        <Footer isCollapsed={collapsed} />
      </aside>

      {/* Mobile trigger */}
      <button onClick={() => setMobileOpen(true)} className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-xl bg-white border border-line shadow-sm flex items-center justify-center text-ink">
        <Icon name="menu" size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <aside className="relative w-[248px] h-full flex flex-col" style={{ background: '#15161D' }} onClick={e => e.stopPropagation()}>
            <Brand isCollapsed={false} />
            <NavList isCollapsed={false} onItem={() => setMobileOpen(false)} />
            <Footer isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="transition-[padding] duration-300" style={{ paddingLeft: 0 }}>
        <div className="md:pl-[var(--admin-pad)]" style={{ '--admin-pad': W + 'px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Green gradient page header (charte: #1B5E20 → #2E7D32)
function AdminHeader({ title, subtitle, icon, actions, badge }) {
  return (
    <div className="relative overflow-hidden" style={{ background: 'var(--admin-grad)' }}>
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}></div>
      <div className="relative max-w-[1180px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0 pl-10 md:pl-0">
          {icon && <span className="w-12 h-12 rounded-2xl bg-white/12 flex items-center justify-center text-white shrink-0"><Icon name={icon} size={24} stroke={1.9} /></span>}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h1>
              {badge && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white">{badge}</span>}
            </div>
            {subtitle && <p className="text-white/65 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

function AdminBody({ children }) {
  return <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-7 space-y-7">{children}</div>;
}

Object.assign(window, { AdminShell, AdminHeader, AdminBody });
