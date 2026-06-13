import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { HeroSection } from "./sections/HeroSection";
import { SocialLinksSection } from "./sections/SocialLinksSection";
import { SkillsSection } from "./sections/SkillsSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { PortfolioFooter } from "./PortfolioFooter";

interface ModernPortfolioTemplateProps {
  portfolio: any;
  experiences: any[];
  education: any[];
  skills: any[];
  projects: any[];
}

const NAV_ITEMS = [
  { id: 'experience', label: 'Expérience' },
  { id: 'projets',    label: 'Projets' },
];

export const ModernPortfolioTemplate = ({
  portfolio, experiences, education, skills, projects,
}: ModernPortfolioTemplateProps) => {
  const { toast } = useToast();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const themeColor = portfolio.theme_color || '#28A745';

  // Sticky nav visibility
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section via IntersectionObserver
  useEffect(() => {
    const sections = NAV_ITEMS.map(n => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [experiences, projects]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: portfolio.title, text: portfolio.bio, url: window.location.href });
        return;
      } catch { /* fallthrough */ }
    }
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Lien copié !', description: 'Le lien du portfolio a été copié.' });
  };

  const hasContent = experiences.length > 0 || projects.length > 0;
  const visibleNav = NAV_ITEMS.filter(n =>
    (n.id === 'experience' && experiences.length > 0) ||
    (n.id === 'projets'    && projects.length > 0)
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky navigation ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {scrolled && visibleNav.length > 0 && (
          <motion.nav
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm"
          >
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
              <span className="text-sm font-bold text-gray-900 mr-4 truncate max-w-[140px]">
                {portfolio.title}
              </span>
              <div className="flex gap-1 ml-auto">
                {visibleNav.map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={
                      activeSection === item.id
                        ? { backgroundColor: themeColor, color: '#fff' }
                        : { color: '#374151' }
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="bg-white shadow-sm">
        <HeroSection portfolio={portfolio} onShare={handleShare} />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Left sidebar ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-20">
              <SocialLinksSection portfolio={portfolio} themeColor={themeColor} />

              {skills.length > 0 && (
                <>
                  {/* Divider if both socials and skills */}
                  {(portfolio.linkedin_url || portfolio.github_url || portfolio.website ||
                    portfolio.twitter_url || portfolio.facebook_url || portfolio.instagram_url) && (
                    <hr className="my-5 border-gray-100" />
                  )}
                  <SkillsSection skills={skills} themeColor={themeColor} />
                </>
              )}
            </div>
          </div>

          {/* ── Right main ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">
            {experiences.length > 0 && (
              <ExperienceSection experiences={experiences} themeColor={themeColor} />
            )}
            {projects.length > 0 && (
              <ProjectsSection projects={projects} themeColor={themeColor} />
            )}
            {!hasContent && (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">Ce portfolio est en cours de construction.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PortfolioFooter />
    </div>
  );
};
