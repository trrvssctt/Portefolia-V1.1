import * as React from "react";
import { Button } from "@/components/ui/button";
import { 
  Heart,
  Share2,
  Download,
  MapPin,
  Phone
} from "lucide-react";

interface HeroSectionProps {
  portfolio: any;
  isLoading: boolean;
  isSaved: boolean;
  onSaveContact: () => void;
  onShare: () => void;
}

export const HeroSection = ({ 
  portfolio, 
  isLoading, 
  isSaved, 
  onSaveContact, 
  onShare 
}: HeroSectionProps) => {
  const [bannerOk, setBannerOk] = React.useState<boolean>(false);
  const [profileOk, setProfileOk] = React.useState<boolean>(false);

  React.useEffect(() => {
    setBannerOk(false);
    setProfileOk(false);
    // Preload banner
    if (portfolio.banner_type === 'image' && portfolio.banner_image_url) {
      const img = new Image();
      img.onload = () => setBannerOk(true);
      img.onerror = () => setBannerOk(false);
      img.src = portfolio.banner_image_url;
    }
    // Preload profile image
    if (portfolio.profile_image_url) {
      const p = new Image();
      p.onload = () => setProfileOk(true);
      p.onerror = () => setProfileOk(false);
      p.src = portfolio.profile_image_url;
    }
  }, [portfolio.banner_image_url, portfolio.banner_type, portfolio.profile_image_url]);
  const getBannerStyle = () => {
    if (portfolio.banner_type === 'image' && portfolio.banner_image_url) {
      return {
        backgroundImage: `url(${portfolio.banner_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else {
      return {
        background: `linear-gradient(135deg, ${portfolio.banner_color || '#1e293b'} 0%, ${portfolio.banner_color || '#1e293b'}DD 100%)`
      };
    }
  };

  return (
    <div className="relative text-white" style={getBannerStyle()}>
      {/* Overlay pour améliorer la lisibilité du texte sur les images */}
      {portfolio.banner_type === 'image' && portfolio.banner_image_url && (
        <div className="absolute inset-0 bg-black/50"></div>
      )}
      
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-12">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
              {portfolio.profile_image_url && profileOk ? (
                <img
                  src={portfolio.profile_image_url}
                  alt={portfolio.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; setProfileOk(false); }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#28A745] to-green-600 flex items-center justify-center text-white text-6xl font-bold">
                  {portfolio.title.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#28A745] rounded-full flex items-center justify-center shadow-lg">
              <Heart size={24} className="text-white" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ background: `linear-gradient(90deg, ${portfolio.theme_color || '#ffffff'}, ${portfolio.theme_color || '#ffffff'}66)` , WebkitBackgroundClip: 'text', color: 'transparent' }}>
              {portfolio.title}
            </h1>
            
            {portfolio.bio && (
              <p className="text-xl text-gray-300 mb-6 leading-relaxed max-w-2xl">
                {portfolio.bio}
              </p>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
              {portfolio.location && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <MapPin size={18} />
                  <span>{portfolio.location}</span>
                </div>
              )}
              {portfolio.phone && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Phone size={18} />
                  <span>{portfolio.phone}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <Button
                onClick={onSaveContact}
                disabled={isLoading || isSaved}
                      className="text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      style={{ backgroundColor: portfolio.theme_color || '#28A745' }}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Heart size={18} className="mr-2" />
                )}
                {isSaved ? 'Contact Sauvegardé' : 'Sauvegarder Contact'}
              </Button>

              <Button
                onClick={onShare}
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-full"
              >
                <Share2 size={18} className="mr-2" />
                Partager
              </Button>

              {portfolio.cv_url && (
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-full"
                >
                  <a href={portfolio.cv_url} target="_blank" rel="noopener noreferrer">
                    <Download size={18} className="mr-2" />
                    Télécharger CV
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
