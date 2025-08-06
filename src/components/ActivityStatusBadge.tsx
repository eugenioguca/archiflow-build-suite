import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivityUpdate } from "@/hooks/useActivityUpdate";
import { CheckCircle, Clock, Play, XCircle, Pause } from "lucide-react";

interface ActivityStatusBadgeProps {
  activityId: string;
  currentStatus: string;
  onStatusChange?: () => void;
  interactive?: boolean;
}

const statusConfig = {
  'not_started': {
    label: 'No Iniciado',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-muted-foreground'
  },
  'in_progress': {
    label: 'En Progreso',
    variant: 'default' as const,
    icon: Play,
    color: 'text-blue-600'
  },
  'completed': {
    label: 'Completado',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  'on_hold': {
    label: 'En Espera',
    variant: 'secondary' as const,
    icon: Pause,
    color: 'text-yellow-600'
  },
  'cancelled': {
    label: 'Cancelado',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600'
  }
};

export function ActivityStatusBadge({ 
  activityId, 
  currentStatus, 
  onStatusChange, 
  interactive = true 
}: ActivityStatusBadgeProps) {
  const { updateActivityStatus, updating } = useActivityUpdate();
  
  const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.not_started;
  const Icon = config.icon;

  const handleStatusChange = async (newStatus: string) => {
    const success = await updateActivityStatus(activityId, newStatus);
    if (success && onStatusChange) {
      onStatusChange();
    }
  };

  if (!interactive) {
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <Select 
      value={currentStatus} 
      onValueChange={handleStatusChange}
      disabled={updating}
    >
      <SelectTrigger className="h-auto w-auto border-none p-0 bg-transparent">
        <SelectValue asChild>
          <Badge variant={config.variant} className="gap-1 cursor-pointer hover:opacity-80">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([status, config]) => {
          const StatusIcon = config.icon;
          return (
            <SelectItem key={status} value={status}>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-3 w-3 ${config.color}`} />
                {config.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}