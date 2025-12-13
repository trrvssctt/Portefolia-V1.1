
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-v-card.onrender.com';
import { ModernPortfolioTemplate } from "@/components/portfolio/ModernPortfolioTemplate";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Facebook, Instagram, Linkedin, Github, Globe } from "lucide-react";

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
    if (slug) {
      loadPortfolio();
    }
  }, [slug]);

  const loadPortfolio = async () => {
    try {
      // Load portfolio from backend public endpoint
      const res = await fetch(`${API_BASE}/p/${slug}`);
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
      // map french fields to frontend shape (fallbacks for english keys)
      const portfolioData = {
        id: p.id,
        title: p.titre || p.title || p.nom || '',
        slug: p.url_slug || p.slug || p.url || '',
        bio: p.description || p.bio || p.about || '',
        profile_image_url: p.profile_image_url || p.photo || p.avatar || '',
        location: p.location || p.localisation || p.lieu || '',
        phone: p.phone || p.telephone || p.phone_number || '',
        website: p.website || p.site || p.site_web || '',
        linkedin_url: p.linkedin_url || p.linkedin || '',
        // Primary: explicit fields, fallback: search relations like `liens_sociaux` or `socials`
        facebook_url: (() => {
          const raw = p.facebook_url || p.facebook || '';
          if (raw) return /^(https?:)?\/\//i.test(raw) ? raw : `https://facebook.com/${raw.replace(/^@/, '')}`;
          const relations = p.liens_sociaux || p.socials || p.links || p.relations || [];
          for (const r of relations) {
            const key = (r.plateforme || r.platform || r.name || r.key || '').toString().toLowerCase();
            const val = r.url || r.lien || r.value || r.link || r.href || '';
            if (!val) continue;
            if (key.includes('facebook')) return /^(https?:)?\/\//i.test(val) ? val : `https://facebook.com/${val.replace(/^@/, '')}`;
            // sometimes platform may be empty but the url contains facebook domain
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
        banner_type: p.banner_type || p.banniere_type || (p.banner_image_url ? 'image' : 'color'),
        banner_image_url: p.banner_image_url || p.banniere_image_url || p.banner || '',
        banner_color: p.banner_color || p.couleur_banniere || p.theme || '#1e293b',
        theme_color: p.theme_color || p.theme || '#28A745',
        cv_url: p.cv_url || p.resume_url || p.cv || '',
        est_public: p.est_public !== undefined ? p.est_public : (p.is_public !== undefined ? p.is_public : true),
      };
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

        const normalizedProjects = (relProjects || []).map((rp: any) => ({
          id: rp.id,
          title: rp.title || rp.titre || '',
          project_url: rp.project_url || rp.demo_url || rp.lien_demo || '',
          github_url: rp.github_url || rp.code_url || rp.lien_code || '',
          description: rp.description || '',
          technologies: rp.technologies || rp.techno || rp.tags || [],
          image: rp.image || rp.image_url || null,
        }));

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

          const normalizedProjects = (projectsJson.projects || []).map((p: any) => ({
            id: p.id,
            title: p.title || p.titre || '',
            project_url: p.project_url || p.demo_url || p.lien_demo || '',
            github_url: p.github_url || p.code_url || p.lien_code || '',
            description: p.description || '',
            technologies: p.technologies || p.techno || p.tags || [],
            image: p.image || p.image_url || null,
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

      // Record visit using slug endpoint now that portfolio exists
      try {
        await fetch(`${API_BASE}/p/${slug}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adresse_ip: 'unknown', user_agent: navigator.userAgent, referer: document.referrer }),
        });
      } catch (err) {
        // silent
        console.log('Visit recording failed (by slug):', err);
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

  const trackVisit = async () => {
    try {
      // Send visit to backend
      await fetch(`${API_BASE}/api/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolio?.id, adresse_ip: 'unknown', user_agent: navigator.userAgent, referer: document.referrer }),
      });
    } catch (error) {
      // Silent fail for visit tracking
      console.log('Visit tracking failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#28A745] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement du portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfolio non trouvé</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Ce portfolio n\'existe pas ou n\'est pas public.'}
          </p>
          <button 
            onClick={() => (window.location.href = '/')}
            className="bg-[#28A745] hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Social links bar (public) */}
      {(portfolio.facebook_url || portfolio.instagram_url || portfolio.linkedin_url || portfolio.github_url || portfolio.website) && (
        <div className="w-full bg-white/90 backdrop-blur-sm border-b py-4">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-4">
            {portfolio.website && (
              <a href={portfolio.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                <Globe className="w-5 h-5" /> <span className="hidden sm:inline">Site</span>
              </a>
            )}
            {portfolio.linkedin_url && (
              <a href={portfolio.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-700 hover:text-blue-900">
                <Linkedin className="w-5 h-5" /> <span className="hidden sm:inline">LinkedIn</span>
              </a>
            )}
            {portfolio.github_url && (
              <a href={portfolio.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-800 hover:text-black">
                <Github className="w-5 h-5" /> <span className="hidden sm:inline">GitHub</span>
              </a>
            )}
            {portfolio.facebook_url && (
              <a href={portfolio.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                <Facebook className="w-5 h-5" /> <span className="hidden sm:inline">Facebook</span>
              </a>
            )}
            {portfolio.instagram_url && (
              <a href={portfolio.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-600 hover:text-pink-800">
                <Instagram className="w-5 h-5" /> <span className="hidden sm:inline">Instagram</span>
              </a>
            )}
          </div>
        </div>
      )}
      {/* CV quick access (visible above the template) */}
      <ModernPortfolioTemplate
        portfolio={portfolio}
        experiences={experiences}
        education={education}
        skills={skills}
        projects={projects}
      />
    </>
  );
};

export default Portfolio;
