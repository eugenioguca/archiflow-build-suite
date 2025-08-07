-- Crear la vista materializada simplificada usando solo tablas existentes
CREATE MATERIALIZED VIEW IF NOT EXISTS public.financial_summary_by_client_project AS
SELECT 
    cp.id as project_id,
    cp.client_id,
    cp.project_name,
    c.full_name as client_name,
    0::numeric as total_income,  -- Por ahora 0 hasta que se implemente sistema de ingresos
    COALESCE(exp.total_expenses, 0) as total_expenses,
    0 - COALESCE(exp.total_expenses, 0) as net_profit,
    CASE 
      WHEN COALESCE(exp.total_expenses, 0) > 0 
      THEN -100  -- Muestra pérdida cuando hay gastos sin ingresos
      ELSE 0 
    END as profit_margin,
    cp.status::TEXT as project_status,
    cp.sales_pipeline_stage::TEXT,
    cp.budget as estimated_budget,
    cp.construction_budget as construction_budget
FROM public.client_projects cp
LEFT JOIN public.clients c ON cp.client_id = c.id
LEFT JOIN (
    SELECT 
      project_id,
      SUM(amount) as total_expenses
    FROM public.expenses
    WHERE project_id IS NOT NULL
    GROUP BY project_id
  ) exp ON cp.id = exp.project_id;

-- Crear índice único para permitir REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS financial_summary_by_client_project_unique_idx 
ON public.financial_summary_by_client_project (project_id);

-- Hacer el primer refresh para poblar la vista
REFRESH MATERIALIZED VIEW public.financial_summary_by_client_project;