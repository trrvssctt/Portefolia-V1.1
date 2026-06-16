import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
import { ModernPortfolioTemplate } from "@/components/portfolio/ModernPortfolioTemplate";
import { useToast } from "@/hooks/use-toast";
import { isTokenExpired } from '@/utils/authUtils';
import { templateById } from '@/components/portfolio/portfolioTemplates';

const Portfolio = () => {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
      window.location.href = '/auth';
    }
  }, [toast]);

  useEffect(() => {
    if (slug) {
      loadPortfolio();
    }
  }, [slug]);

  const loadPortfolio = async () => {
    try {
      // Load portfolio from backend public endpoint
<<<<<<< HEAD
      const res = await fetch(`${API_BASE}/api/p/${slug}`);
=======
      const res = await fetch(`${API_BASE}/p/${slug}`);
>>>>>>> 475c22479d16e3eeb9ee016f028cf1b8259518ae
      if (!res.ok) {
        setError('Portfolio non trouvé ou privé');
        setLoading(false);
        return;
      }
      const { portfolio: p } = await res.json();
      
      // If the backend returned a portfolio marked as not public, block access immediately
      if (p && (p.est_public === 0 || p.est_public === false || p.is_public === 0 || p.is_public === false)) {
        setError('Ce portfolio est privé');
        setLoading(false);
        return;
      }
      
      // Debug: log the raw data to see what's coming from the API
      console.log('Raw portfolio data:', p);
      console.log('Projects data:', p.projects || p.projets);
      
      // map french fields to frontend shape (fallbacks for english keys)
      const portfolioData = {
        id: p.id,
        title: p.titre || p.title || p.nom || '',
        slug: p.url_slug || p.slug || p.url || '',
        bio: p.description || p.bio || p.about || '',
        // CORRECTION: Photo de profil - plus de fallbacks
        profile_image_url: p.profile_image_url || p.photo || p.avatar || p.profileImage || '',
        location: p.location || p.localisation || p.lieu || '',
        phone: p.phone || p.telephone || p.phone_number || '',
        website: p.website || p.site || p.site_web || '',
        linkedin_url: p.linkedin_url || p.linkedin || '',
        facebook_url: (() => {
          const raw = p.facebook_url || p.facebook || '';
          if (raw) return /^(https?:)?\/\//i.test(raw) ? raw : `https://facebook.com/${raw.replace(/^@/, '')}`;
          const relations = p.liens_sociaux || p.socials || p.links || p.relations || [];
          for (const r of relations) {
            const key = (r.plateforme || r.platform || r.name || r.key || '').toString().toLowerCase();
            const val = r.url || r.lien || r.value || r.link || r.href || '';
            if (!val) continue;
            if (key.includes('facebook')) return /^(https?:)?\/\//i.test(val) ? val : `https://facebook.com/${val.replace(/^@/, '')}`;
            if (typeof val === 'string' && val.includes('facebook.com')) return val;
          }
          return '';
        })(),
        instagram_url: (() => {
          const raw = p.instagram_url || p.instagram || '';
          if (raw) return /^(https?:)?\/\//i.test(raw) ? raw : `https://instagram.com/${raw.replace(/^@/, '')}`;
          const relations = p.liens_sociaux || p.socials || p.links || p.relations || [];
          for (const r of relations) {
            const key = (r.plateforme || r.platform || r.name || r.key || '').toString().toLowerCase();
            const val = r.url || r.lien || r.value || r.link || r.href || '';
            if (!val) continue;
            if (key.includes('instagram')) return /^(https?:)?\/\//i.test(val) ? val : `https://instagram.com/${val.replace(/^@/, '')}`;
            if (typeof val === 'string' && val.includes('instagram.com')) return val;
          }
          return '';
        })(),
        github_url: p.github_url || p.github || '',
        twitter_url: p.twitter_url || p.twitter || '',
        // CORRECTION: Bannière - meilleure gestion des champs
        banner_type: p.banner_type || p.banniere_type || (p.banner_image_url ? 'image' : 'color'),
        banner_image_url: p.banner_image_url || p.banniere_image_url || p.bannerImageUrl || p.banner || '',
        banner_color: p.banner_color || p.couleur_banniere || p.theme || '#1e293b',
        theme_color: (() => {
          if (p.theme_color && p.theme_color !== '#28A745') return p.theme_color;
          const tid = (p.template_id || p.template || '').toString();
          if (/^t\d+$/.test(tid)) return templateById(tid).primary;
          return p.theme_color || p.theme || '#28A745';
        })(),
        cv_url: p.cv_url || p.resume_url || p.cv || '',
        est_public: p.est_public !== undefined ? p.est_public : (p.is_public !== undefined ? p.is_public : true),
        business: p.business || null,
        role: p.role || p.titre_professionnel || p.profession || p.poste || '',
        template_family: (() => {
          // If backend returns template_family directly, use it
          if (p.template_family) return p.template_family;
          // If template_id matches catalog format (t1, t2, …), resolve via catalog
          const tid = (p.template_id || p.template || '').toString();
          if (/^t\d+$/.test(tid)) return templateById(tid).family;
          // Fallback: infer from slug/name
          const slug = tid.toLowerCase();
          if (slug.includes('classique') || slug.includes('classic')) return 'classique';
          if (slug.includes('minimal')   || slug.includes('minima'))  return 'minimal';
          if (slug.includes('sombre')    || slug.includes('dark') || slug.includes('creative')) return 'sombre';
          return 'editorial';
        })(),
      };
      
      console.log('Mapped portfolio data:', portfolioData);
      setPortfolio(portfolioData);

      // If the portfolio is marked private, block access immediately
      if (portfolioData.est_public === false) {
        setError('Ce portfolio est privé');
        setLoading(false);
        return;
      }

      // Prefer relations returned by public slug response (no auth required)
      if (p.projects || p.projets || p.competences || p.experiences) {
        const relProjects = p.projects || p.projets || [];
        const relCompetences = p.competences || [];
        const relExperiences = p.experiences || [];

        const normalizedExperiences = (relExperiences || []).map((e: any) => ({
          id: e.id,
          position: e.position || e.title || e.titre_poste || e.titre || e.nom || '',
          company: e.company || e.entreprise || '',
          start_date: e.start_date || e.date_debut || null,
          end_date: e.end_date || e.date_fin || null,
          is_current: e.is_current !== undefined ? e.is_current : (!e.date_fin && !!e.date_debut),
          location: e.location || e.lieu || '',
          description: e.description || '',
        }));

        const normalizedSkills = (relCompetences || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.nom || c.titre || '',
          level: c.level || c.niveau || null,
        }));

        // CORRECTION: Mapping des projets avec l'image
        const normalizedProjects = (relProjects || []).map((rp: any) => {
          console.log('Raw project data:', rp);
          return {
            id: rp.id,
            title: rp.title || rp.titre || '',
            project_url: rp.project_url || rp.demo_url || rp.lien_demo || '',
            github_url: rp.github_url || rp.code_url || rp.lien_code || '',
            description: rp.description || '',
            technologies: rp.technologies || rp.techno || rp.tags || [],
            // CORRECTION: Meilleure gestion de l'image du projet
            image: rp.image || rp.image_url || rp.imageUrl || rp.photo || null,
          };
        });

        console.log('Normalized projects:', normalizedProjects);
        setExperiences(normalizedExperiences);
        setSkills(normalizedSkills);
        setProjects(normalizedProjects);
      } else {
        // Fallback: call portfolio-specific endpoints (may require auth)
        try {
          const [expRes, skillsRes, projectsRes] = await Promise.all([
            fetch(`${API_BASE}/api/experiences/portfolio/${p.id}`),
            fetch(`${API_BASE}/api/competences/portfolio/${p.id}`),
            fetch(`${API_BASE}/api/projects/portfolio/${p.id}`),
          ]);
          const expJson = await expRes.json();
          const skillsJson = await skillsRes.json();
          const projectsJson = await projectsRes.json();

          const normalizedExperiences = (expJson.experiences || []).map((e: any) => ({
            id: e.id,
            position: e.position || e.title || e.titre_poste || e.titre || '',
            company: e.company || e.entreprise || '',
            start_date: e.start_date || e.date_debut || null,
            end_date: e.end_date || e.date_fin || null,
            is_current: e.is_current !== undefined ? e.is_current : (!e.date_fin && !!e.date_debut),
            location: e.location || e.lieu || '',
            description: e.description || '',
          }));

          const normalizedSkills = (skillsJson.competences || []).map((c: any) => ({
            id: c.id,
            name: c.name || c.nom || c.titre || '',
            level: c.level || c.niveau || null,
          }));

          // CORRECTION: Mapping des projets avec l'image
          const normalizedProjects = (projectsJson.projects || []).map((p: any) => ({
            id: p.id,
            title: p.title || p.titre || '',
            project_url: p.project_url || p.demo_url || p.lien_demo || '',
            github_url: p.github_url || p.code_url || p.lien_code || '',
            description: p.description || '',
            technologies: p.technologies || p.techno || p.tags || [],
            // CORRECTION: Meilleure gestion de l'image du projet
            image: p.image || p.image_url || p.imageUrl || null,
          }));

          setExperiences(normalizedExperiences);
          setSkills(normalizedSkills);
          setProjects(normalizedProjects);
        } catch (err) {
          console.warn('Fallback relation fetch failed:', err);
          setExperiences([]);
          setSkills([]);
          setProjects([]);
        }
      }


    } catch (error: any) {
      console.error('Error loading portfolio:', error);
      setError('Erreur lors du chargement du portfolio');
      toast({
        title: "Erreur",
        description: "Impossible de charger le portfolio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#28A745] animate-pulse mx-auto" />
          <p className="text-gray-500 text-sm font-medium">Chargement du portfolio…</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto text-4xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio introuvable</h1>
          <p className="text-gray-500 text-sm">
            {error || "Ce portfolio n'existe pas ou n'est pas accessible publiquement."}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#28A745] text-white text-sm font-semibold hover:bg-green-600 transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <ModernPortfolioTemplate
      portfolio={portfolio}
      experiences={experiences}
      education={education}
      skills={skills}
      projects={projects}
    />
  );
};

export default Portfolio;