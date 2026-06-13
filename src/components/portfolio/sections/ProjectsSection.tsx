import { motion } from "framer-motion";
import { FolderOpen, ExternalLink, Github } from "lucide-react";

interface ProjectsSectionProps {
  projects: any[];
  themeColor?: string;
}

const TECH_COLORS: Record<string, string> = {
  react: '#61dafb', vue: '#42b883', angular: '#dd0031', svelte: '#ff3e00',
  typescript: '#3178c6', javascript: '#f7df1e', python: '#3776ab', java: '#ed8b00',
  php: '#777bb4', ruby: '#cc342d', go: '#00add8', rust: '#dea584',
  node: '#339933', express: '#000000', django: '#092e20', laravel: '#ff2d20',
  tailwind: '#06b6d4', css: '#1572b6', html: '#e34c26',
  mysql: '#4479a1', postgresql: '#336791', mongodb: '#47a248', redis: '#dc382d',
  docker: '#2496ed', kubernetes: '#326ce5', aws: '#ff9900', gcp: '#4285f4',
};

function techColor(tech: string) {
  return TECH_COLORS[tech.toLowerCase().replace(/[^a-z]/g, '')] || '#6b7280';
}

export const ProjectsSection = ({ projects, themeColor = '#28A745' }: ProjectsSectionProps) => {
  if (!projects.length) return null;

  return (
    <motion.section
      id="projets"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
          <FolderOpen className="w-5 h-5" style={{ color: themeColor }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Projets</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id || i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            whileHover={{ y: -4 }}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Image or placeholder */}
            {project.image ? (
              <div className="h-36 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div
                className="h-36 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}30)` }}
              >
                <FolderOpen className="w-12 h-12 opacity-30" style={{ color: themeColor }} />
              </div>
            )}

            <div className="p-4 flex flex-col flex-1">
              {/* Title + links */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-900 text-base leading-snug">{project.title}</h3>
                <div className="flex gap-1.5 shrink-0">
                  {project.project_url && (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Demo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-900 hover:text-white text-gray-600 transition-colors"
                      title="GitHub"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 leading-relaxed flex-1 line-clamp-3">
                  {project.description}
                </p>
              )}

              {project.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.technologies.map((tech: string, j: number) => (
                    <span
                      key={j}
                      className="px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                      style={{ backgroundColor: techColor(tech) }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};
