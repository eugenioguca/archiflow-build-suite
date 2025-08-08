import React from 'react';
import { PersonalCalendar } from './PersonalCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ClientPortalCalendarProps {
  clientId: string;
  projectId: string;
  isPreview?: boolean;
}

export const ClientPortalCalendar: React.FC<ClientPortalCalendarProps> = ({
  clientId,
  projectId,
  isPreview = false
}) => {
  if (isPreview) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Vista previa del calendario - Funcionalidad disponible para el cliente</p>
        <p className="text-sm mt-2">El cliente puede ver y gestionar eventos relacionados con su proyecto</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Instructions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-primary">Calendario del Proyecto</h4>
              <p className="text-sm text-muted-foreground">
                Aquí puedes ver las citas programadas, reuniones y eventos importantes de tu proyecto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Calendar Component */}
      <PersonalCalendar />
    </div>
  );
};