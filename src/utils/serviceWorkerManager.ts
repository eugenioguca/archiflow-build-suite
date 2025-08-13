// Service Worker registration and management
class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Service Workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    console.log('Message from Service Worker:', event.data);
    
    if (event.data.type === 'SYNC_DASHBOARD') {
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('dashboard-sync-requested'));
    }
    
    if (event.data.type === 'SYNC_NOTIFICATIONS') {
      // Trigger notifications refresh
      window.dispatchEvent(new CustomEvent('notifications-sync-requested'));
    }
  };

  async scheduleSync(tag: string): Promise<void> {
    if (!this.registration) return;
    
    try {
      // Send message to service worker
      navigator.serviceWorker.controller?.postMessage({
        type: 'SCHEDULE_SYNC',
        tag: tag
      });
    } catch (error) {
      console.error('Error scheduling sync:', error);
    }
  }

  async requestPushPermission(): Promise<boolean> {
    if (!this.isSupported || !this.registration) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }

  private notifyUpdate() {
    // Notify user that an update is available
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  async updateServiceWorker(): Promise<void> {
    if (!this.registration) return;
    
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to get the new version
    window.location.reload();
  }

  // Check if app is running in background
  isBackgroundMode(): boolean {
    return document.hidden || document.visibilityState === 'hidden';
  }

  // Smart visibility detection
  onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
    const handler = () => {
      callback(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handler);
    
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();