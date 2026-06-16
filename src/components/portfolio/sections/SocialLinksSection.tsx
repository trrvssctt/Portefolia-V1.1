import { Globe, Linkedin, Github, Twitter, Facebook, Instagram, ExternalLink } from "lucide-react";

interface SocialLinksSectionProps {
  portfolio: any;
  themeColor?: string;
}

const LINKS = [
  { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin, bg: 'bg-blue-50 hover:bg-blue-600',    text: 'text-blue-600' },
  { key: 'github_url',   label: 'GitHub',   Icon: Github,   bg: 'bg-gray-50 hover:bg-gray-900',   text: 'text-gray-800' },
  { key: 'twitter_url',  label: 'Twitter',  Icon: Twitter,  bg: 'bg-sky-50 hover:bg-sky-500',      text: 'text-sky-500'  },
  { key: 'facebook_url', label: 'Facebook', Icon: Facebook, bg: 'bg-blue-50 hover:bg-blue-700',   text: 'text-blue-700' },
  { key: 'instagram_url',label: 'Instagram',Icon: Instagram,bg: 'bg-pink-50 hover:bg-pink-600',   text: 'text-pink-600' },
  { key: 'website',      label: 'Site web', Icon: Globe,    bg: 'bg-emerald-50 hover:bg-emerald-600', text: 'text-emerald-700' },
];

function findSocial(portfolio: any, aliases: string[]): string | null {
  const directKeys = new Set<string>();
  for (const a of aliases) {
    directKeys.add(a);
    directKeys.add(a.replace(/_url$/, ''));
    directKeys.add(a + '_url');
  }
  for (const k of Array.from(directKeys)) {
    if (portfolio?.[k]) return portfolio[k];
  }
  const relations = portfolio?.liens_sociaux || portfolio?.socials || portfolio?.links || [];
  for (const r of relations) {
    const plat = (r.plateforme || r.platform || r.name || '').toString().toLowerCase();
    const url = r.url || r.value || r.link || null;
    if (!url) continue;
    if (aliases.some(a => plat.includes(a.replace('_url', '').replace('_link', '')))) return url;
  }
  return null;
}

export const SocialLinksSection = ({ portfolio, themeColor = '#28A745' }: SocialLinksSectionProps) => {
  const resolved = LINKS.map(l => ({
    ...l,
    url: findSocial(portfolio, [l.key, l.key.replace('_url', ''), l.label.toLowerCase()]),
  })).filter(l => l.url);

  if (!resolved.length) return null;

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Réseaux</h3>
      <div className="space-y-2">
        {resolved.map(({ key, label, Icon, bg, text, url }) => (
          <a key={key} href={url!} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${bg} hover:text-white`}>
            <Icon className={`w-4 h-4 ${text} group-hover:text-white transition-colors`} />
            <span className={`text-sm font-medium ${text} group-hover:text-white transition-colors`}>{label}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto text-gray-400 group-hover:text-white/70 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
};
