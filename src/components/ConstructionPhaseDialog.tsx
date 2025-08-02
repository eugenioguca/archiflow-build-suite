import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Building } from 'lucide-react';

interface ConstructionPhase {
  id?: string;
  phase_name: string;
  phase_type: 'preliminares' | 'cimentacion' | 'estructura' | 'albanileria' | 'instalaciones' | 'acabados' | 'exteriores' | 'limpieza';
  phase_order: number;
  description?: string;
  estimated_start_date?: string;
  estimated_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_budget: number;
  actual_cost: number;
  progress_percentage: number;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  required_team_size: number;
  special_requirements?: string;
  dependencies?: string[];
}

interface ConstructionPhaseDialogProps {
  constructionProjectId: string;
  phase?: ConstructionPhase;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function ConstructionPhaseDialog({ 
  constructionProjectId, 
  phase, 
  trigger,
  onSave 
}: ConstructionPhaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingPhases, setExistingPhases] = useState<{ id: string; phase_name: string }[]>([]);
  
  const [formData, setFormData] = useState<ConstructionPhase>({
    phase_name: '',
    phase_type: 'cimentacion',
    phase_order: 1,
    description: '',
    estimated_budget: 0,
    actual_cost: 0,
    progress_percentage: 0,
    status: 'not_started',
    required_team_size: 1,
    dependencies: [],
    ...phase
  });

  const isEditing = Boolean(phase?.id);

  useEffect(() => {
    if (open) {
      fetchExistingPhases();
    }
  }, [open, constructionProjectId]);

  const fetchExistingPhases = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_phases')
        .select('id, phase_name')
        .eq('construction_project_id', constructionProjectId)
        .neq('id', phase?.id || '');

      if (error) throw error;
      setExistingPhases(data || []);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;

      if (!userId) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const phaseData = {
        construction_project_id: constructionProjectId,
        phase_name: formData.phase_name,
        phase_type: formData.phase_type,
        phase_order: formData.phase_order,
        description: formData.description,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
        actual_start_date: formData.actual_start_date || null,
        actual_end_date: formData.actual_end_date || null,
        estimated_budget: formData.estimated_budget,
        actual_cost: formData.actual_cost,
        progress_percentage: formData.progress_percentage,
        status: formData.status,
        required_team_size: formData.required_team_size,
        special_requirements: formData.special_requirements,
        dependencies: formData.dependencies || [],
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('construction_phases')
          .update(phaseData)
          .eq('id', phase!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_phases')
          .insert(phaseData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Fase actualizada" : "Fase creada",
        description: `La fase ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          phase_name: '',
          phase_type: 'cimentacion',
          phase_order: 1,
          description: '',
          estimated_budget: 0,
          actual_cost: 0,
          progress_percentage: 0,
          status: 'not_started',
          required_team_size: 1,
          dependencies: []
        });
      }
    } catch (error) {
      console.error('Error saving phase:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la fase`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const phaseTypes = [
    { value: 'preliminares', label: 'Preliminares' },
    { value: 'cimentacion', label: 'Cimentación' },
    { value: 'estructura', label: 'Estructura' },
    { value: 'albanileria', label: 'Albañilería' },
    { value: 'instalaciones', label: 'Instalaciones' },
    { value: 'acabados', label: 'Acabados' },
    { value: 'exteriores', label: 'Exteriores' },
    { value: 'limpieza', label: 'Limpieza' }
  ];

  const statusOptions = [
    { value: 'not_started', label: 'No Iniciado' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Completado' },
    { value: 'delayed', label: 'Retrasado' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {isEditing ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fase
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {isEditing ? 'Editar Fase' : 'Nueva Fase de Construcción'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase_name">Nombre de la Fase *</Label>
              <Input
                id="phase_name"
                value={formData.phase_name}
                onChange={(e) => setFormData(prev => ({ ...prev, phase_name: e.target.value }))}
                placeholder="Ej: Cimentación Principal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase_type">Tipo de Fase *</Label>
              <Select 
                value={formData.phase_type} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, phase_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {phaseTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada de la fase"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase_order">Orden</Label>
              <Input
                id="phase_order"
                type="number"
                min="1"
                value={formData.phase_order}
                onChange={(e) => setFormData(prev => ({ ...prev, phase_order: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress_percentage">Progreso (%)</Label>
              <Input
                id="progress_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.progress_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, progress_percentage: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_start_date">Fecha Inicio Estimada</Label>
              <Input
                id="estimated_start_date"
                type="date"
                value={formData.estimated_start_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_end_date">Fecha Fin Estimada</Label>
              <Input
                id="estimated_end_date"
                type="date"
                value={formData.estimated_end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_budget">Presupuesto Estimado</Label>
              <Input
                id="estimated_budget"
                type="number"
                step="0.01"
                value={formData.estimated_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_budget: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual_cost">Costo Real</Label>
              <Input
                id="actual_cost"
                type="number"
                step="0.01"
                value={formData.actual_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_cost: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="required_team_size">Tamaño del Equipo</Label>
              <Input
                id="required_team_size"
                type="number"
                min="1"
                value={formData.required_team_size}
                onChange={(e) => setFormData(prev => ({ ...prev, required_team_size: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requirements">Requerimientos Especiales</Label>
            <Textarea
              id="special_requirements"
              value={formData.special_requirements || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
              placeholder="Requerimientos especiales para esta fase"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Fase')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}