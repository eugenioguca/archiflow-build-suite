import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CalendarDebugPanel() {
  const { createEvent, events, loading } = usePersonalCalendar();
  const { user } = useAuth();
  const [testTitle, setTestTitle] = useState("Evento de Prueba");

  const createTestEvent = async () => {
    if (!user) {
      console.error("❌ No user authenticated");
      return;
    }

    const now = new Date();
    const eventDate = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now

    const testEvent = {
      title: testTitle,
      description: "Evento creado para pruebas de debug",
      start_date: eventDate.toISOString(),
      end_date: new Date(eventDate.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes duration
      all_day: false,
      color: "#3b82f6",
      location: "Prueba",
      alerts: [
        {
          alert_type: "minutes" as const,
          alert_value: 1,
          sound_enabled: true,
          sound_type: "soft" as const,
        }
      ]
    };

    console.log("🧪 Creating test event:", testEvent);
    
    try {
      await createEvent(testEvent);
      console.log("✅ Test event created successfully");
    } catch (error) {
      console.error("❌ Error creating test event:", error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Panel de Debug del Calendario
          <Badge variant={user ? "default" : "destructive"}>
            {user ? "Autenticado" : "No Autenticado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>Usuario ID:</strong> {user?.id || "No autenticado"}</p>
          <p><strong>Email:</strong> {user?.email || "No disponible"}</p>
          <p><strong>Eventos cargados:</strong> {loading ? "Cargando..." : events.length}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="test-title" className="text-sm font-medium">
            Título del evento de prueba:
          </label>
          <Input
            id="test-title"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Título del evento"
          />
        </div>

        <Button 
          onClick={createTestEvent} 
          disabled={!user}
          className="w-full"
        >
          Crear Evento de Prueba (con Alerta en 1 min)
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Este botón creará un evento con una alerta que se activará en 1 minuto.</p>
          <p>Revisa la consola del navegador para ver los logs de debug.</p>
        </div>

        {events.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Eventos en la base de datos:</h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {events.map((event, index) => (
                <div key={event.id} className="text-xs p-2 bg-muted rounded">
                  <strong>{index + 1}. {event.title}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {new Date(event.start_date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}