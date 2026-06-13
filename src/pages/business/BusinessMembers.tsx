import React, { useEffect, useState, useMemo } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  UserPlus, Pause, Play, Trash2, Mail, FolderOpen,
  Search, Users, Clock, UserX, Building2, CheckCircle2,
  MoreVertical, Send, Eye, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
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

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  active:    { label: 'Actif',        className: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500' },
  pending:   { label: 'En attente',   className: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  suspended: { label: 'Suspendu',     className: 'bg-red-100 text-red-600 border-red-200',         dot: 'bg-red-500' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const BusinessMembers: React.FC = () => {
  const { account } = useBusiness();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePoste, setInvitePoste] = useState('');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [profileDialog, setProfileDialog] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const primaryColor = account?.primary_color || '#1a1a2e';
  const secondaryColor = account?.secondary_color || '#16213e';
  const accentColor = account?.accent_color || '#0f3460';

  const tok = () => localStorage.getItem('token');

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/business/members`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
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
      const res = await fetch(`${API_BASE}/api/business/members/invite`, {
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
      toast({ title: 'Membre retiré', description: 'Il n\'a plus accès à l\'espace Business.' });
      setConfirmRemoveId(null);
      loadMembers();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const loadProfile = async (memberId: number) => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/business/members/${memberId}/profile`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setProfileDialog(data);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger le profil', variant: 'destructive' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Counts
  const activeCount    = members.filter(m => m.status === 'active').length;
  const pendingCount   = members.filter(m => m.status === 'pending').length;
  const suspendedCount = members.filter(m => m.status === 'suspended').length;
  const capacityPct    = Math.round((activeCount / MAX_MEMBERS) * 100);
  const atCapacity     = activeCount >= MAX_MEMBERS;

  // Filtered list
  const filtered = useMemo(() => {
    let list = members;
    if (activeTab !== 'all') list = list.filter(m => m.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.prenom || '').toLowerCase().includes(q) ||
        (m.nom || '').toLowerCase().includes(q) ||
        m.invitation_email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, activeTab, search]);

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',       label: 'Tous',         count: members.length },
    { key: 'active',    label: 'Actifs',        count: activeCount },
    { key: 'pending',   label: 'En attente',    count: pendingCount },
    { key: 'suspended', label: 'Suspendus',     count: suspendedCount },
  ];

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return '—'; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessNav onSignOut={signOut} />

      {/* Member profile dialog */}
      <Dialog open={!!profileDialog} onOpenChange={open => { if (!open) setProfileDialog(null); }}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Profil du membre
            </DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
            </div>
          ) : profileDialog ? (
            <div className="space-y-5">
              {/* Member info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarFallback
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: profileDialog.member.status === 'suspended' ? '#9ca3af' : primaryColor }}
                  >
                    {(profileDialog.member.prenom?.[0] || profileDialog.member.invitation_email[0] || '?').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {profileDialog.member.prenom && profileDialog.member.nom
                      ? `${profileDialog.member.prenom} ${profileDialog.member.nom}`
                      : profileDialog.member.invitation_email}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 truncate mt-0.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {profileDialog.member.invitation_email}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={profileDialog.member.status} />
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Rôle</p>
                  <p className="font-medium text-gray-900 capitalize">{profileDialog.member.role || 'member'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Portfolios</p>
                  <p className="font-medium text-gray-900">
                    {profileDialog.member.portfolio_count} / {profileDialog.member.portfolio_limit}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Membre depuis</p>
                  <p className="font-medium text-gray-900">{fmtDate(profileDialog.member.user_created_at || profileDialog.member.created_at)}</p>
                </div>
              </div>

              {/* Portfolios list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Portfolios ({profileDialog.portfolios.length})
                </h3>
                {profileDialog.portfolios.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Aucun portfolio créé
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profileDialog.portfolios.map(p => {
                      const title = p.titre || 'Portfolio sans titre';
                      const isPublic = !!p.is_public;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                              <FolderOpen className="h-4 w-4" style={{ color: primaryColor }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                              {p.url_slug && <p className="text-xs text-gray-400 truncate">/{p.url_slug}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isPublic ? 'Public' : 'Privé'}
                            </span>
                            {p.url_slug && isPublic && (
                              <a
                                href={`/portfolio/${p.url_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
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
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, ${accentColor} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex items-center gap-4 flex-1">
              {account?.company_logo_url ? (
                <img src={account.company_logo_url} alt={account.company_name} className="h-14 w-14 object-contain rounded-xl bg-white/20 p-1.5 shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Gestion des membres</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Invitez et gérez les agents de {account?.company_name || 'votre entreprise'}
                </p>
              </div>
            </div>

            {/* Quick stats chips */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-white/15 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
                {activeCount} actif{activeCount !== 1 ? 's' : ''}
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/15 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  {pendingCount} en attente
                </div>
              )}
              {suspendedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/15 text-white rounded-full px-3 py-1.5 text-xs font-medium">
                  <UserX className="h-3.5 w-3.5 text-red-300" />
                  {suspendedCount} suspendu{suspendedCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Capacité */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Capacité de l'espace</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {activeCount} <span className="font-normal text-gray-400">/ {MAX_MEMBERS} membres</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(capacityPct, 100)}%`,
                  backgroundColor: capacityPct >= 90 ? '#ef4444' : capacityPct >= 70 ? '#f59e0b' : primaryColor,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {atCapacity ? 'Capacité maximale atteinte' : `${MAX_MEMBERS - activeCount} place${MAX_MEMBERS - activeCount !== 1 ? 's' : ''} disponible${MAX_MEMBERS - activeCount !== 1 ? 's' : ''}`}
              </span>
              <span className="text-xs font-medium" style={{ color: capacityPct >= 90 ? '#ef4444' : 'inherit' }}>
                {capacityPct}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire d'invitation */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                <UserPlus className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Inviter un collaborateur</h2>
                <p className="text-xs text-gray-500">Il recevra un email avec un lien pour rejoindre votre espace</p>
              </div>
            </div>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="collaborateur@entreprise.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="pl-9"
                    disabled={atCapacity}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim() || atCapacity}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white hover:opacity-90 gap-2 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  {inviting ? 'Envoi…' : "Inviter"}
                </Button>
              </div>
              <Input
                type="text"
                placeholder="Poste / fonction (optionnel) — ex: Directeur commercial"
                value={invitePoste}
                onChange={e => setInvitePoste(e.target.value)}
                disabled={atCapacity}
              />
            </form>
            {atCapacity && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <UserX className="h-3.5 w-3.5" />
                Vous avez atteint la limite de {MAX_MEMBERS} membres. Retirez un membre pour en ajouter un nouveau.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Liste des membres */}
        <div>
          {/* Header + filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 shrink-0">
              Membres{members.length > 0 ? ` (${filtered.length}${filtered.length !== members.length ? `/${members.length}` : ''})` : ''}
            </h2>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Rechercher un membre…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              {/* Tab filters */}
              <div className="flex gap-1 flex-wrap">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={activeTab === tab.key ? { backgroundColor: primaryColor } : {}}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1.5 ${activeTab === tab.key ? 'text-white/70' : 'text-gray-400'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
                <p className="text-sm text-gray-400">Chargement des membres…</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-gray-400" />
                </div>
                {members.length === 0 ? (
                  <>
                    <h3 className="font-semibold text-gray-700 mb-1">Aucun membre pour l'instant</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Invitez vos collaborateurs en saisissant leur email ci-dessus.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-700 mb-1">Aucun résultat</h3>
                    <p className="text-sm text-gray-500">Essayez un autre terme de recherche ou filtre.</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(m => {
                const displayName = m.prenom && m.nom ? `${m.prenom} ${m.nom}` : null;
                const initials = (m.prenom?.[0] || m.invitation_email[0] || '?').toUpperCase();
                const portfolioPct = m.portfolio_limit > 0 ? Math.min((m.portfolio_count / m.portfolio_limit) * 100, 100) : 0;
                const isConfirming = confirmRemoveId === m.id;

                return (
                  <Card key={m.id} className={`transition-all ${isConfirming ? 'border-red-200 bg-red-50/30' : 'hover:shadow-sm'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start sm:items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarFallback
                            className="text-sm font-bold text-white"
                            style={{ backgroundColor: m.status === 'suspended' ? '#9ca3af' : primaryColor }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {displayName || m.invitation_email}
                            </span>
                            <StatusBadge status={m.status} />
                          </div>
                          {displayName && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{m.invitation_email}</span>
                            </p>
                          )}

                          {/* Portfolio quota */}
                          {m.status !== 'pending' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <FolderOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <div className="flex-1 max-w-[120px]">
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${portfolioPct}%`,
                                      backgroundColor: portfolioPct >= 90 ? '#ef4444' : primaryColor,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {m.portfolio_count}/{m.portfolio_limit} portfolio{m.portfolio_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isConfirming ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-red-600 font-medium hidden sm:block">Confirmer la suppression ?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs px-3"
                              onClick={() => handleRemove(m.id)}
                            >
                              Retirer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-3"
                              onClick={() => setConfirmRemoveId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {m.user_id && (
                                <>
                                  <DropdownMenuItem onClick={() => loadProfile(m.id)} className="gap-2">
                                    <Eye className="h-4 w-4 text-gray-500" />
                                    Voir le profil
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {m.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleToggle(m.id)} className="gap-2">
                                  <Pause className="h-4 w-4 text-amber-500" />
                                  Suspendre
                                </DropdownMenuItem>
                              )}
                              {m.status === 'suspended' && (
                                <DropdownMenuItem onClick={() => handleToggle(m.id)} className="gap-2">
                                  <Play className="h-4 w-4 text-green-500" />
                                  Réactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmRemoveId(m.id)}
                                className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Retirer du compte
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BusinessMembers;
