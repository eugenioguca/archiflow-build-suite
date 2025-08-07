import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePaymentInstallments, PaymentInstallment } from '@/hooks/usePaymentInstallments';
import { useAuth } from '@/hooks/useAuth';
import { CurrencyInput } from './CurrencyInput';
import { DatePicker } from './DatePicker';

interface PaymentInstallmentsTableProps {
  paymentPlanId: string;
  readOnly?: boolean;
  showSummary?: boolean;
}

export const PaymentInstallmentsTable: React.FC<PaymentInstallmentsTableProps> = ({
  paymentPlanId,
  readOnly = false,
  showSummary = true
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'employee';
  const { 
    installments, 
    isLoading, 
    createInstallment, 
    updateInstallment, 
    markAsPaid,
    deleteInstallment,
    getPaymentSummary,
    checkOverdueInstallments
  } = usePaymentInstallments(paymentPlanId);

  const [selectedInstallment, setSelectedInstallment] = useState<PaymentInstallment | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    due_date: new Date(),
    payment_reference: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      due_date: new Date(),
      payment_reference: '',
      notes: ''
    });
  };

  const summary = getPaymentSummary();
  const overdueInstallments = checkOverdueInstallments();

  const handleCreate = async () => {
    if (!formData.description || formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    const nextNumber = Math.max(...installments.map(i => i.installment_number), 0) + 1;

    createInstallment.mutate({
      payment_plan_id: paymentPlanId,
      installment_number: nextNumber,
      description: formData.description,
      amount: formData.amount,
      due_date: formData.due_date.toISOString().split('T')[0],
      status: 'pending'
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    });
  };

  const handleEdit = async () => {
    if (!selectedInstallment) return;

    updateInstallment.mutate({
      id: selectedInstallment.id,
      data: {
        description: formData.description,
        amount: formData.amount,
        due_date: formData.due_date.toISOString().split('T')[0]
      }
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setSelectedInstallment(null);
        resetForm();
      }
    });
  };

  const handleMarkAsPaid = async () => {
    if (!selectedInstallment) return;

    markAsPaid.mutate({
      installmentId: selectedInstallment.id,
      paymentReference: formData.payment_reference,
      notes: formData.notes
    }, {
      onSuccess: () => {
        setIsPaymentDialogOpen(false);
        setSelectedInstallment(null);
        resetForm();
      }
    });
  };

  const handleDelete = async (installment: PaymentInstallment) => {
    deleteInstallment.mutate(installment.id);
  };

  const openEditDialog = (installment: PaymentInstallment) => {
    setSelectedInstallment(installment);
    setFormData({
      description: installment.description,
      amount: installment.amount,
      due_date: new Date(installment.due_date),
      payment_reference: '',
      notes: ''
    });
    setIsEditDialogOpen(true);
  };

  const openPaymentDialog = (installment: PaymentInstallment) => {
    setSelectedInstallment(installment);
    setFormData({
      description: installment.description,
      amount: installment.amount,
      due_date: new Date(installment.due_date),
      payment_reference: '',
      notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    if (status === 'paid') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pagado
        </Badge>
      );
    }
    
    if (status === 'pending' && due < today) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Vencido
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <Calendar className="h-3 w-3 mr-1" />
        Pendiente
      </Badge>
    );
  };

  const isOverdue = (status: string, dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return status === 'pending' && due < today;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  ${summary.totalAmount.toLocaleString('es-MX')}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${summary.paidAmount.toLocaleString('es-MX')}
                </p>
                <p className="text-sm text-muted-foreground">Pagado</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  ${summary.pendingAmount.toLocaleString('es-MX')}
                </p>
                <p className="text-sm text-muted-foreground">Pendiente</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  ${summary.overdueAmount.toLocaleString('es-MX')}
                </p>
                <p className="text-sm text-muted-foreground">Vencido</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso de Pagos</span>
                <span>{summary.completionPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={summary.completionPercentage} className="h-2" />
            </div>
            {overdueInstallments.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ {overdueInstallments.length} parcialidad(es) vencida(s)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Parcialidades</CardTitle>
            {!readOnly && canEdit && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Parcialidad
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Parcialidad</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ej: Primer anticipo - 40%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Monto</Label>
                      <CurrencyInput
                        value={formData.amount}
                        onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                      <DatePicker
                        date={formData.due_date}
                        onDateChange={(date) => setFormData(prev => ({ ...prev, due_date: date || new Date() }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreate} disabled={createInstallment.isPending}>
                        {createInstallment.isPending ? 'Creando...' : 'Crear'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {installments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay parcialidades creadas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  {!readOnly && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow 
                    key={installment.id}
                    className={isOverdue(installment.status, installment.due_date) ? 'bg-red-50' : ''}
                  >
                    <TableCell className="font-medium">
                      {installment.installment_number}
                    </TableCell>
                    <TableCell>{installment.description}</TableCell>
                    <TableCell className="font-medium">
                      ${installment.amount.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {new Date(installment.due_date).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(installment.status, installment.due_date)}
                    </TableCell>
                    <TableCell>
                      {installment.paid_date 
                        ? new Date(installment.paid_date).toLocaleDateString('es-MX')
                        : '-'
                      }
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <div className="flex gap-2">
                          {installment.status === 'pending' && canEdit && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openPaymentDialog(installment)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(installment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar parcialidad?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(installment)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parcialidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_description">Descripción</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_amount">Monto</Label>
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_due_date">Fecha de Vencimiento</Label>
              <DatePicker
                date={formData.due_date}
                onDateChange={(date) => setFormData(prev => ({ ...prev, due_date: date || new Date() }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={updateInstallment.isPending}>
                {updateInstallment.isPending ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Parcialidad:</strong> {selectedInstallment?.description}</p>
              <p><strong>Monto:</strong> ${selectedInstallment?.amount.toLocaleString('es-MX')}</p>
              <p><strong>Vencimiento:</strong> {selectedInstallment?.due_date ? new Date(selectedInstallment.due_date).toLocaleDateString('es-MX') : '-'}</p>
            </div>
            <div>
              <Label htmlFor="payment_reference">Referencia de Pago (Opcional)</Label>
              <Input
                id="payment_reference"
                value={formData.payment_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
                placeholder="Ej: Transferencia #12345"
              />
            </div>
            <div>
              <Label htmlFor="payment_notes">Notas (Opcional)</Label>
              <Textarea
                id="payment_notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleMarkAsPaid} disabled={markAsPaid.isPending}>
                {markAsPaid.isPending ? 'Confirmando...' : 'Confirmar Pago'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};