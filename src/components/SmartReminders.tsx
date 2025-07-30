import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function SmartReminders() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const checkForSmartReminders = async () => {
      try {
        // Buscar clientes que no han sido contactados en más de 7 días
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: staleClients, error } = await supabase
          .from('clients')
          .select(`
            id,
            full_name,
            last_contact_date,
            status,
            priority,
            profiles!inner(user_id, full_name)
          `)
          .eq('status', 'potential')
          .or(`last_contact_date.is.null,last_contact_date.lt.${sevenDaysAgo.toISOString()}`)
          .limit(5);

        if (error) throw error;

        // Crear recordatorios inteligentes para estos clientes
        for (const client of staleClients || []) {
          const reminderExists = await supabase
            .from('crm_reminders')
            .select('id')
            .eq('client_id', client.id)
            .eq('user_id', user.id)
            .eq('title', 'Seguimiento Inteligente')
            .gte('created_at', sevenDaysAgo.toISOString())
            .single();

          if (!reminderExists.data) {
            const reminderDate = new Date();
            reminderDate.setMinutes(reminderDate.getMinutes() + 1); // Recordatorio en 1 minuto

            const message = client.last_contact_date 
              ? `El cliente ${client.full_name} no ha sido contactado desde hace más de 7 días. Es recomendable hacer seguimiento para mantener el engagement.`
              : `El cliente ${client.full_name} aún no ha sido contactado. Es importante establecer el primer contacto para iniciar la relación comercial.`;

            await supabase
              .from('crm_reminders')
              .insert({
                client_id: client.id,
                user_id: user.id,
                title: 'Seguimiento Inteligente',
                message,
                reminder_date: reminderDate.toISOString(),
              });
          }
        }

        // Buscar clientes de alta prioridad sin actividad reciente
        const { data: highPriorityClients, error: highPriorityError } = await supabase
          .from('clients')
          .select(`
            id,
            full_name,
            next_contact_date,
            priority,
            profiles!inner(user_id, full_name)
          `)
          .eq('status', 'potential')
          .eq('priority', 'high')
          .lt('next_contact_date', new Date().toISOString())
          .limit(3);

        if (highPriorityError) throw highPriorityError;

        for (const client of highPriorityClients || []) {
          const reminderExists = await supabase
            .from('crm_reminders')
            .select('id')
            .eq('client_id', client.id)
            .eq('user_id', user.id)
            .eq('title', 'Cliente Prioritario')
            .gte('created_at', sevenDaysAgo.toISOString())
            .single();

          if (!reminderExists.data) {
            const reminderDate = new Date();
            reminderDate.setMinutes(reminderDate.getMinutes() + 2); // Recordatorio en 2 minutos

            await supabase
              .from('crm_reminders')
              .insert({
                client_id: client.id,
                user_id: user.id,
                title: 'Cliente Prioritario',
                message: `El cliente de alta prioridad ${client.full_name} requiere seguimiento urgente. Su fecha de próximo contacto ya venció.`,
                reminder_date: reminderDate.toISOString(),
              });
          }
        }

      } catch (error) {
        console.error('Error creating smart reminders:', error);
      }
    };

    // Ejecutar al cargar y luego cada 30 minutos
    checkForSmartReminders();
    const interval = setInterval(checkForSmartReminders, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return null; // Este componente no renderiza nada
}