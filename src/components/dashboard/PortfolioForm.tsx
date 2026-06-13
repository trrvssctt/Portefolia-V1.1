import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { BannerCustomizer } from '@/components/portfolio/BannerCustomizer';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  User, MapPin, Phone, Link2, Github, Linkedin, Globe, Facebook, Instagram,
  Palette, AlertCircle, Sparkles, Plus, Trash2, Calendar, Lock, X,
  Briefcase, Code2, Star, Info, Crown, Zap, CheckCircle2, ArrowRight,
  Building2, Type, Layout,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

type PlanType = 'free' | 'starter' | 'pro' | 'business';

interface PlanLimits {
  socials: number;
  projects: number;
  competences: number;
  experiences: number;
}

interface PortfolioFormProps {
  portfolio?: any;
  onClose?: () => void;
  onSuccess?: () => void;
  isBusiness?: boolean;
  businessAccount?: {
    company_name?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    company_logo_url?: string | null;
  };
}

// ─── Configuration par plan ──────────────────────────────────────────────────
const PLAN_CONFIG: Record<PlanType, {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  limits: PlanLimits;
  features: string[];
}> = {
  free: {
    label: 'Gratuit',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: <Star className="w-3.5 h-3.5" />,
    limits: { socials: 1, projects: 0, competences: 0, experiences: 0 },
    features: ['1 portfolio', 'Photo + biographie', '1 lien social (LinkedIn)'],
  },
  starter: {
    label: 'Starter',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: <Zap className="w-3.5 h-3.5" />,
    limits: { socials: 3, projects: 3, competences: 3, experiences: 0 },
    features: ['5 portfolios', '3 liens sociaux', '3 projets', '3 compétences'],
  },
  pro: {
    label: 'Pro',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    limits: { socials: 5, projects: 10, competences: 10, experiences: 5 },
    features: ['20 portfolios', '5 liens sociaux', '10 projets', '10 compétences', '5 expériences'],
  },
  business: {
    label: 'Business',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: <Crown className="w-3.5 h-3.5" />,
    limits: { socials: 5, projects: 9999, competences: 9999, experiences: 9999 },
    features: ['Portfolios illimités', '5 liens sociaux', 'Projets illimités', 'Compétences illimitées', 'Expériences illimitées'],
  },
};

const PLAN_ORDER: PlanType[] = ['free', 'starter', 'pro', 'business'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const displayLimit = (n: number) => (n >= 9999 ? '∞' : String(n));

const mapDomainToEnum = (domain: string | null | undefined): string | null => {
  if (!domain) return null;
  const s = String(domain).toLowerCase();
  if (s.includes('tech')) return 'TECH';
  if (s.includes('médec') || s.includes('medec') || s.includes('med')) return 'MEDECINE';
  if (s.includes('jurid') || s.includes('droit')) return 'DROIT';
  if (s.includes('agro') || s.includes('agric')) return 'AGRO';
  return 'TECH';
};

const ensureUrl = (v: any) => {
  if (!v || typeof v !== 'string') return v;
  const s = v.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return s;
  return `https://${s}`;
};

// ─── Sous-composants ──────────────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  title,
  count,
  total,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  total?: number | string;
}) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 rounded-lg bg-gray-100">{icon}</div>
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
    </div>
    {typeof count === 'number' && total !== undefined && (
      <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
        {count} / {total}
      </span>
    )}
  </div>
);

const LockedSection = ({
  title,
  requiredPlan,
  onUpgrade,
}: {
  title: string;
  requiredPlan: string;
  onUpgrade: () => void;
}) => (
  <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 bg-gray-50/80 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Lock className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Disponible à partir du plan <strong>{requiredPlan}</strong>
        </p>
      </div>
    </div>
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onUpgrade}
      className="shrink-0 text-[#28A745] border-[#28A745] hover:bg-green-50 font-semibold text-xs gap-1"
    >
      Upgrader <ArrowRight className="w-3.5 h-3.5" />
    </Button>
  </div>
);

// Composant pour une expérience individuelle
const ExperienceItem = ({
  experience,
  index,
  onUpdate,
  onDelete,
  hasError,
  dateError
}: {
  experience: any;
  index: number;
  onUpdate: (updatedExp: any) => void;
  onDelete: () => void;
  hasError: boolean;
  dateError: string | null;
}) => {
  // ✅ Les hooks sont maintenant au niveau supérieur du composant
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const debutDate = experience.date_debut ? new Date(experience.date_debut) : undefined;
  const finDate = experience.date_fin ? new Date(experience.date_fin) : undefined;

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'MMMM yyyy', { locale: fr });
  };

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all duration-200 ${hasError
        ? 'border-red-300 bg-red-50/50 ring-1 ring-red-200'
        : 'border-gray-200 bg-gray-50/50'
      }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Expérience {index + 1}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Titre du poste *</Label>
          <Input
            value={experience.titre_poste}
            onChange={ev => onUpdate({ ...experience, titre_poste: ev.target.value })}
            placeholder="Développeur Full Stack"
            className="h-10 text-sm"
            required
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Entreprise *</Label>
          <Input
            value={experience.entreprise}
            onChange={ev => onUpdate({ ...experience, entreprise: ev.target.value })}
            placeholder="Nom de l'entreprise"
            className="h-10 text-sm"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Date de début - Calendrier */}
        <div className="relative">
          <Label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <CalendarIcon className="w-3 h-3" /> Date de début *
          </Label>
          <button
            type="button"
            onClick={() => {
              setShowStartCalendar(!showStartCalendar);
              setShowEndCalendar(false);
            }}
            className={`w-full h-10 px-3 text-left text-sm rounded-md border ${hasError && !debutDate ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
              } hover:border-gray-300 transition-colors flex items-center justify-between`}
          >
            <span className={debutDate ? 'text-gray-900' : 'text-gray-400'}>
              {debutDate ? formatDate(debutDate) : 'Sélectionner une date'}
            </span>
            <CalendarIcon className="w-4 h-4 text-gray-400" />
          </button>

          {showStartCalendar && (
            <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <DayPicker
                mode="single"
                selected={debutDate}
                onSelect={(date) => {
                  const newDate = date ? format(date, 'yyyy-MM-dd') : null;
                  onUpdate({ ...experience, date_debut: newDate });
                  setShowStartCalendar(false);
                }}
                locale={fr}
                captionLayout="dropdown-buttons"
                fromYear={1950}
                toYear={new Date().getFullYear()}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Date de fin - Calendrier */}
        <div className="relative">
          <Label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <CalendarIcon className="w-3 h-3" /> Date de fin
            <span className="text-gray-400 ml-1">(vide = en cours)</span>
          </Label>
          <button
            type="button"
            onClick={() => {
              setShowEndCalendar(!showEndCalendar);
              setShowStartCalendar(false);
            }}
            className={`w-full h-10 px-3 text-left text-sm rounded-md border ${hasError && finDate ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
              } hover:border-gray-300 transition-colors flex items-center justify-between`}
          >
            <span className={finDate ? 'text-gray-900' : 'text-gray-400'}>
              {finDate ? formatDate(finDate) : 'En cours'}
            </span>
            <CalendarIcon className="w-4 h-4 text-gray-400" />
          </button>

          {showEndCalendar && (
            <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <DayPicker
                mode="single"
                selected={finDate}
                onSelect={(date) => {
                  const newDate = date ? format(date, 'yyyy-MM-dd') : null;
                  onUpdate({ ...experience, date_fin: newDate });
                  setShowEndCalendar(false);
                }}
                locale={fr}
                captionLayout="dropdown-buttons"
                fromYear={1950}
                toYear={new Date().getFullYear()}
                className="text-sm"
                disabled={{ after: new Date() }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Affichage des erreurs de date */}
      {hasError && dateError && (
        <div className="flex items-center gap-2 p-2 bg-red-100/80 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700 font-medium">{dateError}</p>
        </div>
      )}

      {/* Indicateur de statut "En cours" */}
      {debutDate && !finDate && !hasError && (
        <div className="flex items-center gap-2 p-2 bg-green-100/50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-xs text-green-700 font-medium">Poste actuel - En cours</p>
        </div>
      )}

      {/* Indicateur de validité des dates */}
      {debutDate && finDate && !hasError && (
        <div className="flex items-center gap-2 p-2 bg-green-100/50 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <p className="text-xs text-green-700 font-medium">Dates valides</p>
        </div>
      )}

      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Description</Label>
        <Textarea
          value={experience.description}
          onChange={ev => onUpdate({ ...experience, description: ev.target.value })}
          placeholder="Missions, technologies utilisées, résultats..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
export const PortfolioForm: React.FC<PortfolioFormProps> = ({ portfolio, onClose, onSuccess, isBusiness = false, businessAccount }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<PlanType>('free');

  const plan = PLAN_CONFIG[planType];
  const limits = plan.limits;

  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    linkedin_url: '',
    github_url: '',
    facebook_url: '',
    instagram_url: '',
    profile_image_url: '',
    cv_url: '',
    theme_color: '#28A745',
    banner_type: 'color' as 'color' | 'image',
    banner_color: '#1e293b',
    banner_image_url: '',
    is_public: true,
    projects: [] as any[],
    competences: [] as any[],
    experiences: [] as any[],
    font_family: '',
    layout_style: 'modern' as 'classic' | 'modern' | 'minimal' | 'bold',
  });

  // Détection du plan
  useEffect(() => {
    if (isBusiness) {
      setPlanType('business');
      return;
    }
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/plans/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const { plans } = await res.json();
        if (!plans?.length) return;
        const slug = plans[0].slug?.toString().toLowerCase() || '';
        if (slug.includes('business')) setPlanType('business');
        else if (slug.includes('pro') || slug.includes('professionnel') || slug.includes('professional')) setPlanType('pro');
        else if (slug.includes('starter') || slug.includes('standard')) setPlanType('starter');
        else setPlanType('free');
      } catch { }
    };
    fetchPlan();
  }, [isBusiness]);

  // Chargement des données existantes
  useEffect(() => {
    if (!portfolio) return;
    const relations = portfolio.liens_sociaux || portfolio.socials || portfolio.links || portfolio.relations || [];
    const socialMap: Record<string, string> = {};
    for (const r of relations) {
      const key = (r.plateforme || r.platform || r.name || r.key || '').toString().toLowerCase();
      const val = r.url || r.lien || r.value || r.link || r.href || '';
      if (!val) continue;
      if (key.includes('facebook')) socialMap.facebook_url = /^(https?:)?\/\//i.test(val) ? val : `https://facebook.com/${String(val).replace(/^@/, '')}`;
      else if (key.includes('instagram')) socialMap.instagram_url = /^(https?:)?\/\//i.test(val) ? val : `https://instagram.com/${String(val).replace(/^@/, '')}`;
      else if (key.includes('linkedin')) socialMap.linkedin_url = /^(https?:)?\/\//i.test(val) ? val : `https://linkedin.com/${String(val).replace(/^@/, '')}`;
      else if (key.includes('github')) socialMap.github_url = val;
      else if (key.includes('website') || key.includes('site')) socialMap.website = val;
    }
    setFormData({
      title: portfolio.title || portfolio.titre || '',
      domain: portfolio.domain || portfolio.domaine || '',
      bio: portfolio.bio || portfolio.description || '',
      location: portfolio.location || '',
      phone: portfolio.phone || '',
      website: portfolio.website || socialMap.website || '',
      linkedin_url: portfolio.linkedin_url || socialMap.linkedin_url || '',
      github_url: portfolio.github_url || socialMap.github_url || '',
      facebook_url: portfolio.facebook_url || socialMap.facebook_url || '',
      instagram_url: portfolio.instagram_url || socialMap.instagram_url || '',
      profile_image_url: portfolio.profile_image_url || '',
      cv_url: portfolio.cv_url || portfolio.cv || '',
      theme_color: portfolio.theme_color || '#28A745',
      banner_type: portfolio.banner_type || 'color',
      banner_color: portfolio.banner_color || '#1e293b',
      banner_image_url: portfolio.banner_image_url || '',
      is_public: portfolio.is_public ?? true,
      font_family: portfolio.font_family || '',
      layout_style: portfolio.layout_style || 'modern',
      projects: (portfolio.projects || portfolio.projets || []).map((p: any) => ({
        titre: p.titre || p.title || '',
        description: p.description || '',
        lien_demo: p.lien_demo || p.demo_url || '',
        lien_code: p.lien_code || p.code_url || '',
        image: p.image || p.image_url || null,
      })),
      competences: (portfolio.competences || []).map((c: any) => ({
        nom: c.nom || c.name || '',
        niveau: c.niveau || '',
      })),
      experiences: (portfolio.experiences || []).map((e: any) => ({
        titre_poste: e.titre_poste || e.title || '',
        entreprise: e.entreprise || e.company || '',
        description: e.description || '',
        date_debut: e.date_debut || null,
        date_fin: e.date_fin || null,
      })),
    });
  }, [portfolio]);

  // Définition des liens sociaux avec le plan minimum requis
  const socialFields = [
    { key: 'linkedin_url', label: 'LinkedIn', icon: Linkedin, minPlan: 'free' as PlanType },
    { key: 'website', label: 'Site web', icon: Globe, minPlan: 'starter' as PlanType },
    { key: 'github_url', label: 'GitHub', icon: Github, minPlan: 'starter' as PlanType },
    { key: 'facebook_url', label: 'Facebook', icon: Facebook, minPlan: 'pro' as PlanType },
    { key: 'instagram_url', label: 'Instagram', icon: Instagram, minPlan: 'pro' as PlanType },
  ];

  const visibleSocials = socialFields
    .filter(f => PLAN_ORDER.indexOf(planType) >= PLAN_ORDER.indexOf(f.minPlan))
    .slice(0, limits.socials);

  const filledSocialCount = visibleSocials.filter(f => formData[f.key as keyof typeof formData]).length;

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const mappedDomain = mapDomainToEnum(formData.domain);
    if (!portfolio && !mappedDomain) {
      toast({ title: 'Erreur', description: 'Le champ Domaine est requis', variant: 'destructive' });
      return;
    }

    // Bloquer si une expérience a des dates invalides
    const invalidExp = formData.experiences.find(e => {
      const d = e.date_debut || '';
      const f = e.date_fin || '';
      return d && f && d >= f;
    });
    if (invalidExp) {
      toast({ title: 'Erreur', description: 'Vérifiez les dates des expériences', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: 'Non authentifié', description: 'Veuillez vous reconnecter.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const payload: any = { ...formData };

      // Filtrer les liens sociaux non autorisés par le plan
      const allSocialKeys = ['website', 'linkedin_url', 'github_url', 'twitter_url', 'facebook_url', 'instagram_url'];
      const allowedSocialKeys = visibleSocials.map(s => s.key);
      for (const k of allSocialKeys) {
        const val = payload[k];
        if (typeof val === 'string' && val.trim() === '') { delete payload[k]; continue; }
        if (!allowedSocialKeys.includes(k)) { delete payload[k]; }
      }
      for (const k of allSocialKeys) {
        if (payload[k]) payload[k] = ensureUrl(payload[k]);
      }

      if (payload.profile_image_url && String(payload.profile_image_url).startsWith('data:')) {
        delete payload.profile_image_url;
      }

      const domainesEnum = mapDomainToEnum(payload.domain || formData.domain);
      if (domainesEnum) payload.domaines = domainesEnum;

      if (Array.isArray(payload.experiences)) {
        payload.experiences = payload.experiences.map((exp: any) => ({
          titre_poste: exp.titre_poste || exp.title || '',
          entreprise: exp.entreprise || exp.company || '',
          description: exp.description || '',
          date_debut: exp.date_debut && typeof exp.date_debut === 'string' && exp.date_debut.length === 7
            ? `${exp.date_debut}-01` : (exp.date_debut || null),
          date_fin: exp.date_fin && typeof exp.date_fin === 'string' && exp.date_fin.length === 7
            ? `${exp.date_fin}-01` : (exp.date_fin || null),
        }));
      }

      // Construire liens_sociaux pour le backend
      const platformMap: Record<string, string> = {
        linkedin_url: 'LinkedIn', website: 'Site', github_url: 'GitHub',
        facebook_url: 'Facebook', instagram_url: 'Instagram',
      };
      const socialsPayload: any[] = [];
      visibleSocials.forEach(field => {
        const url = (payload as any)[field.key];
        if (!url?.trim()) return;
        socialsPayload.push({ plateforme: platformMap[field.key] || field.key, url: String(url).trim() });
      });
      if (socialsPayload.length > 0) payload.liens_sociaux = socialsPayload;

      const url = portfolio ? `${API_BASE}/api/portfolios/${portfolio.id}` : `${API_BASE}/api/portfolios`;
      const res = await fetch(url, {
        method: portfolio ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let parsed: any = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { }
        throw new Error((parsed && (parsed.error || parsed.message)) || text || `HTTP ${res.status}`);
      }

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      toast({ title: 'Succès !', description: portfolio ? 'Portfolio mis à jour' : 'Portfolio créé avec succès !' });
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => navigate('/upgrade');

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── En-tête fixe ── */}
      <div className={`flex items-start justify-between gap-4 px-6 py-5 border-b shrink-0 ${isBusiness ? 'bg-gradient-to-r from-amber-50/70 via-yellow-50/40 to-amber-50/60' : 'bg-gradient-to-r from-green-50/60 to-emerald-50/60'}`}>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            {isBusiness && <Crown className="w-5 h-5 text-amber-500" />}
            <h2 className="text-xl font-bold text-gray-900">
              {portfolio ? 'Modifier le portfolio' : isBusiness ? 'Nouveau portfolio Business' : 'Nouveau portfolio'}
            </h2>
            {!isBusiness && <Sparkles className="w-5 h-5 text-yellow-400" />}
          </div>
          <p className="text-sm text-gray-500">
            {portfolio
              ? 'Mettez à jour votre vitrine professionnelle'
              : isBusiness
                ? 'Accès complet · Styles avancés · Charte graphique entreprise'
                : 'Construisez votre présence professionnelle en ligne'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Badge plan */}
          <Badge
            className={`${plan.bgColor} ${plan.textColor} border ${plan.borderColor} flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-none`}
          >
            {plan.icon}
            {plan.label}
          </Badge>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto">
        <form id="portfolio-form" onSubmit={handleSubmit} className="divide-y divide-gray-100">

          {/* ──── 1. Informations de base ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<User className="w-4 h-4 text-gray-600" />}
              title="Informations de base"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nom complet *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="pl-9 h-10 text-sm"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Domaine d'activité *</Label>
                <select
                  value={formData.domain}
                  onChange={e => setFormData({ ...formData, domain: e.target.value })}
                  required={!portfolio}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Sélectionner un domaine</option>
                  <option value="Tech">Tech</option>
                  <option value="Agro">Agro</option>
                  <option value="Médecine">Médecine</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Éducation">Éducation</option>
                  <option value="Art">Art</option>
                  <option value="Juridique">Juridique</option>
                  <option value="Autres">Autres</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Localisation</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="pl-9 h-10 text-sm"
                    placeholder="Dakar, Sénégal"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-9 h-10 text-sm"
                    placeholder="+221 77 000 00 00"
                    type="tel"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Biographie</Label>
              <Textarea
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="text-sm resize-none"
                placeholder="Décrivez votre parcours, vos spécialités, ce qui vous distingue..."
              />
            </div>
          </div>

          {/* ──── 2. Médias (photo + CV) ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Palette className="w-4 h-4 text-blue-600" />}
              title="Photo & CV"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUpload
                label="Photo de profil"
                value={formData.profile_image_url}
                onChange={url => setFormData({ ...formData, profile_image_url: url })}
              />
              <ImageUpload
                label="CV (PDF)"
                value={formData.cv_url}
                onChange={url => setFormData({ ...formData, cv_url: url })}
                accept="application/pdf"
              />
            </div>
          </div>

          {/* ──── 3. Liens sociaux ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Link2 className="w-4 h-4 text-indigo-600" />}
              title="Liens sociaux"
              count={filledSocialCount}
              total={displayLimit(limits.socials)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleSocials.map(({ key, label, icon: Icon }) => (
                <div key={key}>
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Label>
                  <Input
                    placeholder={`Votre profil ${label}`}
                    value={formData[key as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    className="h-10 text-sm"
                  />
                </div>
              ))}
            </div>

            {planType === 'free' && (
              <Alert className="mt-4 bg-amber-50 border-amber-200 py-3">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-800 text-sm">
                  Plan <strong>Gratuit</strong> : seul LinkedIn est disponible.{' '}
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="underline font-semibold hover:text-amber-900"
                  >
                    Passer au Starter
                  </button>{' '}pour débloquer GitHub, Site web, et plus.
                </AlertDescription>
              </Alert>
            )}

            {planType === 'starter' && (
              <Alert className="mt-4 bg-blue-50 border-blue-200 py-3">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-800 text-sm">
                  Plan <strong>Starter</strong> : Facebook et Instagram disponibles avec le plan{' '}
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    className="underline font-semibold hover:text-blue-900"
                  >
                    Pro
                  </button>.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* ──── 4. Projets ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Code2 className="w-4 h-4 text-purple-600" />}
              title="Projets"
              count={limits.projects > 0 ? formData.projects.length : undefined}
              total={limits.projects > 0 ? displayLimit(limits.projects) : undefined}
            />

            {limits.projects === 0 ? (
              <LockedSection title="Projets" requiredPlan="Starter" onUpgrade={handleUpgrade} />
            ) : (
              <div className="space-y-3">
                {formData.projects.map((p, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projet {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, projects: formData.projects.filter((_, idx) => idx !== i) })}
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={p.titre}
                      onChange={e => {
                        const np = [...formData.projects];
                        np[i].titre = e.target.value;
                        setFormData({ ...formData, projects: np });
                      }}
                      placeholder="Titre du projet"
                      className="h-10 text-sm"
                    />
                    <Textarea
                      value={p.description}
                      onChange={e => {
                        const np = [...formData.projects];
                        np[i].description = e.target.value;
                        setFormData({ ...formData, projects: np });
                      }}
                      placeholder="Description du projet..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={p.lien_demo || ''}
                        onChange={e => {
                          const np = [...formData.projects];
                          np[i].lien_demo = e.target.value;
                          setFormData({ ...formData, projects: np });
                        }}
                        placeholder="Lien démo"
                        className="h-9 text-xs"
                      />
                      <Input
                        value={p.lien_code || ''}
                        onChange={e => {
                          const np = [...formData.projects];
                          np[i].lien_code = e.target.value;
                          setFormData({ ...formData, projects: np });
                        }}
                        placeholder="Lien code source"
                        className="h-9 text-xs"
                      />
                    </div>
                    <ImageUpload
                      label="Image du projet"
                      value={p.image || ''}
                      onChange={(url) => {
                        const np = [...formData.projects];
                        np[i].image = url;
                        setFormData({ ...formData, projects: np });
                      }}
                      placeholder="https://exemple.com/image.jpg"
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({
                    ...formData,
                    projects: [...formData.projects, { titre: '', description: '', lien_demo: '', lien_code: '', image: '' }],
                  })}
                  disabled={formData.projects.length >= limits.projects}
                  className="w-full h-10 border-dashed text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un projet
                </Button>
              </div>
            )}
          </div>

          {/* ──── 5. Compétences ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Star className="w-4 h-4 text-green-600" />}
              title="Compétences"
              count={limits.competences > 0 ? formData.competences.length : undefined}
              total={limits.competences > 0 ? displayLimit(limits.competences) : undefined}
            />

            {limits.competences === 0 ? (
              <LockedSection title="Compétences" requiredPlan="Starter" onUpgrade={handleUpgrade} />
            ) : (
              <div className="space-y-3">
                {formData.competences.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.competences.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 group"
                      >
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        <input
                          value={c.nom}
                          onChange={e => {
                            const nc = [...formData.competences];
                            nc[i].nom = e.target.value;
                            setFormData({ ...formData, competences: nc });
                          }}
                          placeholder="Compétence"
                          className="bg-transparent text-sm text-green-800 font-medium outline-none w-24 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, competences: formData.competences.filter((_, idx) => idx !== i) })}
                          className="text-green-400 hover:text-red-500 transition-colors ml-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, competences: [...formData.competences, { nom: '' }] })}
                  disabled={formData.competences.length >= limits.competences}
                  className="border-dashed h-9 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une compétence
                </Button>

                <p className="text-xs text-gray-400">
                  Ex : React, Laravel, Python, Figma, SEO...
                </p>
              </div>
            )}
          </div>

          {/* ──── 6. Expériences professionnelles ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Briefcase className="w-4 h-4 text-orange-600" />}
              title="Expériences professionnelles"
              count={limits.experiences > 0 ? formData.experiences.length : undefined}
              total={limits.experiences > 0 ? displayLimit(limits.experiences) : undefined}
            />

            {limits.experiences === 0 ? (
              <LockedSection title="Expériences professionnelles" requiredPlan="Pro" onUpgrade={handleUpgrade} />
            ) : (
              <div className="space-y-3">
                {formData.experiences.map((e, i) => {
                  // Calcul des erreurs - pas de hooks ici !
                  const debutDate = e.date_debut ? new Date(e.date_debut) : undefined;
                  const finDate = e.date_fin ? new Date(e.date_fin) : undefined;

                  const getDateError = (start: Date | undefined, end: Date | undefined): string | null => {
                    if (!start && !end) return null;
                    if (start && !end) return null;
                    if (!start && end) return 'La date de début est requise';

                    if (start && end) {
                      if (start > end) return 'La date de début ne peut pas être postérieure à la date de fin';
                      if (start.getTime() === end.getTime()) return 'Les dates ne peuvent pas être identiques';

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (start > today) return 'La date de début ne peut pas être dans le futur';
                      if (end > today) return 'La date de fin ne peut pas être dans le futur';
                    }
                    return null;
                  };

                  const dateError = getDateError(debutDate, finDate);
                  const hasError = !!dateError;

                  return (
                    <ExperienceItem
                      key={i}
                      experience={e}
                      index={i}
                      onUpdate={(updatedExp) => {
                        const newExperiences = [...formData.experiences];
                        newExperiences[i] = updatedExp;
                        setFormData({ ...formData, experiences: newExperiences });
                      }}
                      onDelete={() => {
                        setFormData({
                          ...formData,
                          experiences: formData.experiences.filter((_, idx) => idx !== i)
                        });
                      }}
                      hasError={hasError}
                      dateError={dateError}
                    />
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({
                    ...formData,
                    experiences: [...formData.experiences, {
                      titre_poste: '',
                      entreprise: '',
                      description: '',
                      date_debut: '',
                      date_fin: ''
                    }],
                  })}
                  disabled={formData.experiences.length >= limits.experiences}
                  className="w-full h-10 border-dashed text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une expérience
                </Button>

                {/* Message d'information */}
                {formData.experiences.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Règles de validation des dates :
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-0.5 ml-5 list-disc">
                      <li>La date de début doit être antérieure à la date de fin</li>
                      <li>Les dates de début et de fin ne peuvent pas être identiques</li>
                      <li>Les dates ne peuvent pas être dans le futur</li>
                      <li>Laisser la date de fin vide si le poste est actuel</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ──── 7. Personnalisation ──── */}
          <div className="px-6 py-6">
            <SectionHeader
              icon={<Palette className="w-4 h-4 text-pink-600" />}
              title="Personnalisation visuelle"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Couleur du thème</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <Input
                    type="color"
                    value={formData.theme_color}
                    onChange={e => setFormData({ ...formData, theme_color: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded-lg p-0.5 border-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800" style={{ color: formData.theme_color }}>
                      {formData.theme_color.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">Couleur principale du portfolio</p>
                  </div>
                </div>
              </div>
              <BannerCustomizer
                bannerType={formData.banner_type}
                bannerColor={formData.banner_color}
                bannerImageUrl={formData.banner_image_url}
                onBannerTypeChange={type => setFormData({ ...formData, banner_type: type })}
                onBannerColorChange={color => setFormData({ ...formData, banner_color: color })}
                onBannerImageChange={url => setFormData({ ...formData, banner_image_url: url })}
              />
            </div>
          </div>

          {/* ──── 7.5 Styles avancés Business ──── */}
          {isBusiness && (
            <div className="px-6 py-6 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50">
              <SectionHeader
                icon={<Crown className="w-4 h-4 text-amber-600" />}
                title="Styles avancés Business"
              />

              {/* Branding rapide */}
              {businessAccount && (businessAccount.primary_color || businessAccount.secondary_color) && (
                <div className="mb-5 p-4 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {businessAccount.company_logo_url ? (
                      <img
                        src={businessAccount.company_logo_url}
                        alt={businessAccount.company_name}
                        className="h-9 w-9 object-contain rounded-lg border border-gray-100"
                      />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: businessAccount.primary_color || '#1a1a2e' }}
                      >
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{businessAccount.company_name || 'Votre entreprise'}</p>
                      <p className="text-xs text-gray-500">Appliquer la charte graphique de l'entreprise</p>
                    </div>
                    {/* Color swatches */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {[businessAccount.primary_color, businessAccount.secondary_color, businessAccount.accent_color].filter(Boolean).map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c! }} />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      theme_color: businessAccount.primary_color || prev.theme_color,
                      banner_color: businessAccount.secondary_color || businessAccount.primary_color || prev.banner_color,
                      font_family: businessAccount.font_family || prev.font_family,
                    }))}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Appliquer
                  </Button>
                </div>
              )}

              {/* Police du portfolio */}
              <div className="mb-5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Type className="w-3.5 h-3.5" />
                  Police du portfolio
                </Label>
                <select
                  value={formData.font_family}
                  onChange={e => setFormData(prev => ({ ...prev, font_family: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Système (défaut)</option>
                  <option value="Inter">Inter — Moderne & lisible</option>
                  <option value="Poppins">Poppins — Contemporain</option>
                  <option value="Playfair Display">Playfair Display — Élégant & luxueux</option>
                  <option value="Montserrat">Montserrat — Professionnel</option>
                  <option value="Roboto Slab">Roboto Slab — Solide & structuré</option>
                  <option value="DM Sans">DM Sans — Épuré & minimaliste</option>
                  <option value="Space Grotesk">Space Grotesk — Tech & innovant</option>
                </select>
                {formData.font_family && (
                  <p className="mt-1 text-xs text-amber-700">
                    La police sélectionnée sera appliquée sur la page publique du portfolio.
                  </p>
                )}
              </div>

              {/* Style de mise en page */}
              <div>
                <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                  <Layout className="w-3.5 h-3.5" />
                  Style de présentation
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { value: 'modern', label: 'Moderne', emoji: '⚡', desc: 'Épuré & dynamique' },
                    { value: 'classic', label: 'Classique', emoji: '📋', desc: 'Sobre & formel' },
                    { value: 'minimal', label: 'Minimal', emoji: '◻', desc: 'Blanc & contrasté' },
                    { value: 'bold', label: 'Impact', emoji: '🔥', desc: 'Couleurs prononcées' },
                  ] as const).map(style => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, layout_style: style.value }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        formData.layout_style === style.value
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-gray-200 hover:border-amber-300 bg-white'
                      }`}
                    >
                      <div className="text-xl mb-1">{style.emoji}</div>
                      <p className={`text-xs font-semibold ${formData.layout_style === style.value ? 'text-amber-700' : 'text-gray-900'}`}>
                        {style.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──── 8. Visibilité ──── */}
          <div className="px-6 py-5">
            <label
              htmlFor="is_public"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/80 transition-colors"
            >
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={v => setFormData({ ...formData, is_public: !!v })}
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">Portfolio public</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visible par tout le monde via un lien partageable
                </p>
              </div>
              <Globe className={`w-5 h-5 ml-auto ${formData.is_public ? 'text-green-500' : 'text-gray-300'}`} />
            </label>
          </div>

        </form>
      </div>

      {/* ── Pied de page fixe ── */}
      <div className="shrink-0 border-t bg-white px-6 py-4 flex items-center justify-between gap-3">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} className="px-5 h-10">
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          form="portfolio-form"
          disabled={loading}
          className="flex-1 sm:flex-none sm:px-10 h-10 bg-[#28A745] hover:bg-[#218838] text-white font-semibold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sauvegarde en cours...
            </span>
          ) : (
            portfolio ? 'Mettre à jour' : 'Créer mon portfolio'
          )}
        </Button>
      </div>
    </div>
  );
};