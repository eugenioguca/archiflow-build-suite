/**
 * Planning v2 - Index page
 * Lista de presupuestos con estado vacío
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { BudgetListItem } from '../types';

export default function PlanningV2Index() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planning_budgets')
        .select(`
          id,
          name,
          status,
          created_at,
          updated_at,
          project_id,
          client_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include project and client names
      const budgetsWithNames: BudgetListItem[] = await Promise.all(
        (data || []).map(async (budget) => {
          let projectName = null;
          let clientName = null;

          if (budget.project_id) {
            const { data: project } = await supabase
              .from('client_projects')
              .select('project_name')
              .eq('id', budget.project_id)
              .single();
            projectName = project?.project_name || null;
          }

          if (budget.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', budget.client_id)
              .single();
            clientName = client?.full_name || null;
          }

          return {
            id: budget.id,
            name: budget.name,
            project_name: projectName,
            client_name: clientName,
            status: budget.status as 'draft' | 'published' | 'closed',
            created_at: budget.created_at,
            updated_at: budget.updated_at
          };
        })
      );

      setBudgets(budgetsWithNames);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewBudget = () => {
    // TODO: Open create budget dialog
    console.log('Crear nuevo presupuesto');
  };

  const filteredBudgets = budgets.filter((budget) =>
    budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    budget.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      published: { label: 'Publicado', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Cerrado', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planeación v2 (Beta)</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona presupuestos con el nuevo sistema de planeación
          </p>
        </div>
        <Button onClick={handleNewBudget} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo presupuesto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Presupuestos
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar presupuestos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {budgets.length === 0 ? 'Sin presupuestos todavía' : 'No se encontraron presupuestos'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {budgets.length === 0 
                  ? 'Crea tu primer presupuesto para comenzar' 
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {budgets.length === 0 && (
                <Button onClick={handleNewBudget} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer presupuesto
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/planning-v2/budgets/${budget.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium truncate">{budget.name}</h4>
                      {getStatusBadge(budget.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {budget.project_name && (
                        <span>Proyecto: {budget.project_name}</span>
                      )}
                      {budget.client_name && (
                        <span>Cliente: {budget.client_name}</span>
                      )}
                      <span>
                        Creado: {new Date(budget.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {budgets.length > 0 && (
            <div className="text-center mt-6">
              <p className="text-xs text-muted-foreground">
                {filteredBudgets.length === budgets.length 
                  ? `${budgets.length} presupuesto${budgets.length !== 1 ? 's' : ''} total${budgets.length !== 1 ? 'es' : ''}`
                  : `${filteredBudgets.length} de ${budgets.length} presupuestos`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
