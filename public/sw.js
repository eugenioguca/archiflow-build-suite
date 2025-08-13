// Service Worker for background updates and push notifications
const CACHE_NAME = 'dovita-hub-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'dashboard-sync') {
    event.waitUntil(
      syncDashboardData()
    );
  }
  
  if (event.tag === 'notifications-sync') {
    event.waitUntil(
      syncNotifications()
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
  }
  
  const options = {
    body: data.message || 'Nueva actualización disponible',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.type || 'general',
    data: data,
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Dovita Hub',
      options
    )
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background data sync functions
async function syncDashboardData() {
  try {
    console.log('Syncing dashboard data in background');
    // This would connect to your Supabase instance
    // For now, just post a message to clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_DASHBOARD',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Error syncing dashboard data:', error);
  }
}

async function syncNotifications() {
  try {
    console.log('Syncing notifications in background');
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_NOTIFICATIONS',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Message handler from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SCHEDULE_SYNC') {
    // Schedule background sync
    self.registration.sync.register(event.data.tag || 'dashboard-sync');
  }
});

// Fetch event (for caching strategy)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});