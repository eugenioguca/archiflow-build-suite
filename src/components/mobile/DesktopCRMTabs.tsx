import React from "react";
import { Calendar, MessageSquare } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DesktopCRMTabsProps {
  selectedProject: any;
  disabled?: boolean;
}

export const DesktopCRMTabs: React.FC<DesktopCRMTabsProps> = ({ 
  selectedProject, 
  disabled = false 
}) => {
  const isNewLead = selectedProject?.sales_pipeline_stage === 'nuevo_lead';
  
  return (
    <div className="flex-shrink-0 mx-6 space-y-2">
      {/* Primera fila de tabs */}
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="crm">CRM & Información</TabsTrigger>
        <TabsTrigger 
          value="required-docs"
          disabled={disabled || isNewLead}
          className={isNewLead ? 'opacity-50' : ''}
        >
          Documentos Obligatorios
        </TabsTrigger>
        <TabsTrigger 
          value="documents"
          disabled={disabled || isNewLead}
          className={isNewLead ? 'opacity-50' : ''}
        >
          Expediente del Proyecto
        </TabsTrigger>
        <TabsTrigger 
          value="payments"
          disabled={disabled || isNewLead}
          className={isNewLead ? 'opacity-50' : ''}
        >
          Planes de Pago
        </TabsTrigger>
        <TabsTrigger value="projects">Gestión de Proyectos</TabsTrigger>
      </TabsList>
      
      {/* Segunda fila con Chat y Calendario */}
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="calendar">
          <Calendar className="h-4 w-4 mr-2" />
          Calendario Cliente
        </TabsTrigger>
        <TabsTrigger value="chat">
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat Cliente
        </TabsTrigger>
      </TabsList>
    </div>
  );
};