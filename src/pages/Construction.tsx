import React, { useState } from 'react';
import { ConstructionProjectsGrid } from '@/components/ConstructionProjectsGrid';
import { ConstructionDashboard } from '@/components/ConstructionDashboard';
import { AdvancedBudgetManager } from '@/components/AdvancedBudgetManager';
// import { GanttScheduler } from '@/components/GanttScheduler';
// import { IntegratedExpenseManager } from '@/components/IntegratedExpenseManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Construction() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  const handleProjectSelect = (projectId: string) => {
    setSelectedProject(projectId);
    setViewMode('detail');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedProject('');
  };

  if (viewMode === 'grid') {
    return <ConstructionProjectsGrid onProjectSelect={handleProjectSelect} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={handleBackToGrid}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Proyectos
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="schedule">Cronograma</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ConstructionDashboard projectId={selectedProject} />
        </TabsContent>

        <TabsContent value="budget">
          <AdvancedBudgetManager 
            projectId={selectedProject}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Módulo de cronograma será refactorizado</p>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Módulo de gastos será refactorizado</p>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Módulo de reportes en desarrollo</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}