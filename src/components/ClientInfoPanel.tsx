import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConstructionRequirementsDialog } from "@/components/ConstructionRequirementsDialog";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight
} from "lucide-react";

interface ClientProject {
  id: string;
  project_name: string;
  project_description?: string;
  budget: number;
  service_type: string;
  status: string;
  sales_pipeline_stage: string;
  has_existing_design: boolean;
  lead_source?: string;
  lead_source_details?: string;
  priority: string;
  estimated_value: number;
  probability_percentage: number;
  timeline_months?: number;
  land_square_meters?: number;
  project_location?: string;
  project_size?: string;
  tags?: string[];
  notes?: string;
  conversion_notes?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  assigned_advisor_id?: string;
  branch_office_id?: string;
  alliance_id?: string;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  notes?: string;
}

interface ClientInfoPanelProps {
  projectId: string;
}

export function ClientInfoPanel({ projectId }: ClientInfoPanelProps) {
  const { toast } = useToast();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);

  useEffect(() => {
    fetchProjectAndClientData();
  }, [projectId]);

  const fetchProjectAndClientData = async () => {
    try {
      // Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from("client_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", projectData.client_id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información del cliente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExistingDesignToggle = async (checked: boolean) => {
    if (!project) return;
    
    if (checked && project.status === 'design') {
      // Show requirements dialog instead of moving automatically
      setShowRequirementsDialog(true);
      return;
    }
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .update({ 
          has_existing_design: checked,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      setProject({ ...project, has_existing_design: checked });
      
      toast({
        title: "Actualizado",
        description: checked 
          ? "Proyecto marcado como con diseño existente"
          : "Proyecto marcado para diseño completo",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del diseño",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmMoveToConstruction = async () => {
    if (!project) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .update({ 
          has_existing_design: true,
          status: 'construction',
          moved_to_construction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      setProject({ ...project, has_existing_design: true, status: 'construction' });
      
      toast({
        title: "Proyecto Transferido",
        description: "El proyecto se ha movido al módulo de construcción",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo transferir el proyecto",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'potential': return 'bg-amber-500/20 text-amber-700 border-amber-300';
      case 'cerrado': return 'bg-green-500/20 text-green-700 border-green-300';
      case 'design': return 'bg-purple-500/20 text-purple-700 border-purple-300';
      case 'construction': return 'bg-blue-500/20 text-blue-700 border-blue-300';
      default: return 'bg-slate-500/20 text-slate-700 border-slate-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-500/20 text-green-700 border-green-300';
      default: return 'bg-slate-500/20 text-slate-700 border-slate-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!project || !client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No se pudo cargar la información</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{client.full_name}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {client.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{client.address}</span>
                </div>
              )}
              {client.state && (
                <div className="text-sm text-muted-foreground">
                  Estado: {client.state}
                </div>
              )}
            </div>
          </div>
          {client.notes && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={getStatusColor(project.status)}>
              {project.status === 'potential' && 'Potencial'}
              {project.status === 'cerrado' && 'Cerrado'}
              {project.status === 'design' && 'En Diseño'}
              {project.status === 'construction' && 'En Construcción'}
            </Badge>
            <Badge className={getPriorityColor(project.priority)}>
              Prioridad: {project.priority === 'high' ? 'Alta' : project.priority === 'medium' ? 'Media' : 'Baja'}
            </Badge>
            <Badge variant="outline">
              {project.service_type}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Proyecto:</span>
                <p className="text-sm text-muted-foreground">{project.project_name}</p>
              </div>
              {project.project_description && (
                <div>
                  <span className="text-sm font-medium">Descripción:</span>
                  <p className="text-sm text-muted-foreground">{project.project_description}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Presupuesto: ${project.budget?.toLocaleString() || '0'}
                </span>
              </div>
              {project.timeline_months && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Duración: {project.timeline_months} meses
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {project.project_location && (
                <div>
                  <span className="text-sm font-medium">Ubicación:</span>
                  <p className="text-sm text-muted-foreground">{project.project_location}</p>
                </div>
              )}
              {project.project_size && (
                <div>
                  <span className="text-sm font-medium">Tamaño:</span>
                  <p className="text-sm text-muted-foreground">{project.project_size}</p>
                </div>
              )}
              {project.land_square_meters && (
                <div>
                  <span className="text-sm font-medium">Terreno:</span>
                  <p className="text-sm text-muted-foreground">{project.land_square_meters} m²</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">Probabilidad:</span>
                <p className="text-sm text-muted-foreground">{project.probability_percentage}%</p>
              </div>
            </div>
          </div>

          {project.lead_source && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Origen del Lead:</div>
              <p className="text-sm text-muted-foreground">{project.lead_source}</p>
              {project.lead_source_details && (
                <p className="text-sm text-muted-foreground mt-1">{project.lead_source_details}</p>
              )}
            </div>
          )}

          {project.notes && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-1">Notas del Proyecto:</div>
              <p className="text-sm text-muted-foreground">{project.notes}</p>
            </div>
          )}

          {project.conversion_notes && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium mb-1 text-green-800">Notas de Conversión:</div>
              <p className="text-sm text-green-700">{project.conversion_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Design Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Estado del Diseño
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="existing-design"
              checked={project.has_existing_design}
              onCheckedChange={handleExistingDesignToggle}
              disabled={updating}
            />
            <label
              htmlFor="existing-design"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              El cliente ya cuenta con un diseño
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Si se marca esta opción, el proyecto pasará automáticamente al módulo de construcción
          </p>
          
          {project.has_existing_design && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Diseño Existente Confirmado</div>
                <div>Este proyecto está listo para pasar a construcción</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Construction Requirements Dialog */}
      <ConstructionRequirementsDialog
        open={showRequirementsDialog}
        onOpenChange={setShowRequirementsDialog}
        projectId={projectId}
        onConfirm={handleConfirmMoveToConstruction}
      />
    </div>
  );
}
