import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Volume2 } from 'lucide-react';
import { useEventAlerts, AlertConfig, SoundType } from '@/hooks/useEventAlerts';

interface EventAlertsConfigProps {
  eventId?: string;
  onAlertsChange?: (alerts: AlertConfig[]) => void;
  initialAlerts?: AlertConfig[];
}

const ALERT_MINUTES_OPTIONS = [
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 día antes' }
];

const SOUND_OPTIONS = [
  { value: 'none' as SoundType, label: 'Sin sonido' },
  { value: 'icq' as SoundType, label: 'ICQ Clásico' },
  { value: 'soft' as SoundType, label: 'Suave' },
  { value: 'loud' as SoundType, label: 'Fuerte' }
];

export const EventAlertsConfig: React.FC<EventAlertsConfigProps> = ({
  eventId,
  onAlertsChange,
  initialAlerts = []
}) => {
  const [alerts, setAlerts] = useState<AlertConfig[]>(initialAlerts);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { testSound, getEventAlerts } = useEventAlerts();

  useEffect(() => {
    if (eventId) {
      loadExistingAlerts();
    }
  }, [eventId]);

  useEffect(() => {
    onAlertsChange?.(alerts);
  }, [alerts, onAlertsChange]);

  const loadExistingAlerts = async () => {
    if (!eventId) return;
    
    try {
      const existingAlerts = await getEventAlerts(eventId);
      const alertConfigs = existingAlerts.map(alert => ({
        minutes_before: alert.alert_minutes_before,
        alert_type: alert.alert_type as 'popup' | 'email' | 'sound',
        sound_type: (alert as any).sound_type as SoundType
      }));
      setAlerts(alertConfigs);
      setSoundEnabled(alertConfigs.some(alert => alert.alert_type === 'sound'));
    } catch (error) {
      console.error('Error loading existing alerts:', error);
    }
  };

  const addAlert = () => {
    const newAlert: AlertConfig = {
      minutes_before: 15,
      alert_type: 'popup'
    };
    setAlerts([...alerts, newAlert]);
  };

  const updateAlert = (index: number, field: keyof AlertConfig, value: any) => {
    const updatedAlerts = [...alerts];
    updatedAlerts[index] = { ...updatedAlerts[index], [field]: value };
    
    // If switching to sound, add default sound type
    if (field === 'alert_type' && value === 'sound' && !updatedAlerts[index].sound_type) {
      updatedAlerts[index].sound_type = 'icq';
    }
    
    setAlerts(updatedAlerts);
  };

  const removeAlert = (index: number) => {
    const updatedAlerts = alerts.filter((_, i) => i !== index);
    setAlerts(updatedAlerts);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (enabled && alerts.length === 0) {
      addAlert();
    }
  };

  const handleTestSound = (soundType: SoundType) => {
    if (soundType !== 'none') {
      testSound(soundType);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Recordatorios y Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="sound-enabled">Habilitar recordatorios con sonido</Label>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {alerts.map((alert, index) => (
          <div key={index} className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Recordatorio {index + 1}</h4>
              {alerts.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAlert(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tiempo</Label>
                <Select
                  value={alert.minutes_before.toString()}
                  onValueChange={(value) => updateAlert(index, 'minutes_before', parseInt(value))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_MINUTES_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={alert.alert_type}
                  onValueChange={(value) => updateAlert(index, 'alert_type', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popup">Notificación</SelectItem>
                    <SelectItem value="sound">Sonido</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {alert.alert_type === 'sound' && (
              <div>
                <Label className="text-xs">Sonido</Label>
                <div className="flex gap-2">
                  <Select
                    value={alert.sound_type || 'icq'}
                    onValueChange={(value) => updateAlert(index, 'sound_type', value as SoundType)}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestSound(alert.sound_type || 'icq')}
                    disabled={!alert.sound_type || alert.sound_type === 'none'}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAlert}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Recordatorio
        </Button>
      </CardContent>
    </Card>
  );
};