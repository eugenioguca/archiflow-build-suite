import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  
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
      <Badge variant={config.variant} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Calculate real progress based on project status and payments
  const calculateRealProgress = () => {
    const status = project.status;
    let baseProgress = 0;
    
    switch (status) {
      case 'potential':
        baseProgress = 5;
        break;
      case 'design':
        baseProgress = 35;
        break;
      case 'construction':
        baseProgress = 75;
        break;
      case 'completed':
        baseProgress = 100;
        break;
      default:
        baseProgress = 0;
    }
    
    return Math.min(100, Math.max(baseProgress, project.overall_progress_percentage || 0));
  };

  const projectProgress = calculateRealProgress();

  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg overflow-hidden">
      <div className={isMobile ? 'p-3' : 'p-6'}>
        {/* Mobile-First Header */}
        <div className={isMobile ? 'space-y-3' : 'flex items-start justify-between gap-6'}>
          <div className="flex-1 min-w-0">
            <h1 className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold mb-2 truncate`}>
              {project.project_name}
            </h1>
            <p className={`text-primary-foreground/80 ${isMobile ? 'text-xs leading-relaxed' : 'text-base'} mb-3 line-clamp-2`}>
              {project.project_description || 'Su proyecto de construcción'}
            </p>
            
            {/* Mobile Optimized Status */}
            <div className={`flex flex-wrap gap-1 ${isMobile ? 'mb-3' : 'mb-0'}`}>
              {getStatusBadge(project.status)}
              {project.project_location && (
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 text-xs max-w-24 truncate">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{project.project_location}</span>
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Card */}
          <div className={isMobile ? 'w-full' : 'lg:w-72'}>
            <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <CardContent className={isMobile ? 'p-3' : 'p-4'}>
                <div className="text-center mb-3">
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{projectProgress}%</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80`}>Progreso General</div>
                </div>
                <Progress value={projectProgress} className={`${isMobile ? 'h-2' : 'h-3'} bg-white/20 mb-3`} />
                
                {/* Budget Information - Mobile Optimized */}
                <div className={isMobile ? 'space-y-2' : 'grid grid-cols-1 gap-2'}>
                  {/* Opening Budget */}
                  <div className="bg-white/5 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Inicial</span>
                      <div className="text-right">
                        <div className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {formatCurrency(project.budget)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Construction Budget */}
                  {project.construction_budget && project.construction_budget > 0 && (
                    <div className="bg-white/5 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Construcción</span>
                        <div className="text-right">
                          <div className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {formatCurrency(project.construction_budget)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Project Timeline */}
                  {project.timeline_months && (
                    <div className="bg-white/5 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Duración</span>
                        <div className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {project.timeline_months} meses
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Service Type */}
                  <div className="bg-white/5 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Servicio</span>
                      <div className={`font-semibold capitalize ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {project.service_type || 'N/A'}
                      </div>
                    </div>
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