import React from "react";
import { ClientProjectCalendar } from "./ClientProjectCalendar";

interface CRMClientCalendarProps {
  clientId: string;
  projectId: string;
  projectName: string;
}

export const CRMClientCalendar: React.FC<CRMClientCalendarProps> = ({
  clientId,
  projectId,
  projectName
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-medium text-sm text-muted-foreground mb-2">
          📋 Calendario Cliente - CRM
        </h3>
        <p className="text-sm text-muted-foreground">
          Programa citas y reuniones que serán visibles para el cliente en su portal.
          Los eventos creados aquí aparecerán automáticamente en el calendario del cliente.
        </p>
      </div>
      
      <ClientProjectCalendar
        projectId={projectId}
        projectName={projectName}
        canEdit={true}
        userRole="sales"
      />
    </div>
  );
};