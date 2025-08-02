import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Clock } from 'lucide-react';

interface TimelineActivity {
  id?: string;
  activity_name: string;
  description?: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage: number;
  phase_id?: string;
  assigned_team_id?: string;
  depends_on?: string[];
  is_critical_path: boolean;
  notes?: string;
}

interface TimelineActivityDialogProps {
  constructionProjectId: string;
  activity?: TimelineActivity;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function TimelineActivityDialog({ 
  constructionProjectId, 
  activity, 
  trigger,
  onSave 
}: TimelineActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<{ id: string; phase_name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; team_name: string }[]>([]);
  const [activities, setActivities] = useState<{ id: string; activity_name: string }[]>([]);
  
  const [formData, setFormData] = useState<TimelineActivity>({
    activity_name: '',
    description: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress_percentage: 0,
    is_critical_path: false,
    depends_on: [],
    ...activity
  });

  const isEditing = Boolean(activity?.id);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, constructionProjectId]);

  const fetchData = async () => {
    try {
      const [phasesRes, teamsRes, activitiesRes] = await Promise.all([
        supabase
          .from('construction_phases')
          .select('id, phase_name')
          .eq('construction_project_id', constructionProjectId),
        supabase
          .from('construction_teams')
          .select('id, team_name')
          .eq('construction_project_id', constructionProjectId)
          .eq('active', true),
        supabase
          .from('construction_timelines')
          .select('id, activity_name')
          .eq('construction_project_id', constructionProjectId)
          .neq('id', activity?.id || '')
      ]);

      if (phasesRes.data) setPhases(phasesRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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

      const activityData = {
        construction_project_id: constructionProjectId,
        activity_name: formData.activity_name,
        description: formData.description,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        actual_start_date: formData.actual_start_date || null,
        actual_end_date: formData.actual_end_date || null,
        progress_percentage: formData.progress_percentage,
        phase_id: formData.phase_id || null,
        assigned_team_id: formData.assigned_team_id || null,
        depends_on: formData.depends_on || [],
        is_critical_path: formData.is_critical_path,
        notes: formData.notes,
        duration_days: Math.ceil((new Date(formData.planned_end_date).getTime() - new Date(formData.planned_start_date).getTime()) / (1000 * 60 * 60 * 24)),
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('construction_timelines')
          .update(activityData)
          .eq('id', activity!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_timelines')
          .insert(activityData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Actividad actualizada" : "Actividad creada",
        description: `La actividad ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          activity_name: '',
          description: '',
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          progress_percentage: 0,
          is_critical_path: false,
          depends_on: []
        });
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la actividad`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
                Nueva Actividad
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isEditing ? 'Editar Actividad' : 'Nueva Actividad del Timeline'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity_name">Nombre de la Actividad *</Label>
            <Input
              id="activity_name"
              value={formData.activity_name}
              onChange={(e) => setFormData(prev => ({ ...prev, activity_name: e.target.value }))}
              placeholder="Ej: Excavación para cimentación"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada de la actividad"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_start_date">Fecha Inicio Planificada *</Label>
              <Input
                id="planned_start_date"
                type="date"
                value={formData.planned_start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned_end_date">Fecha Fin Planificada *</Label>
              <Input
                id="planned_end_date"
                type="date"
                value={formData.planned_end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual_start_date">Fecha Inicio Real</Label>
              <Input
                id="actual_start_date"
                type="date"
                value={formData.actual_start_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual_end_date">Fecha Fin Real</Label>
              <Input
                id="actual_end_date"
                type="date"
                value={formData.actual_end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase_id">Fase</Label>
              <Select 
                value={formData.phase_id || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, phase_id: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {phases.map(phase => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_team_id">Equipo Asignado</Label>
              <Select 
                value={formData.assigned_team_id || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_team_id: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-2">
            <Label>Ruta Crítica</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_critical_path"
                checked={formData.is_critical_path}
                onChange={(e) => setFormData(prev => ({ ...prev, is_critical_path: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_critical_path">Esta actividad es parte de la ruta crítica</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Actividad')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}