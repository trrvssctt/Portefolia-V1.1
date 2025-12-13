
import { Card, CardContent } from "@/components/ui/card";
import { Building, Calendar, MapPin } from "lucide-react";

interface ExperienceSectionProps {
  experiences: any[];
}

export const ExperienceSection = ({ experiences }: ExperienceSectionProps) => {
  if (experiences.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center">
          <Building size={24} className="mr-3 text-[#28A745]" />
          Expérience Professionnelle
        </h3>
        <div className="space-y-6">
          {experiences.map((exp) => (
            <div key={exp.id} className="relative pl-6 border-l-2 border-[#28A745]/30">
              <div className="absolute -left-2 top-2 w-4 h-4 bg-[#28A745] rounded-full"></div>
              <div className="mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{exp.position}</h4>
                <p className="text-[#28A745] font-medium">{exp.company}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {new Date(exp.start_date).toLocaleDateString('fr-FR')} - 
                    {exp.is_current ? ' Présent' : ` ${new Date(exp.end_date).toLocaleDateString('fr-FR')}`}
                  </span>
                  {exp.location && (
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-1" />
                      {exp.location}
                    </span>
                  )}
                </div>
              </div>
              {exp.description && (
                <p className="text-gray-700 leading-relaxed">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
