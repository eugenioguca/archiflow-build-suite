import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Users, BarChart3, FileText } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Building2 className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold text-foreground">DOVITA CRM</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema integral de gestión para despachos de arquitectura y construcción
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="px-8">
                Acceder al Sistema
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center p-6 rounded-lg border bg-card">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gestión de Clientes</h3>
            <p className="text-muted-foreground">
              Administra clientes potenciales, activos y finalizados
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Control de Proyectos</h3>
            <p className="text-muted-foreground">
              Seguimiento completo del avance de obras
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Documentación</h3>
            <p className="text-muted-foreground">
              Gestión de documentos y permisos
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Reportes</h3>
            <p className="text-muted-foreground">
              Analytics y reportes en tiempo real
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para optimizar tu despacho?</h2>
          <p className="text-muted-foreground mb-8">
            Únete a los profesionales que ya están transformando su gestión
          </p>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              Comenzar Ahora
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
