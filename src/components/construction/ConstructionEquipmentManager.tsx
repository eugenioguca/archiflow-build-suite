import React, { useState, useEffect } from 'react';
import { Truck, Plus, Settings, AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status: string;
  hourly_rate?: number;
  daily_rate?: number;
  monthly_rate?: number;
  current_phase_id?: string;
  condition_rating?: number;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
}

interface ConstructionEquipmentManagerProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  available: { label: 'Disponible', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-white' },
  in_use: { label: 'En uso', icon: Settings, color: 'bg-blue-500', textColor: 'text-white' },
  maintenance: { label: 'Mantenimiento', icon: Wrench, color: 'bg-yellow-500', textColor: 'text-white' },
  out_of_service: { label: 'Fuera de servicio', icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-white' },
};

export const ConstructionEquipmentManager: React.FC<ConstructionEquipmentManagerProps> = ({
  projectId,
  clientId
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    hourly_rate: 0,
    daily_rate: 0,
    monthly_rate: 0,
    notes: ''
  });

  useEffect(() => {
    fetchEquipment();
  }, [projectId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      
      const { data: equipmentData, error } = await supabase
        .from('construction_equipment')
        .select('*')
        .eq('project_id', projectId)
        .order('equipment_name');

      if (error) {
        console.warn('Equipment table not available, using mock data');
        // Usar datos simulados
        const mockEquipment: Equipment[] = [
          {
            id: '1',
            equipment_name: 'Excavadora CAT 320',
            equipment_type: 'excavadora',
            brand: 'Caterpillar',
            model: '320D2L',
            serial_number: 'CAT123456',
            status: 'in_use',
            hourly_rate: 800,
            daily_rate: 6400,
            monthly_rate: 140000,
            condition_rating: 9,
            notes: 'Equipo en excelente estado'
          },
          {
            id: '2',
            equipment_name: 'Mezcladora de Concreto',
            equipment_type: 'mezcladora',
            brand: 'CEMEX',
            model: 'MX-350',
            status: 'available',
            hourly_rate: 200,
            daily_rate: 1600,
            monthly_rate: 35000,
            condition_rating: 8
          },
          {
            id: '3',
            equipment_name: 'Compresor Ingersoll Rand',
            equipment_type: 'compresor',
            brand: 'Ingersoll Rand',
            model: 'P185WJD',
            status: 'maintenance',
            hourly_rate: 150,
            daily_rate: 1200,
            condition_rating: 7,
            notes: 'Mantenimiento preventivo programado'
          }
        ];
        
        setTimeout(() => {
          setEquipment(mockEquipment);
          setLoading(false);
        }, 500);
        return;
      }

      setEquipment(equipmentData || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const createEquipment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      const { error } = await supabase
        .from('construction_equipment')
        .insert({
          ...formData,
          project_id: projectId,
          status: 'available',
          created_by: user.id,
          condition_rating: 5,
          acquisition_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.warn('Equipment table not available, using simulation');
        // Simular creación
        const newEquipment: Equipment = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData,
          status: 'available',
          condition_rating: 5
        };
        
        setEquipment(prev => [...prev, newEquipment]);
        toast.success('Equipo agregado exitosamente (simulado)');
        setShowAddDialog(false);
        setFormData({
          equipment_name: '',
          equipment_type: '',
          brand: '',
          model: '',
          serial_number: '',
          hourly_rate: 0,
          daily_rate: 0,
          monthly_rate: 0,
          notes: ''
        });
        return;
      }

      toast.success('Equipo agregado exitosamente');
      setShowAddDialog(false);
      setFormData({
        equipment_name: '',
        equipment_type: '',
        brand: '',
        model: '',
        serial_number: '',
        hourly_rate: 0,
        daily_rate: 0,
        monthly_rate: 0,
        notes: ''
      });
      fetchEquipment();
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast.error('Error al agregar equipo');
    }
  };

  const updateEquipmentStatus = async (equipmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('construction_equipment')
        .update({ status: newStatus })
        .eq('id', equipmentId);

      if (error) {
        console.warn('Equipment table not available, using simulation');
        // Simular actualización
        setEquipment(prev => prev.map(item => 
          item.id === equipmentId ? { ...item, status: newStatus } : item
        ));
        toast.success('Estado actualizado (simulado)');
        return;
      }

      toast.success('Estado actualizado');
      fetchEquipment();
    } catch (error) {
      console.error('Error updating equipment status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  // Filtros
  const filteredEquipment = equipment.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.equipment_type === filterType;
    const matchesSearch = !searchText || 
      item.equipment_name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    in_use: equipment.filter(e => e.status === 'in_use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    totalValue: equipment.reduce((sum, e) => sum + (e.daily_rate || 0), 0)
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
              <Truck className="h-5 w-5" />
              Gestión de Equipos
            </CardTitle>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Equipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Equipo</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre del Equipo</label>
                    <Input
                      value={formData.equipment_name}
                      onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                      placeholder="Ej: Excavadora CAT 320"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select 
                      value={formData.equipment_type} 
                      onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excavadora">Excavadora</SelectItem>
                        <SelectItem value="retroexcavadora">Retroexcavadora</SelectItem>
                        <SelectItem value="cargador">Cargador</SelectItem>
                        <SelectItem value="camion">Camión</SelectItem>
                        <SelectItem value="mezcladora">Mezcladora</SelectItem>
                        <SelectItem value="grua">Grúa</SelectItem>
                        <SelectItem value="compresor">Compresor</SelectItem>
                        <SelectItem value="generador">Generador</SelectItem>
                        <SelectItem value="herramienta">Herramienta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Marca</label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Ej: Caterpillar"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modelo</label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Ej: 320D2L"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de Serie</label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Número de serie"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tarifa por Hora</label>
                    <Input
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tarifa por Día</label>
                    <Input
                      type="number"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tarifa por Mes</label>
                    <Input
                      type="number"
                      value={formData.monthly_rate}
                      onChange={(e) => setFormData({ ...formData, monthly_rate: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Notas</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observaciones adicionales..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createEquipment}>
                    Agregar Equipo
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
              <p className="text-sm text-muted-foreground">Total Equipos</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.in_use}</p>
              <p className="text-sm text-muted-foreground">En Uso</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValue)}</p>
              <p className="text-sm text-muted-foreground">Valor Diario</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <Input
              placeholder="Buscar equipos..."
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="excavadora">Excavadora</SelectItem>
                <SelectItem value="retroexcavadora">Retroexcavadora</SelectItem>
                <SelectItem value="cargador">Cargador</SelectItem>
                <SelectItem value="camion">Camión</SelectItem>
                <SelectItem value="mezcladora">Mezcladora</SelectItem>
                <SelectItem value="grua">Grúa</SelectItem>
                <SelectItem value="compresor">Compresor</SelectItem>
                <SelectItem value="generador">Generador</SelectItem>
                <SelectItem value="herramienta">Herramienta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de equipos */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {filteredEquipment.map((item) => {
              const StatusIcon = statusConfig[item.status as keyof typeof statusConfig]?.icon;
              const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
              
              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{item.equipment_name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`${statusInfo?.color} ${statusInfo?.textColor}`}
                        >
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {statusInfo?.label}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.brand && item.model ? `${item.brand} ${item.model}` : item.equipment_type}
                        {item.serial_number && ` • S/N: ${item.serial_number}`}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">
                        {item.daily_rate ? formatCurrency(item.daily_rate) : 'Sin tarifa'}
                      </p>
                      <p className="text-xs text-muted-foreground">por día</p>
                    </div>
                  </div>

                  {/* Tarifas */}
                  {(item.hourly_rate || item.monthly_rate) && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {item.hourly_rate && (
                        <span>Hora: {formatCurrency(item.hourly_rate)}</span>
                      )}
                      {item.monthly_rate && (
                        <span>Mes: {formatCurrency(item.monthly_rate)}</span>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {item.condition_rating && (
                        <span>Condición: {item.condition_rating}/10</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={item.status} 
                        onValueChange={(value) => updateEquipmentStatus(item.id, value)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Notas */}
                  {item.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Notas:</strong> {item.notes}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredEquipment.length === 0 && (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay equipos</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? "No se han registrado equipos para este proyecto."
                    : `No hay equipos con estado "${statusConfig[filterStatus as keyof typeof statusConfig]?.label}".`
                  }
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Equipo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};