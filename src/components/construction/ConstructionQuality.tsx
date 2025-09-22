import React, { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, AlertTriangle, X, Camera, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QualityChecklist {
  id: string;
  checklist_name: string;
  construction_phase: string;
  checklist_items: any[];
  status: string;
  inspector_name?: string;
  inspection_date?: string;
  inspection_result?: string;
  observations?: string;
  created_at: string;
}

interface ConstructionQualityProps {
  projectId: string;
  clientId: string;
}

const phaseConfig = {
  excavacion: { label: 'Excavación', color: 'bg-amber-600' },
  cimentacion: { label: 'Cimentación', color: 'bg-stone-600' },
  estructura: { label: 'Estructura', color: 'bg-blue-600' },
  muros: { label: 'Muros', color: 'bg-orange-500' },
  instalaciones: { label: 'Instalaciones', color: 'bg-yellow-500' },
  acabados: { label: 'Acabados', color: 'bg-green-500' },
  limpieza: { label: 'Limpieza', color: 'bg-purple-500' },
};

const statusConfig = {
  pending: { label: 'Pendiente', icon: AlertTriangle, color: 'bg-yellow-500', textColor: 'text-white' },
  in_progress: { label: 'En inspección', icon: FileText, color: 'bg-blue-500', textColor: 'text-white' },
  passed: { label: 'Aprobada', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-white' },
  failed: { label: 'No conformidad', icon: X, color: 'bg-red-500', textColor: 'text-white' },
};

const resultConfig = {
  passed: { label: 'Aprobada', color: 'bg-green-500' },
  failed: { label: 'No Conformidad', color: 'bg-red-500' },
  conditional: { label: 'Condicional', color: 'bg-yellow-500' },
};

export const ConstructionQuality: React.FC<ConstructionQualityProps> = ({
  projectId,
  clientId
}) => {
  const [checklists, setChecklists] = useState<QualityChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    checklist_name: '',
    construction_phase: '',
    checklist_items: [{ item: '', required: true, notes: '' }]
  });

  useEffect(() => {
    fetchChecklists();
  }, [projectId]);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      
      // Datos simulados por ahora
      const mockChecklists: QualityChecklist[] = [
        {
          id: '1',
          checklist_name: 'Inspección de Cimentación',
          construction_phase: 'cimentacion',
          checklist_items: [
            { item: 'Verificar niveles de excavación', required: true },
            { item: 'Comprobar resistencia del suelo', required: true },
            { item: 'Revisar armado de acero', required: true },
            { item: 'Verificar calidad del concreto', required: true }
          ],
          status: 'passed',
          inspector_name: 'Ing. María González',
          inspection_date: '2024-01-15',
          inspection_result: 'passed',
          observations: 'Cimentación cumple con especificaciones técnicas.',
          created_at: '2024-01-10'
        },
        {
          id: '2',
          checklist_name: 'Control de Muros Planta Baja',
          construction_phase: 'muros',
          checklist_items: [
            { item: 'Verificar plomado de muros', required: true },
            { item: 'Revisar juntas de mortero', required: true },
            { item: 'Comprobar nivel horizontal', required: true },
            { item: 'Verificar escuadras', required: true }
          ],
          status: 'pending',
          created_at: '2024-01-20'
        },
        {
          id: '3',
          checklist_name: 'Inspección Instalaciones Eléctricas',
          construction_phase: 'instalaciones',
          checklist_items: [
            { item: 'Verificar calibre de conductores', required: true },
            { item: 'Revisar conexiones a tierra', required: true },
            { item: 'Comprobar tableros eléctricos', required: true },
            { item: 'Verificar salidas y contactos', required: false }
          ],
          status: 'failed',
          inspector_name: 'Ing. Carlos Ramírez',
          inspection_date: '2024-01-22',
          inspection_result: 'failed',
          observations: 'Conductor de tierra no cumple con calibre especificado. Requiere corrección.',
          created_at: '2024-01-18'
        }
      ];

      setTimeout(() => {
        setChecklists(mockChecklists);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching checklists:', error);
      toast.error('Error al cargar las inspecciones de calidad');
      setLoading(false);
    }
  };

  const createChecklist = async () => {
    try {
      // Simular creación
      const newChecklist: QualityChecklist = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      setChecklists(prev => [newChecklist, ...prev]);
      toast.success('Checklist de calidad creado (simulado)');
      setShowAddDialog(false);
      setFormData({
        checklist_name: '',
        construction_phase: '',
        checklist_items: [{ item: '', required: true, notes: '' }]
      });
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast.error('Error al crear checklist');
    }
  };

  const updateInspectionResult = async (checklistId: string, result: string, observations: string) => {
    try {
      setChecklists(prev => prev.map(checklist => 
        checklist.id === checklistId ? {
          ...checklist,
          status: result === 'passed' ? 'passed' : 'failed',
          inspection_result: result,
          observations: observations,
          inspection_date: new Date().toISOString().split('T')[0],
          inspector_name: 'Usuario Actual'
        } : checklist
      ));
      toast.success('Resultado de inspección guardado (simulado)');
    } catch (error) {
      console.error('Error updating inspection:', error);
      toast.error('Error al guardar resultado');
    }
  };

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      checklist_items: [...formData.checklist_items, { item: '', required: true, notes: '' }]
    });
  };

  const updateChecklistItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.checklist_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, checklist_items: updatedItems });
  };

  const removeChecklistItem = (index: number) => {
    if (formData.checklist_items.length > 1) {
      const updatedItems = formData.checklist_items.filter((_, i) => i !== index);
      setFormData({ ...formData, checklist_items: updatedItems });
    }
  };

  // Filtros
  const filteredChecklists = checklists.filter(checklist => {
    const matchesStatus = filterStatus === 'all' || checklist.status === filterStatus;
    const matchesPhase = filterPhase === 'all' || checklist.construction_phase === filterPhase;
    const matchesSearch = !searchText || 
      checklist.checklist_name.toLowerCase().includes(searchText.toLowerCase()) ||
      checklist.construction_phase.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesStatus && matchesPhase && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: checklists.length,
    pending: checklists.filter(c => c.status === 'pending').length,
    passed: checklists.filter(c => c.status === 'passed').length,
    failed: checklists.filter(c => c.status === 'failed').length,
    completion_rate: checklists.length > 0 ? Math.round((checklists.filter(c => c.status === 'passed').length / checklists.length) * 100) : 0
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
              <Shield className="h-5 w-5" />
              Control de Calidad
            </CardTitle>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Checklist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Checklist de Calidad</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre del Checklist</label>
                      <Input
                        value={formData.checklist_name}
                        onChange={(e) => setFormData({ ...formData, checklist_name: e.target.value })}
                        placeholder="Ej: Inspección de Cimentación"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fase de Construcción</label>
                      <Select 
                        value={formData.construction_phase} 
                        onValueChange={(value) => setFormData({ ...formData, construction_phase: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar fase" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(phaseConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Items del checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Items a Verificar</label>
                      <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Item
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.checklist_items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <Input
                            value={item.item}
                            onChange={(e) => updateChecklistItem(index, 'item', e.target.value)}
                            placeholder="Descripción del item a verificar"
                            className="flex-1"
                          />
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={item.required}
                              onCheckedChange={(checked) => updateChecklistItem(index, 'required', checked)}
                            />
                            <span className="text-xs">Obligatorio</span>
                          </div>
                          {formData.checklist_items.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeChecklistItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createChecklist}>
                    Crear Checklist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Inspecciones</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
              <p className="text-sm text-muted-foreground">Aprobadas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">No Conformidad</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.completion_rate}%</p>
              <p className="text-sm text-muted-foreground">Tasa de Aprobación</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <Input
              placeholder="Buscar inspecciones..."
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
            <Select value={filterPhase} onValueChange={setFilterPhase}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fases</SelectItem>
                {Object.entries(phaseConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de inspecciones */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {filteredChecklists.map((checklist) => {
              const StatusIcon = statusConfig[checklist.status as keyof typeof statusConfig]?.icon;
              const statusInfo = statusConfig[checklist.status as keyof typeof statusConfig];
              const phaseInfo = phaseConfig[checklist.construction_phase as keyof typeof phaseConfig];
              
              return (
                <div key={checklist.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{checklist.checklist_name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`${phaseInfo?.color} text-white`}
                        >
                          {phaseInfo?.label}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`${statusInfo?.color} ${statusInfo?.textColor}`}
                        >
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {statusInfo?.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Creado: {format(new Date(checklist.created_at), 'dd/MMM/yyyy', { locale: es })}</span>
                        {checklist.inspection_date && (
                          <span>Inspeccionado: {format(new Date(checklist.inspection_date), 'dd/MMM/yyyy', { locale: es })}</span>
                        )}
                        {checklist.inspector_name && (
                          <span>Inspector: {checklist.inspector_name}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {checklist.inspection_result && (
                        <Badge 
                          variant="secondary" 
                          className={`${resultConfig[checklist.inspection_result as keyof typeof resultConfig]?.color} text-white`}
                        >
                          {resultConfig[checklist.inspection_result as keyof typeof resultConfig]?.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Items del checklist */}
                  {checklist.checklist_items && Array.isArray(checklist.checklist_items) && checklist.checklist_items.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Items a verificar:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {checklist.checklist_items.map((item: any, index: number) => (
                          <div key={index} className="text-sm p-2 bg-muted/30 rounded flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            {typeof item === 'string' ? item : item.item || item.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {checklist.observations && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Observaciones:</strong> {checklist.observations}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {checklist.checklist_items?.length || 0} items a verificar
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {checklist.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateInspectionResult(checklist.id, 'failed', 'No conformidad detectada')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            No Conforme
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => updateInspectionResult(checklist.id, 'passed', 'Inspección aprobada')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                        </>
                      )}
                      
                      <Button variant="outline" size="sm" disabled>
                        <Camera className="h-4 w-4 mr-1" />
                        Fotos
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredChecklists.length === 0 && (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay inspecciones</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? "No se han creado inspecciones de calidad para este proyecto."
                    : `No hay inspecciones con estado "${statusConfig[filterStatus as keyof typeof statusConfig]?.label}".`
                  }
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Inspección
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};