import { supabase } from "@/integrations/supabase/client";

const PUBLIC_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY || ""; // base64url

function urlB64ToUint8Array(base64String: string) {
  const pad = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + pad).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensurePushSubscription() {
  const out = { step: "start" as string, detail: {} as any };
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      out.step = "unsupported";
      throw new Error("Browser does not support service worker/push");
    }
    
    // 1) Permiso
    out.step = "permission";
    console.info("🔔 [Push] Requesting notification permission...");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notifications permission not granted");
    console.info("✅ [Push] Permission granted");

    // 2) SW listo (raíz)
    out.step = "sw.register";
    console.info("⚙️ [Push] Registering service worker...");
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    console.info("✅ [Push] Service worker ready");

    // 3) VAPID key
    out.step = "vapid.key";
    if (!PUBLIC_VAPID) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");
    const appServerKey = urlB64ToUint8Array(PUBLIC_VAPID);
    console.info("🔑 [Push] VAPID key loaded");

    // 4) Suscripción (reusar si ya existe)
    out.step = "push.subscribe";
    console.info("📱 [Push] Getting/creating push subscription...");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ 
        userVisibleOnly: true, 
        applicationServerKey: appServerKey 
      });
      console.info("✅ [Push] New subscription created");
    } else {
      console.info("✅ [Push] Using existing subscription");
    }

    // 5) Guardar/actualizar backend
    out.step = "save.subscription";
    console.info("💾 [Push] Saving subscription to backend...");
    const body = {
      endpoint: sub.endpoint,
      keys: (sub.toJSON() as any).keys, // {p256dh, auth}
    };
    
    const { data, error } = await supabase.functions.invoke("push-save-subscription", { body });
    if (error) throw error;

    console.info("✅ [Push] Subscription saved successfully", { endpoint: body.endpoint });
    return { ok: true };
  } catch (e: any) {
    console.error("❌ [Push] Setup failed at step:", out.step, e);
    return { ok: false, step: out.step, error: String(e?.message || e) };
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
