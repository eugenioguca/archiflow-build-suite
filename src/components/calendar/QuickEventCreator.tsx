import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarEvent, EventAlert } from "@/hooks/usePersonalCalendar";
import { format, addHours } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

interface QuickEventCreatorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (eventData: Partial<CalendarEvent> & { alerts?: Partial<EventAlert>[] }) => void;
  initialDate?: Date | null;
  event?: CalendarEvent | null;
}

export function QuickEventCreator({ 
  open, 
  onClose, 
  onSubmit, 
  initialDate, 
  event 
}: QuickEventCreatorProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    all_day: false,
    color: "#3b82f6",
    location: "",
  });

  const [alerts, setAlerts] = useState<Partial<EventAlert>[]>([]);

  useEffect(() => {
    if (event) {
      // Edit mode
      setFormData({
        title: event.title,
        description: event.description || "",
        start_date: format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"),
        end_date: format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm"),
        all_day: event.all_day,
        color: event.color,
        location: event.location || "",
      });
      setAlerts((event.alerts || []) as Partial<EventAlert>[]);
    } else if (initialDate) {
      // Create mode with initial date
      const start = format(initialDate, "yyyy-MM-dd'T'HH:mm");
      const end = format(addHours(initialDate, 1), "yyyy-MM-dd'T'HH:mm");
      setFormData({
        title: "",
        description: "",
        start_date: start,
        end_date: end,
        all_day: false,
        color: "#3b82f6",
        location: "",
      });
      setAlerts([]);
    } else {
      // Reset form
      const now = new Date();
      const start = format(now, "yyyy-MM-dd'T'HH:mm");
      const end = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm");
      setFormData({
        title: "",
        description: "",
        start_date: start,
        end_date: end,
        all_day: false,
        color: "#3b82f6",
        location: "",
      });
      setAlerts([]);
    }
  }, [event, initialDate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (endDate <= startDate) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    onSubmit({
      ...formData,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      alerts: alerts.filter(alert => alert.alert_type && alert.alert_value) as EventAlert[],
    });
  };

  const addAlert = () => {
    setAlerts([...alerts, {
      alert_type: "minutes",
      alert_value: 15,
      sound_enabled: false,
      sound_type: "soft",
    }]);
  };

  const removeAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const updateAlert = (index: number, field: string, value: any) => {
    const updatedAlerts = [...alerts];
    updatedAlerts[index] = { ...updatedAlerts[index], [field]: value };
    setAlerts(updatedAlerts);
  };

  const colors = [
    { value: "#3b82f6", label: "Azul" },
    { value: "#ef4444", label: "Rojo" },
    { value: "#10b981", label: "Verde" },
    { value: "#f59e0b", label: "Amarillo" },
    { value: "#8b5cf6", label: "Púrpura" },
    { value: "#06b6d4", label: "Cian" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? "Editar Evento" : "Nuevo Evento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha y hora de inicio *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">Fecha y hora de fin *</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
            />
            <Label htmlFor="all_day">Todo el día</Label>
          </div>

          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: formData.color }}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {colors.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Alertas</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAlert}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Alerta
              </Button>
            </div>

            {alerts.map((alert, index) => (
              <div key={index} className="border rounded p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Cantidad"
                    value={alert.alert_value || ""}
                    onChange={(e) => updateAlert(index, "alert_value", parseInt(e.target.value))}
                  />
                  <Select 
                    value={alert.alert_type || "minutes"} 
                    onValueChange={(value) => updateAlert(index, "alert_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Días</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeAlert(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={alert.sound_enabled || false}
                    onCheckedChange={(checked) => updateAlert(index, "sound_enabled", checked)}
                  />
                  <Label className="text-sm">Sonido de alerta</Label>
                </div>

                {alert.sound_enabled && (
                  <Select 
                    value={alert.sound_type || "soft"} 
                    onValueChange={(value) => updateAlert(index, "sound_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soft">Suave</SelectItem>
                      <SelectItem value="professional">Profesional</SelectItem>
                      <SelectItem value="loud">Fuerte</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {event ? "Actualizar" : "Crear"} Evento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}