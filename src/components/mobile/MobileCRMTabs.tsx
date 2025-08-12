import React from "react";
import { 
  Crown, 
  FileText, 
  Building, 
  CreditCard, 
  Briefcase, 
  Calendar,
  MessageSquare
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileCRMTabsProps {
  selectedProject: any;
  disabled?: boolean;
}

export const MobileCRMTabs: React.FC<MobileCRMTabsProps> = ({ 
  selectedProject, 
  disabled = false 
}) => {
  const isNewLead = selectedProject?.sales_pipeline_stage === 'nuevo_lead';
  
  const tabItems = [
    {
      value: "crm",
      icon: Crown,
      label: "Info",
      fullLabel: "CRM & Información",
      disabled: false
    },
    {
      value: "required-docs",
      icon: FileText,
      label: "Docs",
      fullLabel: "Documentos Obligatorios",
      disabled: isNewLead
    },
    {
      value: "documents",
      icon: Building,
      label: "Exp.",
      fullLabel: "Expediente del Proyecto",
      disabled: isNewLead
    },
    {
      value: "payments",
      icon: CreditCard,
      label: "Pagos",
      fullLabel: "Planes de Pago",
      disabled: isNewLead
    },
    {
      value: "projects",
      icon: Briefcase,
      label: "Proyectos",
      fullLabel: "Gestión de Proyectos",
      disabled: false
    },
    {
      value: "calendar",
      icon: Calendar,
      label: "Cal.",
      fullLabel: "Calendario Cliente",
      disabled: false
    },
    {
      value: "chat",
      icon: MessageSquare,
      label: "Chat",
      fullLabel: "Chat Cliente",
      disabled: false
    }
  ];

  return (
    <div className="flex-shrink-0 mx-2 sm:mx-6">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="w-max">
          <TabsList className="inline-flex h-12 items-center justify-start space-x-1 p-1 bg-muted w-max">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={disabled || tab.disabled}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[60px] w-[60px] h-10 px-2 py-1 
                  text-xs font-medium shrink-0
                  data-[state=active]:bg-background 
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-sm
                  ${(disabled || tab.disabled) ? 'opacity-50' : 'hover:bg-muted/50'}
                `}
                title={tab.fullLabel}
              >
                <tab.icon className="h-4 w-4 mb-0.5" />
                <span className="leading-none">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </ScrollArea>
    </div>
  );
};