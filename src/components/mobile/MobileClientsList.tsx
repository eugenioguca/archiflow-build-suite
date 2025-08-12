import React, { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MobileMetricCard } from "./MobileMetricCard";
import {
  Search,
  Filter,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Eye,
  Edit,
  FileText,
  DollarSign,
  Activity,
  Users,
  Star,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface ClientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'prospect' | 'lead';
  created_at: string;
  updated_at?: string;
  projects_count?: number;
  total_value?: number;
  last_contact?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  contact_person?: string;
  company?: string;
  notes?: string;
}

interface MobileClientsListProps {
  clients: ClientData[];
  onClientSelect?: (client: ClientData) => void;
  onNewClient?: () => void;
  onEditClient?: (client: ClientData) => void;
  className?: string;
}

const clientStatuses = [
  { value: 'all', label: 'Todos', icon: Users },
  { value: 'active', label: 'Activos', icon: CheckCircle, color: 'text-green-600' },
  { value: 'prospect', label: 'Prospectos', icon: Eye, color: 'text-blue-600' },
  { value: 'lead', label: 'Leads', icon: Star, color: 'text-yellow-600' },
  { value: 'inactive', label: 'Inactivos', icon: AlertCircle, color: 'text-gray-600' },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return { label: 'Activo', variant: 'default' as const, color: 'text-green-600' };
    case 'prospect':
      return { label: 'Prospecto', variant: 'secondary' as const, color: 'text-blue-600' };
    case 'lead':
      return { label: 'Lead', variant: 'outline' as const, color: 'text-yellow-600' };
    case 'inactive':
      return { label: 'Inactivo', variant: 'destructive' as const, color: 'text-gray-600' };
    default:
      return { label: status, variant: 'secondary' as const, color: 'text-gray-600' };
  }
};

const getPriorityConfig = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return { label: 'Alta', color: 'bg-red-500' };
    case 'medium':
      return { label: 'Media', color: 'bg-yellow-500' };
    case 'low':
      return { label: 'Baja', color: 'bg-green-500' };
    default:
      return null;
  }
};

const formatCurrency = (amount?: number) => {
  if (!amount) return 'Sin valor';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Sin fecha';
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function MobileClientsList({
  clients,
  onClientSelect,
  onNewClient,
  onEditClient,
  className = ""
}: MobileClientsListProps) {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'value' | 'projects'>('name');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  if (!isMobile) return null;

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort clients
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'value':
          return (b.total_value || 0) - (a.total_value || 0);
        case 'projects':
          return (b.projects_count || 0) - (a.projects_count || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [clients, searchTerm, statusFilter, sortBy]);

  // Calculate metrics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalValue = clients.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalProjects = clients.reduce((sum, c) => sum + (c.projects_count || 0), 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard
          title="Total Clientes"
          value={totalClients}
          icon={Users}
          subtitle={`${activeClients} activos`}
        />
        <MobileMetricCard
          title="Valor Total"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          subtitle={`${totalProjects} proyectos`}
        />
      </div>

      {/* Search and Filters */}
      <Card className="bg-card/50 border border-border/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh]">
                <SheetHeader>
                  <SheetTitle>Filtros y Ordenamiento</SheetTitle>
                  <SheetDescription>
                    Personaliza la vista de tus clientes
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Status Filter */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Estado</h3>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clientStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <status.icon className={`h-4 w-4 ${status.color || ''}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Ordenar por</h3>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nombre (A-Z)</SelectItem>
                        <SelectItem value="created">Más Recientes</SelectItem>
                        <SelectItem value="value">Mayor Valor</SelectItem>
                        <SelectItem value="projects">Más Proyectos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            {onNewClient && (
              <Button size="icon" onClick={onNewClient}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {(statusFilter !== 'all' || searchTerm) && (
            <div className="flex gap-2 flex-wrap">
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Estado: {clientStatuses.find(s => s.value === statusFilter)?.label}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Búsqueda: "{searchTerm}"
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredClients.length} de {totalClients} clientes
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <Card className="bg-card/30 border border-border/20">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-muted/20 mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                No se encontraron clientes
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Intenta modificar los filtros de búsqueda'
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
              {onNewClient && (
                <Button size="sm" onClick={onNewClient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const statusConfig = getStatusConfig(client.status);
            const priorityConfig = getPriorityConfig(client.priority);

            return (
              <Card 
                key={client.id} 
                className="bg-card/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm leading-tight">
                              {client.name}
                            </h3>
                            {priorityConfig && (
                              <div className={`w-2 h-2 rounded-full ${priorityConfig.color}`} />
                            )}
                          </div>
                          
                          {client.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {client.company}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant={statusConfig.variant} 
                              className="text-xs h-5 px-2"
                            >
                              {statusConfig.label}
                            </Badge>
                            
                            {client.projects_count !== undefined && client.projects_count > 0 && (
                              <Badge variant="outline" className="text-xs h-5 px-2">
                                {client.projects_count} proyecto{client.projects_count !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(client.total_value)}
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1">
                        {client.email && (
                          <p className="text-xs text-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {client.email}
                          </p>
                        )}
                        {client.phone && (
                          <p className="text-xs text-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {client.phone}
                          </p>
                        )}
                        {client.address && (
                          <p className="text-xs text-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {client.address}
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => onClientSelect?.(client)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        {onEditClient && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => onEditClient(client)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <FileText className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}