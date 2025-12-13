
import { Card, CardContent } from "@/components/ui/card";
import { 
  Globe, 
  Linkedin, 
  Github, 
  Twitter,
  ExternalLink,
  Facebook,
  Instagram
} from "lucide-react";

interface SocialLinksSectionProps {
  portfolio: any;
}

export const SocialLinksSection = ({ portfolio }: SocialLinksSectionProps) => {
  // Normalize socials: prefer direct fields (multiple aliases), fallback to relations arrays (liens_sociaux, social links)
  const findSocial = (aliases: string[]) => {
    // direct fields and common variants
    const directKeys = new Set<string>();
    for (const a of aliases) {
      directKeys.add(a);
      // common variants
      directKeys.add(a.replace(/_url$/, ''));
      directKeys.add(a + '_url');
      directKeys.add(a + '_link');
      directKeys.add(a.replace('_url', '') + '_profile');
    }
    for (const k of Array.from(directKeys)) {
      if (portfolio && portfolio[k]) return portfolio[k];
    }

    // relations: liens_sociaux (FR), socials or links (EN)
    const relations = portfolio?.liens_sociaux || portfolio?.socials || portfolio?.links || [];
    for (const r of relations) {
      const plat = (r.plateforme || r.platform || r.name || r.nom || '').toString().toLowerCase();
      const url = r.url || r.value || r.link || r.value_url || r.url_value || null;
      if (!url) continue;
      // match by known aliases
      if (aliases.some(a => a.includes('facebook')) && plat.includes('facebook')) return url;
      if (aliases.some(a => a.includes('instagram')) && (plat.includes('instagram') || plat.includes('insta'))) return url;
      if (aliases.some(a => a.includes('linkedin')) && plat.includes('linkedin')) return url;
      if (aliases.some(a => a.includes('github')) && plat.includes('github')) return url;
      if (aliases.some(a => a.includes('twitter')) && plat.includes('twitter')) return url;
      if (aliases.some(a => a.includes('website')) && (plat === 'website' || plat === 'site' || plat.includes('site'))) return url;
    }
    return null;
  };

  const website = findSocial(['website', 'website_url']);
  const linkedin = findSocial(['linkedin_url', 'linkedin']);
  const github = findSocial(['github_url', 'github']);
  const twitter = findSocial(['twitter_url', 'twitter']);
  const facebook = findSocial(['facebook_url', 'facebook', 'fb']);
  const instagram = findSocial(['instagram_url', 'instagram', 'insta']);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Réseaux</h3>
        <div className="space-y-3">
          {website && (
            <a 
              href={website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Globe size={20} className="text-gray-600 group-hover:text-[#28A745]" />
              <span className="text-gray-700 group-hover:text-gray-900">Site Web</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
          {linkedin && (
            <a 
              href={linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Linkedin size={20} className="text-blue-600 group-hover:text-blue-700" />
              <span className="text-gray-700 group-hover:text-gray-900">LinkedIn</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
          {github && (
            <a 
              href={github} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Github size={20} className="text-gray-800 group-hover:text-gray-900" />
              <span className="text-gray-700 group-hover:text-gray-900">GitHub</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
          {twitter && (
            <a 
              href={twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Twitter size={20} className="text-blue-400 group-hover:text-blue-500" />
              <span className="text-gray-700 group-hover:text-gray-900">Twitter</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
          {facebook && (
            <a 
              href={facebook} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Facebook size={20} className="text-blue-600 group-hover:text-blue-700" />
              <span className="text-gray-700 group-hover:text-gray-900">Facebook</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
          {instagram && (
            <a 
              href={instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Instagram size={20} className="text-pink-500 group-hover:text-pink-600" />
              <span className="text-gray-700 group-hover:text-gray-900">Instagram</span>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
