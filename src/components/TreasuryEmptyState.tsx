import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Wallet, Plus, Info } from "lucide-react";

interface TreasuryEmptyStateProps {
  type: "bank" | "cash" | "transactions";
  onAction?: () => void;
  actionLabel?: string;
}

export const TreasuryEmptyState: React.FC<TreasuryEmptyStateProps> = ({
  type,
  onAction,
  actionLabel
}) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case "bank":
        return {
          icon: <Building2 className="h-12 w-12 text-muted-foreground" />,
          title: "No hay cuentas bancarias",
          description: "Para comenzar a gestionar transacciones bancarias, primero necesitas agregar al menos una cuenta bancaria.",
          actionText: actionLabel || "Agregar Primera Cuenta Bancaria"
        };
      case "cash":
        return {
          icon: <Wallet className="h-12 w-12 text-muted-foreground" />,
          title: "No hay movimientos de efectivo",
          description: "Aún no has registrado ningún movimiento de efectivo. Comienza registrando tu primer ingreso o egreso.",
          actionText: actionLabel || "Registrar Primer Movimiento"
        };
      case "transactions":
        return {
          icon: <Info className="h-12 w-12 text-muted-foreground" />,
          title: "No hay transacciones",
          description: "No se encontraron transacciones para los filtros seleccionados. Intenta ajustar los filtros o crear una nueva transacción.",
          actionText: actionLabel || "Nueva Transacción"
        };
      default:
        return {
          icon: <Info className="h-12 w-12 text-muted-foreground" />,
          title: "Sin datos",
          description: "No hay información disponible en este momento.",
          actionText: "Continuar"
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          {content.icon}
        </div>
        <CardTitle className="text-lg">{content.title}</CardTitle>
        <CardDescription className="max-w-sm mx-auto">
          {content.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {content.actionText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};