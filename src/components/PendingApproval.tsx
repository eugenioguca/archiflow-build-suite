import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ShieldAlert, Sparkles } from "lucide-react";

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto p-4 bg-gradient-to-br from-orange-500/20 to-blue-500/20 rounded-full w-fit">
            <Clock className="h-12 w-12 text-orange-400" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl text-white font-light">
              Cuenta Pendiente de Aprobación
            </CardTitle>
            <CardDescription className="text-slate-300">
              Tu cuenta ha sido creada exitosamente, pero necesita ser aprobada por un administrador antes de que puedas acceder al sistema.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
              <ShieldAlert className="h-4 w-4" />
              ¿Qué sigue?
            </div>
            <ul className="text-sm text-slate-300 space-y-2 ml-6">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                Un administrador revisará tu solicitud
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                Recibirás una notificación cuando sea aprobada
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                Podrás acceder al sistema una vez aprobado
              </li>
            </ul>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={signOut}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 border-0 shadow-xl group"
            >
              <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}