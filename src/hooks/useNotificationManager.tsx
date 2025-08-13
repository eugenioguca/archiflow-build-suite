import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { serviceWorkerManager } from '@/utils/serviceWorkerManager';

interface NotificationEvent {
  type: 'dashboard_update' | 'module_notification' | 'realtime_notification' | 'payment_update';
  data: any;
  timestamp: number;
}

interface NotificationManager {
  // Dashboard stats
  dashboardStats: any;
  recentActivity: any[];
  // Module notifications
  moduleNotifications: Record<string, any[]>;
  // Realtime notifications
  realtimeNotifications: any[];
  // Loading states
  loading: boolean;
  // Methods
  refreshDashboard: () => void;
  invalidateCache: (keys: string[]) => void;
  subscribeTo: (type: string, callback: (data: any) => void) => () => void;
}

// Debounce utility
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
}

// Smart cache with TTL
class SmartCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(keys: string[]) {
    keys.forEach(key => this.cache.delete(key));
  }
  
  clear() {
    this.cache.clear();
  }
}

const cache = new SmartCache();

export function useNotificationManager(): NotificationManager {
  const { user } = useAuth();
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [moduleNotifications, setModuleNotifications] = useState<Record<string, any[]>>({});
  const [realtimeNotifications, setRealtimeNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribers] = useState(new Map<string, Set<(data: any) => void>>());
  
  // Subscription channels
  const channelsRef = useRef<any[]>([]);

  // Smart fetch with caching
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    const cacheKey = 'dashboard_stats';
    const cached = cache.get(cacheKey);
    if (cached && !document.hidden) {
      setDashboardStats(cached.stats);
      setRecentActivity(cached.activity);
      return;
    }

    try {
      setLoading(true);
      
      // Parallel fetch operations
      const [clientProjectsResult, projectsResult, expensesResult, activitiesResult] = await Promise.all([
        supabase.from('client_projects').select('status, budget'),
        supabase.from('projects').select('status, name, created_at, progress_percentage, budget'),
        supabase.from('expenses').select('amount, created_at, description'),
        supabase.from('crm_activities').select('title, activity_type, created_at').order('created_at', { ascending: false }).limit(3)
      ]);

      // Process data
      const clientProjects = clientProjectsResult.data || [];
      const projects = projectsResult.data || [];
      const expenses = expensesResult.data || [];
      const activities = activitiesResult.data || [];

      const stats = {
        totalClients: clientProjects.length,
        activeClients: clientProjects.filter(c => c.status === 'active').length,
        potentialClients: clientProjects.filter(c => c.status === 'potential').length,
        totalProjects: projects.length,
        activeProjects: projects.filter(p => ['construction', 'design', 'permits', 'planning'].includes(p.status)).length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalExpenses: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
        monthlyExpenses: expenses.filter(e => {
          if (!e.created_at) return false;
          const expenseDate = new Date(e.created_at);
          const now = new Date();
          return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
        }).reduce((sum, e) => sum + Number(e.amount), 0),
        pipelineValue: clientProjects.filter(c => c.status === 'potential').reduce((sum, c) => sum + (Number(c.budget) || 0), 0)
      };

      // Create activity array
      const activity = [
        ...activities.map((a, i) => ({ id: `activity-${i}`, type: 'client', description: a.title, date: a.created_at })),
        ...projects.slice(0, 2).map((p, i) => ({ id: `project-${i}`, type: 'project', description: `Proyecto: ${p.name}`, date: p.created_at })),
        ...expenses.slice(0, 2).map((e, i) => ({ id: `expense-${i}`, type: 'expense', description: `Gasto: ${e.description}`, date: e.created_at, amount: Number(e.amount) }))
      ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 6);

      // Cache the results
      cache.set(cacheKey, { stats, activity }, 300000); // 5 minutes

      setDashboardStats(stats);
      setRecentActivity(activity);

      // Notify subscribers (will be added after notifySubscribers is defined)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchModuleNotifications = useCallback(async (module?: string) => {
    if (!user) return;
    
    const modules = module ? [module] : ['sales', 'design', 'construction'];
    
    try {
      const results = await Promise.all(
        modules.map(mod => 
          supabase
            .from('module_notifications')
            .select('*, client:clients(full_name)')
            .eq('target_module', mod)
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10)
        )
      );

      const notifications: Record<string, any[]> = {};
      modules.forEach((mod, index) => {
        notifications[mod] = results[index].data || [];
      });

      setModuleNotifications(prev => ({ ...prev, ...notifications }));
      
      // Notify subscribers (will be added after notifySubscribers is defined)
      
    } catch (error) {
      console.error('Error fetching module notifications:', error);
    }
  }, [user]);

  // Notify subscribers
  const notifySubscribers = useCallback((type: string, data: any) => {
    const typeSubscribers = subscribers.get(type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => callback(data));
    }
  }, [subscribers]);

  // Update the fetch functions to include notifications
  useEffect(() => {
    if (user && Object.keys(dashboardStats).length > 0) {
      notifySubscribers('dashboard_update', { stats: dashboardStats, activity: recentActivity });
    }
  }, [dashboardStats, recentActivity, notifySubscribers, user]);

  useEffect(() => {
    if (user && Object.keys(moduleNotifications).length > 0) {
      notifySubscribers('module_notification', moduleNotifications);
    }
  }, [moduleNotifications, notifySubscribers, user]);

  // Debounced update functions
  const debouncedDashboardUpdate = useDebounce(fetchDashboardData, 2000);
  const debouncedNotificationUpdate = useDebounce(fetchModuleNotifications, 1000);

  // Centralized realtime subscription setup
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) return;
    
    // Clear existing channels
    channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    channelsRef.current = [];

    // Dashboard updates channel
    const dashboardChannel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_projects' }, () => {
        cache.invalidate(['dashboard_stats']);
        debouncedDashboardUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        cache.invalidate(['dashboard_stats']);
        debouncedDashboardUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        cache.invalidate(['dashboard_stats']);
        debouncedDashboardUpdate();
      })
      .subscribe();

    // Module notifications channel
    const moduleChannel = supabase
      .channel('module-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'module_notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const notification = payload.new;
        debouncedNotificationUpdate();
        
        // Show toast for new notifications
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      })
      .subscribe();

    // Payment updates channel
    const paymentChannel = supabase
      .channel('payment-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payment_installments'
      }, (payload) => {
        const updated = payload.new;
        const old = payload.old;
        
        if (old.status !== updated.status) {
          const statusText = updated.status === 'paid' ? 'Pagada' : 
                            updated.status === 'overdue' ? 'Vencida' : 'Pendiente';
          
          toast(`Estado de pago actualizado`, {
            description: `Parcialidad #${updated.installment_number} ahora está: ${statusText}`,
            duration: 6000,
          });
          
          notifySubscribers('payment_update', { updated, old });
        }
      })
      .subscribe();

    channelsRef.current = [dashboardChannel, moduleChannel, paymentChannel];
  }, [user, debouncedDashboardUpdate, debouncedNotificationUpdate, notifySubscribers]);

  // Subscribe method for components
  const subscribeTo = useCallback((type: string, callback: (data: any) => void) => {
    if (!subscribers.has(type)) {
      subscribers.set(type, new Set());
    }
    subscribers.get(type)!.add(callback);
    
    return () => {
      const typeSubscribers = subscribers.get(type);
      if (typeSubscribers) {
        typeSubscribers.delete(callback);
        if (typeSubscribers.size === 0) {
          subscribers.delete(type);
        }
      }
    };
  }, [subscribers]);

  // Enhanced Visibility API integration with Service Worker
  useEffect(() => {
    const unsubscribeVisibility = serviceWorkerManager.onVisibilityChange((isVisible) => {
      if (isVisible) {
        // Resume when tab becomes visible - smart refresh
        const timeSinceHidden = Date.now() - (window as any).lastHiddenTime;
        
        // Only refresh if hidden for more than 2 minutes
        if (!(window as any).lastHiddenTime || timeSinceHidden > 120000) {
          cache.clear();
          fetchDashboardData();
          fetchModuleNotifications();
        }
        
        delete (window as any).lastHiddenTime;
      } else {
        // Store when tab was hidden
        (window as any).lastHiddenTime = Date.now();
        
        // Schedule background sync if supported
        serviceWorkerManager.scheduleSync('dashboard-sync');
      }
    });

    // Listen for service worker sync requests
    const handleDashboardSync = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };

    const handleNotificationsSync = () => {
      if (!document.hidden) {
        fetchModuleNotifications();
      }
    };

    window.addEventListener('dashboard-sync-requested', handleDashboardSync);
    window.addEventListener('notifications-sync-requested', handleNotificationsSync);

    return () => {
      unsubscribeVisibility();
      window.removeEventListener('dashboard-sync-requested', handleDashboardSync);
      window.removeEventListener('notifications-sync-requested', handleNotificationsSync);
    };
  }, [fetchDashboardData, fetchModuleNotifications]);

  // Initialize
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchModuleNotifications();
      setupRealtimeSubscriptions();
    }

    return () => {
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, fetchDashboardData, fetchModuleNotifications, setupRealtimeSubscriptions]);

  return {
    dashboardStats,
    recentActivity,
    moduleNotifications,
    realtimeNotifications,
    loading,
    refreshDashboard: fetchDashboardData,
    invalidateCache: (keys: string[]) => cache.invalidate(keys),
    subscribeTo
  };
}