import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/contexts/PlanContext';
import BusinessNav from '@/components/business/BusinessNav';
import { PortfolioForm } from '@/components/dashboard/PortfolioForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, FolderOpen, Settings, UserPlus, Clock,
  TrendingUp, Building2, ArrowRight, CheckCircle, AlertCircle,
  Plus, Eye, Globe, Lock, CalendarClock, RefreshCw,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const BusinessDashboard: React.FC = () => {
  const { account, isBusinessAdmin, loading } = useBusiness();
  const { user, profile, signOut } = useAuth();
  const { currentPlan } = usePlan();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ member_count: number; members: any[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [portfolios, setPortfolios] = useState<any[]>([]);
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

  const primaryColor = account?.primary_color || '#1a1a2e';
  const secondaryColor = account?.secondary_color || '#16213e';
  const accentColor = account?.accent_color || '#0f3460';

  const activeMemberCount = stats?.members?.filter(m => m.status === 'active').length ?? 0;
  const pendingCount = stats?.members?.filter((m: any) => m.status === 'pending').length ?? 0;
  const totalPortfolios = stats?.members?.reduce((s: number, m: any) => s + (m.portfolio_count || 0), 0) ?? 0;
  const capacityPct = Math.round((activeMemberCount / 50) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }} />
          <p className="text-sm text-gray-500">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BusinessNav onSignOut={signOut} />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, ${accentColor} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            {account?.company_logo_url ? (
              <img
                src={account.company_logo_url}
                alt={account.company_name}
                className="h-14 w-14 object-contain rounded-xl bg-white/20 p-1.5"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {account?.company_name || 'Votre Espace Business'}
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                Bonjour, {(profile as any)?.prenom || (user as any)?.prenom || 'Admin'} — bienvenue sur votre tableau de bord
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending ? (
              <Badge className="bg-amber-400/20 text-amber-200 border border-amber-400/40 gap-1.5">
                <Clock className="h-3.5 w-3.5" /> En attente de validation
              </Badge>
            ) : (
              <Badge className="bg-green-400/20 text-green-200 border border-green-400/40 gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Compte actif
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Pending banner */}
      {isPending && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Votre compte est en attente de validation</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Notre équipe va valider votre espace Business sous 24–48h. Vous recevrez un email dès que l'accès est activé.
                En attendant, vous pouvez déjà configurer votre espace.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal création portfolio Business */}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Membres actifs"
            value={statsLoading ? '…' : String(activeMemberCount)}
            sub={`sur 50 max`}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-100"
          />
          <StatCard
            label="Invitations en attente"
            value={statsLoading ? '…' : String(pendingCount)}
            sub="à accepter"
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            iconBg="bg-amber-100"
          />
          <StatCard
            label="Portfolios créés"
            value={statsLoading ? '…' : String(totalPortfolios)}
            sub="par vos agents"
            icon={<FolderOpen className="h-5 w-5 text-green-600" />}
            iconBg="bg-green-100"
          />
          <StatCard
            label="Capacité utilisée"
            value={statsLoading ? '…' : `${capacityPct}%`}
            sub={`${activeMemberCount} / 50 membres`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-100"
            progress={capacityPct}
            progressColor={primaryColor}
          />
        </div>

        {/* Prochain renouvellement abonnement */}
        {currentPlan && Number(currentPlan.price_cents || 0) > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Abonnement Business</p>
                <p className="font-bold text-gray-900 text-sm">{currentPlan.name}</p>
                {(currentPlan.next_billing_date || currentPlan.end_date) ? (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Prochain renouvellement : <strong>{format(new Date(currentPlan.next_billing_date || currentPlan.end_date), 'dd MMMM yyyy', { locale: fr })}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Date de renouvellement non définie</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/reabonnement')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Renouveler
            </Button>
          </div>
        )}

        {/* Actions rapides */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionCard
              icon={<Plus className="h-6 w-6 text-white" />}
              iconBg={primaryColor}
              title="Créer un portfolio"
              desc="Nouveau portfolio Business avec accès complet & styles avancés"
              onClick={() => setShowPortfolioForm(true)}
            />
            <ActionCard
              icon={<UserPlus className="h-6 w-6 text-white" />}
              iconBg={secondaryColor}
              title="Gérer les membres"
              desc="Inviter, suspendre ou retirer des agents de votre espace"
              onClick={() => navigate('/business/members')}
            />
            <ActionCard
              icon={<Settings className="h-6 w-6 text-white" />}
              iconBg={accentColor}
              title="Personnalisation"
              desc="Logo, couleurs et police à l'image de votre entreprise"
              onClick={() => navigate('/business/settings')}
            />
          </div>
        </div>

        {/* Mes portfolios Business */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mes portfolios Business</h2>
            <Button
              size="sm"
              onClick={() => setShowPortfolioForm(true)}
              className="text-white text-xs gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="h-3.5 w-3.5" /> Nouveau portfolio
            </Button>
          </div>

          {portfolios.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FolderOpen className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1">Aucun portfolio Business</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">
                  Créez votre premier portfolio Business avec accès complet et styles avancés.
                </p>
                <Button
                  onClick={() => setShowPortfolioForm(true)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Créer un portfolio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {portfolios.slice(0, 5).map((p: any) => {
                  const title = p.titre || p.title || p.nom || 'Portfolio';
                  const slug = p.url_slug || p.slug || '';
                  const isPublic = p.is_public !== undefined ? p.is_public : p.est_public;
                  const accent = p.theme_color || primaryColor;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 group hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${accent}99, ${accent})` }}
                        >
                          {title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                          {slug && <p className="text-xs text-gray-400 truncate">/{slug}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] gap-0.5 ${isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {isPublic ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          {isPublic ? 'Public' : 'Privé'}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => window.open(`/portfolio/${slug}`, '_blank')}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {portfolios.length > 5 && (
                  <div className="px-5 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/business/portfolios')}
                      className="text-xs font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                      style={{ color: primaryColor }}
                    >
                      Voir les {portfolios.length - 5} autres <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Membres récents */}
        {!statsLoading && stats?.members && stats.members.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Membres récents</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/business/members')} className="text-xs gap-1">
                Voir tous <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Card>
              <CardContent className="p-0 divide-y">
                {stats.members.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(m.prenom?.[0] || m.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 leading-none">
                          {m.prenom && m.nom ? `${m.prenom} ${m.nom}` : m.email}
                        </p>
                        {m.email && (m.prenom || m.nom) && (
                          <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        m.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : m.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }
                    >
                      {m.status === 'active' ? 'Actif' : m.status === 'pending' ? 'En attente' : 'Inactif'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!statsLoading && (!stats?.members || stats.members.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">Aucun membre pour l'instant</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                Invitez vos agents et collaborateurs pour qu'ils créent leurs portfolios Business.
              </p>
              <Button onClick={() => navigate('/business/members')} style={{ backgroundColor: primaryColor }} className="text-white">
                <UserPlus className="mr-2 h-4 w-4" /> Inviter des membres
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, iconBg, progress, progressColor,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; iconBg: string;
  progress?: number; progressColor?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: progressColor || '#1a1a2e' }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionCard({
  icon, iconBg, title, desc, onClick,
}: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string; onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group border hover:border-gray-300"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: iconBg }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
      </CardContent>
    </Card>
  );
}

export default BusinessDashboard;
