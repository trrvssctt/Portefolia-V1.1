import { Cpu } from "lucide-react";

interface SkillsSectionProps {
  skills: any[];
  themeColor?: string;
}

function levelLabel(l: number | null) {
  if (!l) return null;
  if (l >= 90) return 'Expert';
  if (l >= 70) return 'Avancé';
  if (l >= 45) return 'Intermédiaire';
  return 'Débutant';
}

function levelColor(l: number | null, theme: string) {
  if (!l) return theme;
  if (l >= 90) return '#8b5cf6';
  if (l >= 70) return '#3b82f6';
  if (l >= 45) return '#f59e0b';
  return '#6b7280';
}

export const SkillsSection = ({ skills, themeColor = '#28A745' }: SkillsSectionProps) => {
  if (!skills.length) return null;

  const withLevel    = skills.filter(s => s.level);
  const withoutLevel = skills.filter(s => !s.level);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
          <Cpu className="w-4 h-4" style={{ color: themeColor }} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Compétences</h3>
      </div>

      {withLevel.length > 0 && (
        <div className="space-y-3 mb-4">
          {withLevel.map((skill, i) => (
            <div key={skill.id || i}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-800">{skill.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: levelColor(skill.level, themeColor) }}>
                  {levelLabel(skill.level)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${skill.level}%`, backgroundColor: levelColor(skill.level, themeColor) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {withoutLevel.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {withoutLevel.map((skill, i) => (
            <span key={skill.id || i}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
              style={{ borderColor: `${themeColor}40`, backgroundColor: `${themeColor}0d`, color: themeColor }}>
              {skill.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
