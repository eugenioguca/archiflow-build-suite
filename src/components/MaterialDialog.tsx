import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Package } from 'lucide-react';

interface Material {
  id?: string;
  material_name: string;
  material_code?: string;
  description?: string;
  unit: string;
  quantity_required: number;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  supplier_id?: string;
  partida_id?: string;
  delivery_date?: string;
  expiry_date?: string;
  location_stored?: string;
  quality_certified: boolean;
  certificate_url?: string;
  status: string;
  notes?: string;
}

interface MaterialDialogProps {
  constructionProjectId: string;
  material?: Material;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function MaterialDialog({ 
  constructionProjectId, 
  material, 
  trigger,
  onSave 
}: MaterialDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; company_name: string }[]>([]);
  const [partidas, setPartidas] = useState<{ id: string; descripcion: string }[]>([]);
  
  const [formData, setFormData] = useState<Material>({
    material_name: '',
    description: '',
    unit: 'pza',
    quantity_required: 0,
    quantity_ordered: 0,
    quantity_delivered: 0,
    quantity_used: 0,
    unit_cost: 0,
    total_cost: 0,
    quality_certified: false,
    status: 'pending',
    ...material
  });

  const isEditing = Boolean(material?.id);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, constructionProjectId]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total_cost: prev.quantity_required * prev.unit_cost
    }));
  }, [formData.quantity_required, formData.unit_cost]);

  const fetchData = async () => {
    try {
      const [suppliersRes, partidasRes] = await Promise.all([
        supabase.from('suppliers').select('id, company_name').order('company_name'),
        supabase
          .from('construction_budget_items')
          .select('id, descripcion')
          .eq('construction_project_id', constructionProjectId)
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (partidasRes.data) setPartidas(partidasRes.data);
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

      const materialData = {
        construction_project_id: constructionProjectId,
        material_name: formData.material_name,
        material_code: formData.material_code,
        description: formData.description,
        unit: formData.unit,
        quantity_required: formData.quantity_required,
        quantity_ordered: formData.quantity_ordered,
        quantity_delivered: formData.quantity_delivered,
        quantity_used: formData.quantity_used,
        unit_cost: formData.unit_cost,
        total_cost: formData.total_cost,
        supplier_id: formData.supplier_id || null,
        partida_id: formData.partida_id || null,
        delivery_date: formData.delivery_date || null,
        expiry_date: formData.expiry_date || null,
        location_stored: formData.location_stored,
        quality_certified: formData.quality_certified,
        certificate_url: formData.certificate_url,
        status: formData.status,
        notes: formData.notes,
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('construction_materials')
          .update(materialData)
          .eq('id', material!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_materials')
          .insert(materialData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Material actualizado" : "Material agregado",
        description: `El material ha sido ${isEditing ? 'actualizado' : 'agregado'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          material_name: '',
          description: '',
          unit: 'pza',
          quantity_required: 0,
          quantity_ordered: 0,
          quantity_delivered: 0,
          quantity_used: 0,
          unit_cost: 0,
          total_cost: 0,
          quality_certified: false,
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'agregar'} el material`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const units = [
    'pza', 'm', 'm²', 'm³', 'ton', 'kg', 'lt', 'bulto', 'rollo', 'caja', 'lote', 'global'
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'ordered', label: 'Ordenado' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'in_use', label: 'En Uso' },
    { value: 'depleted', label: 'Agotado' }
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
                Agregar Material
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Editar Material' : 'Agregar Material al Inventario'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material_name">Nombre del Material *</Label>
              <Input
                id="material_name"
                value={formData.material_name}
                onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                placeholder="Ej: Cemento Portland"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material_code">Código</Label>
              <Input
                id="material_code"
                value={formData.material_code || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, material_code: e.target.value }))}
                placeholder="Ej: CEM-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada del material"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_required">Cantidad Requerida</Label>
              <Input
                id="quantity_required"
                type="number"
                step="0.01"
                value={formData.quantity_required}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_required: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo Unitario</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_cost">Costo Total</Label>
              <Input
                id="total_cost"
                type="number"
                value={formData.total_cost}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_ordered">Cantidad Ordenada</Label>
              <Input
                id="quantity_ordered"
                type="number"
                step="0.01"
                value={formData.quantity_ordered}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_ordered: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_delivered">Cantidad Entregada</Label>
              <Input
                id="quantity_delivered"
                type="number"
                step="0.01"
                value={formData.quantity_delivered}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_delivered: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_used">Cantidad Utilizada</Label>
              <Input
                id="quantity_used"
                type="number"
                step="0.01"
                value={formData.quantity_used}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_used: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              <Select 
                value={formData.supplier_id || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Fecha de Entrega</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_stored">Ubicación de Almacén</Label>
              <Input
                id="location_stored"
                value={formData.location_stored || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location_stored: e.target.value }))}
                placeholder="Ej: Bodega A, Rack 3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certificación de Calidad</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="quality_certified"
                checked={formData.quality_certified}
                onChange={(e) => setFormData(prev => ({ ...prev, quality_certified: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="quality_certified">Material certificado</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre el material..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Agregar Material')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}