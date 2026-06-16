import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import BusinessNav from '@/components/business/BusinessNav';
import { PortfolioForm } from '@/components/dashboard/PortfolioForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, FolderOpen, Settings, UserPlus, Clock,
  TrendingUp, Building2, ArrowRight, AlertCircle,
  Plus, Eye, Globe, Lock, CalendarClock, RefreshCw,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const BIZ_STATUS = {
  active:    { label: 'Actif',      tint: '#E8F5E9', color: '#1B5E20', dot: '#2E7D32' },
  pending:   { label: 'En attente', tint: '#FEF3E2', color: '#B45309', dot: '#F59E0B' },
  suspended: { label: 'Suspendu',   tint: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

function BizHero({ title, subtitle, logoUrl, chips, primary, secondary, accent }: {
  title: string; subtitle: string; logoUrl?: string | null;
  chips?: { label: string; dot: string }[];
  primary: string; secondary: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
      <div
        className="absolute inset-0 opacity-[0.16] pointer-events-none"
        style={{ background: `radial-gradient(50% 120% at 85% 0%, ${accent}, transparent 60%)` }}
      />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-9 flex flex-col sm:flex-row sm:items-center gap-5">
        {logoUrl ? (
          <img src={logoUrl} alt={title} className="w-14 h-14 object-contain rounded-2xl bg-white/12 p-1.5 shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-2xl bg-white/12 flex items-center justify-center text-white shrink-0">
            <Building2 size={26} strokeWidth={1.8} />
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h1>
          <p className="text-white/55 text-sm mt-1">{subtitle}</p>
        </div>
        {chips && chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map(c => (
              <span key={c.label} className="flex items-center gap-1.5 bg-white/12 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BizStat({ label, value, sub, icon, progress, progressColor }: {
  label: string; value: string; sub: string; icon: React.ReactNode; progress?: number; progressColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#71717A]">{label}</p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 text-[#18181B]/60">{icon}</span>
      </div>
      <p className="text-[26px] font-semibold text-[#18181B] leading-none tabular-nums">{value}</p>
      <p className="text-xs text-[#71717A] mt-1.5">{sub}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: progressColor || '#2E7D32' }} />
        </div>
      )}
    </div>
  );
}

const BusinessDashboard: React.FC = () => {
  const { account, isBusinessAdmin, loading } = useBusiness();
  const { user, profile, signOut } = useAuth();
  const { currentPlan } = usePlan();
  const navigate = useNavigate();
  const [stats, setStats]               = useState<{ member_count: number; members: any[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [portfolios, setPortfolios]     = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);

  const isPending = profile?.is_active === false || profile?.is_active === 0;

  useEffect(() => {
    if (!isBusinessAdmin) { setStatsLoading(false); return; }
    const token = localStorage.getItem('token');
    setStatsLoading(true);
    fetch(`${API_BASE}/api/business/account`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setStats(data); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));

    fetch(`${API_BASE}/api/portfolios`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPortfolios(data.portfolios || []))
      .catch(() => {});
  }, [isBusinessAdmin]);

  const primary  = account?.primary_color   || '#15161D';
  const secondary = account?.secondary_color || '#15161D';
  const accent   = account?.accent_color    || '#2E7D32';

  const activeMemberCount = stats?.members?.filter(m => m.status === 'active').length ?? 0;
  const pendingCount      = stats?.members?.filter((m: any) => m.status === 'pending').length ?? 0;
  const totalPortfolios   = stats?.members?.reduce((s: number, m: any) => s + (m.portfolio_count || 0), 0) ?? 0;
  const capacityPct       = Math.round((activeMemberCount / 50) * 100);
  const adminName         = (profile as any)?.prenom || (user as any)?.prenom || 'Admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F8F8' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent" style={{ borderBottomColor: primary }} />
          <p className="text-sm text-[#71717A]">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  const actions = [
    { icon: <Plus size={19} />, title: 'Créer un portfolio', desc: 'Nouveau portfolio Business avec styles avancés', onClick: () => setShowPortfolioForm(true) },
    { icon: <UserPlus size={19} />, title: 'Gérer les membres', desc: 'Inviter, suspendre ou retirer des agents', onClick: () => navigate('/business/members') },
    { icon: <Settings size={19} />, title: 'Personnalisation', desc: 'Logo, couleurs et police de votre marque', onClick: () => navigate('/business/settings') },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <BusinessNav onSignOut={signOut} />

      <BizHero
        title={account?.company_name || 'Votre Espace Business'}
        subtitle={`Bonjour ${adminName} — bienvenue sur votre tableau de bord`}
        logoUrl={account?.company_logo_url}
        primary={primary}
        secondary={secondary}
        accent={accent}
        chips={[{
          label: isPending ? 'En attente de validation' : 'Compte actif',
          dot:   isPending ? '#F59E0B' : '#2E7D32',
        }]}
      />

      {isPending && (
        <div className="bg-[#FEF3E2] border-b border-[#F59E0B]/30">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#B45309]">Votre compte est en attente de validation</p>
              <p className="text-xs text-[#B45309]/80 mt-0.5">
                Notre équipe va valider votre espace Business sous 24–48h. Vous recevrez un email dès que l'accès est activé.
                En attendant, vous pouvez déjà configurer votre espace.
              </p>
            </div>
          </div>
        </div>
      )}

      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              isBusiness
              businessAccount={account ?? undefined}
              onClose={() => setShowPortfolioForm(false)}
              onSuccess={() => {
                setShowPortfolioForm(false);
                const token = localStorage.getItem('token');
                fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.json())
                  .then(data => setPortfolios(data.portfolios || []))
                  .catch(() => {});
              }}
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BizStat label="Membres actifs"        value={statsLoading ? '…' : String(activeMemberCount)} sub="sur 50 max"      icon={<Users      size={16} />} />
          <BizStat label="Invitations en attente" value={statsLoading ? '…' : String(pendingCount)}      sub="à accepter"     icon={<Clock      size={16} />} />
          <BizStat label="Portfolios créés"       value={statsLoading ? '…' : String(totalPortfolios)}   sub="par vos agents"  icon={<FolderOpen size={16} />} />
          <BizStat label="Capacité utilisée"      value={statsLoading ? '…' : `${capacityPct}%`}         sub={`${activeMemberCount} / 50 membres`} icon={<TrendingUp size={16} />} progress={capacityPct} progressColor={primary} />
        </div>

        {/* ── Renewal strip ── */}
        {currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
          <div className="bg-white rounded-2xl border border-[#E7E7EA] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              <CalendarClock size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-[#71717A] font-semibold">Abonnement Business</p>
              <p className="font-semibold text-[#18181B] text-sm">
                {currentPlan.name}
                {(currentPlan.next_billing_date || currentPlan.end_date) ? (
                  <span className="font-normal text-[#71717A]">
                    {' · renouvellement '}
                    {format(new Date(currentPlan.next_billing_date || currentPlan.end_date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              onClick={() => navigate('/reabonnement')}
              className="h-9 px-4 rounded-[10px] text-sm font-semibold text-white flex items-center gap-1.5 shrink-0"
              style={{ background: '#2E7D32' }}
            >
              <RefreshCw size={14} /> Renouveler
            </button>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#71717A] mb-3">Actions rapides</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {actions.map(a => (
              <button
                key={a.title}
                onClick={a.onClick}
                className="group bg-white rounded-2xl border border-[#E7E7EA] p-5 text-left hover:border-[#18181B]/20 hover:shadow-[0_8px_30px_rgba(16,24,40,0.07)] transition-all flex items-center gap-4"
              >
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: primary }}>
                  {a.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#18181B] text-sm">{a.title}</p>
                  <p className="text-xs text-[#71717A] mt-0.5 leading-snug">{a.desc}</p>
                </div>
                <ArrowRight size={16} className="text-[#71717A]/50 group-hover:text-[#18181B]/60 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Portfolios + Members ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Portfolios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#71717A]">Portfolios Business</p>
              <button onClick={() => setShowPortfolioForm(true)} className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: primary }}>
                <Plus size={13} /> Nouveau
              </button>
            </div>
            {portfolios.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E7E7EA] p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen size={22} className="text-[#71717A]" />
                </div>
                <p className="text-sm font-medium text-[#18181B] mb-1">Aucun portfolio Business</p>
                <p className="text-xs text-[#71717A]">Créez votre premier portfolio avec styles avancés.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] divide-y divide-[#E7E7EA]">
                {portfolios.slice(0, 5).map((p: any) => {
                  const title    = p.titre || p.title || p.nom || 'Portfolio';
                  const slug     = p.url_slug || p.slug || '';
                  const isPublic = p.is_public !== undefined ? p.is_public : p.est_public;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: primary }}>
                          {title.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#18181B] truncate">{title}</p>
                          {slug && <p className="text-xs text-[#71717A]">/{slug}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={isPublic ? { background: `${primary}20`, color: primary } : { background: '#F4F4F5', color: '#71717A' }}
                        >
                          {isPublic ? <Globe size={11} /> : <Lock size={11} />}
                          {isPublic ? 'Public' : 'Privé'}
                        </span>
                        {slug && (
                          <button
                            onClick={() => window.open(`/portfolio/${slug}`, '_blank')}
                            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {portfolios.length > 5 && (
                  <div className="px-5 py-3 text-center">
                    <button onClick={() => navigate('/business/portfolios')} className="text-xs font-medium hover:underline flex items-center justify-center gap-1 mx-auto" style={{ color: primary }}>
                      Voir les {portfolios.length - 5} autres <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#71717A]">Membres récents</p>
              <button onClick={() => navigate('/business/members')} className="text-xs font-semibold hover:underline" style={{ color: primary }}>
                Voir tous →
              </button>
            </div>
            {!statsLoading && stats?.members && stats.members.length > 0 ? (
              <div className="bg-white rounded-2xl border border-[#E7E7EA] divide-y divide-[#E7E7EA]">
                {stats.members.slice(0, 4).map((m: any) => {
                  const s    = BIZ_STATUS[m.status as keyof typeof BIZ_STATUS] || BIZ_STATUS.active;
                  const name = m.prenom && m.nom ? `${m.prenom} ${m.nom}` : m.invitation_email || m.email || '?';
                  return (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: m.status === 'suspended' ? '#A1A1AA' : primary }}
                        >
                          {name[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#18181B] truncate">{name}</p>
                          <p className="text-xs text-[#71717A] truncate">{m.role || 'member'}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: s.tint, color: s.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : !statsLoading ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#E7E7EA] p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-[#71717A]" />
                </div>
                <p className="text-sm font-medium text-[#18181B] mb-1">Aucun membre pour l'instant</p>
                <button onClick={() => navigate('/business/members')} className="text-xs font-semibold mt-2 hover:underline" style={{ color: primary }}>
                  Inviter des membres →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;
