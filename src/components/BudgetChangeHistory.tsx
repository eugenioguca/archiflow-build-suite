import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { History, Search, Filter, User, Calendar, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChangeLog {
  id: string;
  budget_item_id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  change_reason: string;
  change_comments: string | null;
  created_at: string;
  changed_by: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface BudgetChangeHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  itemId?: string;
}

const changeTypeLabels: Record<string, string> = {
  quantity: 'Cantidad',
  unit_price: 'Precio Unitario',
  total_price: 'Precio Total',
  status: 'Estado',
  description: 'Descripción',
  created: 'Creación',
  deleted: 'Eliminación'
};

const changeReasonLabels: Record<string, string> = {
  client_request: 'Solicitud del Cliente',
  material_change: 'Cambio de Material',
  price_update: 'Actualización de Precio',
  quantity_adjustment: 'Ajuste de Cantidad',
  specification_change: 'Cambio de Especificación',
  error_correction: 'Corrección de Error',
  improvement: 'Mejora del Proceso',
  other: 'Otro'
};

export const BudgetChangeHistory: React.FC<BudgetChangeHistoryProps> = ({
  isOpen,
  onClose,
  projectId,
  itemId
}) => {
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && projectId) {
      fetchChangeLogs();
    }
  }, [isOpen, projectId, itemId]);

  useEffect(() => {
    filterLogs();
  }, [changeLogs, searchTerm, typeFilter, reasonFilter]);

  const fetchChangeLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('budget_change_log')
        .select(`
          *,
          profiles:changed_by (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (itemId) {
        query = query.eq('budget_item_id', itemId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setChangeLogs(data || []);
    } catch (error) {
      console.error('Error fetching change logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = changeLogs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.change_comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        changeTypeLabels[log.change_type]?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.change_type === typeFilter);
    }

    if (reasonFilter !== 'all') {
      filtered = filtered.filter(log => log.change_reason === reasonFilter);
    }

    setFilteredLogs(filtered);
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'quantity': return 'bg-blue-100 text-blue-800';
      case 'unit_price': return 'bg-purple-100 text-purple-800';
      case 'total_price': return 'bg-amber-100 text-amber-800';
      case 'status': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios del Presupuesto
            {itemId && " - Partida Específica"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en comentarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo de cambio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(changeTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Razón del cambio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las razones</SelectItem>
                {Object.entries(changeReasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change logs */}
          <ScrollArea className="h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {changeLogs.length === 0 ? 'No hay cambios registrados' : 'No se encontraron cambios con los filtros aplicados'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getChangeTypeColor(log.change_type)}>
                            {changeTypeLabels[log.change_type] || log.change_type}
                          </Badge>
                          <Badge variant="outline">
                            {changeReasonLabels[log.change_reason] || log.change_reason}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(log.created_at), 'PPp', { locale: es })}
                        </div>
                      </div>

                      {(log.old_value || log.new_value) && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Valor anterior:</span>
                              <p className="text-muted-foreground mt-1">
                                {log.old_value || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Valor nuevo:</span>
                              <p className="text-foreground mt-1">
                                {log.new_value || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {log.change_comments && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Comentarios:</span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            {log.change_comments}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Modificado por: {log.profiles?.full_name || 'Usuario desconocido'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};