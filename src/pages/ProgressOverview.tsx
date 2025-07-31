import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MapPin, User, Plus, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2,
  Camera, FileText, BarChart3, Target, Building2, Users, Edit2, Save, X,
  PlayCircle, PauseCircle, RotateCcw, ArrowRight, Activity, Eye, Mail, Phone, Upload
} from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { EditableCell } from "@/components/EditableCell";
import { UserAvatar } from "@/components/UserAvatar";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ProjectOverview {
  id: string;
  name: string;
  description: string;
  location?: string;
  progress_percentage: number;
  status: 'planning' | 'construction' | 'design' | 'permits' | 'completed' | 'cancelled';
  client: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
  };
  assigned_team: TeamMember[];
  phases: ProjectPhase[];
  estimated_dates: EstimatedDate[];
  budget: number | null;
  total_cost: number | null;
  start_date: string | null;
  estimated_completion: string | null;
  created_at: string;
}

interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  value: number; // Peso porcentual en el proyecto total
  color: string;
  status: 'not_started' | 'planning' | 'in_progress' | 'on_hold' | 'completed';
  progress_percentage: number;
  start_date: string | null;
  end_date: string | null;
  estimated_duration_days: number;
  budget_allocated: number | null;
  actual_cost: number | null;
  dependencies: string[];
  assigned_team: string[];
  milestones: Milestone[];
  notes: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatar_url?: string | null;
  email: string;
  phone: string;
  specialization: string;
}

interface EstimatedDate {
  phase: string;
  date: string;
  is_critical: boolean;
  buffer_days: number;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  due_date: string;
  completed: boolean;
  completion_date?: string;
}

const phaseConfig = {
  not_started: { label: "No iniciado", color: "bg-gray-100", textColor: "text-gray-600", bgColor: "bg-gray-500", value: 0 },
  planning: { label: "Planeando", color: "bg-blue-100", textColor: "text-blue-600", bgColor: "bg-blue-500", value: 1 },
  in_progress: { label: "En progreso", color: "bg-yellow-100", textColor: "text-yellow-600", bgColor: "bg-yellow-500", value: 2 },
  on_hold: { label: "En pausa", color: "bg-red-100", textColor: "text-red-600", bgColor: "bg-red-500", value: 3 },
  completed: { label: "Completado", color: "bg-green-100", textColor: "text-green-600", bgColor: "bg-green-500", value: 10 },
};

const statusConfig = {
  planning: { label: "Planeación", color: "bg-blue-100 text-blue-600", icon: FileText },
  design: { label: "Diseño", color: "bg-purple-100 text-purple-600", icon: Edit2 },
  permits: { label: "Permisos", color: "bg-orange-100 text-orange-600", icon: FileText },
  construction: { label: "Construcción", color: "bg-yellow-100 text-yellow-600", icon: Building2 },
  completed: { label: "Completado", color: "bg-green-100 text-green-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-600", icon: X },
};

export default function ProgressOverview() {
  const [activeProjects, setActiveProjects] = useState<ProjectOverview[]>([]);
  const [completedProjects, setCompletedProjects] = useState<ProjectOverview[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOverview | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingProjectInModal, setEditingProjectInModal] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact' | 'timeline'>('detailed');
  const { toast } = useToast();

  // Mock team members data expandido
  const availableTeamMembers: TeamMember[] = [
    { 
      id: '1', 
      name: 'Ing. Carlos Méndez', 
      initials: 'CM', 
      role: 'Director de Proyecto',
      avatar_url: null,
      email: 'carlos.mendez@empresa.com',
      phone: '+52 55 1234 5678',
      specialization: 'Gestión de Proyectos'
    },
    { 
      id: '2', 
      name: 'Arq. Ana Rodríguez', 
      initials: 'AR', 
      role: 'Arquitecta Senior',
      avatar_url: null,
      email: 'ana.rodriguez@empresa.com',
      phone: '+52 55 2345 6789',
      specialization: 'Diseño Arquitectónico'
    },
    { 
      id: '3', 
      name: 'Ing. Roberto Silva', 
      initials: 'RS', 
      role: 'Ingeniero Estructural',
      avatar_url: null,
      email: 'roberto.silva@empresa.com',
      phone: '+52 55 3456 7890',
      specialization: 'Estructuras'
    },
    { 
      id: '4', 
      name: 'Maestro Juan López', 
      initials: 'JL', 
      role: 'Maestro de Obra',
      avatar_url: null,
      email: 'juan.lopez@empresa.com',
      phone: '+52 55 4567 8901',
      specialization: 'Construcción'
    },
    { 
      id: '5', 
      name: 'Ing. Laura Martín', 
      initials: 'LM', 
      role: 'Ingeniera Eléctrica',
      avatar_url: null,
      email: 'laura.martin@empresa.com',
      phone: '+52 55 5678 9012',
      specialization: 'Instalaciones Eléctricas'
    },
    { 
      id: '6', 
      name: 'Tec. Pedro Hernández', 
      initials: 'PH', 
      role: 'Supervisor de Calidad',
      avatar_url: null,
      email: 'pedro.hernandez@empresa.com',
      phone: '+52 55 6789 0123',
      specialization: 'Control de Calidad'
    }
  ];

  useEffect(() => {
    fetchProjectsFromSupabase();
  }, []);

  const fetchProjectsFromSupabase = async () => {
    try {
      setLoading(true);
      
      // Obtener proyectos reales de Supabase
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convertir y enriquecer los datos de Supabase
      const enrichedProjects = projectsData?.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        location: project.location || '',
        progress_percentage: project.progress_percentage || 0,
        status: project.status,
        budget: project.budget,
        total_cost: project.total_cost,
        start_date: project.start_date,
        estimated_completion: project.estimated_completion,
        created_at: project.created_at,
        client: project.client || { id: '', full_name: 'Cliente no encontrado' },
        assigned_team: generateTeamForProject(project.id),
        phases: generatePhasesForProject(project.id, project.status, project.progress_percentage),
        estimated_dates: generateEstimatedDates(project.start_date, project.estimated_completion)
      })) || [];

      // Separar proyectos activos y completados
      setActiveProjects(enrichedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled'));
      setCompletedProjects(enrichedProjects.filter(p => p.status === 'completed' || p.status === 'cancelled'));

    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos desde la base de datos",
        variant: "destructive",
      });
      
      // Fallback a datos locales si falla la conexión
      loadLocalProjects();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalProjects = () => {
    // Datos iniciales mejorados como respaldo
    const initialProjects: ProjectOverview[] = [
      {
        id: "1",
        name: "Casa Moderna Satelite",
        description: "Construcción de casa residencial de 200m² con diseño contemporáneo",
        location: "Av. Constituyentes 123, Naucalpan, Estado de México",
        progress_percentage: 65,
        status: 'construction',
        budget: 2500000,
        total_cost: 1625000,
        start_date: "2024-01-15",
        estimated_completion: "2024-10-15",
        created_at: "2024-01-01",
        client: {
          id: "c1",
          full_name: "Familia Rodríguez",
          email: "rodriguez@email.com",
          phone: "+52 55 1234 5678"
        },
        assigned_team: [
          availableTeamMembers[0], // Carlos Méndez
          availableTeamMembers[1], // Ana Rodríguez  
          availableTeamMembers[3], // Juan López
          availableTeamMembers[4], // Laura Martín
        ],
        phases: [
          {
            id: "p1-1",
            name: "Diseño Arquitectónico",
            description: "Elaboración de planos arquitectónicos y especificaciones técnicas",
            value: 10,
            color: "bg-green-500",
            status: 'completed',
            progress_percentage: 100,
            start_date: "2024-01-15",
            end_date: "2024-02-15",
            estimated_duration_days: 30,
            budget_allocated: 250000,
            actual_cost: 230000,
            dependencies: [],
            assigned_team: ["1", "2"],
            milestones: [
              { id: "m1", name: "Planos aprobados", description: "Aprobación final de planos", due_date: "2024-02-10", completed: true, completion_date: "2024-02-08" }
            ],
            notes: "Diseño completado según especificaciones del cliente"
          },
          {
            id: "p1-2", 
            name: "Permisos y Licencias",
            description: "Tramitación de permisos municipales y licencias de construcción",
            value: 5,
            color: "bg-green-500",
            status: 'completed',
            progress_percentage: 100,
            start_date: "2024-02-16",
            end_date: "2024-03-01",
            estimated_duration_days: 15,
            budget_allocated: 125000,
            actual_cost: 140000,
            dependencies: ["p1-1"],
            assigned_team: ["1"],
            milestones: [
              { id: "m2", name: "Licencia obtenida", description: "Licencia de construcción aprobada", due_date: "2024-02-28", completed: true, completion_date: "2024-02-26" }
            ],
            notes: "Permisos obtenidos sin contratiempos"
          },
          {
            id: "p1-3",
            name: "Preparación del Sitio",
            description: "Limpieza del terreno y preparación para construcción",
            value: 8,
            color: "bg-green-500", 
            status: 'completed',
            progress_percentage: 100,
            start_date: "2024-03-01",
            end_date: "2024-03-10",
            estimated_duration_days: 10,
            budget_allocated: 200000,
            actual_cost: 195000,
            dependencies: ["p1-2"],
            assigned_team: ["3", "4"],
            milestones: [],
            notes: "Sitio preparado correctamente"
          },
          {
            id: "p1-4",
            name: "Cimentación",
            description: "Excavación y construcción de cimientos",
            value: 15,
            color: "bg-green-500",
            status: 'completed',
            progress_percentage: 100,
            start_date: "2024-03-11",
            end_date: "2024-04-10",
            estimated_duration_days: 30,
            budget_allocated: 375000,
            actual_cost: 380000,
            dependencies: ["p1-3"],
            assigned_team: ["3", "4"],
            milestones: [
              { id: "m3", name: "Cimientos terminados", description: "Finalización de trabajos de cimentación", due_date: "2024-04-08", completed: true, completion_date: "2024-04-07" }
            ],
            notes: "Cimentación sólida completada"
          },
          {
            id: "p1-5",
            name: "Estructura Principal", 
            description: "Construcción de la estructura de concreto y acero",
            value: 25,
            color: "bg-yellow-500",
            status: 'in_progress',
            progress_percentage: 75,
            start_date: "2024-04-11",
            end_date: "2024-06-30",
            estimated_duration_days: 80,
            budget_allocated: 625000,
            actual_cost: 470000,
            dependencies: ["p1-4"],
            assigned_team: ["2", "3", "4"],
            milestones: [
              { id: "m4", name: "Estructura al 50%", description: "Mitad de la estructura completada", due_date: "2024-05-20", completed: true, completion_date: "2024-05-18" },
              { id: "m5", name: "Estructura completa", description: "Estructura principal finalizada", due_date: "2024-06-28", completed: false }
            ],
            notes: "Progreso según cronograma, buen clima ha ayudado"
          },
          {
            id: "p1-6",
            name: "Instalaciones",
            description: "Sistemas eléctricos, hidráulicos y sanitarios",
            value: 20,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-07-01",
            end_date: "2024-08-15",
            estimated_duration_days: 45,
            budget_allocated: 500000,
            actual_cost: null,
            dependencies: ["p1-5"],
            assigned_team: ["5"],
            milestones: [
              { id: "m6", name: "Instalaciones eléctricas", description: "Sistema eléctrico completado", due_date: "2024-07-20", completed: false },
              { id: "m7", name: "Instalaciones hidráulicas", description: "Sistema hidráulico completado", due_date: "2024-08-10", completed: false }
            ],
            notes: "Pendiente de iniciar tras completar estructura"
          },
          {
            id: "p1-7",
            name: "Acabados",
            description: "Acabados interiores y exteriores",
            value: 15,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-08-16",
            end_date: "2024-09-30",
            estimated_duration_days: 45,
            budget_allocated: 375000,
            actual_cost: null,
            dependencies: ["p1-6"],
            assigned_team: ["1", "4"],
            milestones: [],
            notes: "Materiales ya seleccionados por el cliente"
          },
          {
            id: "p1-8",
            name: "Entrega Final",
            description: "Inspección final, limpieza y entrega del proyecto",
            value: 2,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-10-01",
            end_date: "2024-10-15",
            estimated_duration_days: 15,
            budget_allocated: 50000,
            actual_cost: null,
            dependencies: ["p1-7"],
            assigned_team: ["1", "6"],
            milestones: [
              { id: "m8", name: "Entrega final", description: "Proyecto entregado al cliente", due_date: "2024-10-15", completed: false }
            ],
            notes: "Incluye garantías y manuales de operación"
          }
        ],
        estimated_dates: [
          { phase: "Diseño Arquitectónico", date: "2024-02-15", is_critical: true, buffer_days: 5 },
          { phase: "Permisos y Licencias", date: "2024-03-01", is_critical: true, buffer_days: 3 },
          { phase: "Preparación del Sitio", date: "2024-03-10", is_critical: false, buffer_days: 2 },
          { phase: "Cimentación", date: "2024-04-10", is_critical: true, buffer_days: 5 },
          { phase: "Estructura Principal", date: "2024-06-30", is_critical: true, buffer_days: 10 },
          { phase: "Instalaciones", date: "2024-08-15", is_critical: true, buffer_days: 7 },
          { phase: "Acabados", date: "2024-09-30", is_critical: false, buffer_days: 10 },
          { phase: "Entrega Final", date: "2024-10-15", is_critical: true, buffer_days: 0 }
        ]
      },
      {
        id: "2",
        name: "Oficinas Corporativas Torre Central",
        description: "Remodelación completa de oficinas corporativas de 500m²",
        location: "Av. Presidente Masaryk 123, Polanco, CDMX",
        progress_percentage: 30,
        status: 'design',
        budget: 3200000,
        total_cost: 960000,
        start_date: "2024-02-01",
        estimated_completion: "2024-09-30",
        created_at: "2024-01-15",
        client: {
          id: "c2",
          full_name: "Corporativo ABC S.A. de C.V.",
          email: "proyectos@corporativoabc.com",
          phone: "+52 55 9876 5432"
        },
        assigned_team: [
          availableTeamMembers[0], // Carlos Méndez
          availableTeamMembers[1], // Ana Rodríguez
          availableTeamMembers[2], // Roberto Silva
          availableTeamMembers[4], // Laura Martín
          availableTeamMembers[5], // Pedro Hernández
        ],
        phases: [
          {
            id: "p2-1",
            name: "Análisis y Diseño",
            description: "Análisis del espacio actual y diseño de la nueva distribución",
            value: 20,
            color: "bg-yellow-500",
            status: 'in_progress',
            progress_percentage: 80,
            start_date: "2024-02-01",
            end_date: "2024-03-15",
            estimated_duration_days: 45,
            budget_allocated: 640000,
            actual_cost: 512000,
            dependencies: [],
            assigned_team: ["1", "2"],
            milestones: [
              { id: "m9", name: "Análisis completado", description: "Análisis del espacio finalizado", due_date: "2024-02-20", completed: true, completion_date: "2024-02-18" },
              { id: "m10", name: "Diseño preliminar", description: "Primera propuesta de diseño", due_date: "2024-03-05", completed: true, completion_date: "2024-03-03" },
              { id: "m11", name: "Diseño final", description: "Diseño final aprobado", due_date: "2024-03-15", completed: false }
            ],
            notes: "Cliente muy involucrado en el proceso de diseño"
          },
          {
            id: "p2-2",
            name: "Permisos y Autorizaciones",
            description: "Tramitación de permisos para remodelación",
            value: 5,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-03-16",
            end_date: "2024-04-01",
            estimated_duration_days: 15,
            budget_allocated: 160000,
            actual_cost: null,
            dependencies: ["p2-1"],
            assigned_team: ["1"],
            milestones: [],
            notes: "Se requieren permisos especiales por ser edificio comercial"
          },
          {
            id: "p2-3", 
            name: "Demolición Selectiva",
            description: "Demolición de elementos no deseados",
            value: 10,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-04-02",
            end_date: "2024-04-15",
            estimated_duration_days: 14,
            budget_allocated: 320000,
            actual_cost: null,
            dependencies: ["p2-2"],
            assigned_team: ["4"],
            milestones: [],
            notes: "Demolición cuidadosa para preservar estructura principal"
          },
          {
            id: "p2-4",
            name: "Construcción y Remodelación",
            description: "Construcción de nuevos elementos y remodelación",
            value: 40,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-04-16",
            end_date: "2024-07-15",
            estimated_duration_days: 90,
            budget_allocated: 1280000,
            actual_cost: null,
            dependencies: ["p2-3"],
            assigned_team: ["2", "3", "4"],
            milestones: [],
            notes: "Fase más extensa del proyecto"
          },
          {
            id: "p2-5",
            name: "Instalaciones Especializadas",
            description: "Sistemas de aire acondicionado, redes y tecnología",
            value: 15,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-07-16",
            end_date: "2024-08-15",
            estimated_duration_days: 30,
            budget_allocated: 480000,
            actual_cost: null,
            dependencies: ["p2-4"],
            assigned_team: ["5"],
            milestones: [],
            notes: "Instalaciones de alta tecnología requeridas"
          },
          {
            id: "p2-6",
            name: "Acabados y Mobiliario",
            description: "Acabados finales e instalación de mobiliario",
            value: 10,
            color: "bg-gray-300",
            status: 'not_started',
            progress_percentage: 0,
            start_date: "2024-08-16",
            end_date: "2024-09-30",
            estimated_duration_days: 45,
            budget_allocated: 320000,
            actual_cost: null,
            dependencies: ["p2-5"],
            assigned_team: ["1", "2"],
            milestones: [],
            notes: "Mobiliario de alta gama según especificaciones del cliente"
          }
        ],
        estimated_dates: [
          { phase: "Análisis y Diseño", date: "2024-03-15", is_critical: true, buffer_days: 7 },
          { phase: "Permisos y Autorizaciones", date: "2024-04-01", is_critical: true, buffer_days: 3 },
          { phase: "Demolición Selectiva", date: "2024-04-15", is_critical: false, buffer_days: 3 },
          { phase: "Construcción y Remodelación", date: "2024-07-15", is_critical: true, buffer_days: 14 },
          { phase: "Instalaciones Especializadas", date: "2024-08-15", is_critical: true, buffer_days: 7 },
          { phase: "Acabados y Mobiliario", date: "2024-09-30", is_critical: false, buffer_days: 14 }
        ]
      }
    ];
    
    setActiveProjects(initialProjects.filter(p => p.status !== 'completed'));
    setCompletedProjects(initialProjects.filter(p => p.status === 'completed'));
  };

  const generateTeamForProject = (projectId: string): TeamMember[] => {
    // Generar equipo basado en el ID del proyecto para consistencia
    const teamSize = Math.floor(Math.random() * 3) + 3; // 3-5 miembros
    const shuffled = [...availableTeamMembers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, teamSize);
  };

  const generatePhasesForProject = (projectId: string, status: string, progressPercentage: number): ProjectPhase[] => {
    const basePhases = [
      { name: 'Diseño Inicial', description: 'Elaboración de planos y especificaciones técnicas', value: 10 },
      { name: 'Permisos y Licencias', description: 'Tramitación de permisos municipales', value: 5 },
      { name: 'Preparación del Sitio', description: 'Limpieza y preparación del terreno', value: 8 },
      { name: 'Cimentación', description: 'Excavación y construcción de cimientos', value: 15 },
      { name: 'Estructura Principal', description: 'Construcción de la estructura principal', value: 25 },
      { name: 'Instalaciones', description: 'Sistemas eléctricos, hidráulicos y sanitarios', value: 20 },
      { name: 'Acabados', description: 'Acabados interiores y exteriores', value: 15 },
      { name: 'Entrega Final', description: 'Inspección final y entrega del proyecto', value: 2 }
    ];

    return basePhases.map((phase, index) => ({
      id: `${projectId}-phase-${index}`,
      name: phase.name,
      description: phase.description,
      value: phase.value,
      color: getPhaseColor(index, status, progressPercentage),
      status: getPhaseStatus(index, status, progressPercentage) as ProjectPhase['status'],
      progress_percentage: getPhaseProgress(index, status, progressPercentage),
      start_date: null,
      end_date: null,
      estimated_duration_days: Math.floor(Math.random() * 30) + 15,
      budget_allocated: Math.floor(Math.random() * 500000) + 100000,
      actual_cost: index < 3 ? Math.floor(Math.random() * 500000) + 100000 : null,
      dependencies: index > 0 ? [`${projectId}-phase-${index - 1}`] : [],
      assigned_team: [],
      milestones: [],
      notes: `Notas para ${phase.name}`
    }));
  };

  const getPhaseColor = (phaseIndex: number, projectStatus: string, progressPercentage: number) => {
    const totalPhases = 8;
    const phaseProgress = (phaseIndex + 1) / totalPhases * 100;
    
    if (phaseProgress <= progressPercentage) return "bg-green-500";
    if (phaseIndex === Math.floor(progressPercentage / (100 / totalPhases))) return "bg-yellow-500";
    return "bg-gray-300";
  };

  const getPhaseStatus = (phaseIndex: number, projectStatus: string, progressPercentage: number): ProjectPhase['status'] => {
    const totalPhases = 8;
    const phaseProgress = (phaseIndex + 1) / totalPhases * 100;
    
    if (phaseProgress <= progressPercentage) return 'completed';
    if (phaseIndex === Math.floor(progressPercentage / (100 / totalPhases))) return 'in_progress';
    return 'not_started';
  };

  const getPhaseProgress = (phaseIndex: number, projectStatus: string, progressPercentage: number) => {
    const totalPhases = 8;
    const phaseProgress = (phaseIndex + 1) / totalPhases * 100;
    
    if (phaseProgress <= progressPercentage) return 100;
    if (phaseIndex === Math.floor(progressPercentage / (100 / totalPhases))) {
      const phaseStart = phaseIndex / totalPhases * 100;
      const phaseEnd = (phaseIndex + 1) / totalPhases * 100;
      return Math.round(((progressPercentage - phaseStart) / (phaseEnd - phaseStart)) * 100);
    }
    return 0;
  };

  const generateEstimatedDates = (startDate: string | null, endDate: string | null): EstimatedDate[] => {
    if (!startDate) return [];
    
    const start = new Date(startDate);
    const phases = ['Diseño Inicial', 'Permisos y Licencias', 'Preparación del Sitio', 'Cimentación', 'Estructura Principal', 'Instalaciones', 'Acabados', 'Entrega Final'];
    
    return phases.map((phase, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + (index + 1) * 30);
      
      return {
        phase,
        date: date.toISOString().split('T')[0],
        is_critical: [0, 1, 3, 4, 5, 7].includes(index), // Fases críticas
        buffer_days: Math.floor(Math.random() * 10) + 2
      };
    });
  };

  const updatePhaseStatus = async (projectId: string, phaseId: string, newStatus: ProjectPhase['status']) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const updatedProjects = allProjects.map(project => {
      if (project.id === projectId) {
        const updatedPhases = project.phases.map(phase => {
          if (phase.id === phaseId) {
            const newProgress = newStatus === 'completed' ? 100 : 
                              newStatus === 'in_progress' ? Math.min(phase.progress_percentage + 25, 99) :
                              newStatus === 'on_hold' ? phase.progress_percentage :
                              0;
            
            return { ...phase, status: newStatus, progress_percentage: newProgress };
          }
          return phase;
        });
        
        const newProjectProgress = calculateTotalProgress(updatedPhases);
        const newProjectStatus = newProjectProgress === 100 ? 'completed' : project.status;
        
        return { ...project, phases: updatedPhases, progress_percentage: newProjectProgress, status: newProjectStatus };
      }
      return project;
    });

    // Actualizar estado local
    setActiveProjects(updatedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled'));
    setCompletedProjects(updatedProjects.filter(p => p.status === 'completed' || p.status === 'cancelled'));
    
    // Sincronizar con Supabase
    try {
      const project = updatedProjects.find(p => p.id === projectId);
      if (project) {
        await supabase
          .from('projects')
          .update({ 
            progress_percentage: project.progress_percentage,
            status: project.status 
          })
          .eq('id', projectId);
      }
    } catch (error) {
      console.error('Error updating project in Supabase:', error);
    }
    
    toast({
      title: "Fase actualizada",
      description: "El progreso del proyecto se ha actualizado correctamente",
    });
  };

  const updatePhaseProgress = async (projectId: string, phaseId: string, newProgress: number) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const updatedProjects = allProjects.map(project => {
      if (project.id === projectId) {
        const updatedPhases = project.phases.map(phase => {
          if (phase.id === phaseId) {
            const newStatus: 'not_started' | 'planning' | 'in_progress' | 'on_hold' | 'completed' = 
              newProgress === 100 ? 'completed' :
              newProgress > 0 ? 'in_progress' : 'not_started';
            return { ...phase, progress_percentage: newProgress, status: newStatus };
          }
          return phase;
        });
        
        const newProjectProgress = calculateTotalProgress(updatedPhases);
        return { ...project, phases: updatedPhases, progress_percentage: newProjectProgress };
      }
      return project;
    });

    setActiveProjects(updatedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled'));
    setCompletedProjects(updatedProjects.filter(p => p.status === 'completed' || p.status === 'cancelled'));
    
    // Sincronizar con Supabase
    try {
      const project = updatedProjects.find(p => p.id === projectId);
      if (project) {
        await supabase
          .from('projects')
          .update({ progress_percentage: project.progress_percentage })
          .eq('id', projectId);
      }
    } catch (error) {
      console.error('Error updating project progress:', error);
    }
  };

  const addNewProject = async (formData: any) => {
    try {
      // Crear proyecto en Supabase
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: formData.name,
          description: formData.description,
          client_id: formData.client_id,
          location: formData.location,
          budget: formData.budget,
          start_date: formData.start_date,
          estimated_completion: formData.estimated_completion,
          status: 'planning',
          progress_percentage: 0
        }])
        .select()
        .single();

      if (error) throw error;

      // Actualizar estado local
      await fetchProjectsFromSupabase();
      
      toast({
        title: "Nuevo proyecto creado",
        description: `Proyecto "${formData.name}" agregado exitosamente`,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive",
      });
    }
  };

  const updateProject = async (projectId: string, updates: Partial<ProjectOverview>) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const updatedProjects = allProjects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    );

    setActiveProjects(updatedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled'));
    setCompletedProjects(updatedProjects.filter(p => p.status === 'completed' || p.status === 'cancelled'));
    
    // Sincronizar con Supabase
    try {
      await supabase
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          location: updates.location,
          progress_percentage: updates.progress_percentage,
          status: updates.status
        })
        .eq('id', projectId);
    } catch (error) {
      console.error('Error updating project:', error);
    }
    
    toast({
      title: "Proyecto actualizado",
      description: "Los cambios se han guardado correctamente",
    });
  };

  const updateEstimatedDate = (projectId: string, phaseIndex: number, newDate: Date) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;

    const updatedDates = [...project.estimated_dates];
    if (updatedDates[phaseIndex]) {
      updatedDates[phaseIndex] = { 
        ...updatedDates[phaseIndex], 
        date: newDate.toISOString().split('T')[0] 
      };
      
      updateProject(projectId, { estimated_dates: updatedDates });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = phaseConfig[status as keyof typeof phaseConfig];
    if (!config) return null;
    
    return (
      <Badge variant="outline" className={`${config.color} ${config.textColor} border-none`}>
        {config.label}
      </Badge>
    );
  };

  const getProjectStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} border-none`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const calculateTotalProgress = (phases: ProjectPhase[]) => {
    const totalValue = phases.reduce((sum, phase) => sum + phase.value, 0);
    const completedValue = phases.reduce((sum, phase) => {
      const phaseCompletedValue = (phase.progress_percentage / 100) * phase.value;
      return sum + phaseCompletedValue;
    }, 0);
    
    return totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0;
  };

  const getProjectStats = () => {
    const allProjects = [...activeProjects, ...completedProjects];
    return {
      total: allProjects.length,
      active: activeProjects.length,
      completed: completedProjects.length,
      onTrack: activeProjects.filter(p => {
        const today = new Date();
        const estimatedCompletion = p.estimated_completion ? new Date(p.estimated_completion) : null;
        return estimatedCompletion && estimatedCompletion >= today;
      }).length,
      totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalSpent: allProjects.reduce((sum, p) => sum + (p.total_cost || 0), 0)
    };
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas mejoradas */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Seguimiento de Avances</h1>
            <p className="text-muted-foreground">Control detallado del progreso de todos los proyectos</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {viewMode === 'detailed' ? 'Vista Compacta' : 'Vista Detallada'}
            </Button>
            <Button onClick={() => setIsProjectFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>

        {/* Estadísticas del dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Proyectos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
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
                <Activity className="h-8 w-8 text-orange-500" />
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
                  <p className="text-sm font-medium text-muted-foreground">En Tiempo</p>
                  <p className="text-2xl font-bold">{stats.onTrack}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Presupuesto</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalBudget)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gastado</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProjectFormDialog
        open={isProjectFormOpen}
        onOpenChange={setIsProjectFormOpen}
        onSubmit={addNewProject}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Proyectos Activos ({activeProjects.length})</TabsTrigger>
          <TabsTrigger value="completed">Proyectos Completados ({completedProjects.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {/* Proyectos Activos */}
          <Card className="glass-card enhanced-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-foreground">Proyectos en Progreso</CardTitle>
                <Badge variant="outline" className="bg-blue-100 text-blue-600">
                  {activeProjects.length} activos
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Progreso General</TableHead>
                      <TableHead>Fases del Proyecto</TableHead>
                      {viewMode === 'detailed' && <TableHead>Fechas Estimadas</TableHead>}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <EditableCell 
                              value={project.name} 
                              onSave={(value) => updateProject(project.id, { name: value })}
                              className="font-semibold text-foreground"
                            />
                            <EditableCell 
                              value={project.description} 
                              onSave={(value) => updateProject(project.id, { description: value })}
                              className="text-sm text-muted-foreground"
                            />
                            <div className="text-xs text-muted-foreground">
                              Presupuesto: {formatCurrency(project.budget)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{project.client.full_name}</p>
                            {project.client.email && (
                              <p className="text-xs text-muted-foreground">{project.client.email}</p>
                            )}
                            {project.client.phone && (
                              <p className="text-xs text-muted-foreground">{project.client.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <EditableCell 
                              value={project.location || ""} 
                              onSave={(value) => updateProject(project.id, { location: value })}
                              className="text-sm text-foreground"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getProjectStatusBadge(project.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="flex -space-x-2">
                              {project.assigned_team.slice(0, 3).map((member, index) => (
                                <UserAvatar 
                                  key={index}
                                  user={{ 
                                    full_name: member.name, 
                                    avatar_url: member.avatar_url 
                                  }}
                                  size="sm"
                                  showTooltip={true}
                                  className="border-2 border-background"
                                />
                              ))}
                              {project.assigned_team.length > 3 && (
                                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                  +{project.assigned_team.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-foreground">Progreso</span>
                              <span className="text-sm font-medium text-foreground">
                                {calculateTotalProgress(project.phases)}%
                              </span>
                            </div>
                            <Progress value={calculateTotalProgress(project.phases)} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              Gasto: {formatCurrency(project.total_cost)} / {formatCurrency(project.budget)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-2 min-w-[300px]">
                            {project.phases.slice(0, viewMode === 'compact' ? 4 : project.phases.length).map((phase, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Select
                                  value={phase.status}
                                  onValueChange={(value) => updatePhaseStatus(project.id, phase.id, value as ProjectPhase['status'])}
                                >
                                  <SelectTrigger className="h-6 text-xs px-2 py-1 border border-border rounded bg-background text-foreground shadow-sm hover:bg-muted transition-colors min-w-[100px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(phaseConfig).map(([key, config]) => (
                                      <SelectItem key={key} value={key} className="text-xs">
                                        <div className="flex items-center gap-2">
                                          <div className={cn("w-2 h-2 rounded-full", config.bgColor)}></div>
                                          {config.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground min-w-[80px] truncate">{phase.name}</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={phase.progress_percentage}
                                    onChange={(e) => updatePhaseProgress(project.id, phase.id, parseInt(e.target.value) || 0)}
                                    className="h-6 w-12 text-xs p-1"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                                <span className="text-xs text-muted-foreground">({phase.value} pts)</span>
                              </div>
                            ))}
                            {viewMode === 'compact' && project.phases.length > 4 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedProject(project)}
                                className="text-xs"
                              >
                                Ver todas las fases ({project.phases.length})
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        
                        {viewMode === 'detailed' && (
                          <TableCell>
                            <div className="space-y-2 min-w-[150px]">
                              {project.estimated_dates.slice(0, 4).map((dateInfo, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-20 truncate">{dateInfo.phase}</span>
                                  <DatePicker
                                    date={dateInfo.date ? new Date(dateInfo.date) : undefined}
                                    onDateChange={(date) => date && updateEstimatedDate(project.id, index, date)}
                                    className="h-6 text-xs px-2"
                                  />
                                  {dateInfo.is_critical && (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                              ))}
                              {project.estimated_dates.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{project.estimated_dates.length - 4} más
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProject(project)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project);
                                setEditingProjectInModal(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {/* Proyectos Completados */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-foreground">Proyectos Completados</CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-600">
                  {completedProjects.length} completados
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {completedProjects.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay proyectos completados aún</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {completedProjects.map((project) => (
                    <Card key={project.id} className="border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{project.name}</h4>
                            <p className="text-sm text-muted-foreground">{project.client.full_name}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Completado: {formatDate(project.estimated_completion)}</span>
                              <span>Presupuesto: {formatCurrency(project.budget)}</span>
                              <span>Costo Final: {formatCurrency(project.total_cost)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-600">100% Completado</Badge>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedProject(project)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de detalles del proyecto */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalles del Proyecto: {selectedProject?.name}</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant={editingProjectInModal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditingProjectInModal(!editingProjectInModal)}
                >
                  {editingProjectInModal ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProject(null);
                    setEditingProjectInModal(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="phases">Fases Detalladas</TabsTrigger>
                  <TabsTrigger value="team">Equipo</TabsTrigger>
                  <TabsTrigger value="timeline">Cronograma</TabsTrigger>
                  <TabsTrigger value="budget">Presupuesto</TabsTrigger>
                  <TabsTrigger value="files">Documentos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información General</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre del Proyecto</p>
                          {editingProjectInModal ? (
                            <Input
                              value={selectedProject.name}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, name: e.target.value} : null)}
                              className="font-medium"
                            />
                          ) : (
                            <p className="font-medium">{selectedProject.name}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Descripción</p>
                          {editingProjectInModal ? (
                            <Textarea
                              value={selectedProject.description}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, description: e.target.value} : null)}
                              className="font-medium"
                            />
                          ) : (
                            <p className="font-medium">{selectedProject.description}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente</p>
                          <p className="font-medium">{selectedProject.client.full_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estado</p>
                          {editingProjectInModal ? (
                            <Select
                              value={selectedProject.status}
                              onValueChange={(value) => setSelectedProject(prev => prev ? {...prev, status: value as any} : null)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planning">Planeación</SelectItem>
                                <SelectItem value="design">Diseño</SelectItem>
                                <SelectItem value="permits">Permisos</SelectItem>
                                <SelectItem value="construction">Construcción</SelectItem>
                                <SelectItem value="completed">Completado</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getProjectStatusBadge(selectedProject.status)
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ubicación</p>
                          {editingProjectInModal ? (
                            <Input
                              value={selectedProject.location || ''}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, location: e.target.value} : null)}
                              placeholder="Ubicación del proyecto"
                            />
                          ) : (
                            <p className="font-medium">{selectedProject.location || 'No especificada'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progreso General</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{calculateTotalProgress(selectedProject.phases)}%</span>
                            </div>
                            <Progress value={calculateTotalProgress(selectedProject.phases)} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información Financiera</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Presupuesto Total</p>
                          {editingProjectInModal ? (
                            <Input
                              type="number"
                              value={selectedProject.budget || ''}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, budget: parseFloat(e.target.value) || null} : null)}
                              className="font-medium text-lg"
                            />
                          ) : (
                            <p className="font-medium text-lg">{formatCurrency(selectedProject.budget)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gastado Actual</p>
                          {editingProjectInModal ? (
                            <Input
                              type="number"
                              value={selectedProject.total_cost || ''}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, total_cost: parseFloat(e.target.value) || null} : null)}
                              className="font-medium text-lg"
                            />
                          ) : (
                            <p className="font-medium text-lg">{formatCurrency(selectedProject.total_cost)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Restante</p>
                          <p className="font-medium text-lg">
                            {formatCurrency((selectedProject.budget || 0) - (selectedProject.total_cost || 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">% del Presupuesto Usado</p>
                          <div className="space-y-1">
                            <Progress 
                              value={selectedProject.budget ? ((selectedProject.total_cost || 0) / selectedProject.budget) * 100 : 0} 
                              className="h-2" 
                            />
                            <span className="text-xs">
                              {selectedProject.budget ? Math.round(((selectedProject.total_cost || 0) / selectedProject.budget) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Cronograma</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                          {editingProjectInModal ? (
                            <Input
                              type="date"
                              value={selectedProject.start_date || ''}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, start_date: e.target.value} : null)}
                            />
                          ) : (
                            <p className="font-medium">{formatDate(selectedProject.start_date)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Estimada</p>
                          {editingProjectInModal ? (
                            <Input
                              type="date"
                              value={selectedProject.estimated_completion || ''}
                              onChange={(e) => setSelectedProject(prev => prev ? {...prev, estimated_completion: e.target.value} : null)}
                            />
                          ) : (
                            <p className="font-medium">{formatDate(selectedProject.estimated_completion)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Días Transcurridos</p>
                          <p className="font-medium">
                            {selectedProject.start_date ? 
                              Math.floor((new Date().getTime() - new Date(selectedProject.start_date).getTime()) / (1000 * 3600 * 24)) : 0
                            } días
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estado del Cronograma</p>
                          <Badge className="bg-green-100 text-green-600">En Tiempo</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="phases" className="space-y-4">
                  <div className="space-y-4">
                    {selectedProject.phases.map((phase, index) => (
                      <Card key={index} className={cn(
                        "transition-all duration-200",
                        phase.status === 'completed' ? 'border-green-200 bg-green-50/50' :
                        phase.status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
                        phase.status === 'on_hold' ? 'border-red-200 bg-red-50/50' :
                        'border-gray-200'
                      )}>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-3">
                                  {editingProjectInModal ? (
                                    <Input
                                      value={phase.name}
                                      onChange={(e) => {
                                        const updatedPhases = selectedProject.phases.map(p => 
                                          p.id === phase.id ? {...p, name: e.target.value} : p
                                        );
                                        setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                      }}
                                      className="font-semibold text-lg"
                                    />
                                  ) : (
                                    <h4 className="font-semibold text-lg">{phase.name}</h4>
                                  )}
                                  
                                  {editingProjectInModal ? (
                                    <Select
                                      value={phase.status}
                                      onValueChange={(value) => {
                                        const updatedPhases = selectedProject.phases.map(p => 
                                          p.id === phase.id ? {...p, status: value as any} : p
                                        );
                                        setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                      }}
                                    >
                                      <SelectTrigger className="w-40">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="not_started">No iniciado</SelectItem>
                                        <SelectItem value="planning">Planeando</SelectItem>
                                        <SelectItem value="in_progress">En progreso</SelectItem>
                                        <SelectItem value="on_hold">En pausa</SelectItem>
                                        <SelectItem value="completed">Completado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    getStatusBadge(phase.status)
                                  )}
                                  
                                  <Badge variant="outline" className="text-xs">
                                    {phase.value} puntos
                                  </Badge>
                                </div>
                                {editingProjectInModal ? (
                                  <Textarea
                                    value={phase.description}
                                    onChange={(e) => {
                                      const updatedPhases = selectedProject.phases.map(p => 
                                        p.id === phase.id ? {...p, description: e.target.value} : p
                                      );
                                      setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                    }}
                                    className="text-sm"
                                  />
                                ) : (
                                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                                )}
                              </div>
                              <div className="text-right space-y-1">
                                {editingProjectInModal ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={phase.progress_percentage}
                                      onChange={(e) => {
                                        const updatedPhases = selectedProject.phases.map(p => 
                                          p.id === phase.id ? {...p, progress_percentage: parseInt(e.target.value) || 0} : p
                                        );
                                        setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                      }}
                                      className="w-16 text-center"
                                    />
                                    <span>%</span>
                                  </div>
                                ) : (
                                  <p className="text-2xl font-bold">{phase.progress_percentage}%</p>
                                )}
                                <Progress value={phase.progress_percentage} className="h-3 w-32" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Duración Estimada</p>
                                {editingProjectInModal ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={phase.estimated_duration_days}
                                      onChange={(e) => {
                                        const updatedPhases = selectedProject.phases.map(p => 
                                          p.id === phase.id ? {...p, estimated_duration_days: parseInt(e.target.value) || 0} : p
                                        );
                                        setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                      }}
                                      className="w-20"
                                    />
                                    <span className="text-xs">días</span>
                                  </div>
                                ) : (
                                  <p className="font-medium">{phase.estimated_duration_days} días</p>
                                )}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Presupuesto Asignado</p>
                                {editingProjectInModal ? (
                                  <Input
                                    type="number"
                                    value={phase.budget_allocated || ''}
                                    onChange={(e) => {
                                      const updatedPhases = selectedProject.phases.map(p => 
                                        p.id === phase.id ? {...p, budget_allocated: parseFloat(e.target.value) || null} : p
                                      );
                                      setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                    }}
                                    className="font-medium"
                                  />
                                ) : (
                                  <p className="font-medium">{formatCurrency(phase.budget_allocated)}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Costo Actual</p>
                                {editingProjectInModal ? (
                                  <Input
                                    type="number"
                                    value={phase.actual_cost || ''}
                                    onChange={(e) => {
                                      const updatedPhases = selectedProject.phases.map(p => 
                                        p.id === phase.id ? {...p, actual_cost: parseFloat(e.target.value) || null} : p
                                      );
                                      setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                    }}
                                    className="font-medium"
                                  />
                                ) : (
                                  <p className="font-medium">{formatCurrency(phase.actual_cost)}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-muted-foreground">Equipo Asignado</p>
                                <div className="flex -space-x-1">
                                  {phase.assigned_team.slice(0, 3).map((memberId, idx) => {
                                    const member = selectedProject.assigned_team.find(m => m.id === memberId);
                                    return member ? (
                                      <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                                        <AvatarImage src={member.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                                      </Avatar>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            {phase.milestones.length > 0 && (
                              <div>
                                <p className="font-medium text-sm mb-2">Hitos de la Fase</p>
                                <div className="space-y-2">
                                  {phase.milestones.map((milestone) => (
                                    <div key={milestone.id} className="flex items-center gap-2 text-sm">
                                      <div className={cn(
                                        "w-3 h-3 rounded-full",
                                        milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                                      )}></div>
                                      <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                                        {milestone.name}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {milestone.completed ? 
                                          `(Completado: ${formatDate(milestone.completion_date || '')})` :
                                          `(Vence: ${formatDate(milestone.due_date)})`
                                        }
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {phase.notes && (
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Notas:</p>
                                {editingProjectInModal ? (
                                  <Textarea
                                    value={phase.notes}
                                    onChange={(e) => {
                                      const updatedPhases = selectedProject.phases.map(p => 
                                        p.id === phase.id ? {...p, notes: e.target.value} : p
                                      );
                                      setSelectedProject(prev => prev ? {...prev, phases: updatedPhases} : null);
                                    }}
                                    className="text-sm"
                                  />
                                ) : (
                                  <p className="text-sm">{phase.notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="team" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProject.assigned_team.map((member, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="font-medium">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 flex-1">
                              {editingProjectInModal ? (
                                <>
                                  <Input
                                    value={member.name}
                                    onChange={(e) => {
                                      const updatedTeam = selectedProject.assigned_team.map(m => 
                                        m.id === member.id ? {...m, name: e.target.value} : m
                                      );
                                      setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                    }}
                                    className="font-semibold"
                                  />
                                  <Input
                                    value={member.role}
                                    onChange={(e) => {
                                      const updatedTeam = selectedProject.assigned_team.map(m => 
                                        m.id === member.id ? {...m, role: e.target.value} : m
                                      );
                                      setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                    }}
                                    className="text-sm"
                                  />
                                  <Input
                                    value={member.specialization}
                                    onChange={(e) => {
                                      const updatedTeam = selectedProject.assigned_team.map(m => 
                                        m.id === member.id ? {...m, specialization: e.target.value} : m
                                      );
                                      setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                    }}
                                    className="text-xs"
                                  />
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold">{member.name}</p>
                                  <p className="text-sm text-muted-foreground">{member.role}</p>
                                  <p className="text-xs text-muted-foreground">{member.specialization}</p>
                                </>
                              )}
                            </div>
                            {editingProjectInModal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedTeam = selectedProject.assigned_team.filter(m => m.id !== member.id);
                                  setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {editingProjectInModal ? (
                                <Input
                                  type="email"
                                  value={member.email}
                                  onChange={(e) => {
                                    const updatedTeam = selectedProject.assigned_team.map(m => 
                                      m.id === member.id ? {...m, email: e.target.value} : m
                                    );
                                    setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                  }}
                                  className="text-xs h-6"
                                />
                              ) : (
                                member.email
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {editingProjectInModal ? (
                                <Input
                                  type="tel"
                                  value={member.phone}
                                  onChange={(e) => {
                                    const updatedTeam = selectedProject.assigned_team.map(m => 
                                      m.id === member.id ? {...m, phone: e.target.value} : m
                                    );
                                    setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                                  }}
                                  className="text-xs h-6"
                                />
                              ) : (
                                member.phone
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {editingProjectInModal && (
                      <Card className="border-dashed border-2 border-muted-foreground/25">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center justify-center min-h-[140px] gap-3">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                            <Button
                              variant="ghost"
                              onClick={() => {
                                const newMember: TeamMember = {
                                  id: Date.now().toString(),
                                  name: 'Nuevo Miembro',
                                  initials: 'NM',
                                  role: 'Rol',
                                  email: 'email@ejemplo.com',
                                  phone: '+52 55 0000 0000',
                                  specialization: 'Especialización',
                                  avatar_url: null
                                };
                                const updatedTeam = [...selectedProject.assigned_team, newMember];
                                setSelectedProject(prev => prev ? {...prev, assigned_team: updatedTeam} : null);
                              }}
                              className="text-muted-foreground"
                            >
                              Agregar Miembro
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cronograma del Proyecto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedProject.estimated_dates.map((dateInfo, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                            <div className={cn(
                              "w-4 h-4 rounded-full",
                              new Date(dateInfo.date) < new Date() ? 'bg-green-500' : 'bg-gray-300'
                            )}></div>
                            <div className="flex-1">
                              <p className="font-medium">{dateInfo.phase}</p>
                              <p className="text-sm text-muted-foreground">
                                Fecha estimada: {formatDate(dateInfo.date)}
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              {dateInfo.is_critical && (
                                <Badge variant="destructive" className="mb-1">Crítico</Badge>
                              )}
                              <p className="text-muted-foreground">
                                Buffer: {dateInfo.buffer_days} días
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="budget" className="space-y-4">
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Desglose Presupuestario por Fase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedProject.phases.map((phase, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="font-medium">{phase.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {phase.value}% del proyecto total
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="font-medium">{formatCurrency(phase.budget_allocated)}</p>
                                {phase.actual_cost && (
                                  <p className="text-sm text-muted-foreground">
                                    Gastado: {formatCurrency(phase.actual_cost)}
                                  </p>
                                )}
                                {phase.actual_cost && phase.budget_allocated && (
                                  <Progress 
                                    value={Math.min((phase.actual_cost / phase.budget_allocated) * 100, 100)} 
                                    className="h-1 w-24" 
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="files" className="space-y-4">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Los documentos y archivos del proyecto se mostrarán aquí
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setIsDocumentDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Documento
                      </Button>
                      <Button variant="outline" onClick={() => setIsPhotoDialogOpen(true)}>
                        <Camera className="h-4 w-4 mr-2" />
                        Fotos de Progreso
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar documentos */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Documento</DialogTitle>
            <DialogDescription>
              Sube un documento relacionado con el proyecto
            </DialogDescription>
          </DialogHeader>
          <DocumentUploadForm 
            projectId={selectedProject?.id || ''}
            onSuccess={() => {
              setIsDocumentDialogOpen(false);
              toast({
                title: "Documento agregado",
                description: "El documento se ha subido correctamente",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar fotos de progreso */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Foto de Progreso</DialogTitle>
            <DialogDescription>
              Sube una foto del progreso del proyecto
            </DialogDescription>
          </DialogHeader>
          <PhotoUploadForm 
            projectId={selectedProject?.id || ''}
            phases={selectedProject?.phases || []}
            onSuccess={() => {
              setIsPhotoDialogOpen(false);
              toast({
                title: "Foto agregada",
                description: "La foto se ha subido correctamente",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para subir documentos
function DocumentUploadForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !name || !projectId) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${projectId}/${Date.now()}.${fileExt}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Guardar metadata en la base de datos
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          name,
          description,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Error al subir el documento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="document-file">Archivo</Label>
        <Input
          id="document-file"
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
        />
      </div>
      <div>
        <Label htmlFor="document-name">Nombre del documento</Label>
        <Input
          id="document-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del documento"
        />
      </div>
      <div>
        <Label htmlFor="document-description">Descripción (opcional)</Label>
        <Textarea
          id="document-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción del documento"
        />
      </div>
      <Button 
        onClick={handleUpload} 
        disabled={!file || !name || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Upload className="h-4 w-4 mr-2 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Subir Documento
          </>
        )}
      </Button>
    </div>
  );
}

// Componente para subir fotos de progreso
function PhotoUploadForm({ 
  projectId, 
  phases, 
  onSuccess 
}: { 
  projectId: string; 
  phases: ProjectPhase[]; 
  onSuccess: () => void 
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(`Foto de progreso - ${new Date().toLocaleDateString()}`);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !projectId) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${projectId}/${Date.now()}.${fileExt}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Guardar metadata en la base de datos
      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          project_id: projectId,
          phase_id: selectedPhase || null,
          title,
          description,
          file_path: fileName,
          photo_url: fileName, // Usar el mismo path para photo_url
          taken_by: user.id,
          uploaded_by_temp: user.id,
        });

      if (dbError) throw dbError;

      onSuccess();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Error al subir la foto",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="photo-file">Foto</Label>
        <Input
          id="photo-file"
          type="file"
          onChange={handleFileChange}
          accept="image/*"
        />
      </div>
      <div>
        <Label htmlFor="photo-title">Título</Label>
        <Input
          id="photo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la foto"
        />
      </div>
      <div>
        <Label htmlFor="photo-phase">Fase del proyecto (opcional)</Label>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger id="photo-phase">
            <SelectValue placeholder="Seleccionar fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Foto general del proyecto</SelectItem>
            {phases.map((phase) => (
              <SelectItem key={phase.id} value={phase.id}>
                {phase.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="photo-description">Descripción (opcional)</Label>
        <Textarea
          id="photo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción de la foto"
        />
      </div>
      <Button 
        onClick={handleUpload} 
        disabled={!file || !title || uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Upload className="h-4 w-4 mr-2 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Subir Foto
          </>
        )}
      </Button>
    </div>
  );
}