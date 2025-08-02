import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Bell, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BudgetAlert {
  id: string;
  alert_type: 'budget_exceeded' | 'budget_warning' | 'variance_high';
  threshold_percentage: number;
  current_percentage: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface BudgetAlertsPanelProps {
  constructionProjectId: string;
}

export function BudgetAlertsPanel({ constructionProjectId }: BudgetAlertsPanelProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    // Set up real-time subscription for new alerts
    const channel = supabase
      .channel('budget-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'construction_budget_alerts',
          filter: `construction_project_id=eq.${constructionProjectId}`
        },
        (payload) => {
          setAlerts(prev => [payload.new as BudgetAlert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [constructionProjectId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_budget_alerts')
        .select('*')
        .eq('construction_project_id', constructionProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []).map(item => ({
        ...item,
        alert_type: item.alert_type as 'budget_exceeded' | 'budget_warning' | 'variance_high'
      })));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;

      if (!userId) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('construction_budget_alerts')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: profile.id
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_read: true }
            : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la alerta como leída",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'budget_exceeded':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'budget_warning':
        return <Bell className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'budget_exceeded':
        return 'border-l-red-500 bg-red-50';
      case 'budget_warning':
        return 'border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-orange-500 bg-orange-50';
    }
  };

  const unreadAlerts = alerts.filter(alert => !alert.is_read);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Alertas Presupuestarias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-green-600 font-medium">✓ Sin alertas</div>
            <p className="text-sm text-muted-foreground">
              El presupuesto se encuentra dentro de los límites normales
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Presupuestarias
          </div>
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive">{unreadAlerts.length} nuevas</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 p-4 ${getAlertColor(alert.alert_type)} ${
                !alert.is_read ? 'bg-opacity-100' : 'bg-opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alert.alert_type)}
                  <div className="flex-1">
                    <p className={`text-sm ${!alert.is_read ? 'font-semibold' : 'font-medium'}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {alert.current_percentage.toFixed(1)}% utilizado
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {!alert.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(alert.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {alerts.length > 5 && (
          <div className="p-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              Ver todas las alertas ({alerts.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}