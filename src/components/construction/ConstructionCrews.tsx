import React, { useState, useEffect } from 'react';
import { Users, Plus, Clock, DollarSign, MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

interface Crew {
  id: string;
  crew_name: string;
  specialty: string;
  crew_leader: string;
  crew_leader_phone?: string;
  daily_rate?: number;
  hourly_rate?: number;
  estimated_hours?: number;
  status: string;
  notes?: string;
  member_count?: number;
  current_task?: string;
}

interface ConstructionCrewsProps {
  projectId: string;
  clientId: string;
}

const specialtyConfig = {
  albañileria: { label: 'Albañilería', color: 'bg-orange-500' },
  electricidad: { label: 'Electricidad', color: 'bg-yellow-500' },
  plomeria: { label: 'Plomería', color: 'bg-blue-500' },
  pintura: { label: 'Pintura', color: 'bg-purple-500' },
  carpinteria: { label: 'Carpintería', color: 'bg-amber-600' },
  soldadura: { label: 'Soldadura', color: 'bg-red-500' },
  excavacion: { label: 'Excavación', color: 'bg-stone-600' },
  acabados: { label: 'Acabados', color: 'bg-green-500' },
  general: { label: 'General', color: 'bg-slate-500' },
};

const statusConfig = {
  available: { label: 'Disponible', color: 'bg-green-500', textColor: 'text-white' },
  working: { label: 'Trabajando', color: 'bg-blue-500', textColor: 'text-white' },
  break: { label: 'En descanso', color: 'bg-yellow-500', textColor: 'text-white' },
  off_duty: { label: 'Fuera de servicio', color: 'bg-red-500', textColor: 'text-white' },
};

export const ConstructionCrews: React.FC<ConstructionCrewsProps> = ({
  projectId,
  clientId
}) => {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    crew_name: '',
    specialty: '',
    crew_leader: '',
    crew_leader_phone: '',
    daily_rate: 0,
    hourly_rate: 0,
    member_count: 1,
    estimated_hours: 8,
    notes: ''
  });

  useEffect(() => {
    fetchCrews();
  }, [projectId]);

  const fetchCrews = async () => {
    try {
      setLoading(true);
      
      // Datos simulados por ahora
      const mockCrews: Crew[] = [
        {
          id: '1',
          crew_name: 'Cuadrilla de Albañilería A',
          specialty: 'albañileria',
          crew_leader: 'Juan Pérez',
          crew_leader_phone: '444-123-4567',
          daily_rate: 2500,
          hourly_rate: 350,
          estimated_hours: 8,
          status: 'working',
          member_count: 4,
          current_task: 'Construcción de muros planta baja',
          notes: 'Cuadrilla especializada en muros de block'
        },
        {
          id: '2',
          crew_name: 'Equipo Eléctrico Principal',
          specialty: 'electricidad',
          crew_leader: 'Carlos López',
          crew_leader_phone: '444-987-6543',
          daily_rate: 3000,
          hourly_rate: 400,
          estimated_hours: 8,
          status: 'available',
          member_count: 3,
          notes: 'Especialistas en instalaciones residenciales'
        },
        {
          id: '3',
          crew_name: 'Cuadrilla de Plomería',
          specialty: 'plomeria',
          crew_leader: 'Miguel Rodríguez',
          crew_leader_phone: '444-555-7890',
          daily_rate: 2200,
          hourly_rate: 300,
          estimated_hours: 8,
          status: 'working',
          member_count: 2,
          current_task: 'Instalación de tuberías sanitarias'
        }
      ];

      setTimeout(() => {
        setCrews(mockCrews);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching crews:', error);
      toast.error('Error al cargar las cuadrillas');
      setLoading(false);
    }
  };

  const createCrew = async () => {
    try {
      // Simular creación
      const newCrew: Crew = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        status: 'available'
      };

      setCrews(prev => [...prev, newCrew]);
      toast.success('Cuadrilla agregada exitosamente (simulado)');
      setShowAddDialog(false);
      setFormData({
        crew_name: '',
        specialty: '',
        crew_leader: '',
        crew_leader_phone: '',
        daily_rate: 0,
        hourly_rate: 0,
        member_count: 1,
        estimated_hours: 8,
        notes: ''
      });
    } catch (error) {
      console.error('Error creating crew:', error);
      toast.error('Error al agregar cuadrilla');
    }
  };

  const updateCrewStatus = async (crewId: string, newStatus: string) => {
    try {
      setCrews(prev => prev.map(crew => 
        crew.id === crewId ? { ...crew, status: newStatus } : crew
      ));
      toast.success('Estado actualizado (simulado)');
    } catch (error) {
      console.error('Error updating crew status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  // Filtros
  const filteredCrews = crews.filter(crew => {
    const matchesStatus = filterStatus === 'all' || crew.status === filterStatus;
    const matchesSpecialty = filterSpecialty === 'all' || crew.specialty === filterSpecialty;
    const matchesSearch = !searchText || 
      crew.crew_name.toLowerCase().includes(searchText.toLowerCase()) ||
      crew.crew_leader.toLowerCase().includes(searchText.toLowerCase()) ||
      crew.specialty.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesStatus && matchesSpecialty && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: crews.length,
    working: crews.filter(c => c.status === 'working').length,
    available: crews.filter(c => c.status === 'available').length,
    totalMembers: crews.reduce((sum, c) => sum + (c.member_count || 0), 0),
    totalDailyCost: crews.filter(c => c.status === 'working').reduce((sum, c) => sum + (c.daily_rate || 0), 0)
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
              <Users className="h-5 w-5" />
              Gestión de Cuadrillas
            </CardTitle>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cuadrilla
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Cuadrilla</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre de la Cuadrilla</label>
                    <Input
                      value={formData.crew_name}
                      onChange={(e) => setFormData({ ...formData, crew_name: e.target.value })}
                      placeholder="Ej: Cuadrilla de Albañilería A"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Especialidad</label>
                    <Select 
                      value={formData.specialty} 
                      onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar especialidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(specialtyConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Jefe de Cuadrilla</label>
                    <Input
                      value={formData.crew_leader}
                      onChange={(e) => setFormData({ ...formData, crew_leader: e.target.value })}
                      placeholder="Nombre del jefe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      value={formData.crew_leader_phone}
                      onChange={(e) => setFormData({ ...formData, crew_leader_phone: e.target.value })}
                      placeholder="Número de teléfono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de Integrantes</label>
                    <Input
                      type="number"
                      value={formData.member_count}
                      onChange={(e) => setFormData({ ...formData, member_count: Number(e.target.value) })}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Horas Estimadas por Día</label>
                    <Input
                      type="number"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: Number(e.target.value) })}
                      placeholder="8"
                      min="1"
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
                  <Button onClick={createCrew}>
                    Crear Cuadrilla
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
              <p className="text-sm text-muted-foreground">Total Cuadrillas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.working}</p>
              <p className="text-sm text-muted-foreground">Trabajando</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
              <p className="text-sm text-muted-foreground">Disponibles</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalMembers}</p>
              <p className="text-sm text-muted-foreground">Total Personas</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalDailyCost)}</p>
              <p className="text-sm text-muted-foreground">Costo Diario</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-4">
            <Input
              placeholder="Buscar cuadrillas..."
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
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las especialidades</SelectItem>
                {Object.entries(specialtyConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de cuadrillas */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {filteredCrews.map((crew) => {
              const statusInfo = statusConfig[crew.status as keyof typeof statusConfig];
              const specialtyInfo = specialtyConfig[crew.specialty as keyof typeof specialtyConfig];
              
              return (
                <div key={crew.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{crew.crew_name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`${specialtyInfo?.color} text-white`}
                        >
                          {specialtyInfo?.label}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`${statusInfo?.color} ${statusInfo?.textColor}`}
                        >
                          {statusInfo?.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Jefe: {crew.crew_leader}
                        </span>
                        {crew.crew_leader_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {crew.crew_leader_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {crew.member_count} personas
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">
                        {crew.daily_rate ? formatCurrency(crew.daily_rate) : 'Sin tarifa'}
                      </p>
                      <p className="text-xs text-muted-foreground">por día</p>
                    </div>
                  </div>

                  {/* Tarifas y horas */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {crew.hourly_rate && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Por hora: {formatCurrency(crew.hourly_rate)}
                      </span>
                    )}
                    {crew.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {crew.estimated_hours} hrs/día
                      </span>
                    )}
                  </div>

                  {/* Tarea actual */}
                  {crew.current_task && (
                    <div className="text-sm bg-blue-50 p-2 rounded">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <strong>Tarea actual:</strong> {crew.current_task}
                      </span>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {crew.notes && (
                        <span>Notas disponibles</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={crew.status} 
                        onValueChange={(value) => updateCrewStatus(crew.id, value)}
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
                      
                      <Button variant="outline" size="sm" disabled>
                        Timesheet
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                  {/* Notas */}
                  {crew.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Notas:</strong> {crew.notes}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCrews.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay cuadrillas</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? "No se han registrado cuadrillas para este proyecto."
                    : `No hay cuadrillas con estado "${statusConfig[filterStatus as keyof typeof statusConfig]?.label}".`
                  }
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Cuadrilla
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};