
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, ExternalLink, Github } from "lucide-react";

interface ProjectsSectionProps {
  projects: any[];
}

export const ProjectsSection = ({ projects }: ProjectsSectionProps) => {
  if (projects.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 flex items-center">
          <Code size={24} className="mr-3 text-[#28A745]" />
          Projets
        </h3>
        <div className="grid gap-6">
          {projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{project.title}</h4>
                <div className="flex space-x-2">
                  {project.project_url && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <a href={project.project_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                  )}
                  {project.github_url && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                        <Github size={14} />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              
              {project.description && (
                <p className="text-gray-700 mb-3 leading-relaxed">{project.description}</p>
              )}
              
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
