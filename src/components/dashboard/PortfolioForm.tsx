import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Palette, AlertCircle, Sparkles, Plus, Trash2, Calendar as CalendarIcon, Lock, X,
  Briefcase, Code2, Star, Crown, Zap, CheckCircle2, ArrowRight,
  Building2, Type, Layout, Check, ChevronRight, ChevronLeft, Eye, Loader2,
} from 'lucide-react';
import {
  PORTFOLIO_TEMPLATES, TIER_META, isTemplateUnlocked,
  templateById, type PortfolioTemplate,
} from '@/components/portfolio/portfolioTemplates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

type PlanType = 'free' | 'starter' | 'pro' | 'business';
type Step = 1 | 2 | 3;

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
const displayLimit = (n: number) => (n >= 9999 ? '∞' : String(n));

const FIXED_DOMAINS = ['Tech', 'Agro', 'Médecine', 'Design', 'Marketing', 'Finance', 'Éducation', 'Art', 'Juridique'];

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
const SectionHeader = ({ icon, title, count, total }: {
  icon: React.ReactNode; title: string; count?: number; total?: number | string;
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

const LockedSection = ({ title, requiredPlan, onUpgrade }: {
  title: string; requiredPlan: string; onUpgrade: () => void;
}) => (
  <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 bg-gray-50/80 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Lock className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">Disponible à partir du plan <strong>{requiredPlan}</strong></p>
      </div>
    </div>
    <Button type="button" size="sm" variant="outline" onClick={onUpgrade}
      className="shrink-0 text-[#28A745] border-[#28A745] hover:bg-green-50 font-semibold text-xs gap-1">
      Upgrader <ArrowRight className="w-3.5 h-3.5" />
    </Button>
  </div>
);

const ExperienceItem = ({ experience, index, onUpdate, onDelete, hasError, dateError }: {
  experience: any; index: number; onUpdate: (updatedExp: any) => void;
  onDelete: () => void; hasError: boolean; dateError: string | null;
}) => {
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const debutDate = experience.date_debut ? new Date(experience.date_debut) : undefined;
  const finDate = experience.date_fin ? new Date(experience.date_fin) : undefined;
  const formatDate = (date: Date | undefined) => date ? format(date, 'MMMM yyyy', { locale: fr }) : '';

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all duration-200 ${hasError ? 'border-red-300 bg-red-50/50 ring-1 ring-red-200' : 'border-gray-200 bg-gray-50/50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expérience {index + 1}</span>
        <button type="button" onClick={onDelete} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Titre du poste *</Label>
          <Input value={experience.titre_poste} onChange={ev => onUpdate({ ...experience, titre_poste: ev.target.value })} placeholder="Développeur Full Stack" className="h-10 text-sm" required />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1 block">Entreprise *</Label>
          <Input value={experience.entreprise} onChange={ev => onUpdate({ ...experience, entreprise: ev.target.value })} placeholder="Nom de l'entreprise" className="h-10 text-sm" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><CalendarIcon className="w-3 h-3" /> Date de début *</Label>
          <button type="button" onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }}
            className={`w-full h-10 px-3 text-left text-sm rounded-md border ${hasError && !debutDate ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} hover:border-gray-300 transition-colors flex items-center justify-between`}>
            <span className={debutDate ? 'text-gray-900' : 'text-gray-400'}>{debutDate ? formatDate(debutDate) : 'Sélectionner une date'}</span>
            <CalendarIcon className="w-4 h-4 text-gray-400" />
          </button>
          {showStartCalendar && (
            <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <DayPicker mode="single" selected={debutDate} onSelect={(date) => { onUpdate({ ...experience, date_debut: date ? format(date, 'yyyy-MM-dd') : null }); setShowStartCalendar(false); }} locale={fr} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} className="text-sm" />
            </div>
          )}
        </div>
        <div className="relative">
          <Label className="flex items-center gap-1 text-xs text-gray-500 mb-1"><CalendarIcon className="w-3 h-3" /> Date de fin <span className="text-gray-400 ml-1">(vide = en cours)</span></Label>
          <button type="button" onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }}
            className={`w-full h-10 px-3 text-left text-sm rounded-md border ${hasError && finDate ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} hover:border-gray-300 transition-colors flex items-center justify-between`}>
            <span className={finDate ? 'text-gray-900' : 'text-gray-400'}>{finDate ? formatDate(finDate) : 'En cours'}</span>
            <CalendarIcon className="w-4 h-4 text-gray-400" />
          </button>
          {showEndCalendar && (
            <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <DayPicker mode="single" selected={finDate} onSelect={(date) => { onUpdate({ ...experience, date_fin: date ? format(date, 'yyyy-MM-dd') : null }); setShowEndCalendar(false); }} locale={fr} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} className="text-sm" disabled={{ after: new Date() }} />
            </div>
          )}
        </div>
      </div>
      {hasError && dateError && (
        <div className="flex items-center gap-2 p-2 bg-red-100/80 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700 font-medium">{dateError}</p>
        </div>
      )}
      {debutDate && !finDate && !hasError && (
        <div className="flex items-center gap-2 p-2 bg-green-100/50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-xs text-green-700 font-medium">Poste actuel - En cours</p>
        </div>
      )}
      {debutDate && finDate && !hasError && (
        <div className="flex items-center gap-2 p-2 bg-green-100/50 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <p className="text-xs text-green-700 font-medium">Dates valides</p>
        </div>
      )}
      <div>
        <Label className="text-xs text-gray-500 mb-1 block">Description</Label>
        <Textarea value={experience.description} onChange={ev => onUpdate({ ...experience, description: ev.target.value })} placeholder="Missions, technologies utilisées, résultats..." rows={3} className="resize-none text-sm" />
      </div>
    </div>
  );
};

function TemplateThumb({ tpl, selected, locked, onClick }: {
  tpl: PortfolioTemplate; selected: boolean; locked: boolean; onClick: () => void;
}) {
  const a = tpl.primary;

  // ── EDITORIAL: fond blanc · barre accent top · avatar+titre en ligne · 2 colonnes (sidebar | main) ──
  const EditorialInner = () => (
    <div style={{ background: '#fff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre fine accent tout en haut */}
      <div style={{ height: 2.5, background: a, flexShrink: 0 }} />
      {/* Header horizontal : avatar carré gauche + grand titre à droite */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '7px 8px 6px', flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, background: `${a}25`, flexShrink: 0 }} />
        <div>
          <div style={{ width: 56, height: 9, borderRadius: 1, background: '#18181B', marginBottom: 3 }} />
          <div style={{ width: 32, height: 3, borderRadius: 1, background: a }} />
        </div>
      </div>
      {/* Corps 2 colonnes : sidebar compétences | contenu principal */}
      <div style={{ display: 'flex', gap: 5, padding: '0 8px 6px', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar étroite avec barres compétences */}
        <div style={{ width: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[75, 50, 85, 60].map((w, i) => (
            <div key={i}>
              <div style={{ width: `${w}%`, height: 2, borderRadius: 1, background: '#D4D4D8' }} />
              {i < 3 && <div style={{ width: '100%', height: 2.5, borderRadius: 1, marginTop: 1, background: '#F4F4F5' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 1, background: `${a}70` }} />
              </div>}
            </div>
          ))}
        </div>
        {/* Colonne principale : cartes projets/exps */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ flex: 2, borderRadius: 5, border: '1px solid #E4E4E7', background: '#FAFAFA' }} />
          <div style={{ flex: 1, borderRadius: 5, border: '1px solid #E4E4E7', background: '#FAFAFA' }} />
        </div>
      </div>
    </div>
  );

  // ── CLASSIQUE: fond blanc · avatar centré · cartes empilées pleine largeur ──
  const ClassiqueInner = () => (
    <div style={{ background: '#fff', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 7px 5px' }}>
      {/* Avatar cercle centré */}
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${a}20`, border: `2px solid ${a}`, marginBottom: 4, flexShrink: 0 }} />
      {/* Nom centré */}
      <div style={{ width: 48, height: 6, borderRadius: 1, background: '#18181B', marginBottom: 2 }} />
      <div style={{ width: 28, height: 3, borderRadius: 1, background: a, marginBottom: 8 }} />
      {/* Cartes empilées pleine largeur */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflow: 'hidden' }}>
        {/* Carte compétences */}
        <div style={{ borderRadius: 5, border: '1px solid #E4E4E7', padding: '3px 5px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: `${a}20` }} />
            <div style={{ width: 30, height: 3, borderRadius: 1, background: '#18181B' }} />
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {[60, 80].map((w, i) => <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 1, background: '#F4F4F5' }}>
              <div style={{ width: `${w}%`, height: '100%', borderRadius: 1, background: `${a}60` }} />
            </div>)}
          </div>
        </div>
        {/* Carte expériences */}
        <div style={{ borderRadius: 5, border: '1px solid #E4E4E7', padding: '3px 5px', background: '#fff', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: `${a}20` }} />
            <div style={{ width: 24, height: 3, borderRadius: 1, background: '#18181B' }} />
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: a, opacity: 0.7 }} />
            <div>
              <div style={{ width: 36, height: 2.5, borderRadius: 1, background: '#D4D4D8', marginBottom: 1.5 }} />
              <div style={{ width: 22, height: 2, borderRadius: 1, background: a, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── MINIMAL: fond blanc pur · PAS d'avatar · typographie large · séparateurs horizontaux · pills skills ──
  const MinimalInner = () => (
    <div style={{ background: '#fff', width: '100%', height: '100%', padding: '9px 9px 7px' }}>
      {/* Grand titre bold sans avatar */}
      <div style={{ width: '62%', height: 10, borderRadius: 1, background: '#18181B', marginBottom: 3 }} />
      {/* Sous-titre domaine · location */}
      <div style={{ width: '42%', height: 3, borderRadius: 1, background: '#A1A1AA', marginBottom: 8 }} />
      {/* Séparateur horizontal */}
      <div style={{ width: '100%', height: 0.75, background: '#E4E4E7', marginBottom: 7 }} />
      {/* Section : label tout-caps + lignes */}
      <div style={{ width: 28, height: 2.5, borderRadius: 1, background: '#D4D4D8', marginBottom: 5 }} />
      {[1, 2].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, marginBottom: 3, borderBottom: '1px solid #F4F4F5' }}>
          <div style={{ width: `${i === 1 ? 52 : 36}%`, height: 3, borderRadius: 1, background: '#D4D4D8' }} />
          <div style={{ width: 18, height: 3, borderRadius: 1, background: '#E4E4E7' }} />
        </div>
      ))}
      {/* Pills compétences */}
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        {[24, 32, 20].map((w, i) => (
          <div key={i} style={{ width: w, height: 9, borderRadius: 10, border: '1px solid #D4D4D8', background: '#fff' }} />
        ))}
      </div>
    </div>
  );

  // ── SOMBRE: fond #0E0F13 · avatar+titre en ligne (comme editorial mais dark) · sidebar + cartes sombres ──
  const SombreInner = () => (
    <div style={{ background: '#0E0F13', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '7px 7px 5px' }}>
      {/* Header horizontal : avatar rect gauche + titre blanc droite */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, background: `${a}35`, flexShrink: 0 }} />
        <div>
          <div style={{ width: 52, height: 7, borderRadius: 1, background: 'rgba(255,255,255,0.85)', marginBottom: 3 }} />
          <div style={{ width: 28, height: 3, borderRadius: 1, background: a }} />
        </div>
      </div>
      {/* Corps 2 colonnes dark : sidebar compétences | cartes expériences/projets */}
      <div style={{ display: 'flex', gap: 5, flex: 1, overflow: 'hidden' }}>
        {/* Sidebar : barres compétences white */}
        <div style={{ width: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[65, 80, 50, 70].map((w, i) => (
            <div key={i}>
              <div style={{ width: `${w}%`, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ width: '100%', height: 2, borderRadius: 1, marginTop: 1, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${w}%`, height: '100%', borderRadius: 1, background: `${a}80` }} />
              </div>
            </div>
          ))}
        </div>
        {/* Colonne principale : cartes dark à bord blanc/10 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ flex: 2, borderRadius: 5, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ flex: 1, borderRadius: 5, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
    </div>
  );

  const Inner = tpl.family === 'editorial' ? EditorialInner
    : tpl.family === 'classique' ? ClassiqueInner
    : tpl.family === 'minimal' ? MinimalInner
    : SombreInner;

  return (
    <button type="button" onClick={onClick} className="group relative text-left w-full">
      <div className="relative rounded-xl overflow-hidden border transition-all" style={{
        height: 110,
        borderColor: selected ? tpl.primary : '#E4E4E7',
        boxShadow: selected ? `0 0 0 2px ${tpl.primary}` : 'none',
        filter: locked ? 'grayscale(0.6)' : 'none',
        opacity: locked ? 0.65 : 1,
      }}>
        <Inner />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.40)' }}>
            <span className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-600"><Lock size={14} /></span>
          </div>
        )}
        {selected && !locked && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: tpl.primary }}>
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span className="text-xs font-medium text-gray-800 truncate">{tpl.name}</span>
        {locked
          ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-gray-500 bg-zinc-100 shrink-0">{TIER_META[tpl.tier].label}</span>
          : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tpl.primary }} />}
      </div>
    </button>
  );
}

// ─── Indicateur d'étapes ──────────────────────────────────────────────────────
function StepIndicator({ current, isEdit }: { current: Step; isEdit: boolean }) {
  const steps = isEdit
    ? [{ n: 1, label: 'Données' }, { n: 2, label: 'Template' }, { n: 3, label: 'Valider' }]
    : [{ n: 1, label: 'Données' }, { n: 2, label: 'Template' }, { n: 3, label: 'Récapitulatif' }];
  return (
    <div className="flex items-center justify-center gap-0 py-4 px-6 bg-gray-50 border-b">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={
                current === s.n
                  ? { background: '#28A745', color: '#fff', boxShadow: '0 0 0 3px #28A74530' }
                  : current > s.n
                  ? { background: '#28A745', color: '#fff' }
                  : { background: '#E4E4E7', color: '#71717A' }
              }
            >
              {current > s.n ? <Check size={14} strokeWidth={3} /> : s.n}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${current === s.n ? 'text-[#28A745]' : current > s.n ? 'text-gray-500' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-0.5 w-12 sm:w-20 mx-1 mb-4 rounded-full transition-all" style={{ background: current > s.n ? '#28A745' : '#E4E4E7' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Preview téléphone portrait (fidèle à chaque famille) ────────────────────
function PhonePreview({ formData }: { formData: any }) {
  const tpl = templateById(formData.template_id || 't1');
  const accent = formData.theme_color || tpl.primary;
  const name = formData.title || 'Votre Nom';
  const domain = formData.domain || 'Domaine';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'P';
  const skills = (formData.competences || []).slice(0, 4);
  const projects = (formData.projects || []).slice(0, 2);
  const exps = (formData.experiences || []).slice(0, 1);
  const hasAvatar = !!formData.profile_image_url;

  // Avatar réutilisable
  const Av = ({ size, round = false, borderColor = 'transparent' }: { size: number; round?: boolean; borderColor?: string }) => (
    hasAvatar
      ? <img src={formData.profile_image_url} alt=""
          style={{ width: size, height: size, borderRadius: round ? '50%' : 5, objectFit: 'cover', border: `2px solid ${borderColor}`, flexShrink: 0, display: 'block' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      : <div style={{ width: size, height: size, borderRadius: round ? '50%' : 5, background: accent, border: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: '-0.03em' }}>
          {initials}
        </div>
  );

  let screenContent: React.ReactElement;

  // ════════════════════════════════════════════════════════════════════════════
  // EDITORIAL : fond blanc · barre accent top · avatar carré gauche + titre droit
  //             · 2 colonnes : sidebar compétences | colonne principale projets/exps
  // ════════════════════════════════════════════════════════════════════════════
  if (tpl.family === 'editorial') {
    screenContent = (
      <div style={{ background: '#fff', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Barre accent */}
        <div style={{ height: 3, background: accent, flexShrink: 0 }} />
        {/* Header : avatar carré + nom/domaine/localisation */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 10px 7px', flexShrink: 0 }}>
          <Av size={38} borderColor="#E4E4E7" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#18181B', letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 8, color: accent, fontWeight: 600, marginTop: 2 }}>{domain}</div>
            {formData.location && <div style={{ fontSize: 7, color: '#71717A', marginTop: 1 }}>📍 {formData.location}</div>}
          </div>
        </div>
        {/* Bio */}
        {formData.bio && (
          <div style={{ padding: '0 10px 7px', fontSize: 7.5, color: '#52525B', lineHeight: 1.5, overflow: 'hidden', maxHeight: 34, flexShrink: 0 }}>{formData.bio}</div>
        )}
        {/* Séparateur */}
        <div style={{ height: 1, background: '#F4F4F5', margin: '0 10px 7px', flexShrink: 0 }} />
        {/* 2 colonnes */}
        <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar : section COMPÉTENCES avec barres */}
          <div style={{ width: 52, flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 6, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 5 }}>Skills</div>
            {(skills.length > 0 ? skills : [{nom:'Compétence'},{nom:'Autre'},{nom:'Tech'}]).map((c: any, i: number) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 7, color: '#52525B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{c.nom}</div>
                <div style={{ width: '100%', height: 2, background: '#F4F4F5', borderRadius: 1 }}>
                  <div style={{ width: `${55 + i * 10}%`, height: '100%', background: accent, borderRadius: 1, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Colonne principale : expériences + projets */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {exps.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 6, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Expérience</div>
                {exps.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B' }}>{e.titre_poste || 'Poste'}</div>
                      <div style={{ fontSize: 6.5, color: accent }}>{e.entreprise || 'Entreprise'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 6, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Projets</div>
            {(projects.length > 0 ? projects : [{titre:'Projet 1'},{titre:'Projet 2'}]).map((p: any, i: number) => (
              <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: 5, padding: '4px 6px', marginBottom: 3, overflow: 'hidden' }}>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titre}</div>
                {p.description && <div style={{ fontSize: 6.5, color: '#71717A', marginTop: 1, overflow: 'hidden', maxHeight: 10 }}>{p.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════════
  // CLASSIQUE : fond blanc · avatar cercle centré · nom/domaine/bio centrés
  //             · cartes pleine largeur empilées (compétences, expériences, projets)
  // ════════════════════════════════════════════════════════════════════════════
  } else if (tpl.family === 'classique') {
    screenContent = (
      <div style={{ background: '#fff', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Zone header centrée */}
        <div style={{ padding: '14px 12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <Av size={42} round borderColor="#E4E4E7" />
          <div style={{ fontSize: 12, fontWeight: 700, color: '#18181B', marginTop: 6, textAlign: 'center', lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 8, color: accent, fontWeight: 600, marginTop: 2 }}>{domain}</div>
          {formData.location && <div style={{ fontSize: 7, color: '#71717A', marginTop: 2 }}>📍 {formData.location}</div>}
          {formData.bio && (
            <div style={{ fontSize: 7.5, color: '#52525B', lineHeight: 1.5, textAlign: 'center', marginTop: 5, overflow: 'hidden', maxHeight: 24 }}>{formData.bio}</div>
          )}
        </div>
        {/* Cartes empilées pleine largeur */}
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1, overflow: 'hidden' }}>
          {/* Carte Compétences */}
          <div style={{ border: '1px solid #E4E4E7', borderRadius: 7, padding: '6px 8px', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: accent, opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B' }}>Compétences</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 6px' }}>
              {(skills.length > 0 ? skills : [{nom:'React'},{nom:'PHP'},{nom:'Laravel'},{nom:'JS'}]).slice(0, 4).map((c: any, i: number) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                    <span style={{ fontSize: 6.5, color: '#52525B' }}>{c.nom}</span>
                  </div>
                  <div style={{ height: 2, background: '#F4F4F5', borderRadius: 1 }}>
                    <div style={{ width: `${60 + i * 8}%`, height: '100%', background: accent, borderRadius: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Carte Projets */}
          {(projects.length > 0 || true) && (
            <div style={{ border: '1px solid #E4E4E7', borderRadius: 7, padding: '6px 8px', background: '#fff', flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: accent, opacity: 0.8 }} />
                </div>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B' }}>Projets</div>
              </div>
              {(projects.length > 0 ? projects : [{titre:'GeStockPro',description:'ERP commerce'},{titre:'Bouba AI',description:'Assistant IA'}]).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 5, paddingBottom: 4, marginBottom: i < 1 ? 4 : 0, borderBottom: i < 1 ? '1px solid #F4F4F5' : 'none' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: `linear-gradient(140deg, ${accent}, ${accent}cc)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>
                    {(p.titre||'P')[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titre}</div>
                    {p.description && <div style={{ fontSize: 6.5, color: '#71717A', overflow: 'hidden', maxHeight: 9 }}>{p.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════════
  // MINIMAL : fond blanc pur · PAS d'avatar · grand titre gauche · séparateurs
  //           horizontaux · exps en grille date|contenu · projets liste · pills skills
  // ════════════════════════════════════════════════════════════════════════════
  } else if (tpl.family === 'minimal') {
    screenContent = (
      <div style={{ background: '#fff', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 12px 12px' }}>
        {/* Titre grand sans avatar */}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#18181B', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 3 }}>{name}</div>
        {/* Domaine · localisation */}
        <div style={{ fontSize: 8.5, color: '#71717A', marginBottom: formData.bio ? 6 : 8 }}>
          {[domain, formData.location].filter(Boolean).join(' — ')}
        </div>
        {/* Bio */}
        {formData.bio && (
          <div style={{ fontSize: 7.5, color: '#52525B', lineHeight: 1.6, marginBottom: 8, overflow: 'hidden', maxHeight: 30 }}>{formData.bio}</div>
        )}
        {/* Liens sociaux sous forme de texte accent avec points */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexShrink: 0 }}>
          {['LinkedIn', 'GitHub'].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: 7, color: accent, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>
        {/* Séparateur + section Expérience */}
        <div style={{ borderTop: '1px solid #E4E4E7', paddingTop: 7, marginBottom: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 6, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>Expérience</div>
          {(exps.length > 0 ? exps : [{titre_poste:'Développeur Full-Stack',entreprise:'Entreprise',date_debut:'2023-01-01'}]).map((e: any, i: number) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 6, paddingBottom: 5, borderBottom: '1px solid #F4F4F5' }}>
              <span style={{ fontSize: 6.5, color: '#A1A1AA', paddingTop: 1 }}>2023</span>
              <div>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: '#18181B' }}>{e.titre_poste || 'Poste'} <span style={{ color: '#A1A1AA', fontWeight: 400 }}>· {e.entreprise || 'Entreprise'}</span></div>
              </div>
            </div>
          ))}
        </div>
        {/* Section Projets liste */}
        <div style={{ borderTop: '1px solid #E4E4E7', paddingTop: 7, marginBottom: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 6, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>Projets</div>
          {(projects.length > 0 ? projects : [{titre:'GeStockPro'},{titre:'Bouba AI'}]).map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, marginBottom: 4, borderBottom: '1px solid #F4F4F5' }}>
              <div style={{ fontSize: 7.5, fontWeight: 500, color: '#18181B' }}>{p.titre}</div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid #D4D4D8', opacity: 0.5 }} />
            </div>
          ))}
        </div>
        {/* Skills : pills bordered */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(skills.length > 0 ? skills : [{nom:'React'},{nom:'Laravel'},{nom:'Python'}]).map((c: any, i: number) => (
            <span key={i} style={{ fontSize: 7, color: '#52525B', border: '1px solid #D4D4D8', borderRadius: 20, padding: '2px 6px' }}>{c.nom}</span>
          ))}
        </div>
      </div>
    );

  // ════════════════════════════════════════════════════════════════════════════
  // SOMBRE : fond #0E0F13 · même layout qu'editorial mais tout dark
  //          avatar carré gauche + titre blanc · bio muted · 2 colonnes dark
  // ════════════════════════════════════════════════════════════════════════════
  } else {
    screenContent = (
      <div style={{ background: '#0E0F13', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Barre accent */}
        <div style={{ height: 3, background: accent, flexShrink: 0 }} />
        {/* Header : avatar carré gauche + titre blanc droite */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 10px 7px', flexShrink: 0 }}>
          <Av size={38} borderColor={`${accent}50`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 8, color: accent, fontWeight: 600, marginTop: 2 }}>{domain}</div>
            {formData.location && <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>📍 {formData.location}</div>}
          </div>
        </div>
        {/* Bio muted white */}
        {formData.bio && (
          <div style={{ padding: '0 10px 7px', fontSize: 7.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, overflow: 'hidden', maxHeight: 30, flexShrink: 0 }}>{formData.bio}</div>
        )}
        {/* Séparateur */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 10px 7px', flexShrink: 0 }} />
        {/* 2 colonnes dark */}
        <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar : compétences avec barres white */}
          <div style={{ width: 52, flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 5 }}>Skills</div>
            {(skills.length > 0 ? skills : [{nom:'React'},{nom:'Laravel'},{nom:'Python'}]).map((c: any, i: number) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.75)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{c.nom}</div>
                <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
                  <div style={{ width: `${55 + i * 12}%`, height: '100%', background: accent, borderRadius: 1, opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Colonne principale : cartes dark à border white/10 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Projets</div>
            {(projects.length > 0 ? projects : [{titre:'GeStockPro',description:'ERP'},{titre:'Bouba AI',description:'Assistant'}]).map((p: any, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '5px 6px', marginBottom: 4, overflow: 'hidden' }}>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.titre}</div>
                {p.description && <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{p.description}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Cadre téléphone ──────────────────────────────────────────────────────────
  const PW = 185; // largeur totale du téléphone
  const PH = 368; // hauteur totale
  const BORDER = 7;
  return (
    <div className="relative mx-auto select-none" style={{ width: PW, height: PH }}>
      {/* Corps gris foncé */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: '#1C1C1E', boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset' }} />
      {/* Encoche */}
      <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 60, height: 11, background: '#1C1C1E', borderRadius: '0 0 10px 10px', zIndex: 10 }} />
      {/* Écran */}
      <div style={{ position: 'absolute', top: BORDER, left: BORDER, right: BORDER, bottom: BORDER, borderRadius: 27, overflow: 'hidden' }}>
        {screenContent}
      </div>
      {/* Reflet écran */}
      <div style={{ position: 'absolute', top: BORDER, left: BORDER, right: BORDER, height: 60, borderRadius: '27px 27px 0 0', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', pointerEvents: 'none', zIndex: 5 }} />
      {/* Bouton power droit */}
      <div style={{ position: 'absolute', right: -2, top: 90, width: 3, height: 22, background: '#3A3A3C', borderRadius: '0 2px 2px 0' }} />
      {/* Boutons volume gauche */}
      <div style={{ position: 'absolute', left: -2, top: 76, width: 3, height: 14, background: '#3A3A3C', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', left: -2, top: 96, width: 3, height: 26, background: '#3A3A3C', borderRadius: '2px 0 0 2px' }} />
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export const PortfolioForm: React.FC<PortfolioFormProps> = ({ portfolio, onClose, onSuccess, isBusiness = false, businessAccount }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
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
    template_id: 't1',
  });

  const [hintTpl, setHintTpl] = React.useState<PortfolioTemplate | null>(null);

  // ── Domaine custom (quand "Autres" est sélectionné) ──────────────────────────
  const [isOtherDomain, setIsOtherDomain] = useState(false);

  // ── Localisation autocomplete ─────────────────────────────────────────────────
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [locationLoading, setLocationLoading]         = useState(false);
  const [showLocationDrop, setShowLocationDrop]       = useState(false);
  const locationWrapRef  = useRef<HTMLDivElement>(null);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationWrapRef.current && !locationWrapRef.current.contains(e.target as Node)) {
        setShowLocationDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchLocation = useCallback((query: string) => {
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationDrop(false);
      return;
    }
    locationDebounce.current = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&accept-language=fr`,
          { headers: { Accept: 'application/json' } }
        );
        const data = await res.json() as any[];
        const seen = new Set<string>();
        const results: string[] = [];
        for (const item of data) {
          const addr    = item.address || {};
          const city    = addr.city || addr.town || addr.village || addr.municipality || addr.county || item.name || '';
          const country = addr.country || '';
          const label   = [city, country].filter(Boolean).join(', ')
                          || item.display_name.split(',').slice(0, 2).join(',').trim();
          if (label && !seen.has(label)) { seen.add(label); results.push(label); }
        }
        setLocationSuggestions(results);
        setShowLocationDrop(results.length > 0);
      } catch { /* ignore */ } finally {
        setLocationLoading(false);
      }
    }, 350);
  }, []);

  useEffect(() => {
    if (isBusiness) { setPlanType('business'); return; }
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/plans/me`, { headers: { Authorization: `Bearer ${token}` } });
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

  useEffect(() => {
    if (!portfolio) return;
    const existingDomain = portfolio.domain || portfolio.domaine || '';
    if (existingDomain && !FIXED_DOMAINS.includes(existingDomain)) setIsOtherDomain(true);
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
      template_id: portfolio.template_id || portfolio.template || 't1',
      projects: (portfolio.projects || portfolio.projets || []).map((p: any) => ({
        titre: p.titre || p.title || '', description: p.description || '',
        lien_demo: p.lien_demo || p.demo_url || '', lien_code: p.lien_code || p.code_url || '', image: p.image || p.image_url || null,
      })),
      competences: (portfolio.competences || []).map((c: any) => ({ nom: c.nom || c.name || '', niveau: c.niveau || '' })),
      experiences: (portfolio.experiences || []).map((e: any) => ({
        titre_poste: e.titre_poste || e.title || '', entreprise: e.entreprise || e.company || '',
        description: e.description || '', date_debut: e.date_debut || null, date_fin: e.date_fin || null,
      })),
    });
  }, [portfolio]);

  const socialFields = [
    { key: 'linkedin_url', label: 'LinkedIn', icon: Linkedin, minPlan: 'free' as PlanType },
    { key: 'website', label: 'Site web', icon: Globe, minPlan: 'starter' as PlanType },
    { key: 'github_url', label: 'GitHub', icon: Github, minPlan: 'starter' as PlanType },
    { key: 'facebook_url', label: 'Facebook', icon: Facebook, minPlan: 'pro' as PlanType },
    { key: 'instagram_url', label: 'Instagram', icon: Instagram, minPlan: 'pro' as PlanType },
  ];
  const visibleSocials = socialFields.filter(f => PLAN_ORDER.indexOf(planType) >= PLAN_ORDER.indexOf(f.minPlan)).slice(0, limits.socials);
  const filledSocialCount = visibleSocials.filter(f => formData[f.key as keyof typeof formData]).length;

  // Validation étape 1
  // "Autres" sélectionné sans texte custom = domaine valide (champ optionnel)
  const canGoToStep2 = formData.title.trim() !== '' && (!!portfolio || formData.domain !== '' || isOtherDomain);

  const goNext = () => {
    if (step === 1) {
      if (!canGoToStep2) {
        toast({ title: 'Champs requis', description: 'Veuillez remplir le nom complet et le domaine.', variant: 'destructive' });
        return;
      }
    }
    setStep(s => Math.min(s + 1, 3) as Step);
  };

  const goBack = () => setStep(s => Math.max(s - 1, 1) as Step);

  const handleSubmit = async () => {
    if (!user) return;
    // Si "Autres" sélectionné sans texte custom → conserver "Autres" comme valeur affichée
    if (isOtherDomain && !formData.domain) {
      setFormData(prev => ({ ...prev, domain: 'Autres' }));
    }
    const finalDomain   = isOtherDomain && !formData.domain ? 'Autres' : formData.domain;
    const mappedDomain  = mapDomainToEnum(finalDomain);
    if (!portfolio && !mappedDomain) {
      toast({ title: 'Erreur', description: 'Le champ Domaine est requis', variant: 'destructive' });
      return;
    }
    const invalidExp = formData.experiences.find(e => {
      const d = e.date_debut || ''; const f = e.date_fin || '';
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
        return;
      }
      const payload: any = { ...formData };
      const selectedTpl = templateById(payload.template_id || 't1');
      payload.template_family = selectedTpl.family;
      const allSocialKeys = ['website', 'linkedin_url', 'github_url', 'twitter_url', 'facebook_url', 'instagram_url'];
      const allowedSocialKeys = visibleSocials.map(s => s.key);
      for (const k of allSocialKeys) {
        const val = payload[k];
        if (typeof val === 'string' && val.trim() === '') { delete payload[k]; continue; }
        if (!allowedSocialKeys.includes(k)) { delete payload[k]; }
      }
      for (const k of allSocialKeys) { if (payload[k]) payload[k] = ensureUrl(payload[k]); }
      if (payload.profile_image_url && String(payload.profile_image_url).startsWith('data:')) delete payload.profile_image_url;
      if (payload.cv_url && String(payload.cv_url).startsWith('data:')) delete payload.cv_url;
      if (isOtherDomain && !payload.domain) payload.domain = 'Autres';
      const domainesEnum = mapDomainToEnum(payload.domain || finalDomain);
      if (domainesEnum) payload.domaines = domainesEnum;
      if (Array.isArray(payload.experiences)) {
        payload.experiences = payload.experiences.map((exp: any) => ({
          titre_poste: exp.titre_poste || exp.title || '', entreprise: exp.entreprise || exp.company || '',
          description: exp.description || '',
          date_debut: exp.date_debut && typeof exp.date_debut === 'string' && exp.date_debut.length === 7 ? `${exp.date_debut}-01` : (exp.date_debut || null),
          date_fin: exp.date_fin && typeof exp.date_fin === 'string' && exp.date_fin.length === 7 ? `${exp.date_fin}-01` : (exp.date_fin || null),
        }));
      }
      const platformMap: Record<string, string> = { linkedin_url: 'LinkedIn', website: 'Site', github_url: 'GitHub', facebook_url: 'Facebook', instagram_url: 'Instagram' };
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
  const selectedTpl = templateById(formData.template_id || 't1');

  // ─── Récapitulatif (étape 3) ──────────────────────────────────────────────
  const RecapStep = () => {
    const rows = [
      { label: 'Nom complet', value: formData.title || '—' },
      { label: 'Domaine', value: formData.domain || '—' },
      { label: 'Localisation', value: formData.location || '—' },
      { label: 'Template', value: selectedTpl.name },
      { label: 'Couleur', value: <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block border border-gray-200" style={{ background: formData.theme_color }} />{formData.theme_color}</span> },
      { label: 'Visibilité', value: formData.is_public ? '🌐 Public' : '🔒 Privé' },
    ];
    const counts = [
      { label: 'Liens sociaux', count: filledSocialCount, icon: '🔗' },
      { label: 'Projets', count: formData.projects.length, icon: '💼' },
      { label: 'Compétences', count: formData.competences.length, icon: '⭐' },
      { label: 'Expériences', count: formData.experiences.length, icon: '🏢' },
    ];
    return (
      <div className="px-4 py-5 sm:px-6">
        <div className="flex gap-5 items-start">

          {/* Aperçu téléphone — toujours visible, sticky */}
          <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 195 }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Eye className="w-3.5 h-3.5 text-[#28A745]" />
              Aperçu mobile
            </div>
            <PhonePreview formData={formData} />
            <p className="text-[10px] text-gray-400 text-center">Rendu indicatif</p>
          </div>

          {/* Données récap */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#28A745]" /> Informations
              </h3>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {rows.map(r => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-2 text-xs bg-white">
                    <span className="text-gray-500 shrink-0 w-20">{r.label}</span>
                    <span className="font-medium text-gray-900 text-right truncate ml-2">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Contenu</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {counts.map(c => (
                  <div key={c.label} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
                    <span className="text-base">{c.icon}</span>
                    <div>
                      <div className="text-[10px] text-gray-500">{c.label}</div>
                      <div className="text-sm font-bold text-gray-900">{c.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!formData.title.trim() && (
              <Alert className="bg-amber-50 border-amber-200 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <AlertDescription className="text-amber-800 text-xs">
                  Le nom complet est requis pour créer le portfolio.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* En-tête fixe */}
      <div className={`flex items-start justify-between gap-4 px-6 py-4 border-b shrink-0 ${isBusiness ? 'bg-gradient-to-r from-amber-50/70 via-yellow-50/40 to-amber-50/60' : 'bg-gradient-to-r from-green-50/60 to-emerald-50/60'}`}>
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            {isBusiness && <Crown className="w-5 h-5 text-amber-500" />}
            <h2 className="text-lg font-bold text-gray-900">
              {portfolio ? 'Modifier le portfolio' : isBusiness ? 'Nouveau portfolio Business' : 'Nouveau portfolio'}
            </h2>
            {!isBusiness && <Sparkles className="w-4 h-4 text-yellow-400" />}
          </div>
          <p className="text-xs text-gray-500">
            {portfolio ? 'Mettez à jour votre vitrine professionnelle' : isBusiness ? 'Accès complet · Styles avancés · Charte graphique entreprise' : 'Construisez votre présence professionnelle en ligne'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${plan.bgColor} ${plan.textColor} border ${plan.borderColor} flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold shadow-none`}>
            {plan.icon}{plan.label}
          </Badge>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Indicateur d'étapes */}
      <StepIndicator current={step} isEdit={!!portfolio} />

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* ══════════════ ÉTAPE 1 : Données ══════════════ */}
        {step === 1 && (
          <div className="divide-y divide-gray-100">

            {/* Informations de base */}
            <div className="px-6 py-6">
              <SectionHeader icon={<User className="w-4 h-4 text-gray-600" />} title="Informations de base" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="pl-9 h-10 text-sm" placeholder="John Doe" required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Domaine d'activité *</Label>
                  <select
                    value={isOtherDomain ? 'Autres' : formData.domain}
                    onChange={e => {
                      if (e.target.value === 'Autres') {
                        setIsOtherDomain(true);
                        setFormData({ ...formData, domain: '' });
                      } else {
                        setIsOtherDomain(false);
                        setFormData({ ...formData, domain: e.target.value });
                      }
                    }}
                    required={!portfolio && !isOtherDomain}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
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
                  {isOtherDomain && (
                    <div className="mt-2">
                      <Input
                        value={formData.domain}
                        onChange={e => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="Ex : Architecture, Communication, BTP..."
                        className="h-10 text-sm"
                        autoFocus
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Optionnel — sera affiché tel quel sur votre portfolio</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Localisation</Label>
                  <div className="relative" ref={locationWrapRef}>
                    <MapPin className="absolute left-3 top-5 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    {locationLoading && (
                      <Loader2 className="absolute right-3 top-5 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none z-10" />
                    )}
                    <Input
                      value={formData.location}
                      onChange={e => {
                        setFormData({ ...formData, location: e.target.value });
                        searchLocation(e.target.value);
                      }}
                      onFocus={() => { if (locationSuggestions.length > 0) setShowLocationDrop(true); }}
                      onKeyDown={e => { if (e.key === 'Escape') setShowLocationDrop(false); }}
                      className="pl-9 h-10 text-sm"
                      placeholder="Dakar, Sénégal"
                      autoComplete="off"
                    />
                    {showLocationDrop && locationSuggestions.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {locationSuggestions.map((suggestion, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-green-50 transition-colors"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                setFormData({ ...formData, location: suggestion });
                                setShowLocationDrop(false);
                                setLocationSuggestions([]);
                              }}
                            >
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-800">{suggestion}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="pl-9 h-10 text-sm" placeholder="+221 77 000 00 00" type="tel" />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Biographie</Label>
                <Textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} className="text-sm resize-none" placeholder="Décrivez votre parcours, vos spécialités, ce qui vous distingue..." />
              </div>
            </div>

            {/* Photo & CV */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Palette className="w-4 h-4 text-blue-600" />} title="Photo & CV" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUpload label="Photo de profil" value={formData.profile_image_url} onChange={url => setFormData({ ...formData, profile_image_url: url })} />
                <ImageUpload label="CV (PDF)" value={formData.cv_url} onChange={url => setFormData({ ...formData, cv_url: url })} accept="application/pdf" />
              </div>
            </div>

            {/* Liens sociaux */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Link2 className="w-4 h-4 text-indigo-600" />} title="Liens sociaux" count={filledSocialCount} total={displayLimit(limits.socials)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleSocials.map(({ key, label, icon: Icon }) => (
                  <div key={key}>
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5"><Icon className="w-3.5 h-3.5" />{label}</Label>
                    <Input placeholder={`Votre profil ${label}`} value={formData[key as keyof typeof formData] as string} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="h-10 text-sm" />
                  </div>
                ))}
              </div>
              {planType === 'free' && (
                <Alert className="mt-4 bg-amber-50 border-amber-200 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-800 text-sm">
                    Plan <strong>Gratuit</strong> : seul LinkedIn est disponible.{' '}
                    <button type="button" onClick={handleUpgrade} className="underline font-semibold hover:text-amber-900">Passer au Starter</button>{' '}pour débloquer GitHub, Site web, et plus.
                  </AlertDescription>
                </Alert>
              )}
              {planType === 'starter' && (
                <Alert className="mt-4 bg-blue-50 border-blue-200 py-3">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Plan <strong>Starter</strong> : Facebook et Instagram disponibles avec le plan{' '}
                    <button type="button" onClick={handleUpgrade} className="underline font-semibold hover:text-blue-900">Pro</button>.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Projets */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Code2 className="w-4 h-4 text-purple-600" />} title="Projets" count={limits.projects > 0 ? formData.projects.length : undefined} total={limits.projects > 0 ? displayLimit(limits.projects) : undefined} />
              {limits.projects === 0 ? (
                <LockedSection title="Projets" requiredPlan="Starter" onUpgrade={handleUpgrade} />
              ) : (
                <div className="space-y-3">
                  {formData.projects.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projet {i + 1}</span>
                        <button type="button" onClick={() => setFormData({ ...formData, projects: formData.projects.filter((_, idx) => idx !== i) })} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <Input value={p.titre} onChange={e => { const np = [...formData.projects]; np[i].titre = e.target.value; setFormData({ ...formData, projects: np }); }} placeholder="Titre du projet" className="h-10 text-sm" />
                      <Textarea value={p.description} onChange={e => { const np = [...formData.projects]; np[i].description = e.target.value; setFormData({ ...formData, projects: np }); }} placeholder="Description du projet..." rows={2} className="resize-none text-sm" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input value={p.lien_demo || ''} onChange={e => { const np = [...formData.projects]; np[i].lien_demo = e.target.value; setFormData({ ...formData, projects: np }); }} placeholder="Lien démo" className="h-9 text-xs" />
                        <Input value={p.lien_code || ''} onChange={e => { const np = [...formData.projects]; np[i].lien_code = e.target.value; setFormData({ ...formData, projects: np }); }} placeholder="Lien code source" className="h-9 text-xs" />
                      </div>
                      <ImageUpload label="Image du projet" value={p.image || ''} onChange={(url) => { const np = [...formData.projects]; np[i].image = url; setFormData({ ...formData, projects: np }); }} placeholder="https://exemple.com/image.jpg" />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, projects: [...formData.projects, { titre: '', description: '', lien_demo: '', lien_code: '', image: '' }] })} disabled={formData.projects.length >= limits.projects} className="w-full h-10 border-dashed text-sm font-medium text-gray-600 hover:text-gray-900">
                    <Plus className="w-4 h-4 mr-2" />Ajouter un projet
                  </Button>
                </div>
              )}
            </div>

            {/* Compétences */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Star className="w-4 h-4 text-green-600" />} title="Compétences" count={limits.competences > 0 ? formData.competences.length : undefined} total={limits.competences > 0 ? displayLimit(limits.competences) : undefined} />
              {limits.competences === 0 ? (
                <LockedSection title="Compétences" requiredPlan="Starter" onUpgrade={handleUpgrade} />
              ) : (
                <div className="space-y-3">
                  {formData.competences.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.competences.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 group">
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          <input value={c.nom} onChange={e => { const nc = [...formData.competences]; nc[i].nom = e.target.value; setFormData({ ...formData, competences: nc }); }} placeholder="Compétence" className="bg-transparent text-sm text-green-800 font-medium outline-none w-24 min-w-0" />
                          <button type="button" onClick={() => setFormData({ ...formData, competences: formData.competences.filter((_, idx) => idx !== i) })} className="text-green-400 hover:text-red-500 transition-colors ml-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, competences: [...formData.competences, { nom: '' }] })} disabled={formData.competences.length >= limits.competences} className="border-dashed h-9 text-sm font-medium text-gray-600 hover:text-gray-900">
                    <Plus className="w-4 h-4 mr-2" />Ajouter une compétence
                  </Button>
                  <p className="text-xs text-gray-400">Ex : React, Laravel, Python, Figma, SEO...</p>
                </div>
              )}
            </div>

            {/* Expériences */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Briefcase className="w-4 h-4 text-orange-600" />} title="Expériences professionnelles" count={limits.experiences > 0 ? formData.experiences.length : undefined} total={limits.experiences > 0 ? displayLimit(limits.experiences) : undefined} />
              {limits.experiences === 0 ? (
                <LockedSection title="Expériences professionnelles" requiredPlan="Pro" onUpgrade={handleUpgrade} />
              ) : (
                <div className="space-y-3">
                  {formData.experiences.map((e, i) => {
                    const debutDate = e.date_debut ? new Date(e.date_debut) : undefined;
                    const finDate = e.date_fin ? new Date(e.date_fin) : undefined;
                    const getDateError = (start: Date | undefined, end: Date | undefined): string | null => {
                      if (!start && !end) return null;
                      if (start && !end) return null;
                      if (!start && end) return 'La date de début est requise';
                      if (start && end) {
                        if (start > end) return 'La date de début ne peut pas être postérieure à la date de fin';
                        if (start.getTime() === end.getTime()) return 'Les dates ne peuvent pas être identiques';
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        if (start > today) return 'La date de début ne peut pas être dans le futur';
                        if (end > today) return 'La date de fin ne peut pas être dans le futur';
                      }
                      return null;
                    };
                    const dateError = getDateError(debutDate, finDate);
                    return (
                      <ExperienceItem key={i} experience={e} index={i} onUpdate={(updatedExp) => { const newExp = [...formData.experiences]; newExp[i] = updatedExp; setFormData({ ...formData, experiences: newExp }); }} onDelete={() => setFormData({ ...formData, experiences: formData.experiences.filter((_, idx) => idx !== i) })} hasError={!!dateError} dateError={dateError} />
                    );
                  })}
                  <Button type="button" variant="outline" onClick={() => setFormData({ ...formData, experiences: [...formData.experiences, { titre_poste: '', entreprise: '', description: '', date_debut: '', date_fin: '' }] })} disabled={formData.experiences.length >= limits.experiences} className="w-full h-10 border-dashed text-sm font-medium text-gray-600 hover:text-gray-900">
                    <Plus className="w-4 h-4 mr-2" />Ajouter une expérience
                  </Button>
                </div>
              )}
            </div>

            {/* Personnalisation */}
            <div className="px-6 py-6">
              <SectionHeader icon={<Palette className="w-4 h-4 text-pink-600" />} title="Personnalisation visuelle" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Couleur du thème</Label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Input type="color" value={formData.theme_color} onChange={e => setFormData({ ...formData, theme_color: e.target.value })} className="h-10 w-16 cursor-pointer rounded-lg p-0.5 border-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800" style={{ color: formData.theme_color }}>{formData.theme_color.toUpperCase()}</p>
                      <p className="text-xs text-gray-400">Couleur principale du portfolio</p>
                    </div>
                  </div>
                </div>
                <BannerCustomizer bannerType={formData.banner_type} bannerColor={formData.banner_color} bannerImageUrl={formData.banner_image_url} onBannerTypeChange={type => setFormData({ ...formData, banner_type: type })} onBannerColorChange={color => setFormData({ ...formData, banner_color: color })} onBannerImageChange={url => setFormData({ ...formData, banner_image_url: url })} />
              </div>
            </div>

            {/* Business avancé */}
            {isBusiness && (
              <div className="px-6 py-6 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50">
                <SectionHeader icon={<Crown className="w-4 h-4 text-amber-600" />} title="Styles avancés Business" />
                {businessAccount && (businessAccount.primary_color || businessAccount.secondary_color) && (
                  <div className="mb-5 p-4 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {businessAccount.company_logo_url ? (
                        <img src={businessAccount.company_logo_url} alt={businessAccount.company_name} className="h-9 w-9 object-contain rounded-lg border border-gray-100" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: businessAccount.primary_color || '#1a1a2e' }}>
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{businessAccount.company_name || 'Votre entreprise'}</p>
                        <p className="text-xs text-gray-500">Appliquer la charte graphique de l'entreprise</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        {[businessAccount.primary_color, businessAccount.secondary_color, businessAccount.accent_color].filter(Boolean).map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c! }} />
                        ))}
                      </div>
                    </div>
                    <Button type="button" size="sm" onClick={() => setFormData(prev => ({ ...prev, theme_color: businessAccount.primary_color || prev.theme_color, banner_color: businessAccount.secondary_color || businessAccount.primary_color || prev.banner_color, font_family: businessAccount.font_family || prev.font_family }))} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />Appliquer
                    </Button>
                  </div>
                )}
                <div className="mb-5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5"><Type className="w-3.5 h-3.5" />Police du portfolio</Label>
                  <select value={formData.font_family} onChange={e => setFormData(prev => ({ ...prev, font_family: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <option value="">Système (défaut)</option>
                    <option value="Inter">Inter — Moderne & lisible</option>
                    <option value="Poppins">Poppins — Contemporain</option>
                    <option value="Playfair Display">Playfair Display — Élégant & luxueux</option>
                    <option value="Montserrat">Montserrat — Professionnel</option>
                    <option value="Roboto Slab">Roboto Slab — Solide & structuré</option>
                    <option value="DM Sans">DM Sans — Épuré & minimaliste</option>
                    <option value="Space Grotesk">Space Grotesk — Tech & innovant</option>
                  </select>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2"><Layout className="w-3.5 h-3.5" />Style de présentation</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { value: 'modern', label: 'Moderne', emoji: '⚡', desc: 'Épuré & dynamique' },
                      { value: 'classic', label: 'Classique', emoji: '📋', desc: 'Sobre & formel' },
                      { value: 'minimal', label: 'Minimal', emoji: '◻', desc: 'Blanc & contrasté' },
                      { value: 'bold', label: 'Impact', emoji: '🔥', desc: 'Couleurs prononcées' },
                    ] as const).map(style => (
                      <button key={style.value} type="button" onClick={() => setFormData(prev => ({ ...prev, layout_style: style.value }))} className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${formData.layout_style === style.value ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-gray-200 hover:border-amber-300 bg-white'}`}>
                        <div className="text-xl mb-1">{style.emoji}</div>
                        <p className={`text-xs font-semibold ${formData.layout_style === style.value ? 'text-amber-700' : 'text-gray-900'}`}>{style.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{style.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Visibilité */}
            <div className="px-6 py-5">
              <label htmlFor="is_public" className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/80 transition-colors">
                <Checkbox id="is_public" checked={formData.is_public} onCheckedChange={v => setFormData({ ...formData, is_public: !!v })} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Portfolio public</p>
                  <p className="text-xs text-gray-500 mt-0.5">Visible par tout le monde via un lien partageable</p>
                </div>
                <Globe className={`w-5 h-5 ml-auto ${formData.is_public ? 'text-green-500' : 'text-gray-300'}`} />
              </label>
            </div>
          </div>
        )}

        {/* ══════════════ ÉTAPE 2 : Template ══════════════ */}
        {step === 2 && (
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-50"><Layout className="w-4 h-4 text-violet-600" /></div>
                <h3 className="font-semibold text-gray-900 text-sm">Choisissez votre template</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-violet-50 text-violet-700">
                <Sparkles size={12} />{PORTFOLIO_TEMPLATES.filter(t => isTemplateUnlocked(t, planType)).length} / {PORTFOLIO_TEMPLATES.length} débloqués
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-5">Sélectionnez le design de votre portfolio. La couleur du thème sera appliquée automatiquement.</p>

            {hintTpl && (
              <div className="mb-4 rounded-xl border p-3.5 flex items-center gap-3" style={{ borderColor: '#FCD9B6', background: '#FFF7ED' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FED7AA', color: '#B45309' }}><Lock size={15} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#9A3412' }}>« {hintTpl.name} » nécessite la formule {TIER_META[hintTpl.tier].plan}</p>
                  <p className="text-xs" style={{ color: '#B45309' }}>Passez à un plan supérieur pour débloquer ce template et bien d'autres.</p>
                </div>
                <button type="button" onClick={handleUpgrade} className="h-9 px-3.5 rounded-[10px] text-sm font-semibold text-white shrink-0" style={{ background: '#EA580C' }}>Voir les formules</button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
              {PORTFOLIO_TEMPLATES.map(tpl => {
                const locked = !isTemplateUnlocked(tpl, planType);
                return (
                  <TemplateThumb key={tpl.id} tpl={tpl} selected={formData.template_id === tpl.id} locked={locked} onClick={() => {
                    if (!locked) {
                      const bannerColor = tpl.family === 'sombre' ? '#0E0F13'
                        : tpl.family === 'minimal' ? '#F1F5F9'
                        : '#1e293b';
                      setFormData(prev => ({ ...prev, template_id: tpl.id, theme_color: tpl.primary, banner_color: bannerColor }));
                      setHintTpl(null);
                    } else { setHintTpl(tpl); }
                  }} />
                );
              })}
            </div>

            {/* Template sélectionné badge */}
            <div className="mt-6 p-3 rounded-xl flex items-center gap-3" style={{ background: `${selectedTpl.primary}12`, border: `1px solid ${selectedTpl.primary}30` }}>
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ border: `2px solid ${selectedTpl.primary}` }}>
                <div className="w-full h-full" style={{ background: selectedTpl.family === 'sombre' ? '#0E0F13' : '#fff' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: selectedTpl.primary }}>Template sélectionné : {selectedTpl.name}</p>
                <p className="text-xs text-gray-500">Famille {selectedTpl.family} · Couleur appliquée : {formData.theme_color}</p>
              </div>
              <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: selectedTpl.primary }}>
                <Check size={12} strokeWidth={3} />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ ÉTAPE 3 : Récapitulatif ══════════════ */}
        {step === 3 && <RecapStep />}
      </div>

      {/* Pied de page fixe */}
      <div className="shrink-0 border-t bg-white px-6 py-4 flex items-center justify-between gap-3">
        {step === 1 ? (
          <>
            {onClose && <Button type="button" variant="outline" onClick={onClose} className="px-5 h-10">Annuler</Button>}
            <Button type="button" onClick={goNext} className="flex-1 sm:flex-none sm:px-10 h-10 bg-[#28A745] hover:bg-[#218838] text-white font-semibold gap-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <Button type="button" variant="outline" onClick={goBack} className="px-5 h-10 gap-2">
              <ChevronLeft className="w-4 h-4" /> Retour
            </Button>
            <Button type="button" onClick={goNext} className="flex-1 sm:flex-none sm:px-10 h-10 bg-[#28A745] hover:bg-[#218838] text-white font-semibold gap-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={goBack} className="px-5 h-10 gap-2">
              <ChevronLeft className="w-4 h-4" /> Retour
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none sm:px-10 h-10 bg-[#28A745] hover:bg-[#218838] text-white font-semibold">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sauvegarde...
                </span>
              ) : (
                portfolio ? 'Mettre à jour' : '🚀 Créer mon portfolio'
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
