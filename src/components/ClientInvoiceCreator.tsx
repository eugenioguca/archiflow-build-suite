import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvoiceCreator } from "./InvoiceCreator";
import { FileText, Plus } from "lucide-react";

interface ClientInvoiceCreatorProps {
  clientId: string;
  clientName: string;
  paymentPlan?: any;
  onInvoiceCreated: () => void;
}

export function ClientInvoiceCreator({ 
  clientId, 
  clientName, 
  paymentPlan, 
  onInvoiceCreated 
}: ClientInvoiceCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleInvoiceCreated = () => {
    onInvoiceCreated();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Crear Factura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Factura para {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {paymentPlan && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2">Plan de Pagos Activo</h4>
              <p className="text-sm text-blue-800">
                {paymentPlan.plan_name} - Total: ${paymentPlan.total_amount?.toLocaleString()}
              </p>
              <p className="text-sm text-blue-600">
                La factura se creará basada en el plan de pagos establecido
              </p>
            </div>
          )}
          
          <InvoiceCreator onInvoiceCreated={handleInvoiceCreated} />
        </div>
      </DialogContent>
    </Dialog>
  );
}