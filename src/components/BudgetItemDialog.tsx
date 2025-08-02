import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, FileSpreadsheet } from 'lucide-react';

interface BudgetItem {
  id?: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  categoria: string;
  subcategoria?: string;
  supplier_id?: string;
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notas?: string;
}

interface BudgetItemDialogProps {
  constructionProjectId: string;
  item?: BudgetItem;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function BudgetItemDialog({ 
  constructionProjectId, 
  item, 
  trigger,
  onSave 
}: BudgetItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; company_name: string }[]>([]);
  const [formData, setFormData] = useState<BudgetItem>({
    codigo: '',
    descripcion: '',
    unidad: 'pza',
    cantidad: 1,
    precio_unitario: 0,
    total: 0,
    categoria: '',
    status: 'pending',
    ...item
  });

  const isEditing = Boolean(item?.id);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total: prev.cantidad * prev.precio_unitario
    }));
  }, [formData.cantidad, formData.precio_unitario]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
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

      const itemData = {
        construction_project_id: constructionProjectId,
        codigo: formData.codigo,
        descripcion: formData.descripcion,
        unidad: formData.unidad,
        cantidad: formData.cantidad,
        precio_unitario: formData.precio_unitario,
        total: formData.total,
        categoria: formData.categoria,
        subcategoria: formData.subcategoria,
        supplier_id: formData.supplier_id || null,
        status: formData.status,
        notas: formData.notas,
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('construction_budget_items')
          .update(itemData)
          .eq('id', item!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_budget_items')
          .insert(itemData);

        if (error) throw error;
      }

      toast({
        title: isEditing ? "Partida actualizada" : "Partida creada",
        description: `La partida ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          codigo: '',
          descripcion: '',
          unidad: 'pza',
          cantidad: 1,
          precio_unitario: 0,
          total: 0,
          categoria: '',
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error saving budget item:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la partida`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Tierra',
    'Cimentación',
    'Concreto',
    'Acero',
    'Mampostería',
    'Cemento',
    'Agregados',
    'Techos',
    'Instalaciones',
    'Acabados',
    'Carpintería',
    'Cancelería',
    'Pintura',
    'Limpieza'
  ];

  const units = [
    'pza', 'm', 'm²', 'm³', 'ton', 'kg', 'lt', 'bulto', 'rollo', 'caja', 'lote', 'global'
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
                Nueva Partida
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {isEditing ? 'Editar Partida' : 'Nueva Partida del Presupuesto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Ej: CON-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select 
                value={formData.categoria} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción detallada del concepto"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad</Label>
              <Select 
                value={formData.unidad} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, unidad: value }))}
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
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                value={formData.cantidad}
                onChange={(e) => setFormData(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_unitario">Precio Unitario</Label>
              <Input
                id="precio_unitario"
                type="number"
                step="0.01"
                value={formData.precio_unitario}
                onChange={(e) => setFormData(prev => ({ ...prev, precio_unitario: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              <Select 
                value={formData.supplier_id || 'none'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value === 'none' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
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
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="ordered">Ordenado</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total Calculado</Label>
            <Input
              id="total"
              type="number"
              value={formData.total}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Partida')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}