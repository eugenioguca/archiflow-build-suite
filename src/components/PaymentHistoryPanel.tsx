import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Calendar,
  Receipt
} from 'lucide-react';

interface Payment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status?: string;
}

interface PaymentHistoryPanelProps {
  payments: Payment[];
}

export const PaymentHistoryPanel: React.FC<PaymentHistoryPanelProps> = ({ payments }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPaymentStatusIcon = (status?: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const totalPaid = (payments || []).reduce((sum, payment) => sum + payment.amount_paid, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historial de Pagos
          </span>
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(totalPaid)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">No hay pagos registrados</p>
            <p className="text-sm">Los pagos aparecerán aquí cuando se procesen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div 
                key={payment.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    {getPaymentStatusIcon(payment.status)}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">{formatCurrency(payment.amount_paid)}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(payment.payment_date)}
                      {payment.payment_method && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{payment.payment_method}</span>
                        </>
                      )}
                    </div>
                    {payment.reference_number && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Receipt className="h-3 w-3" />
                        Ref: {payment.reference_number}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={payment.status === 'paid' || payment.status === 'completed' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {payment.status === 'paid' || payment.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Pagado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        Pendiente
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {payments.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total de {payments.length} pagos</span>
              <span className="font-semibold">{formatCurrency(totalPaid)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};