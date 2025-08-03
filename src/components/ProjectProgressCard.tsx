import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Eye,
  User
} from 'lucide-react';

interface ProjectProgressCardProps {
  project: {
    project_name: string;
    project_description?: string | null;
    status: string;
    budget?: number | null;
    construction_budget?: number | null;
    overall_progress_percentage?: number | null;
    estimated_completion_date?: string | null;
    construction_start_date?: string | null;
    project_location?: string | null;
    service_type?: string | null;
    timeline_months?: number | null;
  };
}

export const ProjectProgressCard: React.FC<ProjectProgressCardProps> = ({ project }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'potential': { variant: 'secondary', icon: Clock, label: 'Potencial' },
      'design': { variant: 'default', icon: Eye, label: 'Diseño' },
      'construction': { variant: 'default', icon: Building2, label: 'Construcción' },
      'completed': { variant: 'default', icon: CheckCircle, label: 'Completado' },
      'cancelled': { variant: 'destructive', icon: AlertCircle, label: 'Cancelado' }
    };

    const config = variants[status] || { variant: 'outline', icon: Clock, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const projectProgress = project.overall_progress_percentage || 0;

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg">
      <div className="p-8">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{project.project_name}</h1>
            <p className="text-primary-foreground/80 text-lg mb-4">
              {project.project_description || 'Su proyecto de construcción'}
            </p>
            <div className="flex flex-wrap gap-3">
              {getStatusBadge(project.status)}
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(project.budget)}
              </Badge>
              {project.timeline_months && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  <Calendar className="h-3 w-3 mr-1" />
                  {project.timeline_months} meses
                </Badge>
              )}
              {project.project_location && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  <MapPin className="h-3 w-3 mr-1" />
                  {project.project_location}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="lg:w-80">
            <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold">{projectProgress}%</div>
                  <div className="text-sm text-white/80">Progreso General</div>
                </div>
                <Progress value={projectProgress} className="h-3 bg-white/20" />
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/60">Presupuesto</div>
                    <div className="font-semibold">{formatCurrency(project.budget)}</div>
                  </div>
                  <div>
                    <div className="text-white/60">Tipo</div>
                    <div className="font-semibold capitalize">{project.service_type || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};