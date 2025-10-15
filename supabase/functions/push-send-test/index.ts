import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending test push to user:', user.id);

    // Get user's push subscription
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to fetch subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No push subscription found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = subscriptions[0];

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error('Missing VAPID configuration');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare push notification payload
    const payload = JSON.stringify({
      title: 'Notificación de Prueba',
      body: 'Esta es una notificación de prueba desde el sistema.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: '/' }
    });

    // Send Web Push using web-push compatible approach
    // We'll use a lightweight implementation since Deno doesn't have web-push npm module
    const pushResult = await sendWebPush(
      subscription.endpoint,
      {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      },
      payload,
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject
    );

    if (pushResult.ok) {
      console.log('Push notification sent successfully');
      return new Response(
        JSON.stringify({ ok: true, message: 'Test notification sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Failed to send push:', pushResult.error);
      return new Response(
        JSON.stringify({ ok: false, error: pushResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in push-send-test:', error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to send Web Push (simplified implementation)
async function sendWebPush(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Import web-push library from npm via esm.sh
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    
    // Set VAPID details
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send notification
    await webpush.sendNotification(
      {
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth
        }
      },
      payload
    );

    return { ok: true };
  } catch (error: any) {
    console.error('Web push error:', error);
    return { ok: false, error: error.message || String(error) };
  }
}
