import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExcelImporter } from '@/components/ExcelImporter';
import { PartidasList } from '@/components/PartidasList';
import { ConstructionDashboard } from '@/components/ConstructionDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Hammer, Building2, Users, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Partida {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  supplier_id?: string;
}

interface Project {
  id: string;
  project_name: string;
  client: {
    full_name: string;
  };
}

interface Supplier {
  id: string;
  company_name: string;
}

export default function Construction() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConstructionProject, setHasConstructionProject] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      checkConstructionProject();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          client:clients(full_name)
        `)
        .in('status', ['construction', 'budget_accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as any) || []);
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

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      // Set empty array if suppliers table doesn't exist yet
      setSuppliers([]);
    }
  };

  const checkConstructionProject = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_projects')
        .select('id')
        .eq('project_id', selectedProject)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Si no existe proyecto de construcción, crear uno automáticamente
        await createConstructionProject();
      } else {
        setHasConstructionProject(true);
      }
    } catch (error) {
      console.error('Error checking construction project:', error);
      setHasConstructionProject(false);
    }
  };

  const createConstructionProject = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_projects')
        .insert({
          project_id: selectedProject,
          construction_area: 100, // Default value
          total_budget: 0,
          spent_budget: 0,
          start_date: new Date().toISOString().split('T')[0],
          estimated_completion_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
          overall_progress_percentage: 0,
          permit_status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (error) throw error;
      
      setHasConstructionProject(true);
      toast({
        title: "Proyecto de construcción creado",
        description: "Se ha configurado automáticamente el proyecto para construcción",
      });
    } catch (error) {
      console.error('Error creating construction project:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto de construcción",
        variant: "destructive",
      });
    }
  };

  const handlePartidasImported = (newPartidas: Partida[]) => {
    setPartidas(newPartidas);
  };

  const handlePartidasUpdate = (updatedPartidas: Partida[]) => {
    setPartidas(updatedPartidas);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Hammer className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Construcción</h1>
          <p className="text-muted-foreground">
            Gestión de presupuestos, partidas y proveedores
          </p>
        </div>
      </div>

      {/* Selector de Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Proyecto
          </CardTitle>
          <CardDescription>
            Elige el proyecto para gestionar su presupuesto de construcción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un proyecto..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{project.project_name}</span>
                    <span className="text-sm text-muted-foreground">
                      Cliente: {project.client?.full_name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && selectedProjectData && (
        <>
          {/* Header del Proyecto Seleccionado */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedProjectData.project_name}</h2>
                  <p className="text-muted-foreground">
                    Cliente: {selectedProjectData.client?.full_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {partidas.length} partidas
                  </Badge>
                  <Badge variant="secondary">
                    {suppliers.length} proveedores
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs principales */}
          <Tabs defaultValue={hasConstructionProject ? "dashboard" : "presupuesto"} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              {hasConstructionProject && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
              <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
              <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>

            {hasConstructionProject && (
              <TabsContent value="dashboard">
                <ConstructionDashboard projectId={selectedProject} />
              </TabsContent>
            )}

            <TabsContent value="presupuesto" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExcelImporter onPartidasImported={handlePartidasImported} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Resumen del Proyecto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {partidas.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Partidas</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          ${partidas.reduce((sum, p) => sum + p.total, 0).toLocaleString('es-MX')}
                        </div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <PartidasList 
                partidas={partidas}
                suppliers={suppliers}
                onPartidasUpdate={handlePartidasUpdate}
              />
            </TabsContent>

            <TabsContent value="proveedores">
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Gestión de proveedores - Próximamente</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentos">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Gestión documental - Próximamente</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reportes">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Reportes automáticos - Próximamente</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}