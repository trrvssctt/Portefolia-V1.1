
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Calendar } from "lucide-react";

interface EducationSectionProps {
  education: any[];
}

export const EducationSection = ({ education }: EducationSectionProps) => {
  if (education.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center">
          <GraduationCap size={24} className="mr-3 text-[#28A745]" />
          Formation
        </h3>
        <div className="space-y-6">
          {education.map((edu) => (
            <div key={edu.id} className="relative pl-6 border-l-2 border-[#28A745]/30">
              <div className="absolute -left-2 top-2 w-4 h-4 bg-[#28A745] rounded-full"></div>
              <div className="mb-2">
                <h4 className="text-lg font-semibold text-gray-900">{edu.degree}</h4>
                <p className="text-[#28A745] font-medium">{edu.institution}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    {new Date(edu.start_date).toLocaleDateString('fr-FR')} - 
                    {edu.is_current ? ' En cours' : ` ${new Date(edu.end_date).toLocaleDateString('fr-FR')}`}
                  </span>
                  {edu.grade && (
                    <Badge variant="outline" className="text-xs">
                      {edu.grade}
                    </Badge>
                  )}
                </div>
              </div>
              {edu.description && (
                <p className="text-gray-700 leading-relaxed">{edu.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
