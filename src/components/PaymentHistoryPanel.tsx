import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight
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
  compact?: boolean;
}

export const PaymentHistoryPanel: React.FC<PaymentHistoryPanelProps> = ({ payments, compact = false }) => {
  const [currentPage, setCurrentPage] = React.useState(0);
  const ITEMS_PER_PAGE = compact ? 3 : 5;
  
  const paginatedPayments = React.useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return payments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [payments, currentPage, ITEMS_PER_PAGE]);
  
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;
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
    <Card className={compact ? '' : 'h-full'}>
      <CardHeader className={compact ? 'pb-3' : ''}>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className={compact ? "h-4 w-4" : "h-5 w-5"} />
            <span className={compact ? "text-sm" : ""}>Historial de Pagos</span>
          </span>
          <Badge variant="secondary" className="gap-1">
            <DollarSign className="h-3 w-3" />
            <span className={compact ? "text-xs" : ""}>{formatCurrency(totalPaid)}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : 'space-y-4'}>
        {payments.length === 0 ? (
          <div className={`text-center ${compact ? 'py-4' : 'py-8'} text-muted-foreground`}>
            <CreditCard className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-muted-foreground/50`} />
            <p className={`font-medium ${compact ? 'text-sm' : ''}`}>No hay pagos registrados</p>
            <p className={compact ? 'text-xs' : 'text-sm'}>Los pagos aparecerán aquí cuando se procesen</p>
          </div>
        ) : (
          <div className="space-y-3">
            <ScrollArea className={compact ? "h-[300px]" : "h-[400px]"}>
              <div className="space-y-3 pr-4">
                {paginatedPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'} border rounded-lg hover:shadow-md transition-shadow bg-card`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`${compact ? 'p-1.5' : 'p-2'} bg-green-500/10 rounded-lg flex-shrink-0`}>
                        {getPaymentStatusIcon(payment.status)}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className={`font-semibold ${compact ? 'text-base' : 'text-lg'} truncate`}>
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground flex-wrap`}>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Calendar className="h-3 w-3" />
                            {formatDate(payment.payment_date)}
                          </div>
                          {payment.payment_method && (
                            <div className="flex items-center gap-1">
                              <span>•</span>
                              <span className="capitalize truncate">{payment.payment_method}</span>
                            </div>
                          )}
                        </div>
                        {payment.reference_number && (
                          <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                            <Receipt className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Ref: {payment.reference_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge 
                        variant={payment.status === 'paid' || payment.status === 'completed' ? 'default' : 'secondary'}
                        className={`gap-1 ${compact ? 'text-xs' : ''}`}
                      >
                        {payment.status === 'paid' || payment.status === 'completed' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span className="hidden sm:inline">Pagado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span className="hidden sm:inline">Pendiente</span>
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!hasPrevPage}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                  Página {currentPage + 1} de {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNextPage}
                  className="flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {payments.length > 0 && (
          <div className={`${compact ? 'pt-2' : 'pt-4'} border-t`}>
            <div className={`flex justify-between items-center ${compact ? 'text-xs' : 'text-sm'}`}>
              <span className="text-muted-foreground">Total de {payments.length} pagos</span>
              <span className="font-semibold">{formatCurrency(totalPaid)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};