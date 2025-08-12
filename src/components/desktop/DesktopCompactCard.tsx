import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  User,
  DollarSign,
  Target,
  Building
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
  curp?: string;
  constancia_situacion_fiscal_uploaded?: boolean;
  constancia_situacion_fiscal_url?: string;
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

interface DesktopCompactCardProps {
  project: ClientProject;
  onSelect?: (project: ClientProject) => void;
  onStageChange?: (projectId: string, newStage: ClientProject['sales_pipeline_stage']) => void;
  showActions?: boolean;
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead", variant: "secondary" as const, icon: Target, color: "text-yellow-600" },
  en_contacto: { label: "En Contacto", variant: "default" as const, icon: User, color: "text-blue-600" },
  lead_perdido: { label: "Lead Perdido", variant: "destructive" as const, icon: Target, color: "text-red-600" },
  cliente_cerrado: { label: "Cliente Cerrado", variant: "default" as const, icon: Target, color: "text-green-600" },
};

export const DesktopCompactCard: React.FC<DesktopCompactCardProps> = ({
  project,
  onSelect,
  showActions = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const status = statusConfig[project.sales_pipeline_stage];

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-lg">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          {/* Compact Header - Always Visible */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {project.clients?.full_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {project.project_name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
              
              {project.budget && (
                <div className="text-sm font-medium text-primary">
                  {formatCurrency(project.budget)}
                </div>
              )}
              
              {showActions && onSelect && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelect(project)}
                  className="shrink-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Essential Info - Always Visible */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              {project.assigned_advisor?.full_name && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-32">{project.assigned_advisor.full_name}</span>
                </div>
              )}
              
              {project.service_type && (
                <div className="flex items-center space-x-1">
                  <Building className="h-3 w-3" />
                  <span className="truncate max-w-20">{project.service_type}</span>
                </div>
              )}
            </div>
            
            {project.probability_percentage && (
              <div className="flex items-center space-x-1">
                <Target className="h-3 w-3" />
                <span>{project.probability_percentage}%</span>
              </div>
            )}
          </div>

          {/* Expandable Content */}
          <CollapsibleContent className="mt-4 space-y-4">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center space-x-1">
                  <Phone className="h-3 w-3" />
                  <span>Información de Contacto</span>
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {project.clients?.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{project.clients.email}</span>
                    </div>
                  )}
                  {project.clients?.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3 w-3" />
                      <span>{project.clients.phone}</span>
                    </div>
                  )}
                  {project.clients?.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{project.clients.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Fechas Importantes</span>
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Último contacto:</span> {formatDate(project.last_contact_date)}
                  </div>
                  <div>
                    <span className="font-medium">Próximo contacto:</span> {formatDate(project.next_contact_date)}
                  </div>
                  <div>
                    <span className="font-medium">Creado:</span> {formatDate(project.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Description */}
            {project.project_description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Descripción del Proyecto</h4>
                <p className="text-sm text-muted-foreground">
                  {project.project_description}
                </p>
              </div>
            )}

            {/* Financial Info */}
            {project.budget && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-medium">Presupuesto Total:</span>
                </div>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(project.budget)}
                </span>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};