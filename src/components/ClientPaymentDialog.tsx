import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId?: string;
  clientId?: string;
  invoiceTotal?: number;
  className?: string;
}

export function ClientPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  clientId,
  invoiceTotal = 0,
  className
}: ClientPaymentDialogProps) {
  const [formData, setFormData] = useState({
    amount_paid: "",
    payment_date: new Date(),
    payment_method: "",
    reference_number: "",
    notes: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceId || !clientId) {
      toast({
        title: "Error",
        description: "Faltan datos de la factura o cliente",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from('client_payments')
        .insert([{
          client_id: clientId,
          invoice_id: invoiceId,
          amount_paid: parseFloat(formData.amount_paid),
          payment_date: formData.payment_date.toISOString().split('T')[0],
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: formData.notes,
          created_by: user.id,
          complement_due_date: calculateComplementDueDate(formData.payment_date)
        }]);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado exitosamente. Recuerda emitir el complemento de pago."
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error registering payment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateComplementDueDate = (paymentDate: Date) => {
    const nextMonth = new Date(paymentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(17);
    return nextMonth.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setFormData({
      amount_paid: "",
      payment_date: new Date(),
      payment_method: "",
      reference_number: "",
      notes: ""
    });
  };

  const remainingBalance = invoiceTotal - parseFloat(formData.amount_paid || "0");
  const isPartialPayment = remainingBalance > 100; // Tolerancia de 100 pesos

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${className}`}>
        <DialogHeader>
          <DialogTitle>Registrar Pago Recibido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount_paid">Monto Pagado *</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: e.target.value }))}
                required
              />
              {invoiceTotal > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Total factura: ${invoiceTotal.toLocaleString('es-MX')}
                  {formData.amount_paid && (
                    <span className={`block ${isPartialPayment ? 'text-orange-600' : 'text-green-600'}`}>
                      Saldo restante: ${remainingBalance.toLocaleString('es-MX')}
                      {isPartialPayment && " (Pago parcial - requiere más complementos)"}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_date">Fecha de Pago *</Label>
              <DatePicker
                date={formData.payment_date}
                onDateChange={(date) => date && setFormData(prev => ({ ...prev, payment_date: date }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Forma de Pago</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar forma de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="03">Transferencia electrónica de fondos</SelectItem>
                  <SelectItem value="04">Tarjeta de crédito</SelectItem>
                  <SelectItem value="28">Tarjeta de débito</SelectItem>
                  <SelectItem value="02">Cheque nominativo</SelectItem>
                  <SelectItem value="01">Efectivo</SelectItem>
                  <SelectItem value="99">Por definir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference_number">Número de Referencia</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Ej: Transferencia #12345"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional sobre el pago..."
              rows={3}
            />
          </div>

          {formData.payment_date && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Fecha límite para emitir complemento:</strong> {calculateComplementDueDate(formData.payment_date)}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}