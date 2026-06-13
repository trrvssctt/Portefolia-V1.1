import { motion } from "framer-motion";
import { Briefcase, Calendar, MapPin } from "lucide-react";

interface ExperienceSectionProps {
  experiences: any[];
  themeColor?: string;
}

function formatDate(d: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  } catch { return d; }
}

export const ExperienceSection = ({ experiences, themeColor = '#28A745' }: ExperienceSectionProps) => {
  if (!experiences.length) return null;

  return (
    <motion.section
      id="experience"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
          <Briefcase className="w-5 h-5" style={{ color: themeColor }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Expérience professionnelle</h2>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

        <div className="space-y-0">
          {experiences.map((exp, i) => (
            <motion.div
              key={exp.id || i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="relative pl-12 pb-8 last:pb-0"
            >
              {/* Timeline dot */}
              <div
                className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: exp.is_current ? themeColor : '#d1d5db' }}
              />
              {exp.is_current && (
                <div
                  className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: themeColor }}
                />
              )}

              {/* Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{exp.position}</h3>
                    <p className="font-semibold text-sm mt-0.5" style={{ color: themeColor }}>
                      {exp.company}
                    </p>
                  </div>
                  {exp.is_current && (
                    <span
                      className="self-start px-2.5 py-1 rounded-full text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      Actuel
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  {(exp.start_date || exp.end_date) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(exp.start_date)}
                      {' — '}
                      {exp.is_current ? 'Présent' : formatDate(exp.end_date)}
                    </span>
                  )}
                  {exp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {exp.location}
                    </span>
                  )}
                </div>

                {exp.description && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{exp.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};
