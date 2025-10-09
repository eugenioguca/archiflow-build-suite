import { supabase } from "@/integrations/supabase/client";

// Helper to convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function ensurePushSubscription(): Promise<boolean> {
  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return false;
    }

    // Check if push notifications are supported
    if (!('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from environment
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured');
      return false;
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as BufferSource
      });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return false;
    }

    // Extract subscription details
    const subscriptionJson = subscription.toJSON();
    const p256dh = subscriptionJson.keys?.p256dh || '';
    const auth = subscriptionJson.keys?.auth || '';
    const endpoint = subscription.endpoint;

    // Save or update subscription in database
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (upsertError) {
      console.error('Error saving push subscription:', upsertError);
      return false;
    }

    console.log('✅ Push subscription saved successfully');
    return true;

  } catch (error) {
    console.error('Error in ensurePushSubscription:', error);
    return false;
  }
}

export async function checkPushSubscriptionStatus(): Promise<{
  isSupported: boolean;
  hasPermission: boolean;
  isSubscribed: boolean;
}> {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const hasPermission = Notification.permission === 'granted';
  
  let isSubscribed = false;
  
  if (isSupported && hasPermission) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      isSubscribed = !!subscription;
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }
  
  return {
    isSupported,
    hasPermission,
    isSubscribed
  };
}
