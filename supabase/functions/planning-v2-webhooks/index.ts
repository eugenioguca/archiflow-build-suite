// Planning v2 Webhooks Edge Function
// Envía eventos a webhooks configurados

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_id: string;
}

interface Webhook {
  id: string;
  url: string;
  secret: string | null;
}

interface Event {
  id: string;
  event_type: string;
  budget_id: string | null;
  snapshot_id: string | null;
  triggered_by: string;
  triggered_at: string;
  payload: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener event_id del body
    const { event_id } = await req.json() as WebhookPayload;

    if (!event_id) {
      throw new Error('Se requiere event_id');
    }

    console.log(`[Planning v2 Webhooks] Procesando evento: ${event_id}`);

    // Obtener detalles del evento
    const { data: event, error: eventError } = await supabaseClient
      .from('planning_v2_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error(`Evento no encontrado: ${eventError?.message}`);
    }

    console.log(`[Planning v2 Webhooks] Tipo de evento: ${event.event_type}`);

    // Obtener webhooks activos que escuchan este tipo de evento
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('planning_v2_webhooks')
      .select('id, url, secret')
      .eq('is_active', true)
      .contains('events', [event.event_type]);

    if (webhooksError) {
      throw new Error(`Error obteniendo webhooks: ${webhooksError.message}`);
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`[Planning v2 Webhooks] No hay webhooks configurados para: ${event.event_type}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No hay webhooks configurados',
          event_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Planning v2 Webhooks] Enviando a ${webhooks.length} webhook(s)`);

    let sent = 0;
    let failed = 0;

    // Enviar a cada webhook
    for (const webhook of webhooks) {
      try {
        console.log(`[Planning v2 Webhooks] Enviando a: ${webhook.url}`);

        const webhookPayload = {
          event_id: event.id,
          event_type: event.event_type,
          budget_id: event.budget_id,
          snapshot_id: event.snapshot_id,
          triggered_at: event.triggered_at,
          data: event.payload
        };

        // Calcular HMAC signature si hay secret
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Planning-V2-Event': event.event_type
        };

        if (webhook.secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhook.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(JSON.stringify(webhookPayload))
          );
          const signatureHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          headers['X-Planning-V2-Signature'] = `sha256=${signatureHex}`;
        }

        // Enviar request
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(webhookPayload)
        });

        if (response.ok) {
          sent++;
          console.log(`[Planning v2 Webhooks] ✓ Enviado exitosamente a: ${webhook.url}`);
        } else {
          failed++;
          console.error(`[Planning v2 Webhooks] ✗ Error ${response.status} en: ${webhook.url}`);
        }

        // Actualizar last_triggered_at del webhook
        await supabaseClient
          .from('planning_v2_webhooks')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', webhook.id);

      } catch (webhookError) {
        failed++;
        console.error(`[Planning v2 Webhooks] ✗ Excepción en webhook ${webhook.id}:`, webhookError);
      }
    }

    // Actualizar contadores en el evento
    await supabaseClient
      .from('planning_v2_events')
      .update({
        webhooks_sent: sent,
        webhooks_failed: failed
      })
      .eq('id', event_id);

    console.log(`[Planning v2 Webhooks] Completado: ${sent} enviados, ${failed} fallidos`);

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        webhooks_sent: sent,
        webhooks_failed: failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Planning v2 Webhooks] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
