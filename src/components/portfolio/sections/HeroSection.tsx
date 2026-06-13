import * as React from "react";
import { motion } from "framer-motion";
import {
  Download, Share2, MapPin, Phone, Copy, Check,
  Globe, Linkedin, Github, Twitter, Facebook, Instagram, Building2,
} from "lucide-react";

interface HeroSectionProps {
  portfolio: any;
  onShare: () => void;
}

const SOCIALS = [
  { key: 'linkedin_url',  Icon: Linkedin,  color: 'hover:bg-blue-600',   label: 'LinkedIn' },
  { key: 'github_url',    Icon: Github,    color: 'hover:bg-gray-900',   label: 'GitHub' },
  { key: 'twitter_url',   Icon: Twitter,   color: 'hover:bg-sky-500',    label: 'Twitter' },
  { key: 'facebook_url',  Icon: Facebook,  color: 'hover:bg-blue-700',   label: 'Facebook' },
  { key: 'instagram_url', Icon: Instagram, color: 'hover:bg-pink-600',   label: 'Instagram' },
  { key: 'website',       Icon: Globe,     color: 'hover:bg-emerald-600', label: 'Site web' },
];

export const HeroSection = ({ portfolio, onShare }: HeroSectionProps) => {
  const [profileOk, setProfileOk] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!portfolio.profile_image_url) return;
    const img = new Image();
    img.onload = () => setProfileOk(true);
    img.onerror = () => setProfileOk(false);
    img.src = portfolio.profile_image_url;
  }, [portfolio.profile_image_url]);

  const themeColor = portfolio.theme_color || '#28A745';
  const initials = (portfolio.title || 'P')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const bannerStyle: React.CSSProperties =
    portfolio.banner_type === 'image' && portfolio.banner_image_url
      ? { backgroundImage: `url(${portfolio.banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: `linear-gradient(135deg, ${portfolio.banner_color || '#0f172a'} 0%, ${portfolio.banner_color || '#1e293b'} 100%)` };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSocials = SOCIALS.some(s => portfolio[s.key]);

  return (
    <div className="relative">
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden" style={bannerStyle}>
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />

        {/* Share / CV buttons top-right */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={onShare}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
            title="Partager"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={copyLink}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
            title="Copier le lien"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Profile card overlapping banner ────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-20 sm:-mt-24 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pb-6">

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="shrink-0"
          >
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
              style={{ borderColor: 'white' }}
            >
              {portfolio.profile_image_url && profileOk ? (
                <img
                  src={portfolio.profile_image_url}
                  alt={portfolio.title}
                  className="w-full h-full object-cover"
                  onError={() => setProfileOk(false)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-4xl sm:text-5xl font-extrabold"
                  style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
                >
                  {initials}
                </div>
              )}
            </div>
          </motion.div>

          {/* Info + actions */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                {portfolio.title}
              </h1>

              {/* Business badge */}
              {portfolio.business && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: `${portfolio.business.primary_color || '#1a1a2e'}40`,
                    backgroundColor: `${portfolio.business.primary_color || '#1a1a2e'}10`,
                    color: portfolio.business.primary_color || '#1a1a2e',
                  }}
                >
                  {portfolio.business.company_logo_url && !portfolio.business.company_logo_url.startsWith('data:') ? (
                    <img
                      src={portfolio.business.company_logo_url}
                      alt={portfolio.business.company_name}
                      className="h-5 w-5 object-contain rounded"
                    />
                  ) : (
                    <Building2 className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-semibold">{portfolio.business.company_name}</span>
                  {portfolio.business.role_label && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="opacity-80">{portfolio.business.role_label}</span>
                    </>
                  )}
                </motion.div>
              )}

              {/* Location / Phone */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                {portfolio.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {portfolio.location}
                  </span>
                )}
                {portfolio.phone && (
                  <a href={`tel:${portfolio.phone}`} className="flex items-center gap-1.5 hover:text-gray-800 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {portfolio.phone}
                  </a>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {portfolio.cv_url && (
                  <a
                    href={portfolio.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Download className="w-4 h-4" /> Télécharger CV
                  </a>
                )}
                <button
                  onClick={onShare}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <Share2 className="w-4 h-4" /> Partager
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bio */}
        {portfolio.bio && (
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-gray-600 leading-relaxed text-base sm:text-lg max-w-2xl pb-5"
          >
            {portfolio.bio}
          </motion.p>
        )}

        {/* Social icons */}
        {hasSocials && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-wrap gap-2 pb-6"
          >
            {SOCIALS.map(({ key, Icon, color, label }) =>
              portfolio[key] ? (
                <a
                  key={key}
                  href={portfolio[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 ${color} hover:text-white transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </a>
              ) : null
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
