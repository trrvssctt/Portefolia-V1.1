// src/components/portfolio/PortfolioForm.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { BannerCustomizer } from '@/components/portfolio/BannerCustomizer';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  User,
  Link,
  Github,
  Linkedin,
  Globe,
  Facebook,
  Instagram,
  Palette,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';

interface PortfolioFormProps {
  portfolio?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const PortfolioForm: React.FC<PortfolioFormProps> = ({
  portfolio,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<'free' | 'starter' | 'pro' | 'premium'>('free');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
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
  });

  // Détection du plan utilisateur
  useEffect(() => {
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
        if (slug.includes('gratuit') || slug.includes('free')) setPlanType('free');
        else if (slug.includes('starter') || slug.includes('standard')) setPlanType('starter');
        else if (slug.includes('premium') || slug.includes('business')) setPlanType('premium');
        else setPlanType('pro');
      } catch {}
    };
    fetchPlan();
  }, []);

  // Chargement des données existantes
  useEffect(() => {
    if (!portfolio) return;

    // normalize relations -> extract social links if saved in `liens_sociaux` or similar
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
      slug: portfolio.slug || portfolio.url_slug || '',
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
      projects: (portfolio.projects || portfolio.projets || []).map((p: any) => ({
        titre: p.titre || p.title || '',
        description: p.description || '',
        lien_demo: p.lien_demo || p.demo_url || '',
        lien_code: p.lien_code || p.code_url || '',
        image: p.image || null,
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

  // Limites selon le plan
  const limits = {
    free: { socials: 1, projects: 0, competences: 0, experiences: 0 },
    starter: { socials: 3, projects: 3, competences: 3, experiences: 0 },
    pro: { socials: 5, projects: 10, competences: 10, experiences: 5 },
    premium: { socials: 5, projects: 9999, competences: 9999, experiences: 9999 },
  };

  const current = limits[planType];

  // Liens sociaux limités
  const socialFields = [
    { key: 'linkedin_url', label: 'LinkedIn', icon: Linkedin, plan: 'all' },
    { key: 'website', label: 'Site web', icon: Globe, plan: 'starter+' },
    { key: 'github_url', label: 'GitHub', icon: Github, plan: 'starter+' },
    { key: 'facebook_url', label: 'Facebook', icon: Facebook, plan: 'pro' },
    { key: 'instagram_url', label: 'Instagram', icon: Instagram, plan: 'pro' },
  ];

  const visibleSocials = socialFields
    .filter(field => {
      if (field.plan === 'all') return true;
      if (field.plan === 'starter+' && (planType === 'starter' || planType === 'pro' || planType === 'premium')) return true;
      if (field.plan === 'pro' && (planType === 'pro' || planType === 'premium')) return true;
      return false;
    })
    .slice(0, current.socials);

  const filledSocialCount = visibleSocials.filter(
    f => formData[f.key as keyof typeof formData]
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (filledSocialCount > current.socials) {
      toast({
        title: 'Limite atteinte',
        description: `Maximum ${current.socials} lien${current.socials > 1 ? 's' : ''} social${current.socials > 1 ? 'aux' : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Normalize payload and convert month inputs (YYYY-MM) to full date (YYYY-MM-01)
      const payload: any = { ...formData };
      if (Array.isArray(payload.experiences)) {
        payload.experiences = payload.experiences.map((e: any) => ({
          titre_poste: e.titre_poste || e.title || '',
          entreprise: e.entreprise || e.company || '',
          description: e.description || '',
          date_debut: e.date_debut && typeof e.date_debut === 'string' && e.date_debut.length === 7 ? `${e.date_debut}-01` : (e.date_debut || null),
          date_fin: e.date_fin && typeof e.date_fin === 'string' && e.date_fin.length === 7 ? `${e.date_fin}-01` : (e.date_fin || null),
        }));
      }

      // Build liens_sociaux array so backend can persist social links reliably
      const socialsPayload: any[] = [];
      const addSocial = (plat: string, url?: string) => {
        if (!url) return;
        const clean = String(url).trim();
        if (!clean) return;
        socialsPayload.push({ plateforme: plat, url: clean });
      };
      addSocial('LinkedIn', payload.linkedin_url);
      addSocial('Site', payload.website);
      addSocial('GitHub', payload.github_url);
      addSocial('Facebook', payload.facebook_url);
      addSocial('Instagram', payload.instagram_url);

      if (socialsPayload.length > 0) payload.liens_sociaux = socialsPayload;

      const res = portfolio
        ? await fetch(`${API_BASE}/api/portfolios/${portfolio.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API_BASE}/api/portfolios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      toast({ title: 'Succès !', description: portfolio ? 'Portfolio mis à jour' : 'Portfolio créé' });
      onSuccess?.();
      onClose?.();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Formatage joli des dates (ex: Déc. 2023)
  const formatMonthYear = (dateStr: string | null) => {
    if (!dateStr) return 'Présent';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {portfolio ? 'Modifier' : 'Créer'} votre Portfolio
            <Sparkles className="inline-block w-10 h-10 ml-3 text-yellow-500" />
          </h1>
          <Badge className="text-lg px-6 py-2">
            Formule {planType === 'free' ? 'Gratuite' : planType === 'starter' ? 'Starter' : 'Pro / Premium'}
          </Badge>
        </div>

        <Card className="shadow-2xl bg-white/95 backdrop-blur rounded-3xl">
          <CardHeader className="text-center bg-gradient-to-b from-[#28A745]/5 to-transparent">
            <CardTitle className="text-3xl font-bold">
              {portfolio ? 'Mettez à jour' : 'Créez'} votre vitrine professionnelle
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 sm:p-10 space-y-10">
            <form onSubmit={handleSubmit} className="space-y-10">

              {/* Infos de base */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label>Nom complet *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="pl-12 h-14"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>URL personnalisée *</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                      })}
                      placeholder="mon-portfolio"
                      className="pl-12 h-14"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Biographie</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="text-base"
                />
              </div>

              {/* Photo + CV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ImageUpload
                  label="Photo de profil"
                  value={formData.profile_image_url}
                  onChange={(url) => setFormData({ ...formData, profile_image_url: url })}
                />
                <ImageUpload
                  label="CV (PDF)"
                  value={formData.cv_url}
                  onChange={(url) => setFormData({ ...formData, cv_url: url })}
                  accept="application/pdf"
                />
              </div>

              {/* Liens sociaux */}
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <Link className="w-6 h-6" />
                    Liens sociaux ({filledSocialCount}/{current.socials})
                  </h3>
                  {filledSocialCount >= current.socials && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Limite atteinte
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {visibleSocials.map(({ key, label, icon: Icon }) => (
                    <div key={key}>
                      <Label className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5" />
                        {label}
                      </Label>
                      <Input
                        placeholder={`https://${label.toLowerCase().replace(' ', '')}.com/votre-profil`}
                        value={formData[key as keyof typeof formData] as string}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  ))}
                </div>

                {planType === 'free' && (
                  <Alert className="mt-4 bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Avec la formule <strong>Gratuite</strong>, seul <strong>LinkedIn</strong> est autorisé.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Projets */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Projets ({formData.projects.length}/{current.projects})</h3>
                {formData.projects.map((p, i) => (
                  <Card key={i} className="p-4">
                    <Input
                      value={p.titre}
                      onChange={(e) => {
                        const np = [...formData.projects];
                        np[i].titre = e.target.value;
                        setFormData({ ...formData, projects: np });
                      }}
                      placeholder="Titre du projet"
                      className="mb-3"
                    />
                    <Textarea
                      value={p.description}
                      onChange={(e) => {
                        const np = [...formData.projects];
                        np[i].description = e.target.value;
                        setFormData({ ...formData, projects: np });
                      }}
                      placeholder="Description"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={() => setFormData({ ...formData, projects: formData.projects.filter((_, idx) => idx !== i) })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                    </Button>
                  </Card>
                ))}
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, projects: [...formData.projects, { titre: '', description: '' }] })}
                  disabled={formData.projects.length >= current.projects}
                >
                  <Plus className="w-5 h-5 mr-2" /> Ajouter un projet
                </Button>
              </div>

              {/* Compétences */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Compétences ({formData.competences.length}/{current.competences})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formData.competences.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={c.nom}
                        onChange={(e) => {
                          const nc = [...formData.competences];
                          nc[i].nom = e.target.value;
                          setFormData({ ...formData, competences: nc });
                        }}
                        placeholder="React, Laravel..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData({ ...formData, competences: formData.competences.filter((_, idx) => idx !== i) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, competences: [...formData.competences, { nom: '' }] })}
                  disabled={formData.competences.length >= current.competences}
                >
                  <Plus className="w-5 h-5 mr-2" /> Ajouter
                </Button>
              </div>

              {/* === REMPLACE LA SECTION "EXPÉRIENCES" PAR CE BLOC === */}
              {current.experiences > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold">Expériences professionnelles ({formData.experiences.length}/{current.experiences})</h3>

                  {formData.experiences.map((e, i) => {
                    const debut = e.date_debut || '';
                    const fin = e.date_fin || '';
                    const hasError = debut && fin && debut >= fin;

                    return (
                      <Card key={i} className={`p-6 bg-white border ${hasError ? 'border-red-300 shadow-red-100' : 'border-gray-200'}`}>
                        {/* Titre + Entreprise */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                          <div>
                            <Label>Titre du poste</Label>
                            <Input
                              value={e.titre_poste}
                              onChange={(ev) => {
                                const ne = [...formData.experiences];
                                ne[i].titre_poste = ev.target.value;
                                setFormData({ ...formData, experiences: ne });
                              }}
                              placeholder="Développeur Full Stack"
                            />
                          </div>
                          <div>
                            <Label>Entreprise</Label>
                            <Input
                              value={e.entreprise}
                              onChange={(ev) => {
                                const ne = [...formData.experiences];
                                ne[i].entreprise = ev.target.value;
                                setFormData({ ...formData, experiences: ne });
                              }}
                              placeholder="Google, Microsoft..."
                            />
                          </div>
                        </div>

                        {/* Dates avec contrôle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                          <div>
                            <Label className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date de début
                            </Label>
                            <Input
                              type="month"
                              value={debut}
                              onChange={(ev) => {
                                const ne = [...formData.experiences];
                                ne[i].date_debut = ev.target.value || null;
                                setFormData({ ...formData, experiences: ne });
                              }}
                              placeholder="2023-06"
                              className="h-12"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format : AAAA-MM (ex: 2023-06)</p>
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date de fin <span className="text-xs text-gray-500">(laisser vide si en cours)</span>
                            </Label>
                            <Input
                              type="month"
                              value={fin}
                              onChange={(ev) => {
                                const ne = [...formData.experiences];
                                ne[i].date_fin = ev.target.value || null;
                                setFormData({ ...formData, experiences: ne });
                              }}
                              placeholder="2025-12"
                              className={`h-12 ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            <p className="text-xs text-gray-500 mt-1">Format : AAAA-MM</p>
                          </div>
                        </div>

                        {/* Message d'erreur si date invalide */}
                        {hasError && (
                          <Alert variant="destructive" className="mb-4 py-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              La date de début ne peut pas être supérieure ou égale à la date de fin.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Description */}
                        <div className="mb-5">
                          <Label>Description</Label>
                          <Textarea
                            value={e.description}
                            onChange={(ev) => {
                              const ne = [...formData.experiences];
                              ne[i].description = ev.target.value;
                              setFormData({ ...formData, experiences: ne });
                            }}
                            placeholder="Décrivez vos missions, technologies utilisées, résultats obtenus..."
                            rows={3}
                          />
                        </div>

                        {/* Bouton supprimer */}
                        <div className="text-right">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const ne = formData.experiences.filter((_, idx) => idx !== i);
                              setFormData({ ...formData, experiences: ne });
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer cette expérience
                          </Button>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Ajouter une expérience */}
                  <Button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        experiences: [
                          ...formData.experiences,
                          { titre_poste: '', entreprise: '', description: '', date_debut: '', date_fin: '' },
                        ],
                      })
                    }
                    disabled={formData.experiences.length >= current.experiences}
                    className="w-full"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Ajouter une expérience
                  </Button>

                  {formData.experiences.length >= current.experiences && (
                    <p className="text-sm text-orange-600 text-center">Limite atteinte</p>
                  )}
                </div>
              )}

              {/* Personnalisation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t">
                <div>
                  <Label>Couleur du thème</Label>
                  <Input
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                    className="h-16 w-full cursor-pointer rounded-xl"
                  />
                </div>
                <BannerCustomizer
                  bannerType={formData.banner_type}
                  bannerColor={formData.banner_color}
                  bannerImageUrl={formData.banner_image_url}
                  onBannerTypeChange={(type) => setFormData({ ...formData, banner_type: type })}
                  onBannerColorChange={(color) => setFormData({ ...formData, banner_color: color })}
                  onBannerImageChange={(url) => setFormData({ ...formData, banner_image_url: url })}
                />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.is_public}
                  onCheckedChange={(v) => setFormData({ ...formData, is_public: !!v })}
                />
                <Label>Rendre ce portfolio public</Label>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
                {onClose && (
                  <Button type="button" variant="outline" size="lg" onClick={onClose}>
                    Annuler
                  </Button>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="bg-[#28A745] hover:bg-[#218838] text-white font-bold h-14 px-12"
                >
                  {loading ? 'Sauvegarde...' : portfolio ? 'Mettre à jour' : 'Créer mon portfolio'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};