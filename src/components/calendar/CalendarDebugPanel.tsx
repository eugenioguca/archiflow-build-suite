import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateTime } from "luxon";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CalendarDebugPanel() {
  const { events, loading } = usePersonalCalendar();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testTitle, setTestTitle] = useState("Evento de Prueba");

  const createTestEvent = async () => {
    if (!user) {
      console.error("❌ No user authenticated");
      toast({
        title: "Error",
        description: "No hay usuario autenticado",
        variant: "destructive"
      });
      return;
    }

    try {
      // Crear timestamp UTC para el recordatorio (+1 minuto desde ahora)
      const dueAtUtc = DateTime.utc().plus({ minutes: 1 });
      const dueAtUtcISO = dueAtUtc.toISO();
      
      // Crear el evento primero
      const now = new Date();
      const eventDate = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
      
      const eventToCreate = {
        user_id: user.id,
        title: testTitle,
        description: "Evento creado para pruebas de debug",
        start_date: eventDate.toISOString(),
        end_date: new Date(eventDate.getTime() + 30 * 60 * 1000).toISOString(),
        all_day: false,
        color: "#3b82f6",
        location: "Prueba",
      };

      console.log("🧪 Creating test event:", eventToCreate);
      
      const { data: createdEvent, error: eventError } = await supabase
        .from('personal_calendar_events')
        .insert(eventToCreate)
        .select()
        .single();

      if (eventError || !createdEvent) {
        throw eventError || new Error("No se pudo crear el evento");
      }

      console.log("✅ Test event created:", createdEvent);

      // Insertar recordatorio en event_alerts con trazabilidad completa
      const { data: reminderData, error: reminderError } = await supabase
        .from('event_alerts')
        .insert({
          event_id: createdEvent.id,
          alert_type: 'minutes',
          alert_value: 1,
          sound_enabled: true,
          sound_type: 'soft',
          channel: 'push',
          due_at: dueAtUtcISO,
          status: 'queued',
          sent_at: null,
          error: null,
          is_triggered: false
        })
        .select()
        .single();

      if (reminderError) {
        throw reminderError;
      }

      // Log de trazabilidad en consola (dev-only)
      const debugInfo = {
        debugReminder: {
          event_id: createdEvent.id,
          due_at_utc: dueAtUtcISO,
          status: 'queued',
          channel: 'push',
          reminder_id: reminderData?.id
        }
      };
      console.info("📋 DEBUG - Recordatorio programado:", debugInfo);

      console.info("✅ Test event and reminder created successfully");

      // Trigger immediate dispatch via edge function (bypass worker)
      try {
        console.info("🚀 Triggering immediate dispatch for test reminder...");
        console.info("📋 Dispatch payload:", { mode: 'single', reminder_id: reminderData?.id });
        
        const { data: dispatchResult, error: dispatchError } = await supabase.functions.invoke('calendar-dispatcher', {
          body: {
            mode: 'single',
            reminder_id: reminderData?.id
          }
        });

        if (dispatchError) {
          console.error("❌ Dispatch error:", dispatchError);
          toast({
            title: "⚠️ Recordatorio programado",
            description: "Se enviará según la programación (no se pudo enviar inmediatamente)",
            variant: "default"
          });
        } else {
          console.info("✅ Dispatch result:", dispatchResult);
          toast({
            title: "✅ Notificación de prueba enviada",
            description: "Deberías recibir la notificación push en unos segundos",
          });
        }
      } catch (dispatchError) {
        console.error("❌ Error triggering immediate dispatch:", dispatchError);
        // Toast con hora local como fallback
        const dueAtLocal = dueAtUtc.toLocal();
        toast({
          title: "✅ Recordatorio de prueba programado",
          description: `Se enviará a las ${dueAtLocal.toFormat('HH:mm')} (hora local)`,
        });
      }

    } catch (error) {
      console.error("❌ Error creating test event with reminder:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el recordatorio de prueba",
        variant: "destructive"
      });
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
          Crear Evento de Prueba (con Recordatorio en 1 min)
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Este botón creará un evento con un recordatorio que se activará en 1 minuto.</p>
          <p>Revisa la consola del navegador para ver los logs de debug.</p>
          <p>El recordatorio se insertará en la DB con <code>status='queued'</code> y <code>due_at</code> en UTC.</p>
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
