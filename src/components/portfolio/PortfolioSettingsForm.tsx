
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BannerCustomizer } from "./BannerCustomizer";
import { User, Mail, Phone, MapPin, Globe, FileText } from "lucide-react";

interface PortfolioSettingsFormProps {
  portfolio: any;
  onSave: (portfolioData: any) => void;
  isLoading: boolean;
}

export const PortfolioSettingsForm = ({ 
  portfolio, 
  onSave, 
  isLoading 
}: PortfolioSettingsFormProps) => {
  const [formData, setFormData] = useState({
    title: portfolio?.title || '',
    bio: portfolio?.bio || '',
    phone: portfolio?.phone || '',
    location: portfolio?.location || '',
    website: portfolio?.website || '',
    linkedin_url: portfolio?.linkedin_url || '',
    github_url: portfolio?.github_url || '',
    twitter_url: portfolio?.twitter_url || '',
    profile_image_url: portfolio?.profile_image_url || '',
    cv_url: portfolio?.cv_url || '',
    banner_type: portfolio?.banner_type || 'color',
    banner_color: portfolio?.banner_color || '#1e293b',
    banner_image_url: portfolio?.banner_image_url || '',
    theme_color: portfolio?.theme_color || '#28A745',
    is_public: portfolio?.is_public !== false
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // provide both English and French keys
    const payload = {
      title: formData.title,
      bio: formData.bio,
      phone: formData.phone,
      location: formData.location,
      website: formData.website,
      linkedin_url: formData.linkedin_url,
      github_url: formData.github_url,
      twitter_url: formData.twitter_url,
      profile_image_url: formData.profile_image_url,
      cv_url: formData.cv_url,
      banner_type: formData.banner_type,
      banner_color: formData.banner_color,
      banner_image_url: formData.banner_image_url,
      theme_color: formData.theme_color,
      is_public: formData.is_public,
      // French equivalents
      titre: formData.title,
      description: formData.bio,
      profile_image_url_fr: formData.profile_image_url,
      theme: formData.theme_color,
      est_public: formData.is_public,
      banner_image_url: formData.banner_image_url,
      cv_url_fr: formData.cv_url,
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} />
            Informations de base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Nom complet *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Votre nom complet"
              required
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio professionnelle</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Décrivez-vous en quelques lignes..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div>
              <Label htmlFor="location">Localisation</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Paris, France"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="profile_image_url">Photo de profil (URL)</Label>
            <Input
              id="profile_image_url"
              type="url"
              value={formData.profile_image_url}
              onChange={(e) => handleInputChange('profile_image_url', e.target.value)}
              placeholder="https://exemple.com/photo.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bannière personnalisable */}
      <BannerCustomizer
        bannerType={formData.banner_type as 'color' | 'image'}
        bannerColor={formData.banner_color}
        bannerImageUrl={formData.banner_image_url}
        onBannerTypeChange={(type) => handleInputChange('banner_type', type)}
        onBannerColorChange={(color) => handleInputChange('banner_color', color)}
        onBannerImageChange={(url) => handleInputChange('banner_image_url', url)}
      />

      {/* Liens et réseaux sociaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} />
            Liens et réseaux sociaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://monsite.com"
            />
          </div>

          <div>
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/monprofil"
            />
          </div>

          <div>
            <Label htmlFor="github_url">GitHub</Label>
            <Input
              id="github_url"
              type="url"
              value={formData.github_url}
              onChange={(e) => handleInputChange('github_url', e.target.value)}
              placeholder="https://github.com/monprofil"
            />
          </div>

          <div>
            <Label htmlFor="twitter_url">Twitter</Label>
            <Input
              id="twitter_url"
              type="url"
              value={formData.twitter_url}
              onChange={(e) => handleInputChange('twitter_url', e.target.value)}
              placeholder="https://twitter.com/monprofil"
            />
          </div>

          <div>
            <Label htmlFor="cv_url">CV (URL)</Label>
            <Input
              id="cv_url"
              type="url"
              value={formData.cv_url}
              onChange={(e) => handleInputChange('cv_url', e.target.value)}
              placeholder="https://monsite.com/cv.pdf"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-[#28A745] hover:bg-green-600 px-8"
        >
          {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  );
};
