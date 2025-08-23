import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Users, BarChart3, FileText, Zap, Shield, Globe, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TestCombobox } from '@/components/TestCombobox';
import { useState } from 'react';

const Index = () => {
  const { user, loading, isApproved } = useAuth();
  const [showTest, setShowTest] = useState(false);

  // Si el usuario está autenticado y aprobado, redirigir al dashboard
  if (!loading && user && isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  // Modo de prueba del combobox
  if (showTest) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setShowTest(false)}
            variant="outline"
          >
            ← Volver a Index
          </Button>
        </div>
        <TestCombobox />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
      
      {/* Hero Section */}
      <div className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <img 
              src="/lovable-uploads/7a3755e3-978f-4182-af7d-1db88590b5a4.png" 
              alt="Dovita Arquitectura" 
              className="h-24 w-auto"
            />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Gestión Inteligente para 
            <span className="bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent"> Arquitectos y Constructores</span>
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Sistema integral de gestión empresarial. 
            Optimiza tu workflow, gestiona clientes y proyectos con tecnología de vanguardia.
          </p>
          
          <div className="flex gap-6 justify-center items-center">
            <Link to="/auth">
              <Button size="lg" className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 border-0 shadow-2xl group">
                <Sparkles className="mr-2 h-5 w-5 group-hover:animate-spin" />
                Acceder al Sistema
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-orange-500/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">CRM Avanzado</h3>
            <p className="text-slate-300 leading-relaxed">
              Gestión completa de leads, clientes y follow-ups con IA integrada
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-orange-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-blue-500/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Proyectos 360°</h3>
            <p className="text-slate-300 leading-relaxed">
              Control total del ciclo de vida de proyectos arquitectónicos
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Shield className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Seguridad Total</h3>
            <p className="text-slate-300 leading-relaxed">
              Protección de datos empresariales con encriptación avanzada
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-orange-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Analytics Pro</h3>
            <p className="text-slate-300 leading-relaxed">
              Insights en tiempo real y reportes automatizados
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
          <Globe className="h-16 w-16 text-blue-400 mx-auto mb-6 animate-pulse" />
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
            Sistema Empresarial Avanzado
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Accede a herramientas profesionales para la gestión integral de tu empresa
          </p>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="px-10 py-4 text-lg border-2 border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white transition-all duration-300">
              <Sparkles className="mr-2 h-5 w-5" />
              Comenzar Ahora
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Test button - floating */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setShowTest(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="sm"
        >
          🧪 Test Combobox
        </Button>
      </div>
    </div>
  );
};

export default Index;
