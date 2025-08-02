import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Receipt } from 'lucide-react';

interface ConstructionExpense {
  id?: string;
  description: string;
  expense_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  expense_date: string;
  supplier_id?: string;
  partida_id?: string;
  phase_id?: string;
  payment_method?: string;
  invoice_number?: string;
  invoice_url?: string;
  receipt_url?: string;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
}

interface ConstructionExpenseDialogProps {
  constructionProjectId: string;
  expense?: ConstructionExpense;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function ConstructionExpenseDialog({ 
  constructionProjectId, 
  expense, 
  trigger,
  onSave 
}: ConstructionExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; company_name: string }[]>([]);
  const [partidas, setPartidas] = useState<{ id: string; descripcion: string }[]>([]);
  const [phases, setPhases] = useState<{ id: string; phase_name: string }[]>([]);
  
  const [formData, setFormData] = useState<ConstructionExpense>({
    description: '',
    expense_type: 'materials',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    currency: 'MXN',
    status: 'pending',
    ...expense
  });

  const isEditing = Boolean(expense?.id);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, constructionProjectId]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total_amount: prev.quantity * prev.unit_price
    }));
  }, [formData.quantity, formData.unit_price]);

  const fetchData = async () => {
    try {
      const [suppliersRes, partidasRes, phasesRes] = await Promise.all([
        supabase.from('suppliers').select('id, company_name').order('company_name'),
        supabase
          .from('construction_budget_items')
          .select('id, descripcion')
          .eq('construction_project_id', constructionProjectId),
        supabase
          .from('construction_phases')
          .select('id, phase_name')
          .eq('construction_project_id', constructionProjectId)
      ]);

      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (partidasRes.data) setPartidas(partidasRes.data);
      if (phasesRes.data) setPhases(phasesRes.data);
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

      const expenseData = {
        construction_project_id: constructionProjectId,
        description: formData.description,
        expense_type: formData.expense_type,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_amount: formData.total_amount,
        expense_date: formData.expense_date,
        supplier_id: formData.supplier_id || null,
        partida_id: formData.partida_id || null,
        phase_id: formData.phase_id || null,
        payment_method: formData.payment_method,
        invoice_number: formData.invoice_number,
        invoice_url: formData.invoice_url,
        receipt_url: formData.receipt_url,
        currency: formData.currency,
        status: formData.status,
        notes: formData.notes,
        created_by: profile.id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('construction_expenses')
          .update(expenseData)
          .eq('id', expense!.id!);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('construction_expenses')
          .insert(expenseData);

        if (error) throw error;

        // Update spent budget in construction project
        const { error: updateError } = await supabase
          .from('construction_projects')
          .update({
            spent_budget: formData.total_amount
          })
          .eq('id', constructionProjectId);

        if (updateError) console.error('Error updating budget:', updateError);
      }

      toast({
        title: isEditing ? "Gasto actualizado" : "Gasto registrado",
        description: `El gasto ha sido ${isEditing ? 'actualizado' : 'registrado'} exitosamente`
      });

      setOpen(false);
      onSave();
      
      if (!isEditing) {
        setFormData({
          description: '',
          expense_type: 'materials',
          quantity: 1,
          unit_price: 0,
          total_amount: 0,
          expense_date: new Date().toISOString().split('T')[0],
          currency: 'MXN',
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'registrar'} el gasto`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const expenseTypes = [
    { value: 'materials', label: 'Materiales' },
    { value: 'labor', label: 'Mano de Obra' },
    { value: 'equipment', label: 'Equipo' },
    { value: 'transport', label: 'Transporte' },
    { value: 'services', label: 'Servicios' },
    { value: 'permits', label: 'Permisos' },
    { value: 'utilities', label: 'Servicios Públicos' },
    { value: 'other', label: 'Otros' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'paid', label: 'Pagado' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'check', label: 'Cheque' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'credit', label: 'Crédito' }
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
                Nuevo Gasto
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isEditing ? 'Editar Gasto' : 'Nuevo Gasto de Construcción'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada del gasto"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_type">Tipo de Gasto *</Label>
              <Select 
                value={formData.expense_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha del Gasto *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Precio Unitario</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total</Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
              <Label htmlFor="phase_id">Fase</Label>
              <Select 
                value={formData.phase_id || 'none'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, phase_id: value === 'none' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {phases.map(phase => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.phase_name}
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
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select 
                value={formData.payment_method || 'none'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value === 'none' ? undefined : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Número de Factura</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="Número de factura o comprobante"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre el gasto..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Registrar Gasto')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}