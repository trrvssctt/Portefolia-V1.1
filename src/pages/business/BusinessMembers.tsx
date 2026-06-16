import React, { useEffect, useState, useMemo } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import {
  UserPlus, Pause, Play, Trash2, Mail, FolderOpen,
  Search, Users, Building2, Eye, ExternalLink, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE   = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const MAX_MEMBERS = 50;

interface Member {
  id: number;
  user_id: number | null;
  invitation_email: string;
  nom: string | null;
  prenom: string | null;
  user_email: string | null;
  role: string;
  status: string;
  portfolio_count: number;
  portfolio_limit: number;
  created_at?: string | null;
}

interface MemberPortfolio {
  id: number;
  titre: string | null;
  url_slug: string | null;
  is_public: boolean | number;
  views_count: number;
  date_creation: string | null;
}

interface MemberProfile {
  member: Member & { user_created_at?: string | null };
  portfolios: MemberPortfolio[];
}

type FilterTab = 'all' | 'active' | 'pending' | 'suspended';

const BIZ_STATUS: Record<string, { label: string; tint: string; color: string; dot: string }> = {
  active:    { label: 'Actif',      tint: '#E8F5E9', color: '#1B5E20', dot: '#2E7D32' },
  pending:   { label: 'En attente', tint: '#FEF3E2', color: '#B45309', dot: '#F59E0B' },
  suspended: { label: 'Suspendu',   tint: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
};

function StatusBadge({ status }: { status: string }) {
  const s = BIZ_STATUS[status] || { label: status, tint: '#F4F4F5', color: '#71717A', dot: '#A1A1AA' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: s.tint, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function BizHero({ account, activeCount, pendingCount, primary, secondary, accent }: {
  account: any; activeCount: number; pendingCount: number;
  primary: string; secondary: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
      <div className="absolute inset-0 opacity-[0.16] pointer-events-none"
        style={{ background: `radial-gradient(50% 120% at 85% 0%, ${accent}, transparent 60%)` }} />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-9 flex flex-col sm:flex-row sm:items-center gap-5">
        {account?.company_logo_url ? (
          <img src={account.company_logo_url} alt={account.company_name} className="w-14 h-14 object-contain rounded-2xl bg-white/12 p-1.5 shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-2xl bg-white/12 flex items-center justify-center text-white shrink-0">
            <Building2 size={26} strokeWidth={1.8} />
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Gestion des membres</h1>
          <p className="text-white/55 text-sm mt-1">Invitez et gérez les agents de {account?.company_name || 'votre entreprise'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 bg-white/12 text-white rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" /> {activeCount} actif{activeCount !== 1 ? 's' : ''}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 bg-white/12 text-white rounded-full px-3 py-1.5 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> {pendingCount} en attente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const BusinessMembers: React.FC = () => {
  const { account } = useBusiness();
  const { signOut } = useAuth();
  const { toast }   = useToast();

  const [members, setMembers]         = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePoste, setInvitePoste] = useState('');
  const [inviting, setInviting]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState<FilterTab>('all');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [profileDialog, setProfileDialog]     = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading]   = useState(false);

  const primary  = account?.primary_color   || '#15161D';
  const secondary = account?.secondary_color || '#15161D';
  const accent   = account?.accent_color    || '#2E7D32';

  const tok = () => localStorage.getItem('token');

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/business/members`, { headers: { Authorization: `Bearer ${tok()}` } });
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les membres', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/business/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ email: inviteEmail.trim(), poste: invitePoste.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Erreur', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Invitation envoyée !', description: `Un lien a été envoyé à ${inviteEmail}` });
      setInviteEmail('');
      setInvitePoste('');
      loadMembers();
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleToggle = async (memberId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/business/members/${memberId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error();
      loadMembers();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/business/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Membre retiré', description: "Il n'a plus accès à l'espace Business." });
      setConfirmRemoveId(null);
      loadMembers();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const loadProfile = async (memberId: number) => {
    setProfileLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/business/members/${memberId}/profile`, { headers: { Authorization: `Bearer ${tok()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setProfileDialog(data);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger le profil', variant: 'destructive' });
    } finally {
      setProfileLoading(false);
    }
  };

  const activeCount    = members.filter(m => m.status === 'active').length;
  const pendingCount   = members.filter(m => m.status === 'pending').length;
  const suspendedCount = members.filter(m => m.status === 'suspended').length;
  const capacityPct    = Math.round((activeCount / MAX_MEMBERS) * 100);
  const atCapacity     = activeCount >= MAX_MEMBERS;

  const filtered = useMemo(() => {
    let list = members;
    if (activeTab !== 'all') list = list.filter(m => m.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.prenom || '').toLowerCase().includes(q) ||
        (m.nom    || '').toLowerCase().includes(q) ||
        m.invitation_email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, activeTab, search]);

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',       label: 'Tous',       count: members.length },
    { key: 'active',    label: 'Actifs',      count: activeCount },
    { key: 'pending',   label: 'En attente',  count: pendingCount },
    { key: 'suspended', label: 'Suspendus',   count: suspendedCount },
  ];

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return '—'; }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F7F8F8' }}>
      <BusinessNav onSignOut={signOut} />

      {/* ── Profile dialog ── */}
      {profileDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setProfileDialog(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-[0_20px_60px_rgba(16,24,40,0.18)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7E7EA]">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#71717A]" />
                <h3 className="font-semibold text-[#18181B]">Profil du membre</h3>
              </div>
              <button onClick={() => setProfileDialog(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            {profileLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent" style={{ borderBottomColor: primary }} />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Avatar + info */}
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ background: profileDialog.member.status === 'suspended' ? '#A1A1AA' : primary }}
                  >
                    {(profileDialog.member.prenom?.[0] || profileDialog.member.invitation_email[0] || '?').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#18181B] truncate">
                      {profileDialog.member.prenom && profileDialog.member.nom
                        ? `${profileDialog.member.prenom} ${profileDialog.member.nom}`
                        : profileDialog.member.invitation_email}
                    </p>
                    <p className="text-sm text-[#71717A] flex items-center gap-1 truncate mt-0.5">
                      <Mail size={13} className="shrink-0" />
                      {profileDialog.member.invitation_email}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={profileDialog.member.status} />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-[#71717A] mb-0.5">Rôle</p>
                    <p className="font-medium text-[#18181B] capitalize">{profileDialog.member.role || 'member'}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-[#71717A] mb-0.5">Portfolios</p>
                    <p className="font-medium text-[#18181B]">{profileDialog.member.portfolio_count} / {profileDialog.member.portfolio_limit}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-[#71717A] mb-0.5">Membre depuis</p>
                    <p className="font-medium text-[#18181B]">{fmtDate(profileDialog.member.user_created_at || profileDialog.member.created_at)}</p>
                  </div>
                </div>

                {/* Portfolios list */}
                <div>
                  <h4 className="text-sm font-semibold text-[#18181B] mb-3 flex items-center gap-2">
                    <FolderOpen size={15} />
                    Portfolios ({profileDialog.portfolios.length})
                  </h4>
                  {profileDialog.portfolios.length === 0 ? (
                    <div className="text-center py-6 text-sm text-[#71717A] bg-zinc-50 rounded-xl">Aucun portfolio créé</div>
                  ) : (
                    <div className="space-y-2">
                      {profileDialog.portfolios.map(p => {
                        const title    = p.titre || 'Portfolio sans titre';
                        const isPublic = !!p.is_public;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${primary}20`, color: primary }}>
                                <FolderOpen size={15} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#18181B] truncate">{title}</p>
                                {p.url_slug && <p className="text-xs text-[#71717A] truncate">/{p.url_slug}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPublic ? '' : 'bg-zinc-100 text-[#71717A]'}`} style={isPublic ? { background: `${primary}20`, color: primary } : undefined}>
                                {isPublic ? 'Public' : 'Privé'}
                              </span>
                              {p.url_slug && isPublic && (
                                <a href={`/portfolio/${p.url_slug}`} target="_blank" rel="noopener noreferrer" className="p-1 text-[#71717A] hover:text-[#18181B] transition-colors">
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BizHero
        account={account}
        activeCount={activeCount}
        pendingCount={pendingCount}
        primary={primary}
        secondary={secondary}
        accent={accent}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-6">

        {/* ── Capacity ── */}
        <div className="bg-white rounded-2xl border border-[#E7E7EA] p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-[#18181B]/80">
              <Users size={15} /> Capacité de l'espace
            </span>
            <span className="text-sm font-semibold text-[#18181B]">
              {activeCount} <span className="text-[#71717A] font-normal">/ {MAX_MEMBERS} membres</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(capacityPct, 100)}%`, background: capacityPct >= 90 ? '#EF4444' : primary }}
            />
          </div>
          <p className="text-xs text-[#71717A] mt-1.5">
            {atCapacity ? 'Capacité maximale atteinte' : `${MAX_MEMBERS - activeCount} place${MAX_MEMBERS - activeCount !== 1 ? 's' : ''} disponible${MAX_MEMBERS - activeCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* ── Invite form ── */}
        <div className="bg-white rounded-2xl border border-[#E7E7EA] p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primary}20`, color: primary }}>
              <UserPlus size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#18181B]">Inviter un collaborateur</h2>
              <p className="text-xs text-[#71717A]">Il recevra un email avec un lien pour rejoindre votre espace.</p>
            </div>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
              <input
                type="email"
                placeholder="collaborateur@entreprise.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                disabled={atCapacity}
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-[#E7E7EA] outline-none text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#18181B]/30 disabled:opacity-50"
              />
            </div>
            <input
              type="text"
              placeholder="Poste (optionnel)"
              value={invitePoste}
              onChange={e => setInvitePoste(e.target.value)}
              disabled={atCapacity}
              className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-[#E7E7EA] outline-none text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#18181B]/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim() || atCapacity}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              style={{ background: primary }}
            >
              <Mail size={15} /> {inviting ? 'Envoi…' : 'Inviter'}
            </button>
          </form>
          {atCapacity && (
            <p className="text-xs text-[#B91C1C] mt-2.5 flex items-center gap-1.5">
              <Users size={13} /> Capacité maximale atteinte. Retirez un membre pour en ajouter un nouveau.
            </p>
          )}
        </div>

        {/* ── Member list ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-[#18181B] shrink-0">
              Membres <span className="text-[#71717A] font-normal">({filtered.length})</span>
            </h2>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
                <input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E7E7EA] bg-white outline-none text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#18181B]/30"
                />
              </div>
              {/* Tabs */}
              <div className="flex gap-1.5 flex-wrap sm:justify-end">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={activeTab === tab.key
                      ? { background: primary, color: '#fff' }
                      : { background: '#fff', border: '1px solid #E7E7EA', color: '#18181B' }
                    }
                  >
                    {tab.label}{' '}
                    <span style={{ color: activeTab === tab.key ? 'rgba(255,255,255,0.6)' : '#71717A' }}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent" style={{ borderBottomColor: primary }} />
              <p className="text-sm text-[#71717A]">Chargement des membres…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#E7E7EA] p-14 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Users size={26} className="text-[#71717A]" />
              </div>
              {members.length === 0 ? (
                <>
                  <p className="font-semibold text-[#18181B] mb-1">Aucun membre pour l'instant</p>
                  <p className="text-sm text-[#71717A]">Invitez vos collaborateurs en saisissant leur email ci-dessus.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#18181B] mb-1">Aucun résultat</p>
                  <p className="text-sm text-[#71717A]">Essayez un autre terme ou filtre.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(m => {
                const displayName  = m.prenom && m.nom ? `${m.prenom} ${m.nom}` : null;
                const initials     = (m.prenom?.[0] || m.invitation_email[0] || '?').toUpperCase();
                const portfolioPct = m.portfolio_limit > 0 ? Math.min((m.portfolio_count / m.portfolio_limit) * 100, 100) : 0;
                const isConfirming = confirmRemoveId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-colors ${isConfirming ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E7EA]'}`}
                  >
                    {/* Avatar */}
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: m.status === 'suspended' ? '#A1A1AA' : primary }}
                    >
                      {initials}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[#18181B] truncate">{displayName || m.invitation_email}</span>
                        <StatusBadge status={m.status} />
                        <span className="text-xs text-[#71717A]">· {m.role || 'member'}</span>
                      </div>
                      {displayName && (
                        <p className="text-xs text-[#71717A] flex items-center gap-1 mb-1.5">
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{m.invitation_email}</span>
                        </p>
                      )}
                      {m.status !== 'pending' && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <FolderOpen size={13} className="text-[#71717A] shrink-0" />
                          <div className="w-28 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${portfolioPct}%`, background: portfolioPct >= 90 ? '#EF4444' : primary }} />
                          </div>
                          <span className="text-xs text-[#71717A]">{m.portfolio_count}/{m.portfolio_limit} portfolios</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isConfirming ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#B91C1C] font-medium hidden sm:block">Confirmer ?</span>
                        <button onClick={() => handleRemove(m.id)} className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-[#EF4444]">Retirer</button>
                        <button onClick={() => setConfirmRemoveId(null)} className="h-8 px-3 rounded-lg text-xs font-semibold text-[#18181B] border border-[#E7E7EA] bg-white">Annuler</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {m.user_id && (
                          <button onClick={() => loadProfile(m.id)} title="Voir le profil" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-zinc-100 transition-colors">
                            <Eye size={15} />
                          </button>
                        )}
                        {m.status === 'active' && (
                          <button onClick={() => handleToggle(m.id)} title="Suspendre" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#B45309] hover:bg-zinc-100 transition-colors">
                            <Pause size={15} />
                          </button>
                        )}
                        {m.status === 'suspended' && (
                          <button onClick={() => handleToggle(m.id)} title="Réactiver" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#1B5E20] hover:bg-zinc-100 transition-colors">
                            <Play size={15} />
                          </button>
                        )}
                        <button onClick={() => setConfirmRemoveId(m.id)} title="Retirer" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#B91C1C] hover:bg-zinc-100 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessMembers;
