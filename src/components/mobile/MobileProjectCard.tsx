import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface ProjectData {
  id: string;
  name: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  address?: string;
  status: string;
  budget?: number;
  progress?: number;
  created_at: string;
  updated_at?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  phase?: string;
  team_members?: string[];
  next_milestone?: string;
  next_milestone_date?: string;
}

interface MobileProjectCardProps {
  project: ProjectData;
  onSelect?: (project: ProjectData) => void;
  showDetails?: boolean;
  actions?: React.ReactNode;
}

const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'en_proceso':
      return { label: 'En Proceso', variant: 'default' as const, icon: Clock };
    case 'completed':
    case 'completado':
      return { label: 'Completado', variant: 'outline' as const, icon: CheckCircle };
    case 'paused':
    case 'pausado':
      return { label: 'Pausado', variant: 'secondary' as const, icon: AlertCircle };
    case 'cancelled':
    case 'cancelado':
      return { label: 'Cancelado', variant: 'destructive' as const, icon: AlertCircle };
    default:
      return { label: status || 'Sin Estado', variant: 'secondary' as const, icon: Clock };
  }
};

const getPriorityConfig = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return { label: 'Urgente', color: 'bg-red-500' };
    case 'high':
      return { label: 'Alta', color: 'bg-orange-500' };
    case 'medium':
      return { label: 'Media', color: 'bg-yellow-500' };
    case 'low':
      return { label: 'Baja', color: 'bg-green-500' };
    default:
      return null;
  }
};

const formatCurrency = (amount?: number) => {
  if (!amount) return 'No definido';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function MobileProjectCard({ 
  project, 
  onSelect, 
  showDetails = false,
  actions 
}: MobileProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const statusConfig = getStatusConfig(project.status);
  const priorityConfig = getPriorityConfig(project.priority);
  const StatusIcon = statusConfig.icon;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(project);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card className="bg-card/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-200">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="justify-between h-auto p-0 hover:bg-transparent"
              onClick={handleCardClick}
            >
              <div className="flex items-start gap-3 flex-1">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {project.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-left space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {project.name}
                    </h3>
                    {priorityConfig && (
                      <div className={`w-2 h-2 rounded-full ${priorityConfig.color}`} />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={statusConfig.variant} 
                      className="text-xs h-5 px-2 gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                    
                    {project.progress !== undefined && (
                      <Badge variant="outline" className="text-xs h-5 px-2">
                        {project.progress}%
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {project.client_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-2">
                {project.budget && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Presupuesto</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(project.budget)}
                    </p>
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {project.progress !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-xs">
              {project.address && (
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Ubicación
                  </p>
                  <p className="text-foreground leading-tight">{project.address}</p>
                </div>
              )}

              {project.phase && (
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Fase
                  </p>
                  <p className="text-foreground">{project.phase}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Creado
                </p>
                <p className="text-foreground">{formatDate(project.created_at)}</p>
              </div>

              {project.updated_at && (
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Actualizado
                  </p>
                  <p className="text-foreground">{formatDate(project.updated_at)}</p>
                </div>
              )}
            </div>

            {(project.client_email || project.client_phone) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Contacto del Cliente</p>
                  <div className="space-y-1">
                    {project.client_email && (
                      <p className="text-xs text-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {project.client_email}
                      </p>
                    )}
                    {project.client_phone && (
                      <p className="text-xs text-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {project.client_phone}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {project.next_milestone && (
              <>
                <Separator />
                <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-primary">Próximo Hito</p>
                  <p className="text-sm text-foreground">{project.next_milestone}</p>
                  {project.next_milestone_date && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(project.next_milestone_date)}
                    </p>
                  )}
                </div>
              </>
            )}

            {actions && (
              <>
                <Separator />
                <div className="flex gap-2 pt-2">
                  {actions}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}