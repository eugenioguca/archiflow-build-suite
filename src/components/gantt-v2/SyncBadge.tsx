import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, Upload } from 'lucide-react';

interface SyncBadgeProps {
  estadoSync?: 'pendiente_fechas' | 'completo' | 'fuera_de_sync' | null;
  esImportado?: boolean;
}

export function SyncBadge({ estadoSync, esImportado }: SyncBadgeProps) {
  if (!esImportado) return null;

  const getBadgeConfig = () => {
    switch (estadoSync) {
      case 'pendiente_fechas':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: 'Pendiente de fechas',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
        };
      case 'completo':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          text: 'Completo',
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
        };
      case 'fuera_de_sync':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          text: 'Fuera de sync',
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Upload,
          text: 'Importado',
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs ${config.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  );
}