import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Package, 
  Search, 
  DollarSign,
  Calendar,
  Building2,
  User,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MaterialFinanceRequest {
  id: string;
  material_requirement_id: string;
  project_id: string;
  client_id: string;
  requested_by: string;
  request_date: string;
  status: string;
  is_attended: boolean;
  attended_by: string | null;
  attended_date: string | null;
  purchase_order_number: string | null;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  selected_for_payment: boolean;
  exported_to_treasury: boolean;
  treasury_export_date: string | null;
  payment_reference: string | null;
  // Joined data
  material_name: string;
  descripcion_producto: string | null;
  quantity_required: number;
  unit_cost: number | null;
  adjustment_additive: number | null;
  adjustment_deductive: number | null;
  unit_of_measure: string;
  client_name: string;
  project_name: string;
  supplier_name: string | null;
  requester_name: string;
}

interface SupplierSummary {
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  items_count: number;
}

interface MaterialFinanceRequestsProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export function MaterialFinanceRequests({ selectedClientId, selectedProjectId }: MaterialFinanceRequestsProps) {
  const [requests, setRequests] = useState<MaterialFinanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [attendedFilter, setAttendedFilter] = useState("");
  const [selectedForPayment, setSelectedForPayment] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // First, get the basic requests data
      let query = supabase
        .from('material_finance_requests')
        .select('*')
        .eq('exported_to_treasury', false) // Only show non-exported requests
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data: requestsData, error } = await query;

      if (error) {
        console.error('Error fetching material finance requests:', error);
        toast.error('Error al cargar las solicitudes de materiales');
        return;
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get unique IDs for related tables
      const materialIds = [...new Set(requestsData.map(r => r.material_requirement_id))];
      const clientIds = [...new Set(requestsData.map(r => r.client_id))];
      const projectIds = [...new Set(requestsData.map(r => r.project_id))];
      const supplierIds = [...new Set(requestsData.map(r => r.supplier_id).filter(Boolean))];
      const profileIds = [...new Set(requestsData.map(r => r.requested_by))];

      // Fetch related data in parallel
      const [materialsData, clientsData, projectsData, suppliersData, profilesData] = await Promise.all([
        supabase.from('material_requirements').select('id, material_name, descripcion_producto, quantity_required, unit_cost, adjustment_additive, adjustment_deductive, unit_of_measure').in('id', materialIds),
        supabase.from('clients').select('id, full_name').in('id', clientIds),
        supabase.from('client_projects').select('id, project_name').in('id', projectIds),
        supplierIds.length > 0 ? supabase.from('suppliers').select('id, company_name').in('id', supplierIds) : { data: [] },
        supabase.from('profiles').select('id, user_id').in('id', profileIds)
      ]);

      // Create lookup maps
      const materialsMap = new Map((materialsData.data || []).map(m => [m.id, m]));
      const clientsMap = new Map((clientsData.data || []).map(c => [c.id, c]));
      const projectsMap = new Map((projectsData.data || []).map(p => [p.id, p]));
      const suppliersMap = new Map((suppliersData.data || []).map(s => [s.id, s]));
      const profilesMap = new Map((profilesData.data || []).map(p => [p.id, p]));

      // Transform the data to include joined fields
      const transformedData = requestsData.map(request => {
        const material = materialsMap.get(request.material_requirement_id);
        const client = clientsMap.get(request.client_id);
        const project = projectsMap.get(request.project_id);
        const supplier = request.supplier_id ? suppliersMap.get(request.supplier_id) : null;
        const profile = profilesMap.get(request.requested_by);

        return {
          ...request,
          material_name: material?.material_name || '',
          descripcion_producto: material?.descripcion_producto || null,
          quantity_required: material?.quantity_required || 0,
          unit_cost: material?.unit_cost || 0,
          adjustment_additive: material?.adjustment_additive || 0,
          adjustment_deductive: material?.adjustment_deductive || 0,
          unit_of_measure: material?.unit_of_measure || '',
          client_name: client?.full_name || '',
          project_name: project?.project_name || '',
          supplier_name: (supplier as any)?.company_name || null,
          requester_name: (profile as any)?.user_id || 'Usuario'
        };
      });

      setRequests(transformedData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedClientId, selectedProjectId]);

  const handleAttendedToggle = async (requestId: string, isAttended: boolean) => {
    try {
      const updateData: any = {
        is_attended: isAttended,
        status: isAttended ? 'attended' : 'pending'
      };

      if (isAttended) {
        // Get current user's profile
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userData.user.id)
            .single();
          
          if (profile) {
            updateData.attended_by = profile.id;
            updateData.attended_date = new Date().toISOString();
          }
        }
      } else {
        updateData.attended_by = null;
        updateData.attended_date = null;
      }

      const { error } = await supabase
        .from('material_finance_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        toast.error('Error al actualizar la solicitud');
        return;
      }

      toast.success(isAttended ? 'Solicitud marcada como atendida' : 'Solicitud marcada como pendiente');
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al actualizar la solicitud');
    }
  };

  const handleOrderedToggle = async (requestId: string, materialRequirementId: string, isOrdered: boolean) => {
    try {
      // Update the material requirement status to 'ordenado' or back to 'requerido'
      const { error: materialError } = await supabase
        .from('material_requirements')
        .update({ status: isOrdered ? 'ordenado' : 'requerido' })
        .eq('id', materialRequirementId);

      if (materialError) {
        console.error('Error updating material status:', materialError);
        toast.error('Error al actualizar el estado del material');
        return;
      }

      // Update the finance request status
      const { error: requestError } = await supabase
        .from('material_finance_requests')
        .update({ 
          status: isOrdered ? 'ordered' : 'pending',
          is_attended: isOrdered 
        })
        .eq('id', requestId);

      if (requestError) {
        console.error('Error updating request status:', requestError);
        toast.error('Error al actualizar la solicitud');
        return;
      }

      toast.success(isOrdered ? 'Material marcado como ordenado' : 'Orden cancelada');
      fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al actualizar el material');
    }
  };

  // Toggle payment selection for a single request
  const togglePaymentSelection = (requestId: string) => {
    const newSelected = new Set(selectedForPayment);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedForPayment(newSelected);
  };

  // Toggle all payment selections
  const toggleAllPaymentSelections = () => {
    if (selectedForPayment.size === filteredRequests.length) {
      setSelectedForPayment(new Set());
    } else {
      setSelectedForPayment(new Set(filteredRequests.map(r => r.id)));
    }
  };

  // Get supplier summaries for selected items
  const getSupplierSummaries = (): SupplierSummary[] => {
    const selectedRequests = filteredRequests.filter(r => selectedForPayment.has(r.id));
    const supplierMap = new Map<string, SupplierSummary>();

    selectedRequests.forEach(request => {
      const finalCost = calculateFinalCost(
        request.unit_cost || 0,
        request.adjustment_additive || 0,
        request.adjustment_deductive || 0,
        request.quantity_required
      );

      const key = request.supplier_id || 'sin-proveedor';
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplier_id: request.supplier_id || '',
          supplier_name: request.supplier_name || 'Sin proveedor asignado',
          total_amount: 0,
          items_count: 0
        });
      }
      
      const summary = supplierMap.get(key)!;
      summary.total_amount += finalCost;
      summary.items_count += 1;
    });

    return Array.from(supplierMap.values());
  };

  // Export to treasury
  const handleExportToTreasury = async () => {
    if (selectedForPayment.size === 0) {
      toast.error('Seleccione al menos un material para exportar');
      return;
    }

    setIsExporting(true);
    try {
      // Get current user profile
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const selectedRequests = filteredRequests.filter(r => selectedForPayment.has(r.id));
      const supplierSummaries = getSupplierSummaries();

      // Create treasury material payments for each supplier
      for (const summary of supplierSummaries) {
        // Generate reference code
        const { data: referenceCode } = await supabase.rpc('generate_material_payment_reference');
        if (!referenceCode) throw new Error('No se pudo generar código de referencia');

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
          .from('treasury_material_payments')
          .insert({
            reference_code: referenceCode,
            supplier_id: summary.supplier_id || null,
            supplier_name: summary.supplier_name,
            total_amount: summary.total_amount,
            material_count: summary.items_count,
            created_by: profile.id
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Create payment items for tracking
        const supplierRequests = selectedRequests.filter(r => 
          (r.supplier_id || 'sin-proveedor') === (summary.supplier_id || 'sin-proveedor')
        );

        const paymentItems = supplierRequests.map(request => ({
          payment_id: payment.id,
          material_finance_request_id: request.id,
          amount: calculateFinalCost(
            request.unit_cost || 0,
            request.adjustment_additive || 0,
            request.adjustment_deductive || 0,
            request.quantity_required
          )
        }));

        const { error: itemsError } = await supabase
          .from('treasury_material_payment_items')
          .insert(paymentItems);

        if (itemsError) throw itemsError;

        // Update material finance requests as exported
        const { error: updateError } = await supabase
          .from('material_finance_requests')
          .update({
            exported_to_treasury: true,
            treasury_export_date: new Date().toISOString(),
            payment_reference: referenceCode
          })
          .in('id', supplierRequests.map(r => r.id));

        if (updateError) throw updateError;
      }

      toast.success(`${supplierSummaries.length} agrupaciones exportadas a tesorería correctamente`);
      
      // Reset selections and refresh
      setSelectedForPayment(new Set());
      fetchRequests();

    } catch (error) {
      console.error('Error exporting to treasury:', error);
      toast.error('Error al exportar a tesorería');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter requests based on search and filters
  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.descripcion_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || request.status === statusFilter;
    const matchesAttended = !attendedFilter || attendedFilter === "all" || 
      (attendedFilter === "attended" && request.is_attended) ||
      (attendedFilter === "pending" && !request.is_attended);
    
    return matchesSearch && matchesStatus && matchesAttended;
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      attended: { label: "Atendido", variant: "default" as const },
      ordered: { label: "Ordenado", variant: "default" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant} className={status === 'ordered' ? 'bg-green-600 text-white' : ''}>{config.label}</Badge>;
  };

  const calculateFinalCost = (unitCost: number, additive: number, deductive: number, quantity: number) => {
    const finalUnitCost = unitCost + additive - deductive;
    return finalUnitCost * quantity;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Solicitudes de Materiales
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión de órdenes de compra para materiales requeridos
            </p>
          </div>
          <Badge variant="outline">
            {filteredRequests.length} solicitudes
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Payment Selection Summary */}
        {selectedForPayment.size > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-700">Resumen por Proveedor</h3>
              </div>
              <Button
                onClick={handleExportToTreasury}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isExporting ? "Exportando..." : "Pagar y Exportar a Tesorería"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getSupplierSummaries().map((summary, index) => (
                <div key={`supplier-${summary?.supplier_name || index}`} className="bg-white p-3 rounded border">
                  <p className="font-medium text-gray-900">{summary?.supplier_name || 'Proveedor sin nombre'}</p>
                  <p className="text-lg font-bold text-green-600">
                    ${(summary?.total_amount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {summary?.items_count || 0} material{(summary?.items_count || 0) !== 1 ? 'es' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar materiales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="attended">Atendido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={attendedFilter} onValueChange={setAttendedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por atención" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Sin atender</SelectItem>
              <SelectItem value="attended">Atendidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No se encontraron solicitudes</p>
            <p className="text-muted-foreground">
              Las solicitudes aparecerán cuando los materiales cambien a estado "Requerido"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Panel de Control Financiero</p>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Marque como "Ordenado" los materiales que ya fueron solicitados al proveedor
              </p>
            </div>
            <table className="w-full border border-border rounded-lg overflow-hidden">
              <thead>
                 <tr className="border-b bg-muted/50">
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedForPayment.size === filteredRequests.length && filteredRequests.length > 0}
                        onCheckedChange={toggleAllPaymentSelections}
                      />
                      <span>Selección para Pago</span>
                    </div>
                  </th>
                  <th className="text-left p-3 font-semibold">Material</th>
                  <th className="text-left p-3 font-semibold">Cliente/Proyecto</th>
                  <th className="text-left p-3 font-semibold">Cantidad</th>
                  <th className="text-left p-3 font-semibold">Costo Total</th>
                  <th className="text-left p-3 font-semibold">Proveedor</th>
                  <th className="text-left p-3 font-semibold">Solicitado</th>
                  <th className="text-left p-3 font-semibold">Estado</th>
                  <th className="text-center p-3 font-semibold">Ordenado</th>
                  <th className="text-center p-3 font-semibold">Atendido</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const isOrdered = request.status === 'ordered';
                  return (
                    <tr key={request.id} className={`border-b hover:bg-muted/30 transition-colors ${isOrdered ? 'bg-green-50/50' : ''}`}>
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={selectedForPayment.has(request.id)}
                          onCheckedChange={() => togglePaymentSelection(request.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{request.material_name}</p>
                          {request.descripcion_producto && (
                            <p className="text-sm text-muted-foreground">{request.descripcion_producto}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-foreground">{request.client_name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">{request.project_name}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {request.quantity_required} {request.unit_of_measure}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <p className="font-bold text-green-700">
                              ${calculateFinalCost(
                                request.unit_cost || 0,
                                request.adjustment_additive || 0,
                                request.adjustment_deductive || 0,
                                request.quantity_required
                              ).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ${((request.unit_cost || 0) + (request.adjustment_additive || 0) - (request.adjustment_deductive || 0)).toLocaleString()} / {request.unit_of_measure}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        {request.supplier_name ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{request.supplier_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Sin proveedor asignado</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">
                              {format(new Date(request.request_date), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {request.requester_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(request.status)}</td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isOrdered}
                            onCheckedChange={(checked) => handleOrderedToggle(request.id, request.material_requirement_id, !!checked)}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={request.is_attended}
                            onCheckedChange={(checked) => handleAttendedToggle(request.id, !!checked)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}