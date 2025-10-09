// Service Worker for push notifications
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : { title: "Recordatorio", body: "Tienes un evento." };
    event.waitUntil(
      self.registration.showNotification(data.title || "Notificación", {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192.png",
        badge: data.badge || "/icons/badge-72.png",
        data: data.data || {},
      })
    );
  } catch (err) {
    // fallback simple
    event.waitUntil(self.registration.showNotification("Recordatorio", { body: "Tienes un evento." }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
