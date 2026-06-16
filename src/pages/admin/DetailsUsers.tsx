import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Globe,
  Shield,
  HardDrive,
  Activity,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { Skeleton } from '@/components/ui/skeleton';
import UserPaiementHistorique from '@/components/admin/UserPaiementHistorique';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// Types
interface UserData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  prenom?: string;
  nom?: string;
  phone?: string;
  photo_profil?: string;
  profile_image_url?: string;
  is_active: boolean;
  verified: boolean;
  date_inscription: string;
  last_login?: string;
  current_plan?: Plan;
  plan_name?: string;
  plan_price_cents?: number;
  plan_currency?: string;
}

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  status: string;
  start_date: string;
  end_date?: string;
}

interface Portfolio {
  id: number;
  titre: string;
  title?: string;
  utilisateur_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

interface PortfolioStats {
  visit_count_30d: number;
  visit_count_total: number;
}

interface CarteNFC {
  id: string;
  uid_nfc: string;
  lien_portfolio?: string;
  status: string;
  created_at: string;
}

export default function DetailsUsers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [cartes, setCartes] = useState<CarteNFC[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<Record<number, PortfolioStats>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: '', title: '', description: '' });

  const token = localStorage.getItem('token');

  const fetchAllData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [
        userRes,
        plansRes,
        portfoliosRes,
        cartesRes,
        sessionsRes
      ] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/users/${id}/plans`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/portfolios?user_id=${id}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/users/${id}/cartes`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        , fetch(`${API_BASE}/api/admin/users/${id}/sessions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // Traiter les réponses
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user || null);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      // parse portfolios once and reuse to avoid consuming the response body twice
      const portfoliosData = portfoliosRes.ok ? await portfoliosRes.json() : { portfolios: [] };
      setPortfolios(portfoliosData.portfolios || []);

      if (cartesRes.ok) {
        const cartesData = await cartesRes.json();
        setCartes(cartesData.cartes || []);
      }

      // load sessions from admin endpoint (sessions table)
      try {
        if (sessionsRes && sessionsRes.ok) {
          const sdata = await sessionsRes.json();
          setSessions(sdata.sessions || []);
        } else {
          setSessions([]);
        }
      } catch (e) {
        console.warn('Failed to load user sessions', e);
        setSessions([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioStats = async (portfolioId: number) => {
    try {
      // Use analytics summary endpoint (ownership + range handled in controller)
      const res = await fetch(`${API_BASE}/api/analytics/summary?portfolio_id=${portfolioId}&range=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Map to expected minimal shape used by the UI
        return {
          visit_count_30d: (data.totals && Number(data.totals.total_visits)) || 0,
          visit_count_total: (data.totals && Number(data.totals.total_visits)) || 0,
          countries: data.countries || [],
          perDay: data.perDay || []
        };
      }
    } catch (error) {
      console.warn('Error fetching portfolio stats:', error);
    }
    return null;
  };

  useEffect(() => {
    if (id) {
      fetchAllData();
    }
  }, [id]);

  useEffect(() => {
    // Récupérer les stats pour chaque portfolio
    const fetchAllStats = async () => {
      const statsMap: Record<number, PortfolioStats> = {};
      for (const portfolio of portfolios) {
        const stats = await fetchPortfolioStats(portfolio.id);
        if (stats) {
          statsMap[portfolio.id] = stats;
        }
      }
      setPortfolioStats(statsMap);
    };

    if (portfolios.length > 0) {
      fetchAllStats();
    }
  }, [portfolios]);

  const handleAction = async (action: string) => {
    if (!user) return;

    try {
      let url = `${API_BASE}/api/admin/users/${user.id}`;
      let method = 'PUT';
      let body;

      switch (action) {
        case 'activate':
          url += '/activate';
          break;
        case 'deactivate':
          url += '/deactivate';
          break;
        case 'verify':
          url += '/verify';
          break;
        case 'delete':
          method = 'DELETE';
          break;
        case 'reset_password':
          url += '/reset-password';
          body = JSON.stringify({ send_email: true });
          break;
        default:
          return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body
      });

      if (!res.ok) throw new Error('Action échouée');

      toast({
        title: 'Succès',
        description: 'Action effectuée avec succès'
      });

      // Recharger les données
      await fetchAllData();
      setActionDialog({ open: false, action: '', title: '', description: '' });

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Action impossible',
        variant: 'destructive'
      });
    }
  };

  const confirmAction = (action: string) => {
    const actions = {
      activate: {
        title: 'Activer l\'utilisateur',
        description: 'L\'utilisateur pourra se connecter et utiliser l\'application.'
      },
      deactivate: {
        title: 'Désactiver l\'utilisateur',
        description: 'L\'utilisateur ne pourra plus se connecter à l\'application.'
      },
      verify: {
        title: 'Vérifier l\'utilisateur',
        description: 'Marquer l\'email de l\'utilisateur comme vérifié.'
      },
      delete: {
        title: 'Supprimer l\'utilisateur',
        description: 'Cette action est irréversible. Toutes les données associées seront supprimées.'
      },
      reset_password: {
        title: 'Réinitialiser le mot de passe',
        description: 'Un email de réinitialisation sera envoyé à l\'utilisateur.'
      }
    };

    setActionDialog({
      open: true,
      action,
      title: actions[action as keyof typeof actions]?.title || '',
      description: actions[action as keyof typeof actions]?.description || ''
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  const getInitials = (user: UserData) => {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">

        <main className="flex-1 p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">

        <main className="flex-1 p-6 max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateur introuvable</CardTitle>
              <CardDescription>L'utilisateur avec l'ID {id} n'existe pas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(-1)}>Retour à la liste</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const totalVisits30d = Object.values(portfolioStats).reduce(
    (acc, stats) => acc + (stats?.visit_count_30d || 0), 0
  );

  const totalVisitsAllTime = Object.values(portfolioStats).reduce(
    (acc, stats) => acc + (stats?.visit_count_total || 0), 0
  );

  const activePlan = plans.find(p => p.status === 'active') || user.current_plan;

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col font-sans">


      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Navigation & Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              <span className="hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => navigate('/admin/users')}>Annuaire</span>
              <span className="text-gray-200">/</span>
              <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">Profil #{id?.slice(-4)}</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              {user.prenom || user.first_name} {user.nom || user.last_name}
              {user.verified && <CheckCircle className="h-6 w-6 text-emerald-500" />}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/admin/users')}
              className="h-12 rounded-2xl border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-100 font-bold px-6 transition-all"
            >
              Retour à la liste
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={fetchAllData}
              className="h-12 w-12 rounded-2xl border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-100 flex items-center justify-center p-0 transition-all font-bold"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <div className="h-10 w-[1px] bg-gray-100 mx-2 hidden sm:block" />

            <Button
              variant="destructive"
              size="lg"
              onClick={() => confirmAction('delete')}
              className="h-12 rounded-2xl font-black px-8 shadow-2xl shadow-red-100 transition-all hover:scale-105 active:scale-95 bg-red-500 hover:bg-red-600 border-none"
            >
              <Trash2 className="h-5 w-5 mr-3" />
              Supprimer le compte
            </Button>
          </div>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-auto">

          {/* 1. Identity Card (Bento Large) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-1 md:col-span-2 lg:col-span-8 bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-[#f5f5f5] p-10 flex flex-col lg:flex-row gap-10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-50/30 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:bg-indigo-100/30 transition-all duration-700" />

            <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="relative mb-8 group/avatar">
                <div className="absolute inset-0 bg-indigo-500 rounded-[3.5rem] blur-2xl opacity-10 group-hover/avatar:opacity-20 transition-opacity" />
                <Avatar className="h-44 w-44 border-[10px] border-white shadow-3xl rounded-[3.5rem] relative z-10">
                  <AvatarImage src={user.photo_profil || user.profile_image_url} />
                  <AvatarFallback className="text-5xl bg-indigo-50 text-indigo-600 font-black">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-emerald-500 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white z-20">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                  <div className="bg-indigo-600 text-white font-black text-[9px] tracking-[0.2em] px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-100 uppercase">
                    PRO ARCHITECTE
                  </div>
                  <Badge className={`border-none font-black text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-xl uppercase ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? 'Statut Actif' : 'Compte Suspendu'}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                    {user.prenom || user.first_name} <br />
                    <span className="text-slate-400 font-black">{user.nom || user.last_name}</span>
                  </h2>
                </div>
                <div className="flex flex-col gap-2 pt-2 text-slate-500 font-bold text-sm">
                  <div className="flex items-center gap-3 justify-center lg:justify-start"><div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center"><Mail className="h-4 w-4 text-slate-400" /></div> {user.email}</div>
                  <div className="flex items-center gap-3 justify-center lg:justify-start"><div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center"><Phone className="h-4 w-4 text-slate-400" /></div> {user.phone || 'Aucun mobile'}</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-7 bg-[#fbfbfb] rounded-[2.5rem] border border-[#f0f0f0] group/info hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 cursor-default">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Membre depuis</p>
                  <p className="text-xl font-black text-slate-900">{format(new Date(user.date_inscription), 'd MMM yyyy', { locale: fr })}</p>
                  <Calendar className="h-5 w-5 text-indigo-500 mt-4 opacity-30 group-hover/info:opacity-100 group-hover/info:scale-110 transition-all" />
                </div>
                <div className="p-7 bg-[#fbfbfb] rounded-[2.5rem] border border-[#f0f0f0] group/info hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 cursor-default">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Disponibilité</p>
                  <p className="text-xl font-black text-slate-900">{user.last_login ? 'En ligne' : 'Inactif'}</p>
                  <div className="h-2 w-10 bg-emerald-500 rounded-full mt-6 shadow-[0_0_15px_rgba(16,185,129,0.3)] anim-pulse" />
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4">
                <button onClick={() => confirmAction(user.is_active ? 'deactivate' : 'activate')} className={`p-5 rounded-[2rem] font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${user.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                  <Activity className="h-4 w-4" />
                  {user.is_active ? 'Désactiver le compte' : 'Activer le compte'}
                </button>
                <button className="p-5 bg-slate-900 rounded-[2rem] text-white font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier Profile
                </button>
              </div>
            </div>
          </motion.div>

          {/* 2. Subscription Card (Bento Square) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 md:col-span-2 lg:col-span-4 bg-indigo-600 rounded-[3rem] shadow-3xl shadow-indigo-200 p-10 flex flex-col justify-between group overflow-hidden relative text-white"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="h-16 w-16 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 group-hover:rotate-6 transition-transform">
                  <CreditCard className="h-8 w-8" />
                </div>
                {activePlan && (
                  <div className="px-5 py-2 rounded-2xl bg-white text-indigo-600 text-[10px] font-black tracking-widest uppercase shadow-xl">
                    {activePlan.status}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Offre Souscrite</p>
                {activePlan ? (
                  <>
                    <h3 className="text-4xl font-black tracking-tight">{activePlan.name}</h3>
                    <div className="text-3xl font-light text-white/70 mt-4 leading-none">
                      <span className="text-white font-black">{(activePlan.price_cents || 0).toLocaleString('fr-FR')}</span>
                      <span className="text-lg font-bold ml-2">{activePlan.currency || 'F CFA'}</span>
                    </div>
                  </>
                ) : (
                  <h3 className="text-4xl font-black text-indigo-400/50">PLAN GRATUIT</h3>
                )}
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-white/10 relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-2">Expirant le</p>
                  <p className="font-black text-xl">{activePlan?.end_date ? format(new Date(activePlan.end_date), 'd MMMM yyyy', { locale: fr }) : 'A vie'}</p>
                </div>
                <div className="h-12 w-12 rounded-2l bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 cursor-pointer transition-all shadow-xl">
                  <ExternalLink className="h-6 w-6" />
                </div>
              </div>
              <button className="w-full h-16 rounded-3xl bg-white text-indigo-600 font-black text-lg shadow-xl shadow-indigo-900/20 transition-all hover:translate-y-[-4px] hover:shadow-2xl active:scale-[0.98]">
                Audit du Compte
              </button>
            </div>

            <div className="absolute bottom-[-2rem] right-[-2rem] opacity-5 rotate-[-12deg]">
              <Activity className="h-64 w-64" />
            </div>
          </motion.div>

          {/* 3. Portfolios (Bento Table View) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 md:col-span-2 lg:col-span-8 bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-[#f5f5f5] p-10 flex flex-col"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                  <Globe className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Portfolios en ligne</h3>
                  <p className="text-sm text-slate-400 font-bold">{portfolios.length} sites actifs détectés</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Mois en cours</p>
                  <p className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                    {totalVisits30d} <span className="text-[10px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">+12%</span>
                  </p>
                </div>
                <div className="h-10 w-[1px] bg-slate-100" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Total Hits</p>
                  <p className="text-2xl font-black text-slate-900">{totalVisitsAllTime}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {portfolios.length === 0 ? (
                <div className="col-span-2 py-24 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                  <p className="text-slate-400 font-black uppercase text-xs tracking-[0.3em]">Aucun projet publié</p>
                </div>
              ) : (
                portfolios.map((portfolio) => (
                  <div key={portfolio.id} className="group/item relative overflow-hidden bg-[#fafafa] p-6 rounded-[2.5rem] border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl group-hover/item:bg-slate-900 group-hover/item:text-white transition-all duration-500">
                        {portfolio.titre?.[0] || 'P'}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/admin/portfolios/${portfolio.id}`)} className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button onClick={() => navigate(`/admin/portfolios/${portfolio.id}/edit`)} className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-lg font-black text-slate-900 mb-2 truncate group-hover/item:text-indigo-600 transition-colors">
                      {portfolio.titre || portfolio.title || `Projet #${portfolio.id}`}
                    </h4>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        {portfolioStats[portfolio.id]?.visit_count_30d || 0} vues
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                        {format(new Date(portfolio.created_at), 'MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* 4. Mini Stats & NFC (Vertical Group) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-1 gap-6">
            {/* NFC & Tools */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-emerald-50/50 rounded-[3rem] border border-emerald-100 p-10 group relative overflow-hidden"
            >
              <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="h-16 w-16 rounded-[2rem] bg-emerald-600 flex items-center justify-center text-white mb-8 shadow-xl shadow-emerald-200 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black text-emerald-950 tracking-tight">Cartes NFC</h3>
                <p className="text-slate-500 font-bold mb-8 text-sm">{cartes.length} dispositifs liés au compte</p>

                <div className="space-y-4">
                  {cartes.map(carte => (
                    <div key={carte.id} className="flex items-center justify-between p-5 bg-white rounded-[1.75rem] border border-emerald-100/50 group/row hover:shadow-xl hover:shadow-emerald-200/20 transition-all">
                      <div>
                        <div className="text-xs font-black text-emerald-950 font-mono tracking-tighter uppercase">{carte.uid_nfc}</div>
                        <p className="text-[9px] font-bold text-emerald-400 uppercase mt-1">Actif (Link ID 2)</p>
                      </div>
                      <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  ))}
                  {cartes.length === 0 && (
                    <div className="py-8 text-center text-emerald-900/30 font-black text-[10px] tracking-[0.2em]">AUCUNE CARTE</div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Security Sessions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-[#f5f5f5] p-10 group"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100">
                  <Shield className="h-6 w-6" />
                </div>
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Voir log</button>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Sécurité & Accès</h3>
              <p className="text-sm text-slate-400 font-bold mb-8">Dernières sessions vérifiées</p>

              <div className="space-y-4">
                {sessions.slice(0, 3).map((session, i) => (
                  <div key={i} className="flex items-center gap-4 group/sess">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg group-hover/sess:bg-orange-50 transition-colors">
                      {session.user_agent?.toLowerCase().includes('mobile') ? '📱' : '💻'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tighter">{session.user_agent?.split(' ')[0] || 'Browser Unknown'}</div>
                      <div className="text-[10px] text-slate-400 font-bold font-mono">{session.ip_address || '127.0.0.1'}</div>
                    </div>
                    <div className="text-[9px] font-black text-slate-300 uppercase shrink-0">
                      {session.created_at ? format(new Date(session.created_at), 'HH:mm') : '00:00'}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-slate-300 italic text-center py-6 text-[10px] font-black tracking-widest">AUCUNE SESSION</p>}
              </div>
            </motion.div>
          </div>

          {/* 5. Payments Preview (Bento Wide) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="col-span-1 md:col-span-2 lg:col-span-12 bg-slate-900 rounded-[4rem] p-12 shadow-3xl shadow-slate-200 text-white relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-indigo-500/10 rounded-full blur-[100px] -mr-64 -mt-64 group-hover:scale-110 transition-transform duration-[2000ms]" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
              <div>
                <h3 className="text-4xl font-black tracking-tight">Registre des Transactions</h3>
                <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em] mt-3 bg-white/5 py-1 px-3 rounded-lg inline-block">Finance & Facturation</p>
              </div>
              <button onClick={() => setActiveTab('paiements')} className="bg-white text-slate-900 hover:bg-white/90 font-black text-xs uppercase tracking-widest px-10 h-16 rounded-[2rem] shadow-2xl shadow-black/20 flex items-center gap-3 transition-all hover:translate-y-[-4px] active:scale-[0.98]">
                Ouvrir l'historique complet
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex flex-col justify-between hover:bg-white/10 transition-all group/item">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Dernier versement</p>
                  <p className="text-4xl font-black">15 000 <span className="text-sm font-bold text-slate-400">CFA</span></p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">OM - Octobre 2023</span>
                  <span className="h-2 w-10 bg-emerald-500 rounded-full" />
                </div>
              </div>

              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex flex-col justify-between hover:bg-white/10 transition-all opacity-50 grayscale group/item">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-6">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prochaine échéance</p>
                  <p className="text-4xl font-black">15 000 <span className="text-sm font-bold text-slate-400">CFA</span></p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Prévu en Nov</span>
                  <span className="h-2 w-10 bg-slate-700 rounded-full" />
                </div>
              </div>

              <div className="p-8 bg-indigo-500 rounded-[2.5rem] flex flex-col justify-between shadow-2xl shadow-indigo-900/50 hover:bg-indigo-400 transition-all cursor-pointer">
                <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Impact Financier</p>
                  <p className="text-4xl font-black text-white">LTV +120k <span className="text-sm font-bold text-indigo-100">CFA</span></p>
                </div>
                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] mt-8">Générer un rapport PDF →</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Confirmation Modal */}
        <AnimatePresence>
          {actionDialog.open && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActionDialog(p => ({ ...p, open: false }))}
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                <div className={`p-10 text-white ${actionDialog.action === 'delete' ? 'bg-red-500' : 'bg-indigo-600'}`}>
                  <div className="h-20 w-20 rounded-[2.5rem] bg-white/20 flex items-center justify-center mb-6">
                    {actionDialog.action === 'delete' ? <Trash2 className="h-10 w-10" /> : <Shield className="h-10 w-10" />}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-2">{actionDialog.title}</h2>
                  <p className="text-white/70 font-bold text-lg leading-relaxed">{actionDialog.description}</p>
                </div>
                <div className="p-10 bg-slate-50 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setActionDialog(p => ({ ...p, open: false }))}
                    className="flex-1 h-16 rounded-[2rem] bg-white border-2 border-slate-100 font-black text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleAction(actionDialog.action)}
                    className={`flex-1 h-16 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-95 ${actionDialog.action === 'delete' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                  >
                    Confirmer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Overlay Modals (Payments) */}
        <AnimatePresence>
          {activeTab === 'paiements' && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveTab('info')}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className="relative bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[4rem] shadow-[0_50px_150px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-white"
              >
                <div className="p-10 pb-6 flex items-center justify-between border-b border-slate-50">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
                      <CreditCard className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registre des Paiements</h2>
                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Audit financier complet</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('info')} className="h-14 w-14 rounded-3xl bg-slate-50 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center text-slate-300">
                    <XCircle className="h-7 w-7" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 pt-6 custom-scrollbar bg-[#fdfdfd]">
                  <UserPaiementHistorique
                    userId={Number(user.id)}
                    userName={`${user.prenom || user.first_name} ${user.nom || user.last_name}`}
                    onClose={() => setActiveTab('info')}
                  />
                </div>
                <div className="p-10 bg-white border-t border-slate-50 flex justify-end">
                  <button onClick={() => setActiveTab('info')} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-xl">Fermer la vue</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
      <Footer />
    </div>
  );
}