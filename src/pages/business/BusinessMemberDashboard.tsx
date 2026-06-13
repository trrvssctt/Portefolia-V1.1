import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import { PortfolioForm } from '@/components/dashboard/PortfolioForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Eye, ArrowRight, Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const BusinessMemberDashboard: React.FC = () => {
  const { account, member, loading } = useBusiness();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [portfolioCount, setPortfolioCount] = useState<number | null>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const portfolioLimit = member?.portfolio_limit ?? 10;

  const isPending = profile?.is_active === false || profile?.is_active === 0;
  const primaryColor = account?.primary_color || '#1a1a2e';
  const secondaryColor = account?.secondary_color || '#16213e';
  const accentColor = account?.accent_color || '#0f3460';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE}/api/business/portfolio-limit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPortfolioCount(data.count ?? 0))
      .catch(() => {});

    fetch(`${API_BASE}/api/portfolios`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setPortfolios((data.portfolios || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  const canCreate = portfolioCount !== null && portfolioCount < portfolioLimit;
  const quotaPct = portfolioCount !== null ? Math.min((portfolioCount / portfolioLimit) * 100, 100) : 0;
  const quotaColor = quotaPct >= 90 ? '#ef4444' : quotaPct >= 70 ? '#f59e0b' : primaryColor;

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
                  .then(data => {
                    const all = data.portfolios || [];
                    setPortfolios(all.slice(0, 4));
                    setPortfolioCount(all.length);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        </div>
      )}

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, ${accentColor} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white" />
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
                Bonjour, {(profile as any)?.prenom || (user as any)?.prenom || 'Collaborateur'} 👋
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                {account?.company_name || 'Espace Business'} — Votre espace portfolios
              </p>
            </div>
          </div>
          <div>
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
            <p className="text-sm text-amber-800">
              Votre compte est en cours de validation par votre administrateur. Certaines fonctionnalités seront disponibles dès l'activation.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Quota + actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quota */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mes portfolios</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {portfolioCount ?? '—'}
                    </span>
                    <span className="text-base text-gray-400 font-normal">/ {portfolioLimit}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <FolderOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{canCreate ? `${portfolioLimit - (portfolioCount ?? 0)} emplacements libres` : 'Limite atteinte'}</span>
                  <span>{Math.round(quotaPct)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${quotaPct}%`, backgroundColor: quotaColor }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardContent className="p-6 flex flex-col justify-between h-full gap-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions rapides</p>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowPortfolioForm(true)}
                  className="w-full text-white justify-between group"
                  style={{ backgroundColor: primaryColor }}
                  disabled={!canCreate}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Créer un portfolio
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/business/portfolios')}
                  className="w-full justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" /> Voir mes portfolios
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolios récents */}
        {portfolios.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Portfolios récents</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/business/portfolios')} className="text-xs gap-1">
                Voir tous <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portfolios.map((p: any) => {
                const title = p.titre || p.title || p.nom || 'Portfolio';
                const slug = p.url_slug || p.slug || '';
                const isPublic = p.is_public !== undefined ? p.is_public : p.est_public;
                return (
                  <Card key={p.id} className="group hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/business/portfolios')}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                          <FolderOpen className="h-4 w-4" style={{ color: primaryColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                          {slug && <p className="text-xs text-gray-400 truncate">/{slug}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className={isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                        >
                          {isPublic ? 'Public' : 'Privé'}
                        </Badge>
                        <Eye className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty portfolios state */}
        {portfolios.length === 0 && portfolioCount === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 mb-1">Pas encore de portfolio</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                Créez votre premier portfolio Business pour présenter votre profil et vos réalisations.
              </p>
              <Button onClick={() => setShowPortfolioForm(true)} style={{ backgroundColor: primaryColor }} className="text-white" disabled={!canCreate}>
                <Plus className="mr-2 h-4 w-4" /> Créer mon premier portfolio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info entreprise */}
        {account && (
          <Card className="border-gray-100">
            <CardContent className="flex items-center gap-4 p-4">
              {account.company_logo_url ? (
                <img src={account.company_logo_url} alt={account.company_name} className="h-10 w-auto object-contain rounded" />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                  <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{account.company_name}</p>
                <p className="text-xs text-gray-500">Vous êtes agent de cet espace Business</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default BusinessMemberDashboard;
