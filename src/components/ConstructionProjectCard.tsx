import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  MapPin,
  Shield
} from 'lucide-react';

interface ConstructionProject {
  id: string;
  project_name: string;
  budget: number;
  construction_budget: number;
  spent_budget: number;
  construction_area: number;
  land_square_meters: number;
  assigned_advisor_id?: string;
  client: {
    full_name: string;
  };
  construction_project?: {
    id: string;
    construction_area: number;
    total_budget: number;
    spent_budget: number;
    start_date: string;
    estimated_completion_date: string;
    overall_progress_percentage: number;
    permit_status: string;
  }[];
  active_phases_count?: number;
  pending_deliveries?: number;
  safety_incidents?: number;
  team_members_count?: number;
}

interface ConstructionProjectCardProps {
  project: ConstructionProject;
  onOpenProject: (projectId: string) => void;
}

export function ConstructionProjectCard({ project, onOpenProject }: ConstructionProjectCardProps) {
  const constructionData = project.construction_project?.[0];
  const totalBudget = project.budget || constructionData?.total_budget || 0;
  const spentBudget = project.spent_budget || constructionData?.spent_budget || 0;
  const progressPercentage = constructionData?.overall_progress_percentage || 0;
  const permitStatus = constructionData?.permit_status || "pending";
  const estimatedCompletion = constructionData?.estimated_completion_date;
  const constructionArea = constructionData?.construction_area || project.construction_area || (project.land_square_meters * 0.8);

  const budgetPercentage = totalBudget > 0 
    ? (spentBudget / totalBudget) * 100 
    : 0;

  const daysRemaining = estimatedCompletion 
    ? Math.ceil((new Date(estimatedCompletion).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'expired': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-muted/10 text-muted-foreground border-muted-foreground/20';
    }
  };

  const getProgressColor = () => {
    if (progressPercentage >= 80) return 'bg-emerald-500';
    if (progressPercentage >= 60) return 'bg-blue-500';
    if (progressPercentage >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getBudgetColor = () => {
    if (budgetPercentage <= 70) return 'text-emerald-600';
    if (budgetPercentage <= 90) return 'text-amber-600';
    return 'text-red-600';
  };

  const getUrgencyIndicators = () => {
    const indicators = [];
    if (daysRemaining <= 7 && daysRemaining > 0) indicators.push({ type: 'urgent', text: 'Entrega próxima' });
    if (budgetPercentage > 90) indicators.push({ type: 'budget', text: 'Presupuesto excedido' });
    if (project.pending_deliveries && project.pending_deliveries > 0) {
      indicators.push({ type: 'delivery', text: `${project.pending_deliveries} entregas pendientes` });
    }
    return indicators;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold mb-1 truncate">
              {project.project_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              Cliente: {project.client.full_name}
            </p>
          </div>
          <div className="flex flex-col gap-1 ml-4">
            <Badge 
              variant="outline" 
              className={`text-xs ${getStatusColor(permitStatus)}`}
            >
              <Shield className="h-3 w-3 mr-1" />
              {permitStatus === 'approved' && 'Aprobado'}
              {permitStatus === 'pending' && 'Pendiente'}
              {permitStatus === 'expired' && 'Vencido'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso General</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
            style={{ '--progress-background': getProgressColor() } as React.CSSProperties}
          />
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Presupuesto
            </div>
            <div className={`text-sm font-medium ${getBudgetColor()}`}>
              ${spentBudget.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              de ${totalBudget.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Tiempo
            </div>
            <div className={`text-sm font-medium ${daysRemaining <= 7 ? 'text-red-600' : 'text-foreground'}`}>
              {estimatedCompletion ? (daysRemaining > 0 ? `${daysRemaining} días` : 'Vencido') : 'Sin fecha'}
            </div>
            <div className="text-xs text-muted-foreground">
              {estimatedCompletion ? 'restantes' : 'definida'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Área
            </div>
            <div className="text-sm font-medium">{constructionArea.toFixed(0)}m²</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Equipo
            </div>
            <div className="text-sm font-medium">
              {project.team_members_count || 0} miembros
            </div>
          </div>
        </div>

        {/* Urgency Indicators */}
        {getUrgencyIndicators().length > 0 && (
          <div className="space-y-1">
            {getUrgencyIndicators().map((indicator, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {indicator.type === 'urgent' && <Clock className="h-3 w-3 text-red-500" />}
                {indicator.type === 'budget' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                {indicator.type === 'delivery' && <TrendingUp className="h-3 w-3 text-blue-500" />}
                <span className="text-muted-foreground">{indicator.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onOpenProject(project.id)}
            className="flex-1"
            size="sm"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Abrir Proyecto
          </Button>
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}