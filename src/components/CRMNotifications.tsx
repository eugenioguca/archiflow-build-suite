import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Check, AlertCircle, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Componente simplificado para notificaciones básicas
export const CRMNotifications = () => {
  const { toast } = useToast();
  const [notifications] = useState([
    {
      id: '1',
      title: 'Sistema Actualizado',
      message: 'Nueva arquitectura Cliente-Proyecto implementada exitosamente',
      reminder_date: new Date().toISOString(),
      popup_shown: false,
      type: 'info'
    }
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones del Sistema
        </CardTitle>
        <CardDescription>
          Avisos importantes sobre la actualización del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">{notification.title}</h4>
                <p className="text-sm text-blue-700">{notification.message}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {new Date(notification.reminder_date).toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
          ))}
          
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">
              ✅ Sistema refactorizado: Ahora los clientes y proyectos se manejan independientemente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};