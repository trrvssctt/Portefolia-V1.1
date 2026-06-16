import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/hooks/useAuth';
import BusinessNav from '@/components/business/BusinessNav';
import { PortfolioForm } from '@/components/dashboard/PortfolioForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Edit, Trash2, BarChart3, Globe, Lock,
  FolderOpen, Search, Copy, ExternalLink, ArrowLeft,
  Clock, Activity, Building2, AlertCircle,
} from 'lucide-react';
import { DeletePortfolioModal } from '@/components/portfolio/DeletePortfolioModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface Portfolio {
  id: string;
  title: string;
  slug: string;
  bio?: string;
  is_public: boolean;
  profile_image_url?: string;
  theme_color?: string;
  created_at: string;
  views_count?: number;
}

function PortfolioCard({
  portfolio, onCopyLink, onView, onEdit, onDelete,
}: {
  portfolio: Portfolio;
  onCopyLink: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const accent = portfolio.theme_color || '#1a1a2e';
  const initials = portfolio.title
    ? portfolio.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'P';

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      <div
        className="relative h-24 flex items-end px-5 pb-0"
        style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}48 100%)` }}
      >
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: accent }} />
        <div className="absolute top-3 right-4">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            portfolio.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {portfolio.is_public ? <><Globe className="w-3 h-3" />Public</> : <><Lock className="w-3 h-3" />Privé</>}
          </span>
        </div>
        <div className="absolute bottom-0 left-5 translate-y-1/2">
          {portfolio.profile_image_url ? (
            <img src={portfolio.profile_image_url} alt={portfolio.title} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-base font-bold text-white" style={{ background: accent }}>
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-5 pt-9 pb-4 space-y-2">
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{portfolio.title}</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">/{portfolio.slug}</p>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed min-h-[2rem]">
          {portfolio.bio || <span className="italic text-gray-300">Aucune description</span>}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span className="font-semibold text-gray-700">{(portfolio.views_count ?? 0).toLocaleString('fr-FR')}</span>
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {portfolio.created_at && !isNaN(new Date(portfolio.created_at).getTime())
              ? format(new Date(portfolio.created_at), 'd MMM yyyy', { locale: fr })
              : '—'}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-1 bg-gray-50/50">
        <div className="flex items-center gap-1">
          <ActionBtn title="Copier le lien" onClick={onCopyLink}><Copy className="w-3.5 h-3.5" /></ActionBtn>
          <ActionBtn title="Voir en ligne" onClick={onView}><ExternalLink className="w-3.5 h-3.5" /></ActionBtn>
        </div>
        <div className="flex items-center gap-1">
          <ActionBtn title="Modifier" onClick={onEdit} className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"><Edit className="w-3.5 h-3.5" /></ActionBtn>
          <ActionBtn title="Supprimer" onClick={onDelete} className="text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, title, onClick, className = 'text-gray-500 hover:text-gray-800 hover:bg-gray-100' }: {
  children: React.ReactNode; title: string; onClick: () => void; className?: string;
}) {
  return (
    <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg transition-colors ${className}`}>
      {children}
    </button>
  );
}

const BusinessPortfolios: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, member, loading: businessLoading } = useBusiness();
  const { profile, signOut } = useAuth();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotaCount, setQuotaCount] = useState(0);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  const primaryColor = account?.primary_color || '#1a1a2e';
  const secondaryColor = account?.secondary_color || '#16213e';
  const portfolioLimit = member?.portfolio_limit ?? 10;
  const isAtLimit = quotaCount >= portfolioLimit;
  const quotaPct = Math.min((quotaCount / portfolioLimit) * 100, 100);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/auth'); return; }
    try {
      const [portfolioRes, limitRes] = await Promise.all([
        fetch(`${API_BASE}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/business/portfolio-limit`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (portfolioRes.ok) {
        const json = await portfolioRes.json();
        const mapped = (json.portfolios || []).map((p: any) => ({
          ...p,
          slug: p.slug || p.url_slug || p.url || '',
          title: p.title || p.titre || p.nom || '',
          profile_image_url: p.profile_image_url || p.photo || p.avatar || '',
          created_at: p.date_creation || p.created_at || null,
          is_public: p.is_public !== undefined ? p.is_public : (p.est_public !== undefined ? p.est_public : true),
        }));
        setPortfolios(mapped);
      }

      if (limitRes.ok) {
        const limitJson = await limitRes.json();
        setQuotaCount(limitJson.count ?? 0);
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les portfolios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!businessLoading) loadData();
  }, [businessLoading]);

  const filtered = useMemo(() => {
    let result = [...portfolios];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.slug || '').toLowerCase().includes(q) ||
        (p.bio || '').toLowerCase().includes(q)
      );
    }
    if (visibilityFilter !== 'all') {
      result = result.filter(p => visibilityFilter === 'public' ? p.is_public : !p.is_public);
    }
    return result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [portfolios, searchTerm, visibilityFilter]);

  const handleDelete = (portfolio: Portfolio) => setDeleteTarget(portfolio);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Portfolio supprimé' });
      setDeleteTarget(null);
      loadData();
    } catch {
      toast({ title: 'Erreur', description: 'Suppression impossible', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = async (portfolio: Portfolio) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${portfolio.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = res.ok ? await res.json() : null;
      setEditingPortfolio(json?.portfolio || portfolio);
    } catch {
      setEditingPortfolio(portfolio);
    }
    setShowPortfolioForm(true);
  };

  const openCreate = () => {
    if (isAtLimit) {
      toast({ title: 'Quota atteint', description: `Votre limite est de ${portfolioLimit} portfolios.`, variant: 'destructive' });
      return;
    }
    setEditingPortfolio(null);
    setShowPortfolioForm(true);
  };

  if (loading || businessLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BusinessNav onSignOut={signOut} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DeletePortfolioModal
        open={!!deleteTarget}
        portfolioTitle={deleteTarget?.title || ''}
        deleting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <BusinessNav onSignOut={signOut} />

      {/* Modal */}
      {showPortfolioForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:h-[92vh] h-[96vh] flex flex-col overflow-hidden">
            <PortfolioForm
              portfolio={editingPortfolio || undefined}
              isBusiness
              businessAccount={account ?? undefined}
              onClose={() => { setShowPortfolioForm(false); setEditingPortfolio(null); }}
              onSuccess={() => { setShowPortfolioForm(false); setEditingPortfolio(null); loadData(); }}
            />
          </div>
        </div>
      )}

      {/* Header gradient */}
      <div
        className="relative overflow-hidden py-8 px-4"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-white" />
        </div>
        <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/business/member')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {account?.company_logo_url && !account.company_logo_url.startsWith('data:') ? (
                  <img src={account.company_logo_url} alt={account.company_name} className="h-7 w-7 object-contain rounded" />
                ) : (
                  <Building2 className="h-5 w-5 text-white/70" />
                )}
                <span className="text-white/70 text-sm">{account?.company_name}</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Mes Portfolios</h1>
            </div>
          </div>
          <Button
            onClick={openCreate}
            disabled={isAtLimit}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 h-9 px-4 font-semibold shrink-0 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau portfolio
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Quota bar */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {quotaCount} / {portfolioLimit} portfolios utilisés
            </span>
            {isAtLimit ? (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Limite atteinte
              </span>
            ) : (
              <span className="text-xs text-gray-400">{portfolioLimit - quotaCount} emplacement{portfolioLimit - quotaCount > 1 ? 's' : ''} libre{portfolioLimit - quotaCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quotaPct}%`,
                backgroundColor: quotaPct >= 100 ? '#ef4444' : quotaPct >= 80 ? '#f59e0b' : primaryColor,
              }}
            />
          </div>
        </div>

        {/* Search + filter */}
        {portfolios.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un portfolio…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'public', 'private'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setVisibilityFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    visibilityFilter === v
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={visibilityFilter === v ? { backgroundColor: primaryColor } : {}}
                >
                  {v === 'all' ? 'Tous' : v === 'public' ? 'Publics' : 'Privés'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: portfolios.length },
            { label: 'Publics', value: portfolios.filter(p => p.is_public).length },
            { label: 'Vues', value: portfolios.reduce((a, p) => a + (p.views_count || 0), 0).toLocaleString('fr-FR') },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Portfolio grid */}
        {portfolios.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 px-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${primaryColor}15` }}>
              <FolderOpen className="w-10 h-10" style={{ color: primaryColor }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun portfolio</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              Créez votre premier portfolio pour présenter vos réalisations au sein de {account?.company_name || "votre entreprise"}.
            </p>
            <Button onClick={openCreate} className="text-white font-semibold px-8" style={{ backgroundColor: primaryColor }}>
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier portfolio
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 px-6 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun portfolio ne correspond à votre recherche.</p>
            <button onClick={() => { setSearchTerm(''); setVisibilityFilter('all'); }} className="mt-3 text-xs underline text-gray-400 hover:text-gray-600">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            {(searchTerm || visibilityFilter !== 'all') && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4 text-gray-400" />
                <span><span className="font-semibold text-gray-700">{filtered.length}</span> portfolio{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(portfolio => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onCopyLink={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/portfolio/${portfolio.slug}`);
                    toast({ title: 'Lien copié !' });
                  }}
                  onView={() => window.open(`/portfolio/${portfolio.slug}`, '_blank')}
                  onEdit={() => openEdit(portfolio)}
                  onDelete={() => handleDelete(portfolio)}
                />
              ))}
              {!isAtLimit && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="group rounded-2xl border-2 border-dashed border-gray-200 hover:border-opacity-100 hover:bg-opacity-5 transition-all flex flex-col items-center justify-center gap-3 py-12 px-6 text-center"
                  style={{ '--hover-color': primaryColor } as any}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = primaryColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">Nouveau portfolio</p>
                  <p className="text-xs text-gray-400">{portfolioLimit - quotaCount} emplacement{portfolioLimit - quotaCount > 1 ? 's' : ''} libre{portfolioLimit - quotaCount > 1 ? 's' : ''}</p>
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BusinessPortfolios;
