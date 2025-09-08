import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import type { SelectedParametric } from './ExecutiveBudgetPage';

interface TotalsSidebarProps {
  parametric: SelectedParametric;
  rollups: any;
  isLoading: boolean;
}

export function TotalsSidebar({ parametric, rollups, isLoading }: TotalsSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Calculando totales...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalParametric = parametric?.monto_total || 0;
  const totalExecutive = rollups?.totalExecutive || 0;
  const difference = totalExecutive - totalParametric;
  const progressPercentage = totalParametric > 0 ? (totalExecutive / totalParametric) * 100 : 0;
  
  const isWithinBudget = Math.abs(difference) < 0.01;
  const isOverBudget = difference > 0.01;
  const subpartidasCount = rollups?.subpartidasCount || 0;

  return (
    <div className="space-y-6 sticky top-6">
      {/* Budget Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Resumen Presupuestal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex justify-center">
            {isWithinBudget ? (
              <Badge variant="secondary" className="text-green-700 bg-green-100 px-3 py-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Balanceado
              </Badge>
            ) : isOverBudget ? (
              <Badge variant="destructive" className="px-3 py-1">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Sobrepresupuesto
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-700 bg-blue-50 px-3 py-1">
                <Clock className="h-4 w-4 mr-2" />
                En progreso
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso</span>
              <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(progressPercentage, 100)} 
              className="h-3"
            />
          </div>

          {/* Budget Breakdown */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Presupuesto Paramétrico:</span>
              <span className="font-semibold">
                ${totalParametric.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Ejecutivo:</span>
              <span className="font-semibold">
                ${totalExecutive.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Diferencia:</span>
              <div className="flex items-center gap-2">
                {difference > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : difference < 0 ? (
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className={`font-bold ${
                  isOverBudget ? 'text-red-600' : difference < 0 ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {difference >= 0 ? '+' : ''}${difference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Departamento Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🏢 Información del Departamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Departamento:</span>
            <p className="font-semibold">{parametric.departamento}</p>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Mayor:</span>
            <p className="font-semibold">{parametric.mayor_codigo}</p>
            <p className="text-sm text-muted-foreground">{parametric.mayor_nombre}</p>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Partida:</span>
            <p className="font-semibold">{parametric.partida_codigo}</p>
            <p className="text-sm text-muted-foreground">{parametric.partida_nombre}</p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📈 Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{subpartidasCount}</div>
              <div className="text-xs text-muted-foreground">Subpartidas</div>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">{parametric.cantidad_requerida}</div>
              <div className="text-xs text-muted-foreground">Cantidad Base</div>
            </div>
          </div>

          {/* Average Unit Price */}
          {subpartidasCount > 0 && (
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Precio Promedio:</span>
                <span className="font-semibold">
                  ${(totalExecutive / subpartidasCount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button className="w-full text-left p-2 text-sm hover:bg-muted rounded-md transition-colors">
            📊 Exportar a Excel
          </button>
          <button className="w-full text-left p-2 text-sm hover:bg-muted rounded-md transition-colors">
            📄 Generar PDF
          </button>
          <button className="w-full text-left p-2 text-sm hover:bg-muted rounded-md transition-colors">
            📈 Ver historial de cambios
          </button>
        </CardContent>
      </Card>
    </div>
  );
}