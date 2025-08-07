-- Crear la vista materializada que está faltando para evitar errores en triggers
CREATE MATERIALIZED VIEW IF NOT EXISTS public.financial_summary_by_client_project AS
SELECT 
    cp.id as project_id,
    cp.client_id,
    cp.project_name,
    c.full_name as client_name,
    COALESCE(inc.total_income, 0) as total_income,
    COALESCE(exp.total_expenses, 0) as total_expenses,
    COALESCE(inc.total_income, 0) - COALESCE(exp.total_expenses, 0) as net_profit,
    CASE 
      WHEN COALESCE(inc.total_income, 0) > 0 
      THEN ((COALESCE(inc.total_income, 0) - COALESCE(exp.total_expenses, 0)) / COALESCE(inc.total_income, 0)) * 100
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
      SUM(amount) as total_income
    FROM public.incomes
    WHERE project_id IS NOT NULL
    GROUP BY project_id
  ) inc ON cp.id = inc.project_id
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