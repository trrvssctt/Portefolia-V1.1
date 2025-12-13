
import { Card, CardContent } from "@/components/ui/card";
import { Code } from "lucide-react";

interface SkillsSectionProps {
  skills: any[];
}

export const SkillsSection = ({ skills }: SkillsSectionProps) => {
  if (skills.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
          <Code size={20} className="mr-2 text-[#28A745]" />
          Compétences
        </h3>
        <div className="space-y-4">
          {skills.map((skill) => (
            <div key={skill.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{skill.name}</span>
                {skill.level && (
                  <span className="text-sm text-gray-500">{skill.level}%</span>
                )}
              </div>
              {skill.level && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#28A745] to-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
