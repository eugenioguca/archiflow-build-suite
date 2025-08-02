import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Shield } from 'lucide-react';

interface QualityInspection {
  id?: string;
  check_name: string;
  check_type: string;
  description?: string;
  inspection_date: string;
  inspector_name: string;
  status: 'pending' | 'passed' | 'failed' | 'needs_rework';
  phase?: string;
  location?: string;
  checklist_items?: { item: string; passed: boolean; notes?: string }[];
  findings?: string;
  corrective_actions?: string;
  next_inspection_date?: string;
  photos?: string[];
}

interface QualityInspectionDialogProps {
  constructionProjectId: string;
  inspection?: QualityInspection;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function QualityInspectionDialog({ 
  constructionProjectId, 
  inspection, 
  trigger,
  onSave 
}: QualityInspectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<QualityInspection>({
    check_name: '',
    check_type: 'quality_inspection',
    description: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    status: 'pending',
    checklist_items: [
      { item: 'Cumplimiento de especificaciones técnicas', passed: false },
      { item: 'Calidad de materiales utilizados', passed: false },
      { item: 'Acabado y presentación', passed: false },
      { item: 'Medidas de seguridad aplicadas', passed: false }
    ],
    ...inspection
  });

  const isEditing = Boolean(inspection?.id);

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

      const inspectionData = {
        construction_project_id: constructionProjectId,
        check_name: formData.check_name,
        check_type: formData.check_type,
        description: formData.description,
        inspection_date: formData.inspection_date,
        inspector_name: formData.inspector_name,
        status: formData.status,
        phase: formData.phase,
        location: formData.location,
        criteria_checked: formData.checklist_items,
        findings: formData.findings,
        corrective_actions: formData.corrective_actions,
        next_inspection_date: formData.next_inspection_date || null,
        photos: formData.photos || [],
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('quality_checks')
          .update(inspectionData)
          .eq('id', inspection!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quality_checks')
          .insert(inspectionData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Inspección actualizada" : "Inspección creada",
        description: `La inspección ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          check_name: '',
          check_type: 'quality_inspection',
          description: '',
          inspection_date: new Date().toISOString().split('T')[0],
          inspector_name: '',
          status: 'pending',
          checklist_items: [
            { item: 'Cumplimiento de especificaciones técnicas', passed: false },
            { item: 'Calidad de materiales utilizados', passed: false },
            { item: 'Acabado y presentación', passed: false },
            { item: 'Medidas de seguridad aplicadas', passed: false }
          ]
        });
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la inspección`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (index: number, field: 'passed' | 'notes', value: boolean | string) => {
    const newChecklist = [...(formData.checklist_items || [])];
    newChecklist[index] = {
      ...newChecklist[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, checklist_items: newChecklist }));
  };

  const addChecklistItem = () => {
    const newChecklist = [...(formData.checklist_items || [])];
    newChecklist.push({ item: '', passed: false });
    setFormData(prev => ({ ...prev, checklist_items: newChecklist }));
  };

  const removeChecklistItem = (index: number) => {
    const newChecklist = [...(formData.checklist_items || [])];
    newChecklist.splice(index, 1);
    setFormData(prev => ({ ...prev, checklist_items: newChecklist }));
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'passed', label: 'Aprobado' },
    { value: 'failed', label: 'Rechazado' },
    { value: 'needs_rework', label: 'Requiere Retrabajo' }
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
                Nueva Inspección
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Editar Inspección' : 'Nueva Inspección de Calidad'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_name">Nombre de la Inspección *</Label>
              <Input
                id="check_name"
                value={formData.check_name}
                onChange={(e) => setFormData(prev => ({ ...prev, check_name: e.target.value }))}
                placeholder="Ej: Inspección de Cimentación"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada de la inspección"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspection_date">Fecha de Inspección *</Label>
              <Input
                id="inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData(prev => ({ ...prev, inspection_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector *</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name}
                onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                placeholder="Nombre del inspector"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase">Fase</Label>
              <Input
                id="phase"
                value={formData.phase || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                placeholder="Ej: Cimentación, Estructura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ubicación específica en obra"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lista de Verificación</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Item
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.checklist_items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <input
                    type="checkbox"
                    checked={item.passed}
                    onChange={(e) => handleChecklistChange(index, 'passed', e.target.checked)}
                    className="rounded"
                  />
                  <Input
                    value={item.item}
                    onChange={(e) => {
                      const newChecklist = [...(formData.checklist_items || [])];
                      newChecklist[index].item = e.target.value;
                      setFormData(prev => ({ ...prev, checklist_items: newChecklist }));
                    }}
                    placeholder="Elemento a verificar"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeChecklistItem(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="findings">Hallazgos</Label>
            <Textarea
              id="findings"
              value={formData.findings || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
              placeholder="Detalles de los hallazgos encontrados"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="corrective_actions">Acciones Correctivas</Label>
            <Textarea
              id="corrective_actions"
              value={formData.corrective_actions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, corrective_actions: e.target.value }))}
              placeholder="Acciones correctivas requeridas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_inspection_date">Próxima Inspección</Label>
            <Input
              id="next_inspection_date"
              type="date"
              value={formData.next_inspection_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, next_inspection_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Inspección')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}