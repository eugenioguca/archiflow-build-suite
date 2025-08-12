import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Target,
  Clock,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ClientProject {
  id: string;
  client_id: string;
  project_name: string;
  project_description?: string;
  budget?: number;
  sales_pipeline_stage: 'nuevo_lead' | 'en_contacto' | 'lead_perdido' | 'cliente_cerrado';
  assigned_advisor_id?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  probability_percentage?: number;
  service_type?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  assigned_advisor?: {
    id: string;
    full_name: string;
  };
}

interface CompactProjectCardProps {
  project: ClientProject;
  onSelect?: (project: ClientProject) => void;
  onStageChange?: (projectId: string, newStage: ClientProject['sales_pipeline_stage']) => void;
  showActions?: boolean;
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead", variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
  en_contacto: { label: "En Contacto", variant: "default" as const, icon: Users, color: "text-blue-600" },
  lead_perdido: { label: "Lead Perdido", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
  cliente_cerrado: { label: "Cliente Cerrado", variant: "outline" as const, icon: CheckCircle, color: "text-green-600" },
};

export function CompactProjectCard({ 
  project, 
  onSelect, 
  onStageChange,
  showActions = true 
}: CompactProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusInfo = statusConfig[project.sales_pipeline_stage];
  const Icon = statusInfo.icon;
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Sin presupuesto';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definido';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            {/* Información esencial siempre visible */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${statusInfo.color}`} />
                  <h3 className="font-medium text-sm truncate">
                    {project.clients?.full_name || 'Cliente sin nombre'}
                  </h3>
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  {project.project_name}
                </p>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusInfo.variant} className="text-xs">
                    {statusInfo.label}
                  </Badge>
                  {project.budget && (
                    <span className="text-xs font-medium text-primary">
                      {formatCurrency(project.budget)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {showActions && onSelect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(project);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        {/* Información detallada colapsible */}
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t bg-muted/20">
            {/* Asesor asignado */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="text-muted-foreground">Asesor: </span>
                {project.assigned_advisor?.full_name || 'Sin asignar'}
              </span>
            </div>

            {/* Información de contacto */}
            {(project.clients?.email || project.clients?.phone) && (
              <div className="space-y-2">
                {project.clients?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {project.clients.email}
                    </span>
                  </div>
                )}
                {project.clients?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {project.clients.phone}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Dirección */}
            {project.clients?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  {project.clients.address}
                </span>
              </div>
            )}

            {/* Fechas importantes */}
            {(project.last_contact_date || project.next_contact_date) && (
              <div className="space-y-2">
                {project.last_contact_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Último contacto: </span>
                      {formatDate(project.last_contact_date)}
                    </span>
                  </div>
                )}
                {project.next_contact_date && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Próximo contacto: </span>
                      {formatDate(project.next_contact_date)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Probabilidad y tipo de servicio */}
            {(project.probability_percentage || project.service_type) && (
              <div className="flex flex-wrap gap-4">
                {project.probability_percentage && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Probabilidad: </span>
                      {project.probability_percentage}%
                    </span>
                  </div>
                )}
                {project.service_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      <span className="text-muted-foreground">Servicio: </span>
                      {project.service_type}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Descripción del proyecto */}
            {project.project_description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {project.project_description}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}