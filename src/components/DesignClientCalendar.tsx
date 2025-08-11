import React from "react";
import { ClientProjectCalendar } from "./ClientProjectCalendar";

interface DesignClientCalendarProps {
  projectId: string;
  projectName: string;
}

export const DesignClientCalendar: React.FC<DesignClientCalendarProps> = ({
  projectId,
  projectName
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-medium text-sm text-muted-foreground mb-2">
          🎨 Calendario Cliente - Diseño
        </h3>
        <p className="text-sm text-muted-foreground">
          Agenda revisiones de diseño y presentaciones que el cliente podrá ver en su portal.
          Programa entregas de planos, revisiones de renders y reuniones técnicas.
        </p>
      </div>
      
      <ClientProjectCalendar
        projectId={projectId}
        projectName={projectName}
        canEdit={true}
        userRole="design"
      />
    </div>
  );
};