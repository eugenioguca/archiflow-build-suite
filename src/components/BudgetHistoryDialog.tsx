import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BudgetChange {
  id: string;
  previous_budget: number;
  new_budget: number;
  change_amount: number;
  change_percentage: number;
  change_reason: string;
  notes?: string;
  created_at: string;
  authorized_by: string;
  profile: {
    full_name: string;
  };
}

interface BudgetHistoryDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export function BudgetHistoryDialog({ projectId, trigger }: BudgetHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState<BudgetChange[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBudgetHistory();
    }
  }, [open]);

  const fetchBudgetHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_budget_changes')
        .select(`
          *,
          profile:profiles!authorized_by(full_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChanges(data || []);
    } catch (error) {
      console.error('Error fetching budget history:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de cambios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getChangeColor = (percentage: number) => {
    if (percentage > 0) return 'text-red-600';
    if (percentage < 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4" />;
    if (percentage < 0) return <TrendingDown className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getReasonBadge = (reason: string) => {
    const reasonMap: Record<string, { color: string; label: string }> = {
      'material_price_increase': { color: 'bg-red-100 text-red-800', label: 'Incremento Materiales' },
      'scope_change': { color: 'bg-blue-100 text-blue-800', label: 'Cambio Alcance' },
      'design_modification': { color: 'bg-purple-100 text-purple-800', label: 'Modificación Diseño' },
      'client_request': { color: 'bg-green-100 text-green-800', label: 'Solicitud Cliente' },
      'unforeseen_conditions': { color: 'bg-orange-100 text-orange-800', label: 'Condiciones Imprevistas' },
      'regulatory_changes': { color: 'bg-yellow-100 text-yellow-800', label: 'Cambios Regulatorios' },
      'other': { color: 'bg-gray-100 text-gray-800', label: 'Otro' }
    };

    const config = reasonMap[reason] || reasonMap['other'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Historial
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios Presupuestarios
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : changes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin cambios registrados</h3>
              <p className="text-muted-foreground text-center">
                No se han realizado modificaciones al presupuesto de este proyecto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{changes.length}</div>
                    <div className="text-sm text-muted-foreground">Total Cambios</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {changes.filter(c => c.change_amount > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Incrementos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {changes.filter(c => c.change_amount < 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Reducciones</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Changes Timeline */}
            <div className="space-y-3">
              {changes.map((change, index) => (
                <Card key={change.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 ${getChangeColor(change.change_percentage)}`}>
                            {getChangeIcon(change.change_percentage)}
                            <span className="font-semibold">
                              {change.change_percentage > 0 ? '+' : ''}
                              {change.change_percentage.toFixed(2)}%
                            </span>
                          </div>
                          {getReasonBadge(change.change_reason)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(change.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Anterior:</span>
                            <div className="font-medium">
                              ${change.previous_budget.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Nuevo:</span>
                            <div className="font-medium">
                              ${change.new_budget.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Diferencia:</span>
                            <div className={`font-medium ${getChangeColor(change.change_percentage)}`}>
                              {change.change_amount > 0 ? '+' : ''}
                              ${Math.abs(change.change_amount).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {change.notes && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm">{change.notes}</p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Autorizado por: {change.profile?.full_name || 'Usuario desconocido'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}