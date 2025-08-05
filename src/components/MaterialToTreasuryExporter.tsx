import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ShoppingCart, Download, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MaterialFinanceRequest {
  id: string;
  material_requirement_id: string;
  supplier_id: string;
  material_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier_name: string;
  client_name: string;
  project_name: string;
  client_id: string;
  project_id: string;
  status: string;
}

interface SupplierSummary {
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  items: MaterialFinanceRequest[];
}

interface MaterialToTreasuryExporterProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const MaterialToTreasuryExporter: React.FC<MaterialToTreasuryExporterProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [requests, setRequests] = useState<MaterialFinanceRequest[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterialRequests();
  }, [selectedClientId, selectedProjectId]);

  const fetchMaterialRequests = async () => {
    try {
      // Fetch material finance requests without joins first
      let query = supabase
        .from('material_finance_requests')
        .select('*')
        .in('status', ['pending', 'not_attended']);

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data: requests, error } = await query;

      if (error) throw error;

      // Get related data separately to avoid JOIN issues
      const [materialReqs, suppliers, clients, projects] = await Promise.all([
        supabase.from('material_requirements').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('client_projects').select('*')
      ]);

      const formattedRequests: MaterialFinanceRequest[] = (requests || []).map((request: any) => {
        const materialReq = materialReqs.data?.find(mr => mr.id === request.material_requirement_id);
        const supplier = suppliers.data?.find(s => s.id === (request.supplier_id || materialReq?.supplier_id));
        const client = clients.data?.find(c => c.id === request.client_id);
        const project = projects.data?.find(p => p.id === request.project_id);

        return {
          id: request.id,
          material_requirement_id: request.material_requirement_id,
          supplier_id: request.supplier_id || materialReq?.supplier_id,
          client_id: request.client_id,
          project_id: request.project_id,
          status: request.status,
          material_name: materialReq?.material_name || 'Material no especificado',
          quantity: materialReq?.quantity_required || 1,
          unit_cost: materialReq?.unit_cost || 0,
          total_cost: materialReq?.total_cost || 0,
          supplier_name: supplier?.company_name || 'Sin proveedor',
          client_name: client?.full_name || '',
          project_name: project?.project_name || ''
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching material requests:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes de materiales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === requests.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(requests.map(r => r.id)));
    }
  };

  const getSupplierSummaries = (): SupplierSummary[] => {
    const selectedRequests = requests.filter(r => selectedItems.has(r.id));
    const supplierMap = new Map<string, SupplierSummary>();

    selectedRequests.forEach(request => {
      const key = request.supplier_id;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplier_id: request.supplier_id,
          supplier_name: request.supplier_name,
          total_amount: 0,
          items: []
        });
      }
      
      const summary = supplierMap.get(key)!;
      summary.total_amount += request.total_cost;
      summary.items.push(request);
    });

    return Array.from(supplierMap.values());
  };

  const handleExportToTreasury = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Selección requerida",
        description: "Selecciona al menos un material para exportar",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const supplierSummaries = getSupplierSummaries();

      // Create payment references for each supplier
      for (const summary of supplierSummaries) {
        // Generate reference code
        const { data: referenceCode } = await supabase
          .rpc('generate_payment_reference');

        if (!referenceCode) throw new Error('Could not generate reference code');

        // Create payment reference
        const { data: paymentRef, error: refError } = await supabase
          .from('treasury_payment_references')
          .insert([{
            reference_code: referenceCode,
            supplier_id: summary.supplier_id,
            total_amount: summary.total_amount,
            account_type: 'bank', // Default to bank
            account_id: '', // Will be filled when actual payment is made
            notes: `Agrupación de materiales: ${summary.items.map(i => i.material_name).join(', ')}`,
            created_by: profile.id
          }])
          .select()
          .single();

        if (refError) throw refError;

        // Create individual treasury transactions for each material
        const transactions = summary.items.map(item => ({
          transaction_type: 'expense',
          account_type: 'bank',
          account_id: '', // Will be filled when actual payment is made
          client_id: item.client_id,
          project_id: item.project_id,
          supplier_id: item.supplier_id,
          department: 'construccion',
          transaction_date: new Date().toISOString().split('T')[0],
          amount: item.total_cost,
          description: `Material: ${item.material_name} - Cantidad: ${item.quantity}`,
          cuenta_mayor: '5110', // Materiales
          partida: item.material_name,
          unit: 'pieza',
          quantity: item.quantity,
          cost_per_unit: item.unit_cost,
          payment_reference_id: paymentRef.id,
          comments: `Exportado desde solicitudes de materiales. Ref: ${referenceCode}`,
          status: 'pending_payment',
          created_by: profile.id
        }));

        const { error: transError } = await supabase
          .from('treasury_transactions')
          .insert(transactions);

        if (transError) throw transError;

        // Update material finance requests status
        const { error: updateError } = await supabase
          .from('material_finance_requests')
          .update({ 
            status: 'exported_to_treasury',
            is_attended: true
          })
          .in('id', summary.items.map(i => i.id));

        if (updateError) throw updateError;
      }

      toast({
        title: "Éxito",
        description: `${supplierSummaries.length} agrupaciones exportadas a tesorería correctamente`
      });

      // Refresh the list
      fetchMaterialRequests();
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error exporting to treasury:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar a tesorería",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show the component if there are no pending requests
  }

  const supplierSummaries = getSupplierSummaries();
  const totalSelected = supplierSummaries.reduce((sum, summary) => sum + summary.total_amount, 0);

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <ShoppingCart className="h-5 w-5" />
          Materiales Pendientes de Financiamiento
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-orange-600">
          <AlertCircle className="h-4 w-4" />
          {requests.length} solicitudes pendientes de exportar a tesorería
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedItems.size === requests.length && requests.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Seleccionar todos ({requests.length})
            </label>
          </div>
          
          {selectedItems.size > 0 && (
            <Button
              onClick={handleExportToTreasury}
              disabled={exporting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exportando..." : `Exportar a Tesorería (${selectedItems.size})`}
            </Button>
          )}
        </div>

        {/* Selected Summary */}
        {selectedItems.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-800 mb-3">Resumen por Proveedor</h4>
              <div className="space-y-2">
                {supplierSummaries.map((summary) => (
                  <div key={summary.supplier_id} className="flex justify-between items-center">
                    <span className="text-sm">{summary.supplier_name}</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(summary.total_amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {summary.items.length} material{summary.items.length !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(totalSelected)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Materials List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`p-3 border rounded-lg transition-colors ${
                selectedItems.has(request.id) 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={selectedItems.has(request.id)}
                  onCheckedChange={() => toggleSelectItem(request.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium truncate">{request.material_name}</h5>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(request.total_cost)}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.quantity} × {formatCurrency(request.unit_cost)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium">{request.supplier_name}</span>
                    {request.client_name && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{request.client_name}</span>
                      </>
                    )}
                    {request.project_name && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{request.project_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};