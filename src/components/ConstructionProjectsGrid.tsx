import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar, DollarSign, Users } from "lucide-react";

interface ConstructionProject {
  id: string;
  project_name: string;
  status: string;
  client_id: string;
  budget: number;
  construction_budget: number;
  overall_progress_percentage: number;
  construction_start_date: string | null;
  estimated_completion_date: string | null;
  clients: {
    full_name: string;
  };
}

interface ConstructionProjectsGridProps {
  projects: ConstructionProject[];
  onProjectSelect: (project: ConstructionProject) => void;
  selectedProject?: ConstructionProject | null;
}

export function ConstructionProjectsGrid({ 
  projects, 
  onProjectSelect, 
  selectedProject 
}: ConstructionProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card 
          key={project.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedProject?.id === project.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onProjectSelect(project)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Building2 className="h-8 w-8 text-primary" />
              <Badge variant={project.status === 'construction' ? 'default' : 'secondary'}>
                {project.status === 'construction' ? 'En Construcción' : 'Diseño Completado'}
              </Badge>
            </div>
            <CardTitle className="text-lg">{project.project_name}</CardTitle>
            <CardDescription>{project.clients.full_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progreso</span>
                <span className="text-sm font-medium">
                  {project.overall_progress_percentage || 0}%
                </span>
              </div>
              <Progress value={project.overall_progress_percentage || 0} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium">
                    ${(project.construction_budget || project.budget || 0).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground">Presupuesto</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">
                    {project.construction_start_date 
                      ? new Date(project.construction_start_date).toLocaleDateString()
                      : "Sin iniciar"
                    }
                  </div>
                  <div className="text-muted-foreground">Inicio</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}