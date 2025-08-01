import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Eye
} from "lucide-react";

interface SalesDashboardData {
  totalLeads: number;
  newLeads: number;
  inContact: number;
  lostLeads: number;
  closedClients: number;
  conversionRate: number;
  totalRevenue: number;
  avgDaysToClose: number;
  advisorPerformance: AdvisorStats[];
  lossReasons: LossReason[];
  recentActivities: Activity[];
}

interface AdvisorStats {
  advisor_id: string;
  advisor_name: string;
  leads_assigned: number;
  leads_converted: number;
  conversion_rate: number;
  revenue_generated: number;
}

interface LossReason {
  reason: string;
  count: number;
  percentage: number;
}

interface Activity {
  id: string;
  title: string;
  client_name: string;
  created_at: string;
  activity_type: string;
}

export function SalesExecutiveDashboard() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<SalesDashboardData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // días
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      const periodDate = new Date();
      periodDate.setDate(periodDate.getDate() - parseInt(selectedPeriod));

      // Obtener estadísticas generales
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          assigned_advisor: profiles!clients_assigned_advisor_id_fkey(id, full_name)
        `)
        .gte('created_at', periodDate.toISOString());

      if (clientsError) throw clientsError;

      // Obtener actividades recientes
      const { data: activities, error: activitiesError } = await supabase
        .from('crm_activities')
        .select(`
          *,
          client:clients(full_name)
        `)
        .gte('created_at', periodDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      // Procesar datos
      const totalLeads = clients?.length || 0;
      const newLeads = clients?.filter(c => c.status === 'nuevo_lead').length || 0;
      const inContact = clients?.filter(c => c.status === 'en_contacto').length || 0;
      const lostLeads = clients?.filter(c => c.status === 'lead_perdido').length || 0;
      const closedClients = clients?.filter(c => c.status === 'cliente_cerrado').length || 0;
      
      const conversionRate = totalLeads > 0 ? (closedClients / totalLeads) * 100 : 0;

      // Calcular performance por asesor
      const advisorMap = new Map();
      clients?.forEach(client => {
        if (client.assigned_advisor) {
          const advisorId = client.assigned_advisor.id;
          const advisorName = client.assigned_advisor.full_name;
          
          if (!advisorMap.has(advisorId)) {
            advisorMap.set(advisorId, {
              advisor_id: advisorId,
              advisor_name: advisorName,
              leads_assigned: 0,
              leads_converted: 0,
              conversion_rate: 0,
              revenue_generated: 0
            });
          }
          
          const advisor = advisorMap.get(advisorId);
          advisor.leads_assigned++;
          
          if (client.status === 'cliente_cerrado') {
            advisor.leads_converted++;
            advisor.revenue_generated += client.budget || 0;
          }
          
          advisor.conversion_rate = advisor.leads_assigned > 0 
            ? (advisor.leads_converted / advisor.leads_assigned) * 100 
            : 0;
        }
      });

      // Análisis de razones de pérdida (simulado)
      const lossReasons: LossReason[] = [
        { reason: 'Presupuesto insuficiente', count: Math.floor(lostLeads * 0.4), percentage: 40 },
        { reason: 'Eligió competencia', count: Math.floor(lostLeads * 0.25), percentage: 25 },
        { reason: 'Sin respuesta', count: Math.floor(lostLeads * 0.2), percentage: 20 },
        { reason: 'Proyecto cancelado', count: Math.floor(lostLeads * 0.15), percentage: 15 }
      ];

      setDashboardData({
        totalLeads,
        newLeads,
        inContact,
        lostLeads,
        closedClients,
        conversionRate,
        totalRevenue: Array.from(advisorMap.values()).reduce((sum, advisor) => sum + advisor.revenue_generated, 0),
        avgDaysToClose: 25, // Simulado
        advisorPerformance: Array.from(advisorMap.values()),
        lossReasons,
        recentActivities: activities?.map(activity => ({
          id: activity.id,
          title: activity.title,
          client_name: activity.client?.full_name || 'Cliente desconocido',
          created_at: activity.created_at,
          activity_type: activity.activity_type
        })) || []
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Ejecutivo de Ventas</h2>
          <p className="text-gray-600">Análisis de performance del equipo de ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Período:</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{dashboardData.totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasa de Conversión</p>
                <p className="text-2xl font-bold">{dashboardData.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Generados</p>
                <p className="text-2xl font-bold">${dashboardData.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{dashboardData.avgDaysToClose} días</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline de ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pipeline de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Nuevos Leads</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{dashboardData.newLeads}</p>
            </div>

            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium">En Contacto</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{dashboardData.inContact}</p>
            </div>

            <div className="text-center p-4 border rounded-lg bg-green-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Cerrados</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{dashboardData.closedClients}</p>
            </div>

            <div className="text-center p-4 border rounded-lg bg-red-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Perdidos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{dashboardData.lostLeads}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance por asesor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Performance por Asesor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.advisorPerformance.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay datos de asesores</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.advisorPerformance.map((advisor) => (
                  <div key={advisor.advisor_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{advisor.advisor_name}</p>
                      <p className="text-sm text-gray-600">
                        {advisor.leads_converted}/{advisor.leads_assigned} leads convertidos
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={advisor.conversion_rate >= 30 ? "default" : "secondary"}>
                        {advisor.conversion_rate.toFixed(1)}%
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        ${advisor.revenue_generated.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Razones de pérdida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Análisis de Leads Perdidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.lossReasons.filter(r => r.count > 0).length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay leads perdidos en este período</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.lossReasons.filter(r => r.count > 0).map((reason, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{reason.reason}</span>
                      <span className="text-sm text-gray-600">{reason.count} ({reason.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${reason.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividades recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Actividades Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData.recentActivities.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay actividades recientes</p>
          ) : (
            <div className="space-y-3">
              {dashboardData.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-gray-600">Cliente: {activity.client_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{activity.activity_type}</Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}