import React, { useState, useEffect } from 'react';
import { Package, Plus, Clock, CheckCircle, Truck, AlertTriangle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnifiedTransactionForm } from "@/components/UnifiedTransactionForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MaterialRequest {
  id: string;
  reference_code: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  metadata: any;
  mayor_nombre?: string;
  partida_nombre?: string;
  subpartida_nombre?: string;
}

interface ConstructionMaterialsProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  draft: { label: 'Borrador', icon: Clock, color: 'bg-muted', textColor: 'text-muted-foreground' },
  pending: { label: 'Enviado a Finanzas', icon: AlertTriangle, color: 'bg-yellow-500', textColor: 'text-white' },
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-white' },
  ordered: { label: 'Ordenado', icon: Package, color: 'bg-blue-500', textColor: 'text-white' },
  paid: { label: 'Pagado', icon: CheckCircle, color: 'bg-purple-500', textColor: 'text-white' },
  in_transit: { label: 'En camino', icon: Truck, color: 'bg-orange-500', textColor: 'text-white' },
  delivered: { label: 'Entregado', icon: Package, color: 'bg-green-600', textColor: 'text-white' },
  reconciled: { label: 'Conciliado', icon: CheckCircle, color: 'bg-emerald-600', textColor: 'text-white' },
};

export const ConstructionMaterials: React.FC<ConstructionMaterialsProps> = ({
  projectId,
  clientId
}) => {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  useEffect(() => {
    fetchMaterialRequests();
  }, [projectId]);

  const fetchMaterialRequests = async () => {
    try {
      setLoading(true);
      
      // Obtener transacciones financieras relacionadas con gastos de construcción
      const { data, error } = await supabase
        .from('unified_financial_transactions')
        .select(`
          id,
          referencia_unica,
          descripcion,
          monto_total,
          created_at,
          tiene_factura
        `)
        .eq('empresa_proyecto_id', projectId)
        .eq('tipo_movimiento', 'gasto')
        .eq('departamento', 'construccion')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convertir a formato MaterialRequest
      const formattedRequests: MaterialRequest[] = data?.map(transaction => ({
        id: transaction.id,
        reference_code: transaction.referencia_unica || `REQ-${Date.now()}`,
        description: transaction.descripcion,
        amount: transaction.monto_total,
        status: transaction.tiene_factura ? 'delivered' : 'pending',
        created_at: transaction.created_at,
        metadata: { construction_request: true },
        mayor_nombre: 'Construcción',
        partida_nombre: 'Materiales',  
        subpartida_nombre: transaction.descripcion.substring(0, 50)
      })) || [];

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching material requests:', error);
      toast.error('Error al cargar las solicitudes de material');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async (requestId: string) => {
    try {
      // TODO: Implement delivery confirmation logic
      toast.success('Entrega confirmada (funcionalidad pendiente)');
      fetchMaterialRequests();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Error al confirmar entrega');
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('unified_financial_transactions')
        .update({ 
          tiene_factura: newStatus === 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Actualizar estado local
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: newStatus as any } : req
        )
      );

      toast.success('Estado actualizado correctamente');
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  // Filtros
  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = !searchText || 
      request.description.toLowerCase().includes(searchText.toLowerCase()) ||
      request.reference_code.toLowerCase().includes(searchText.toLowerCase()) ||
      request.subpartida_nombre?.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: requests.length,
    pending: requests.filter(r => ['draft', 'pending'].includes(r.status)).length,
    approved: requests.filter(r => ['approved', 'ordered', 'paid'].includes(r.status)).length,
    delivered: requests.filter(r => ['delivered', 'reconciled'].includes(r.status)).length,
    totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y estadísticas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gestión de Materiales
            </CardTitle>
            
            <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Solicitud
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud de Material</DialogTitle>
                </DialogHeader>
                
                <div className="p-4 text-center">
                  <p className="text-muted-foreground">
                    Formulario de solicitud de material (próximamente)
                  </p>
                  <Button 
                    onClick={() => {
                      setShowNewRequestDialog(false);
                      toast.info('Funcionalidad en desarrollo');
                    }}
                    className="mt-4"
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Solicitudes</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-muted-foreground">Entregados</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalAmount)}</p>
              <p className="text-sm text-muted-foreground">Valor Total</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por descripción, código o partida..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de solicitudes */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {filteredRequests.map((request) => {
              const StatusIcon = statusConfig[request.status as keyof typeof statusConfig]?.icon;
              const statusInfo = statusConfig[request.status as keyof typeof statusConfig];
              
              return (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{request.reference_code}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`${statusInfo?.color} ${statusInfo?.textColor}`}
                        >
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {statusInfo?.label}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                      
                      {/* Información de partida */}
                      {request.subpartida_nombre && (
                        <div className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">Partida:</span> {request.mayor_nombre} → {request.partida_nombre} → {request.subpartida_nombre}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(request.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MMM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Timeline visual */}
                  <div className="flex items-center gap-2 text-xs">
                    {['draft', 'pending', 'approved', 'ordered', 'paid', 'in_transit', 'delivered', 'reconciled'].map((status, index) => {
                      const isActive = Object.keys(statusConfig).indexOf(request.status) >= index;
                      const isCurrent = request.status === status;
                      
                      return (
                        <React.Fragment key={status}>
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              isCurrent ? 'bg-primary' : 
                              isActive ? 'bg-green-500' : 'bg-muted'
                            }`} 
                          />
                          {index < 7 && (
                            <div className={`flex-1 h-0.5 ${isActive ? 'bg-green-500' : 'bg-muted'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {request.metadata?.construction_request && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Solicitud de Construcción
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {request.status === 'delivered' && (
                        <Button 
                          size="sm" 
                          onClick={() => confirmDelivery(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar Entrega
                        </Button>
                      )}
                      
                      {request.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateRequestStatus(request.id, 'pending')}
                        >
                          Enviar a Finanzas
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Información adicional */}
                  {request.metadata?.quantity && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Cantidad solicitada:</strong> {request.metadata.quantity} {request.metadata.unit || 'unidades'}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay solicitudes</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? "No se han creado solicitudes de materiales para este proyecto."
                    : `No hay solicitudes con estado "${statusConfig[filterStatus as keyof typeof statusConfig]?.label}".`
                  }
                </p>
                <Button onClick={() => setShowNewRequestDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Solicitud
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};