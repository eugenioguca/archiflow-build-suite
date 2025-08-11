import React from "react";
import { ClientProjectCalendar } from "./ClientProjectCalendar";

interface ClientProjectCalendarViewerProps {
  projectId: string;
  projectName: string;
}

export const ClientProjectCalendarViewer: React.FC<ClientProjectCalendarViewerProps> = ({
  projectId,
  projectName
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
        <h3 className="font-medium text-sm text-primary mb-2">
          📅 Tu Calendario de Proyecto
        </h3>
        <p className="text-sm text-muted-foreground">
          Aquí puedes ver todas las citas, reuniones y eventos programados para tu proyecto.
          El equipo mantendrá actualizado este calendario con las fechas importantes.
        </p>
      </div>
      
      <ClientProjectCalendar
        projectId={projectId}
        projectName={projectName}
        canEdit={false}
        userRole="client"
      />
    </div>
  );
};