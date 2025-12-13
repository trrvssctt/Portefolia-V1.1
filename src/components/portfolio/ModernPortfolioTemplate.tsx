
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HeroSection } from "./sections/HeroSection";
import { SocialLinksSection } from "./sections/SocialLinksSection";
import { SkillsSection } from "./sections/SkillsSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { EducationSection } from "./sections/EducationSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { PortfolioFooter } from "./PortfolioFooter";

interface ModernPortfolioTemplateProps {
  portfolio: any;
  experiences: any[];
  education: any[];
  skills: any[];
  projects: any[];
}

export const ModernPortfolioTemplate = ({ 
  portfolio, 
  experiences, 
  education, 
  skills, 
  projects 
}: ModernPortfolioTemplateProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const handleSaveContact = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('contact_saves')
        .insert({
          portfolio_id: portfolio.id,
          visitor_ip: 'unknown'
        });

      if (error) throw error;

      await supabase.functions.invoke('send-contact-email', {
        body: {
          portfolioId: portfolio.id,
          visitorName: 'Visiteur anonyme',
          visitorEmail: 'contact@visitor.com'
        }
      });

      setIsSaved(true);
      toast({
        title: "Contact sauvegardé",
        description: "Les informations de contact ont été sauvegardées avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le contact",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: portfolio.title,
          text: portfolio.bio,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Lien copié",
        description: "Le lien du portfolio a été copié dans le presse-papiers",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Section */}
      <HeroSection
        portfolio={portfolio}
        isLoading={isLoading}
        isSaved={isSaved}
        onSaveContact={handleSaveContact}
        onShare={handleShare}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Social Links */}
            <SocialLinksSection portfolio={portfolio} />

            {/* Skills */}
            <SkillsSection skills={skills} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Experience */}
            <ExperienceSection experiences={experiences} />

            {/* Education */}
            <EducationSection education={education} />

            {/* Projects */}
            <ProjectsSection projects={projects} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <PortfolioFooter />
    </div>
  );
};
