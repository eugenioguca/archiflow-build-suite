import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ycbflvptfgrjclzzlxci.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationRequest {
  type: 'reminder' | 'follow_up' | 'escalation';
  user_id: string;
  client_id: string;
  message: string;
  subject: string;
  reminder_date?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // FASE 4: Validación de origen
  const origin = req.headers.get('origin');
  const allowedOrigins = ['https://ycbflvptfgrjclzzlxci.supabase.co', 'http://localhost:8080'];
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, user_id, client_id, message, subject, reminder_date }: NotificationRequest = await req.json();

    // Obtener información del usuario y cliente
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', user_id)
      .single();

    if (userError || !userProfile) {
      throw new Error('Usuario no encontrado');
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('full_name, email, phone, project_type, budget')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Cliente no encontrado');
    }

    // Generar contenido del email basado en el tipo
    let emailContent = '';
    let emailSubject = subject;

    switch (type) {
      case 'reminder':
        emailSubject = `🏗️ Recordatorio: Seguimiento con ${client.full_name}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🏗️ Recordatorio de Seguimiento</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">CRM Arquitectura & Construcción</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0;">Hola ${userProfile.full_name},</h2>
              
              <p style="color: #666; line-height: 1.6;">Tienes un recordatorio pendiente para dar seguimiento al cliente:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">👤 ${client.full_name}</h3>
                <p style="margin: 8px 0; color: #666;"><strong>Email:</strong> ${client.email}</p>
                <p style="margin: 8px 0; color: #666;"><strong>Teléfono:</strong> ${client.phone}</p>
                <p style="margin: 8px 0; color: #666;"><strong>Tipo de Proyecto:</strong> ${client.project_type || 'No especificado'}</p>
                <p style="margin: 8px 0; color: #666;"><strong>Presupuesto:</strong> ${client.budget ? '$' + client.budget.toLocaleString('es-MX') : 'No especificado'}</p>
              </div>
              
              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
                <p style="margin: 0; color: #1976d2; font-weight: 500;">💬 Mensaje:</p>
                <p style="margin: 10px 0 0 0; color: #333;">${message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/sales" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  📊 Ir al CRM
                </a>
              </div>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                Este es un recordatorio automático del sistema CRM. No respondas a este email.
              </p>
            </div>
          </div>
        `;
        break;

      case 'follow_up':
        emailSubject = `🎯 Follow-up necesario: ${client.full_name}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🎯 Follow-up Requerido</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Es momento de contactar a tu prospecto</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0;">¡Acción requerida!</h2>
              
              <p style="color: #666; line-height: 1.6;">El cliente <strong>${client.full_name}</strong> necesita seguimiento.</p>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">${message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/sales" 
                   style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  📞 Realizar Follow-up
                </a>
              </div>
            </div>
          </div>
        `;
        break;

      case 'escalation':
        emailSubject = `🚨 URGENTE: Cliente requiere atención - ${client.full_name}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 ESCALACIÓN URGENTE</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Cliente requiere atención inmediata</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #d63031; margin-top: 0;">⚠️ Atención Inmediata Requerida</h2>
              
              <p style="color: #666; line-height: 1.6;">El cliente <strong>${client.full_name}</strong> ha sido escalado y requiere tu atención inmediata.</p>
              
              <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <p style="margin: 0; color: #721c24; font-weight: 500;">${message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/sales" 
                   style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  🚨 Atender Ahora
                </a>
              </div>
            </div>
          </div>
        `;
        break;
    }

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "CRM Arquitectura <crm@resend.dev>",
      to: [userProfile.email],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Email enviado:", emailResponse);

    // Registrar el recordatorio en la base de datos si es necesario
    if (reminder_date) {
      const { error: reminderError } = await supabase
        .from('crm_reminders')
        .insert({
          client_id,
          user_id,
          title: emailSubject,
          message,
          reminder_date,
          email_sent: true
        });

      if (reminderError) {
        console.error("Error al guardar recordatorio:", reminderError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: "Notificación enviada correctamente" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error en send-crm-notifications:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);