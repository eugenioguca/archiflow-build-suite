import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ShieldAlert } from "lucide-react";

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full w-fit">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Cuenta Pendiente de Aprobación
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Tu cuenta ha sido creada exitosamente, pero necesita ser aprobada por un administrador antes de que puedas acceder al sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              ¿Qué sigue?
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Un administrador revisará tu solicitud</li>
              <li>• Recibirás una notificación cuando sea aprobada</li>
              <li>• Podrás acceder al sistema una vez aprobado</li>
            </ul>
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={signOut}
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}