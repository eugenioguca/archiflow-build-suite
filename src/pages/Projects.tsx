import { useState, useEffect } from 'react';
import { 
  Plus, Search, Building2, Calendar, DollarSign, MoreHorizontal, Edit, Trash2, 
  Users, Settings, Eye, TrendingUp, AlertCircle, CheckCircle2, Clock, 
  FileText, Camera, BarChart3, Target, MapPin, Phone, Mail, Save, X, Upload, UserPlus, UserMinus,
  Palette, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CustomizableTable } from '@/components/CustomizableTable';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { EditableField } from '@/components/EditableField';
import { ResponsiveTableWrapper } from '@/components/ui/responsive-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'design' | 'permits' | 'construction' | 'completed' | 'cancelled';
  budget: number | null;
  total_cost: number | null;
  start_date: string | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  progress_percentage: number;
  project_type: string | null;
  location: string | null;
  phases: ProjectPhase[];
  team_members: TeamMember[];
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  created_at: string;
  custom_fields: Record<string, any>;
}

interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progress_percentage: number;
  start_date: string | null;
  end_date: string | null;
  estimated_duration_days: number;
  budget_allocated: number | null;
  actual_cost: number | null;
  dependencies: string[];
  assigned_team: string[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar_url: string | null;
}

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

const statusLabels = {
  planning: 'Planeación',
  design: 'Diseño',
  permits: 'Permisos',
  construction: 'Construcción',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const statusColors = {
  planning: 'bg-blue-100 text-blue-800 border-blue-200',
  design: 'bg-purple-100 text-purple-800 border-purple-200',
  permits: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  construction: 'bg-orange-100 text-orange-800 border-orange-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const phaseStatusLabels = {
  not_started: 'No iniciado',
  in_progress: 'En progreso',
  completed: 'Completado',
  on_hold: 'En pausa'
};

const phaseStatusColors = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-600',
  completed: 'bg-green-100 text-green-600',
  on_hold: 'bg-red-100 text-red-600'
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'timeline'>('cards');
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Columnas predefinidas para la tabla personalizable
  const [customColumns, setCustomColumns] = useState<any[]>([
    { id: 'name', header: 'Nombre del Proyecto', type: 'text', editable: true, sortable: true },
    { id: 'client_name', header: 'Cliente', type: 'text', editable: false, sortable: true },
    { id: 'status', header: 'Estado', type: 'select', options: Object.keys(statusLabels), editable: true, sortable: true },
    { id: 'progress_percentage', header: 'Progreso (%)', type: 'number', editable: true, sortable: true },
    { id: 'budget', header: 'Presupuesto', type: 'currency', editable: true, sortable: true },
    { id: 'start_date', header: 'Fecha Inicio', type: 'date', editable: true, sortable: true },
    { id: 'estimated_completion', header: 'Fecha Estimada', type: 'date', editable: true, sortable: true },
    { id: 'location', header: 'Ubicación', type: 'text', editable: true, sortable: true },
  ]);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enriquecer datos con información mock para demostración
      const enrichedProjects = data?.map(project => ({
        ...project,
        phases: generateMockPhases(project.status),
        team_members: generateMockTeamMembers(),
        custom_fields: (project.custom_fields && typeof project.custom_fields === 'object' && !Array.isArray(project.custom_fields)) 
          ? project.custom_fields as Record<string, any> 
          : {}
      })) || [];

      setProjects(enrichedProjects);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      console.log('Fetching clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .order('full_name');

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      
      console.log('Clients loaded:', data?.length || 0);
      setClients(data || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  };

  // Generar fases mock basadas en el estado del proyecto
  const generateMockPhases = (status: string): ProjectPhase[] => {
    const basePhases = [
      { name: 'Diseño Inicial', description: 'Elaboración de planos y especificaciones' },
      { name: 'Permisos y Licencias', description: 'Tramitación de permisos municipales' },
      { name: 'Preparación del Sitio', description: 'Limpieza y preparación del terreno' },
      { name: 'Cimentación', description: 'Excavación y construcción de cimientos' },
      { name: 'Estructura', description: 'Construcción de la estructura principal' },
      { name: 'Instalaciones', description: 'Sistemas eléctricos, hidráulicos y sanitarios' },
      { name: 'Acabados', description: 'Acabados interiores y exteriores' },
      { name: 'Entrega Final', description: 'Inspección final y entrega del proyecto' }
    ];

    return basePhases.map((phase, index) => ({
      id: `phase-${index}`,
      name: phase.name,
      description: phase.description,
      status: getPhaseStatus(index, status),
      progress_percentage: getPhaseProgress(index, status),
      start_date: null,
      end_date: null,
      estimated_duration_days: Math.floor(Math.random() * 30) + 15,
      budget_allocated: Math.floor(Math.random() * 500000) + 100000,
      actual_cost: null,
      dependencies: index > 0 ? [`phase-${index - 1}`] : [],
      assigned_team: []
    }));
  };

  const getPhaseStatus = (phaseIndex: number, projectStatus: string) => {
    const statusOrder = ['planning', 'design', 'permits', 'construction', 'completed'];
    const currentStatusIndex = statusOrder.indexOf(projectStatus);
    
    if (phaseIndex < currentStatusIndex) return 'completed';
    if (phaseIndex === currentStatusIndex) return 'in_progress';
    return 'not_started';
  };

  const getPhaseProgress = (phaseIndex: number, projectStatus: string) => {
    const status = getPhaseStatus(phaseIndex, projectStatus);
    if (status === 'completed') return 100;
    if (status === 'in_progress') return Math.floor(Math.random() * 80) + 20;
    return 0;
  };

  // Generar miembros del equipo mock
  const generateMockTeamMembers = (): TeamMember[] => {
    const mockMembers = [
      { name: 'Ing. Carlos Méndez', role: 'Director de Proyecto', email: 'carlos@empresa.com', phone: '+52 55 1234 5678' },
      { name: 'Arq. Ana Rodríguez', role: 'Arquitecta', email: 'ana@empresa.com', phone: '+52 55 2345 6789' },
      { name: 'Ing. Roberto Silva', role: 'Ingeniero Estructural', email: 'roberto@empresa.com', phone: '+52 55 3456 7890' },
      { name: 'Maestro Juan López', role: 'Maestro de Obra', email: 'juan@empresa.com', phone: '+52 55 4567 8901' }
    ];

    return mockMembers.slice(0, Math.floor(Math.random() * 3) + 2).map((member, index) => ({
      id: `member-${index}`,
      ...member,
      avatar_url: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      client_id: formData.get('client_id') as string,
      status: formData.get('status') as Project['status'],
      project_type: formData.get('project_type') as string,
      budget: formData.get('budget') ? parseFloat(formData.get('budget') as string) : null,
      total_cost: formData.get('total_cost') ? parseFloat(formData.get('total_cost') as string) : null,
      start_date: formData.get('start_date') as string || null,
      estimated_completion: formData.get('estimated_completion') as string || null,
      progress_percentage: parseInt(formData.get('progress_percentage') as string) || 0,
      location: formData.get('location') as string || null,
    };

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);
        
        if (error) throw error;
        
        toast({
          title: "Proyecto actualizado",
          description: "Los datos del proyecto se actualizaron correctamente",
        });
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([projectData]);
        
        if (error) throw error;
        
        toast({
          title: "Proyecto creado",
          description: "El nuevo proyecto se creó correctamente",
        });
      }
      
      setIsDialogOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el proyecto",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Proyecto eliminado",
        description: "El proyecto se eliminó correctamente",
      });
      
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setIsDialogOpen(false);
  };

  const handleSaveProjectDetail = async (field: string, value: string | number) => {
    if (!selectedProject) return;

    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', selectedProject.id);

      if (error) throw error;

      // Actualizar el proyecto seleccionado
      setSelectedProject({
        ...selectedProject,
        [field]: value
      });

      // Actualizar la lista de proyectos
      setProjects(prev => prev.map(p => 
        p.id === selectedProject.id ? { ...p, [field]: value } : p
      ));

      toast({
        title: "Campo actualizado",
        description: "El cambio se ha guardado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el campo",
        variant: "destructive",
      });
    }
  };

  const handleSavePhase = async (phaseId: string, field: string, value: string | number) => {
    if (!selectedProject) return;

    // Actualizar la fase en el proyecto seleccionado
    const updatedPhases = selectedProject.phases.map(phase =>
      phase.id === phaseId ? { ...phase, [field]: value } : phase
    );

    setSelectedProject({
      ...selectedProject,
      phases: updatedPhases
    });

    // Actualizar en la lista de proyectos
    setProjects(prev => prev.map(p => 
      p.id === selectedProject.id ? { ...p, phases: updatedPhases } : p
    ));

    toast({
      title: "Fase actualizada",
      description: "Los cambios se han guardado exitosamente",
    });
  };

  const handleSaveTeamMember = async (memberData: Partial<TeamMember>) => {
    if (!selectedProject) return;

    let updatedTeam;
    if (editingTeamMember) {
      // Editar miembro existente
      updatedTeam = selectedProject.team_members.map(member =>
        member.id === editingTeamMember.id ? { ...member, ...memberData } : member
      );
    } else {
      // Agregar nuevo miembro
      const newMember: TeamMember = {
        id: `member-${Date.now()}`,
        name: memberData.name || '',
        role: memberData.role || '',
        email: memberData.email || '',
        phone: memberData.phone || '',
        avatar_url: null
      };
      updatedTeam = [...selectedProject.team_members, newMember];
    }

    setSelectedProject({
      ...selectedProject,
      team_members: updatedTeam
    });

    setProjects(prev => prev.map(p => 
      p.id === selectedProject.id ? { ...p, team_members: updatedTeam } : p
    ));

    setIsTeamDialogOpen(false);
    setEditingTeamMember(null);

    toast({
      title: editingTeamMember ? "Miembro actualizado" : "Miembro agregado",
      description: "Los cambios se han guardado exitosamente",
    });
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!selectedProject) return;

    const updatedTeam = selectedProject.team_members.filter(member => member.id !== memberId);

    setSelectedProject({
      ...selectedProject,
      team_members: updatedTeam
    });

    setProjects(prev => prev.map(p => 
      p.id === selectedProject.id ? { ...p, team_members: updatedTeam } : p
    ));

    toast({
      title: "Miembro eliminado",
      description: "El miembro del equipo ha sido eliminado",
    });
  };

  const handleAddDocument = () => {
    setIsDocumentDialogOpen(true);
  };

  const handleAddPhoto = () => {
    setIsPhotoDialogOpen(true);
  };

  const handleFileUpload = (type: 'document' | 'photo') => {
    // Simular subida de archivo
    toast({
      title: type === 'document' ? "Documento subido" : "Foto subida",
      description: `El ${type === 'document' ? 'documento' : 'foto'} se ha subido exitosamente`,
    });
    
    if (type === 'document') {
      setIsDocumentDialogOpen(false);
    } else {
      setIsPhotoDialogOpen(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesType = typeFilter === 'all' || project.project_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getProjectStats = () => {
    return {
      total: projects.length,
      active: projects.filter(p => ['planning', 'design', 'permits', 'construction'].includes(p.status)).length,
      completed: projects.filter(p => p.status === 'completed').length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      avgProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length) : 0
    };
  };

  const convertProjectsToTableData = () => {
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      client_name: project.client.full_name,
      status: project.status,
      progress_percentage: project.progress_percentage,
      budget: project.budget || 0,
      start_date: project.start_date || '',
      estimated_completion: project.estimated_completion || '',
      location: project.location || '',
      description: project.description || '',
    }));
  };

  const handleTableDataChange = async (newData: Record<string, any>[]) => {
    // Implementar sincronización con la base de datos
    try {
      for (const row of newData) {
        if (row.id && projects.find(p => p.id === row.id)) {
          await supabase
            .from('projects')
            .update({
              name: row.name,
              status: row.status,
              progress_percentage: row.progress_percentage,
              budget: row.budget,
              start_date: row.start_date || null,
              estimated_completion: row.estimated_completion || null,
              location: row.location || null,
            })
            .eq('id', row.id);
        }
      }
      
      await fetchProjects();
      toast({
        title: "Datos sincronizados",
        description: "Los cambios se han guardado en la base de datos",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron sincronizar todos los cambios",
        variant: "destructive",
      });
    }
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Proyectos</h1>
            <p className="text-muted-foreground">Sistema integral de administración de proyectos de construcción</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomTable(!showCustomTable)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {showCustomTable ? 'Vista Estándar' : 'Tabla Personalizable'}
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Proyecto
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
                  <DialogDescription>
                    {editingProject ? 'Modifica los datos del proyecto seleccionado' : 'Completa la información para crear un nuevo proyecto'}
                  </DialogDescription>
                </DialogHeader>
                {/* Dialog content will be added here */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="name">Nombre del Proyecto *</Label>
                        <Input
                          id="name"
                          name="name"
                          defaultValue={editingProject?.name || ''}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="client_id">Cliente *</Label>
                        <Select name="client_id" defaultValue={editingProject?.client.id || ''} required>
                          <SelectTrigger className="bg-background border">
                            <SelectValue placeholder={loading ? "Cargando clientes..." : clients.length === 0 ? "No hay clientes disponibles" : "Seleccionar cliente"} />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-[100] backdrop-blur-sm">
                            {clients.length === 0 ? (
                              <SelectItem value="no-clients" disabled>
                                No hay clientes disponibles
                              </SelectItem>
                            ) : (
                              clients.map((client) => (
                                <SelectItem key={client.id} value={client.id} className="hover:bg-accent bg-background">
                                  {client.full_name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {clients.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Debe crear clientes primero en el módulo de Clientes
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Estado</Label>
                        <Select name="status" defaultValue={editingProject?.status || 'planning'}>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {Object.entries(statusLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key} className="hover:bg-accent">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="project_type">Tipo de Proyecto</Label>
                         <Select name="project_type" defaultValue={editingProject?.project_type || ''}>
                           <SelectTrigger className="bg-background">
                             <SelectValue placeholder="Seleccionar tipo" />
                           </SelectTrigger>
                           <SelectContent className="bg-background border z-50">
                             <SelectItem value="construccion" className="hover:bg-accent">Construcción</SelectItem>
                             <SelectItem value="residencial" className="hover:bg-accent">Residencial</SelectItem>
                             <SelectItem value="comercial" className="hover:bg-accent">Comercial</SelectItem>
                             <SelectItem value="industrial" className="hover:bg-accent">Industrial</SelectItem>
                             <SelectItem value="renovacion" className="hover:bg-accent">Renovación</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="budget">Presupuesto</Label>
                        <Input
                          id="budget"
                          name="budget"
                          type="number"
                          step="0.01"
                          defaultValue={editingProject?.budget || ''}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="start_date">Fecha de Inicio</Label>
                        <Input
                          id="start_date"
                          name="start_date"
                          type="date"
                          defaultValue={editingProject?.start_date || ''}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="estimated_completion">Fecha Estimada</Label>
                        <Input
                          id="estimated_completion"
                          name="estimated_completion"
                          type="date"
                          defaultValue={editingProject?.estimated_completion || ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="location">Ubicación</Label>
                        <Input
                          id="location"
                          name="location"
                          defaultValue={editingProject?.location || ''}
                          placeholder="Dirección del proyecto"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="progress_percentage">Progreso (%)</Label>
                        <Input
                          id="progress_percentage"
                          name="progress_percentage"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={editingProject?.progress_percentage || 0}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="total_cost">Costo Actual</Label>
                        <Input
                          id="total_cost"
                          name="total_cost"
                          type="number"
                          step="0.01"
                          defaultValue={editingProject?.total_cost || ''}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingProject?.description || ''}
                        placeholder="Descripción detallada del proyecto"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProject ? 'Actualizar' : 'Crear'} Proyecto
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Proyectos</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completados</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Presupuesto Total</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalBudget)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progreso Promedio</p>
                  <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros mejorados */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cliente o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="all">Todos los tipos</SelectItem>
                             <SelectItem value="construccion">Construcción</SelectItem>
                             <SelectItem value="residencial">Residencial</SelectItem>
                             <SelectItem value="comercial">Comercial</SelectItem>
                             <SelectItem value="industrial">Industrial</SelectItem>
                             <SelectItem value="renovacion">Renovación</SelectItem>
                           </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Tarjetas
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Personalizable */}
      {showCustomTable ? (
        <Card>
          <CardHeader>
            <CardTitle>Tabla Personalizable de Proyectos</CardTitle>
            <CardDescription>
              Personaliza las columnas, agrega filas y edita la información directamente en la tabla
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomizableTable
              data={convertProjectsToTableData()}
              columns={customColumns}
              onDataChange={handleTableDataChange}
              onColumnsChange={setCustomColumns}
              storageKey="projects_advanced_table"
              title="Gestión Avanzada de Proyectos"
              canAddRows={true}
              canDeleteRows={true}
              canCustomizeColumns={true}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista de Tarjetas */}
          {viewMode === 'cards' && (
            <div className="grid gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {project.client.full_name}
                          </span>
                          {project.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {project.location}
                            </span>
                          )}
                          {project.client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {project.client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[project.status]}>
                          {statusLabels[project.status]}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(project)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(project.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {project.description && (
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      )}
                      
                      {/* Progreso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso del Proyecto</span>
                          <span className="font-medium">{project.progress_percentage}%</span>
                        </div>
                        <Progress value={project.progress_percentage} className="h-2" />
                      </div>
                      
                      {/* Información financiera y fechas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Presupuesto</p>
                          <p className="font-medium">{formatCurrency(project.budget)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Inicio</p>
                          <p className="font-medium">{formatDate(project.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Entrega Estimada</p>
                          <p className="font-medium">{formatDate(project.estimated_completion)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Equipo</p>
                          <div className="flex -space-x-2">
                            {project.team_members.slice(0, 3).map((member, index) => (
                              <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {project.team_members.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                +{project.team_members.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Fases rápidas */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Fases del Proyecto</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {project.phases.slice(0, 4).map((phase, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-center gap-1">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  phase.status === 'completed' ? 'bg-green-500' :
                                  phase.status === 'in_progress' ? 'bg-blue-500' :
                                  phase.status === 'on_hold' ? 'bg-red-500' : 'bg-gray-300'
                                )}></div>
                                <span className="truncate">{phase.name}</span>
                              </div>
                              <div className="text-muted-foreground">{phase.progress_percentage}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Acciones rápidas */}
                      <div className="flex gap-2 pt-2 border-t">
                        {(project.status === 'design' || project.status === 'planning') && (
                          <Link to={`/design/${project.id}`}>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Palette className="h-4 w-4 mr-2" />
                              Módulo de Diseño
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setSelectedProject(project)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vista de Tabla Responsiva */}
          {viewMode === 'table' && (
            <Card>
              <CardContent className="p-0">
                <ResponsiveTableWrapper minWidth="800px">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Proyecto</TableHead>
                        <TableHead className="min-w-[120px]">Cliente</TableHead>
                        <TableHead className="min-w-[100px]">Estado</TableHead>
                        <TableHead className="min-w-[100px]">Progreso</TableHead>
                        <TableHead className="min-w-[120px]">Presupuesto</TableHead>
                        <TableHead className="min-w-[150px]">Fechas</TableHead>
                        <TableHead className="min-w-[80px]">Equipo</TableHead>
                        <TableHead className="min-w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{project.name}</p>
                              <p className="text-xs text-muted-foreground">{project.project_type}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{project.client.full_name}</p>
                              {project.location && (
                                <p className="text-xs text-muted-foreground truncate max-w-[100px]">{project.location}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[project.status]} text-xs`}>
                              {statusLabels[project.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-xs font-medium">
                                {project.progress_percentage}%
                              </div>
                              <Progress value={project.progress_percentage} className="h-1.5 w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatCurrency(project.budget)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <p>Inicio: {formatDate(project.start_date)}</p>
                              <p>Estimada: {formatDate(project.estimated_completion)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex -space-x-1">
                              {project.team_members.slice(0, 2).map((member, index) => (
                                <Avatar key={index} className="h-5 w-5 border border-background">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {project.team_members.length > 2 && (
                                <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-xs">
                                  +{project.team_members.length - 2}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(project)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(project.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTableWrapper>
              </CardContent>
            </Card>
          )}
        </>
      )}


      {/* Diálogo de detalles del proyecto */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-4xl xl:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Detalles del Proyecto: {selectedProject?.name}</DialogTitle>
                <DialogDescription>
                  Información completa y seguimiento del proyecto
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsEditingDetails(!isEditingDetails)}
              >
                {isEditingDetails ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="phases">Fases</TabsTrigger>
                  <TabsTrigger value="team">Equipo</TabsTrigger>
                  <TabsTrigger value="documents">Documentos</TabsTrigger>
                  <TabsTrigger value="progress">Progreso</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información General</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente</p>
                          <p className="font-medium">{selectedProject.client.full_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo de Proyecto</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.project_type || ''}
                              onSave={(value) => handleSaveProjectDetail('project_type', value)}
                               type="select"
                               options={[
                                 { value: 'construccion', label: 'Construcción' },
                                 { value: 'residencial', label: 'Residencial' },
                                 { value: 'comercial', label: 'Comercial' },
                                 { value: 'industrial', label: 'Industrial' },
                                 { value: 'renovacion', label: 'Renovación' }
                               ]}
                            />
                          ) : (
                            <p className="font-medium">{selectedProject.project_type || 'No especificado'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estado</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.status}
                              onSave={(value) => handleSaveProjectDetail('status', value)}
                              type="select"
                              options={Object.entries(statusLabels).map(([key, label]) => ({
                                value: key,
                                label: label
                              }))}
                            />
                          ) : (
                            <Badge className={statusColors[selectedProject.status]}>
                              {statusLabels[selectedProject.status]}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ubicación</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.location || ''}
                              onSave={(value) => handleSaveProjectDetail('location', value)}
                              type="text"
                            />
                          ) : (
                            <p className="font-medium">{selectedProject.location || 'No especificada'}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información Financiera</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Presupuesto</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.budget || 0}
                              onSave={(value) => handleSaveProjectDetail('budget', value)}
                              type="number"
                              displayTransform={(val) => formatCurrency(Number(val))}
                            />
                          ) : (
                            <p className="font-medium">{formatCurrency(selectedProject.budget)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Costo Actual</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.total_cost || 0}
                              onSave={(value) => handleSaveProjectDetail('total_cost', value)}
                              type="number"
                              displayTransform={(val) => formatCurrency(Number(val))}
                            />
                          ) : (
                            <p className="font-medium">{formatCurrency(selectedProject.total_cost)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progreso</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              {isEditingDetails ? (
                                <EditableField
                                  value={selectedProject.progress_percentage}
                                  onSave={(value) => handleSaveProjectDetail('progress_percentage', value)}
                                  type="number"
                                  displayTransform={(val) => `${val}%`}
                                />
                              ) : (
                                <span>{selectedProject.progress_percentage}%</span>
                              )}
                            </div>
                            <Progress value={selectedProject.progress_percentage} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cronograma</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.start_date || ''}
                              onSave={(value) => handleSaveProjectDetail('start_date', value)}
                              type="text"
                              displayTransform={(val) => formatDate(val as string)}
                            />
                          ) : (
                            <p className="font-medium">{formatDate(selectedProject.start_date)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Estimada</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.estimated_completion || ''}
                              onSave={(value) => handleSaveProjectDetail('estimated_completion', value)}
                              type="text"
                              displayTransform={(val) => formatDate(val as string)}
                            />
                          ) : (
                            <p className="font-medium">{formatDate(selectedProject.estimated_completion)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Real</p>
                          {isEditingDetails ? (
                            <EditableField
                              value={selectedProject.actual_completion || ''}
                              onSave={(value) => handleSaveProjectDetail('actual_completion', value)}
                              type="text"
                              displayTransform={(val) => formatDate(val as string)}
                            />
                          ) : (
                            <p className="font-medium">{formatDate(selectedProject.actual_completion)}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="phases" className="space-y-4">
                  <div className="space-y-4">
                    {selectedProject.phases.map((phase, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                {editingPhase === phase.id ? (
                                  <EditableField
                                    value={phase.name}
                                    onSave={(value) => handleSavePhase(phase.id, 'name', value)}
                                    type="text"
                                  />
                                ) : (
                                  <h4 className="font-medium">{phase.name}</h4>
                                )}
                                
                                {editingPhase === phase.id ? (
                                  <EditableField
                                    value={phase.status}
                                    onSave={(value) => handleSavePhase(phase.id, 'status', value)}
                                    type="select"
                                    options={Object.entries(phaseStatusLabels).map(([key, label]) => ({
                                      value: key,
                                      label: label
                                    }))}
                                  />
                                ) : (
                                  <Badge className={phaseStatusColors[phase.status]}>
                                    {phaseStatusLabels[phase.status]}
                                  </Badge>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingPhase(editingPhase === phase.id ? null : phase.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {editingPhase === phase.id ? (
                                <EditableField
                                  value={phase.description}
                                  onSave={(value) => handleSavePhase(phase.id, 'description', value)}
                                  type="text"
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{phase.description}</p>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Duración estimada</p>
                                  {editingPhase === phase.id ? (
                                    <EditableField
                                      value={phase.estimated_duration_days}
                                      onSave={(value) => handleSavePhase(phase.id, 'estimated_duration_days', value)}
                                      type="number"
                                      displayTransform={(val) => `${val} días`}
                                    />
                                  ) : (
                                    <p className="font-medium">{phase.estimated_duration_days} días</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Presupuesto asignado</p>
                                  {editingPhase === phase.id ? (
                                    <EditableField
                                      value={phase.budget_allocated || 0}
                                      onSave={(value) => handleSavePhase(phase.id, 'budget_allocated', value)}
                                      type="number"
                                      displayTransform={(val) => formatCurrency(Number(val))}
                                    />
                                  ) : (
                                    <p className="font-medium">{formatCurrency(phase.budget_allocated)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right space-y-1 ml-4">
                              {editingPhase === phase.id ? (
                                <EditableField
                                  value={phase.progress_percentage}
                                  onSave={(value) => handleSavePhase(phase.id, 'progress_percentage', value)}
                                  type="number"
                                  displayTransform={(val) => `${val}%`}
                                />
                              ) : (
                                <p className="text-sm font-medium">{phase.progress_percentage}%</p>
                              )}
                              <Progress value={phase.progress_percentage} className="h-2 w-24" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="team" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Equipo del Proyecto</h3>
                    <Button onClick={() => {
                      setEditingTeamMember(null);
                      setIsTeamDialogOpen(true);
                    }}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Agregar Miembro
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProject.team_members.map((member, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback>
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.role}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {member.email}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {member.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTeamMember(member);
                                  setIsTeamDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveTeamMember(member.id)}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="documents" className="space-y-4">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Los documentos del proyecto se mostrarán aquí</p>
                    <Button className="mt-4" onClick={handleAddDocument}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Documento
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="progress" className="space-y-4">
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Las fotos de progreso se mostrarán aquí</p>
                    <Button className="mt-4" onClick={handleAddPhoto}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Foto
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
        </Dialog>
      )}

      {/* Diálogo para agregar/editar miembro del equipo */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeamMember ? 'Editar Miembro del Equipo' : 'Agregar Miembro del Equipo'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveTeamMember({
              name: formData.get('name') as string,
              role: formData.get('role') as string,
              email: formData.get('email') as string,
              phone: formData.get('phone') as string,
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTeamMember?.name || ''}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Cargo/Rol *</Label>
                <Input
                  id="role"
                  name="role"
                  defaultValue={editingTeamMember?.role || ''}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingTeamMember?.email || ''}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editingTeamMember?.phone || ''}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingTeamMember ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para subir documentos */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Documento</DialogTitle>
            <DialogDescription>
              Sube un documento relacionado con el proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-file">Seleccionar archivo</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="document-name">Nombre del documento</Label>
              <Input
                id="document-name"
                placeholder="Ej: Planos arquitectónicos"
              />
            </div>
            
            <div>
              <Label htmlFor="document-category">Categoría</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planos">Planos</SelectItem>
                  <SelectItem value="permisos">Permisos</SelectItem>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="facturas">Facturas</SelectItem>
                  <SelectItem value="reportes">Reportes</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleFileUpload('document')}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para subir fotos */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Foto de Progreso</DialogTitle>
            <DialogDescription>
              Sube fotos del progreso del proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo-file">Seleccionar fotos</Label>
              <Input
                id="photo-file"
                type="file"
                accept="image/*"
                multiple
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="photo-description">Descripción</Label>
              <Textarea
                id="photo-description"
                placeholder="Describe lo que muestra la foto..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPhotoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => handleFileUpload('photo')}>
                <Camera className="h-4 w-4 mr-2" />
                Subir Fotos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}