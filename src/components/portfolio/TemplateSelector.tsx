
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layout: 'modern' | 'classic' | 'minimal' | 'creative';
  isPro?: boolean;
}

interface TemplateSelectorProps {
  selectedTemplate?: string;
  onSelectTemplate: (template: Template) => void;
}

const templates: Template[] = [
  {
    id: 'modern-green',
    name: 'Moderne Vert',
    description: 'Design moderne avec accent vert professionnel',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#28A745',
      secondary: '#6C757D',
      accent: '#FFC107'
    },
    layout: 'modern'
  },
  {
    id: 'classic-blue',
    name: 'Classique Bleu',
    description: 'Template classique avec nuances de bleu',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#007BFF',
      secondary: '#6C757D',
      accent: '#17A2B8'
    },
    layout: 'classic'
  },
  {
    id: 'minimal-gray',
    name: 'Minimaliste Gris',
    description: 'Design épuré en tons de gris',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#343A40',
      secondary: '#6C757D',
      accent: '#FD7E14'
    },
    layout: 'minimal'
  },
  {
    id: 'creative-purple',
    name: 'Créatif Violet',
    description: 'Template créatif avec des couleurs vives',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#6F42C1',
      secondary: '#E83E8C',
      accent: '#FD7E14'
    },
    layout: 'creative',
    isPro: true
  },
  {
    id: 'dark-orange',
    name: 'Sombre Orange',
    description: 'Template sombre avec accents orange',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#212529',
      secondary: '#FD7E14',
      accent: '#FFC107'
    },
    layout: 'modern',
    isPro: true
  },
  {
    id: 'elegant-teal',
    name: 'Élégant Sarcelle',
    description: 'Design élégant en tons de sarcelle',
    preview: '/api/placeholder/300/200',
    colors: {
      primary: '#20C997',
      secondary: '#6C757D',
      accent: '#FFC107'
    },
    layout: 'classic',
    isPro: true
  }
];

export const TemplateSelector = ({ selectedTemplate, onSelectTemplate }: TemplateSelectorProps) => {
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choisissez un template
        </h3>
        <p className="text-gray-600">
          Sélectionnez un design qui correspond à votre style professionnel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id 
                ? 'ring-2 ring-[#28A745] shadow-lg' 
                : ''
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {template.isPro && (
                    <Badge variant="secondary" className="bg-[#28A745] text-white">
                      Pro
                    </Badge>
                  )}
                  {selectedTemplate === template.id && (
                    <div className="w-5 h-5 bg-[#28A745] rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div 
                  className="w-full h-full flex flex-col"
                  style={{ 
                    background: `linear-gradient(135deg, ${template.colors.primary}20, ${template.colors.secondary}10)`
                  }}
                >
                  <div 
                    className="h-4 w-full"
                    style={{ backgroundColor: template.colors.primary }}
                  />
                  <div className="flex-1 p-3 space-y-2">
                    <div 
                      className="h-2 w-3/4 rounded"
                      style={{ backgroundColor: template.colors.primary }}
                    />
                    <div 
                      className="h-1 w-1/2 rounded"
                      style={{ backgroundColor: template.colors.secondary }}
                    />
                    <div className="flex space-x-1 mt-3">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: template.colors.accent }}
                      />
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: template.colors.accent }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {template.description}
                </p>
                
                {/* Color Palette */}
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xs text-gray-500">Couleurs:</span>
                  <div className="flex space-x-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: template.colors.primary }}
                      title="Couleur principale"
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: template.colors.secondary }}
                      title="Couleur secondaire"
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: template.colors.accent }}
                      title="Couleur d'accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {template.layout}
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(template.id);
                    }}
                  >
                    <Eye size={14} className="mr-1" />
                    Aperçu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium Notice */}
      <div className="bg-gradient-to-r from-[#28A745]/10 to-green-100 p-6 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#28A745] rounded-lg flex items-center justify-center">
            <Check size={24} className="text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Templates Premium</h4>
            <p className="text-gray-600 text-sm">
              Accédez à plus de templates et options de personnalisation avec notre offre Premium à 50,000 F CFA/mois
            </p>
          </div>
          <Button className="bg-[#28A745] hover:bg-green-600 whitespace-nowrap">
            Découvrir Premium
          </Button>
        </div>
      </div>
    </div>
  );
};
