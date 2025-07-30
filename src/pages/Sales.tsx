import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Phone, Mail, MessageSquare, Video, Plus, Filter, Edit2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/DatePicker";
import { EditableCell } from "@/components/EditableCell";

interface SalesLead {
  id: string;
  client_name: string;
  email: string;
  phone: string;
  status: 'lead' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiating' | 'won' | 'lost';
  progress: number;
  last_contact: string;
  next_action: string;
  next_action_date: string;
  action_type: 'call' | 'email' | 'meeting' | 'message' | 'video_call';
  budget_estimate: number;
  probability: number;
  notes: string;
}

const statusConfig = {
  lead: { label: "Lead", color: "bg-gray-100 text-gray-700", progress: 10 },
  contacted: { label: "Contactado", color: "bg-blue-100 text-blue-700", progress: 25 },
  interested: { label: "Interesado", color: "bg-yellow-100 text-yellow-700", progress: 40 },
  proposal_sent: { label: "Propuesta Enviada", color: "bg-orange-100 text-orange-700", progress: 60 },
  negotiating: { label: "Negociando", color: "bg-purple-100 text-purple-700", progress: 80 },
  won: { label: "Ganado", color: "bg-green-100 text-green-700", progress: 100 },
  lost: { label: "Perdido", color: "bg-red-100 text-red-700", progress: 0 },
};

const actionIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  message: MessageSquare,
  video_call: Video,
};

export default function Sales() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<SalesLead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter]);

  const fetchLeads = async () => {
    try {
      // Cargar desde localStorage para persistencia local
      const savedLeads = localStorage.getItem('salesLeads');
      if (savedLeads) {
        setLeads(JSON.parse(savedLeads));
      } else {
        // Datos iniciales si no hay datos guardados
        const initialLeads: SalesLead[] = [
          {
            id: "1",
            client_name: "Empresa ABC",
            email: "contacto@empresaabc.com",
            phone: "+52 55 1234 5678",
            status: "interested",
            progress: 40,
            last_contact: "2024-01-28",
            next_action: "Enviar propuesta detallada",
            next_action_date: "2024-01-30",
            action_type: "email",
            budget_estimate: 500000,
            probability: 70,
            notes: "Cliente muy interesado en proyecto de oficinas"
          },
          {
            id: "2",
            client_name: "Construcciones XYZ",
            email: "info@construccionesxyz.com",
            phone: "+52 55 9876 5432",
            status: "proposal_sent",
            progress: 60,
            last_contact: "2024-01-25",
            next_action: "Seguimiento de propuesta",
            next_action_date: "2024-01-29",
            action_type: "call",
            budget_estimate: 1200000,
            probability: 85,
            notes: "Propuesta enviada, esperando respuesta"
          },
          {
            id: "3",
            client_name: "Desarrollos Inmobiliarios",
            email: "ventas@desarrollos.com",
            phone: "+52 55 4444 7777",
            status: "negotiating",
            progress: 80,
            last_contact: "2024-01-27",
            next_action: "Reunión para negociar términos",
            next_action_date: "2024-01-31",
            action_type: "meeting",
            budget_estimate: 2000000,
            probability: 90,
            notes: "En negociación final de precios y términos"
          }
        ];
        
        setLeads(initialLeads);
        localStorage.setItem('salesLeads', JSON.stringify(initialLeads));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los prospectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLead = (leadId: string, updates: Partial<SalesLead>) => {
    const updatedLeads = leads.map(lead => 
      lead.id === leadId ? { ...lead, ...updates } : lead
    );
    setLeads(updatedLeads);
    localStorage.setItem('salesLeads', JSON.stringify(updatedLeads));
    
    toast({
      title: "Prospecto actualizado",
      description: "Los cambios se han guardado correctamente",
    });
  };

  const updateStatus = (leadId: string, newStatus: SalesLead['status']) => {
    const config = statusConfig[newStatus];
    updateLead(leadId, { 
      status: newStatus, 
      progress: config.progress,
      last_contact: new Date().toISOString().split('T')[0]
    });
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const addNewLead = () => {
    const newLead: SalesLead = {
      id: Date.now().toString(),
      client_name: "Nuevo Cliente",
      email: "cliente@email.com",
      phone: "+52 55 0000 0000",
      status: "lead",
      progress: 10,
      last_contact: new Date().toISOString().split('T')[0],
      next_action: "Contactar por primera vez",
      next_action_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      action_type: "call",
      budget_estimate: 100000,
      probability: 20,
      notes: "Nuevo prospecto"
    };
    
    const updatedLeads = [...leads, newLead];
    setLeads(updatedLeads);
    localStorage.setItem('salesLeads', JSON.stringify(updatedLeads));
    
    toast({
      title: "Nuevo prospecto agregado",
      description: "Puedes editar la información haciendo clic en los campos",
    });
  };

  const getStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} border-none bg-opacity-100`}>
        {config.label}
      </Badge>
    );
  };

  const getActionIcon = (actionType: keyof typeof actionIcons) => {
    const Icon = actionIcons[actionType];
    return <Icon className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getTotalPipeline = () => {
    return leads.reduce((total, lead) => total + (lead.budget_estimate * lead.probability / 100), 0);
  };

  const getLeadsByStatus = () => {
    const counts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusCounts = getLeadsByStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">CRM de Ventas</h1>
        <Button onClick={addNewLead}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Prospecto
        </Button>
      </div>

      {/* Métricas del Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pipeline Total</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(getTotalPipeline())}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Prospectos Activos</p>
              <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">En Negociación</p>
              <p className="text-2xl font-bold text-foreground">{statusCounts.negotiating || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-foreground">
                {leads.length > 0 ? Math.round(((statusCounts.won || 0) / leads.length) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Prospectos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Pipeline de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Próxima Acción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Probabilidad</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="space-y-1">
                      <EditableCell 
                        value={lead.client_name} 
                        onSave={(value) => updateLead(lead.id, { client_name: value })}
                        className="font-medium text-foreground"
                      />
                      <EditableCell 
                        value={lead.email} 
                        onSave={(value) => updateLead(lead.id, { email: value })}
                        type="email"
                        className="text-sm text-muted-foreground"
                      />
                      <EditableCell 
                        value={lead.phone} 
                        onSave={(value) => updateLead(lead.id, { phone: value })}
                        type="phone"
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as SalesLead['status'])}
                      className="px-3 py-2 border border-border rounded-md bg-background text-foreground shadow-sm hover:bg-muted transition-colors z-10"
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key} className="bg-background text-foreground">
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={lead.progress} className="h-2" />
                      <span className="text-xs text-muted-foreground">{lead.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(lead.action_type)}
                      <EditableCell 
                        value={lead.next_action} 
                        onSave={(value) => updateLead(lead.id, { next_action: value })}
                        className="text-sm text-foreground"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <DatePicker
                      date={new Date(lead.next_action_date)}
                      onDateChange={(date) => {
                        if (date) {
                          updateLead(lead.id, { next_action_date: date.toISOString().split('T')[0] });
                        }
                      }}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell 
                      value={formatCurrency(lead.budget_estimate)} 
                      onSave={(value) => {
                        const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ""));
                        if (!isNaN(numValue)) {
                          updateLead(lead.id, { budget_estimate: numValue });
                        }
                      }}
                      className="font-medium text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={lead.probability}
                        onChange={(e) => updateLead(lead.id, { probability: parseInt(e.target.value) })}
                        className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <Badge variant="outline" className="text-foreground bg-background">
                        {lead.probability}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <select
                        value={lead.action_type}
                        onChange={(e) => updateLead(lead.id, { action_type: e.target.value as SalesLead['action_type'] })}
                        className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                      >
                        <option value="call">Llamada</option>
                        <option value="email">Email</option>
                        <option value="meeting">Reunión</option>
                        <option value="message">Mensaje</option>
                        <option value="video_call">Video</option>
                      </select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}