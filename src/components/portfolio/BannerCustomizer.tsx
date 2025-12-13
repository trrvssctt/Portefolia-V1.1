
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

interface BannerCustomizerProps {
  bannerType: 'color' | 'image';
  bannerColor: string;
  bannerImageUrl?: string;
  onBannerTypeChange: (type: 'color' | 'image') => void;
  onBannerColorChange: (color: string) => void;
  onBannerImageChange: (url: string) => void;
}

export const BannerCustomizer = ({
  bannerType,
  bannerColor,
  bannerImageUrl,
  onBannerTypeChange,
  onBannerColorChange,
  onBannerImageChange
}: BannerCustomizerProps) => {
  const predefinedColors = [
    '#1e293b', '#dc2626', '#ea580c', '#d97706', '#65a30d',
    '#059669', '#0891b2', '#2563eb', '#7c3aed', '#c026d3',
    '#e11d48', '#374151'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette size={20} />
          Personnaliser la bannière
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={bannerType} onValueChange={(value) => onBannerTypeChange(value as 'color' | 'image')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="color">Couleur</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
          </TabsList>
          
          <TabsContent value="color" className="space-y-4">
            <div>
              <Label>Couleur personnalisée</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={bannerColor}
                  onChange={(e) => onBannerColorChange(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={bannerColor}
                  onChange={(e) => onBannerColorChange(e.target.value)}
                  placeholder="#1e293b"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Couleurs prédéfinies</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onBannerColorChange(color)}
                    className={`w-10 h-10 rounded-lg border-2 ${
                      bannerColor === color ? 'border-white shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="space-y-4">
            <ImageUpload
              label="Image de bannière"
              value={bannerImageUrl}
              onChange={onBannerImageChange}
              placeholder="https://exemple.com/banniere.jpg"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
