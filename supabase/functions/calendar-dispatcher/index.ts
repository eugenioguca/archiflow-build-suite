import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventAlert {
  id: string;
  event_id: string;
  user_id: string;
  channel: string;
  due_at: string;
  sound_enabled: boolean;
  sound_type: string;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query reminders due now
    const { data: dueReminders, error: queryError } = await supabaseClient
      .from('event_alerts')
      .select('*, personal_calendar_events!inner(title, user_id)')
      .eq('status', 'queued')
      .lte('due_at', new Date().toISOString());

    if (queryError) {
      console.error('Error querying reminders:', queryError);
      throw queryError;
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('No due reminders found');
      return new Response(JSON.stringify({ dispatched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${dueReminders.length} due reminders`);
    let dispatchedCount = 0;

    // Process each reminder
    for (const reminder of dueReminders) {
      const userId = reminder.personal_calendar_events.user_id;

      try {
        if (reminder.channel === 'push') {
          // Get user's push subscription
          const { data: subscriptions } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

          if (subscriptions && subscriptions.length > 0) {
            // Send to all user subscriptions
            for (const subscription of subscriptions) {
              try {
                await sendWebPush(subscription, {
                  title: reminder.personal_calendar_events.title,
                  body: `Recordatorio de evento`,
                  icon: '/icon.png',
                  tag: reminder.event_id,
                });
              } catch (pushError) {
                console.error('Push send error:', pushError);
              }
            }
          }
        }

        // Mark as sent
        await supabaseClient
          .from('event_alerts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error: null,
          })
          .eq('id', reminder.id);

        dispatchedCount++;
      } catch (error) {
        console.error(`Failed to dispatch reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await supabaseClient
          .from('event_alerts')
          .update({
            status: 'failed',
            error: error.message,
          })
          .eq('id', reminder.id);
      }
    }

    console.log({ dispatched: dispatchedCount });

    return new Response(
      JSON.stringify({ dispatched: dispatchedCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in calendar-dispatcher:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string; icon: string; tag: string }
) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:example@example.com';

  // Build Web Push request
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadString);

  // Create JWT for VAPID authentication
  const jwt = await createVapidJWT(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Send push notification
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'TTL': '86400',
    },
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

async function createVapidJWT(subject: string, publicKey: string, privateKey: string): Promise<string> {
  // Simplified JWT creation for VAPID
  // In production, use a proper JWT library like jose
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: new URL(subject).origin,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  // For now, return a placeholder
  // TODO: Implement proper VAPID JWT signing with ES256
  console.warn('VAPID JWT signing not fully implemented - using placeholder');
  return 'placeholder_jwt_token';
}
