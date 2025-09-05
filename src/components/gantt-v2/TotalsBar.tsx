import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/gantt-v2/currency';

interface TotalsBarProps {
  subtotal: number;
  totalDiscounts: number;
  total: number;
}

export function TotalsBar({ subtotal, totalDiscounts, total }: TotalsBarProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-sm text-muted-foreground">SUBTOTAL: </span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            
            {totalDiscounts > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">DESCUENTOS: </span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(totalDiscounts)}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <span className="text-sm text-muted-foreground">TOTAL: </span>
            <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}