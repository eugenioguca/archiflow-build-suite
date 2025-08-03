-- Continuar implementación sin RLS en vista materializada (no soportado)

-- 1. Remover la vista materializada del API público creando una función en su lugar
CREATE OR REPLACE FUNCTION public.get_financial_summary_by_client_project()
RETURNS TABLE (
  project_id UUID,
  client_id UUID,
  project_name TEXT,
  client_name TEXT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_profit NUMERIC,
  profit_margin NUMERIC,
  project_status TEXT,
  sales_pipeline_stage TEXT,
  estimated_budget NUMERIC,
  construction_budget NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo permitir acceso a empleados y admins
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
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
END;
$$;

-- 2. Crear función para obtener resumen financiero filtrado por cliente
CREATE OR REPLACE FUNCTION public.get_financial_summary_by_client(client_filter UUID DEFAULT NULL)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_projects BIGINT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_profit NUMERIC,
  profit_margin NUMERIC,
  active_projects BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo permitir acceso a empleados y admins
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.full_name as client_name,
    COUNT(cp.id) as total_projects,
    COALESCE(SUM(inc.total_income), 0) as total_income,
    COALESCE(SUM(exp.total_expenses), 0) as total_expenses,
    COALESCE(SUM(inc.total_income), 0) - COALESCE(SUM(exp.total_expenses), 0) as net_profit,
    CASE 
      WHEN COALESCE(SUM(inc.total_income), 0) > 0 
      THEN ((COALESCE(SUM(inc.total_income), 0) - COALESCE(SUM(exp.total_expenses), 0)) / COALESCE(SUM(inc.total_income), 0)) * 100
      ELSE 0 
    END as profit_margin,
    COUNT(CASE WHEN cp.status NOT IN ('completed', 'cancelled') THEN 1 END) as active_projects
  FROM public.clients c
  LEFT JOIN public.client_projects cp ON c.id = cp.client_id
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
  ) exp ON cp.id = exp.project_id
  WHERE (client_filter IS NULL OR c.id = client_filter)
  GROUP BY c.id, c.full_name
  ORDER BY net_profit DESC;
END;
$$;

-- 3. Función para análisis de rentabilidad detallado
CREATE OR REPLACE FUNCTION public.get_profitability_analysis(
  analysis_type TEXT DEFAULT 'project', -- 'project', 'client', 'category'
  period_start DATE DEFAULT NULL,
  period_end DATE DEFAULT NULL,
  limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  revenue NUMERIC,
  costs NUMERIC,
  gross_profit NUMERIC,
  gross_margin NUMERIC,
  transaction_count BIGINT,
  additional_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date DATE := COALESCE(period_start, CURRENT_DATE - INTERVAL '30 days');
  end_date DATE := COALESCE(period_end, CURRENT_DATE);
BEGIN
  -- Solo permitir acceso a empleados y admins
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF analysis_type = 'project' THEN
    RETURN QUERY
    SELECT 
      cp.id::TEXT,
      cp.project_name as name,
      COALESCE(inc.total, 0) as revenue,
      COALESCE(exp.total, 0) as costs,
      COALESCE(inc.total, 0) - COALESCE(exp.total, 0) as gross_profit,
      CASE 
        WHEN COALESCE(inc.total, 0) > 0 
        THEN ((COALESCE(inc.total, 0) - COALESCE(exp.total, 0)) / COALESCE(inc.total, 0)) * 100
        ELSE 0 
      END as gross_margin,
      COALESCE(inc.count, 0) + COALESCE(exp.count, 0) as transaction_count,
      jsonb_build_object(
        'client_name', c.full_name,
        'status', cp.status,
        'budget', cp.budget,
        'progress', cp.overall_progress_percentage
      ) as additional_data
    FROM public.client_projects cp
    LEFT JOIN public.clients c ON cp.client_id = c.id
    LEFT JOIN (
      SELECT project_id, SUM(amount) as total, COUNT(*) as count
      FROM public.incomes
      WHERE project_id IS NOT NULL 
        AND expense_date >= start_date 
        AND expense_date <= end_date
      GROUP BY project_id
    ) inc ON cp.id = inc.project_id
    LEFT JOIN (
      SELECT project_id, SUM(amount) as total, COUNT(*) as count
      FROM public.expenses
      WHERE project_id IS NOT NULL 
        AND expense_date >= start_date 
        AND expense_date <= end_date
      GROUP BY project_id
    ) exp ON cp.id = exp.project_id
    WHERE inc.total IS NOT NULL OR exp.total IS NOT NULL
    ORDER BY gross_profit DESC
    LIMIT limit_results;
    
  ELSIF analysis_type = 'client' THEN
    RETURN QUERY
    SELECT 
      c.id::TEXT,
      c.full_name as name,
      COALESCE(inc.total, 0) as revenue,
      COALESCE(exp.total, 0) as costs,
      COALESCE(inc.total, 0) - COALESCE(exp.total, 0) as gross_profit,
      CASE 
        WHEN COALESCE(inc.total, 0) > 0 
        THEN ((COALESCE(inc.total, 0) - COALESCE(exp.total, 0)) / COALESCE(inc.total, 0)) * 100
        ELSE 0 
      END as gross_margin,
      COALESCE(inc.count, 0) + COALESCE(exp.count, 0) as transaction_count,
      jsonb_build_object(
        'project_count', COALESCE(proj.count, 0),
        'avg_project_value', CASE WHEN COALESCE(proj.count, 0) > 0 THEN COALESCE(inc.total, 0) / proj.count ELSE 0 END
      ) as additional_data
    FROM public.clients c
    LEFT JOIN (
      SELECT client_id, SUM(amount) as total, COUNT(*) as count
      FROM public.incomes
      WHERE client_id IS NOT NULL 
        AND expense_date >= start_date 
        AND expense_date <= end_date
      GROUP BY client_id
    ) inc ON c.id = inc.client_id
    LEFT JOIN (
      SELECT client_id, SUM(amount) as total, COUNT(*) as count
      FROM public.expenses
      WHERE client_id IS NOT NULL 
        AND expense_date >= start_date 
        AND expense_date <= end_date
      GROUP BY client_id
    ) exp ON c.id = exp.client_id
    LEFT JOIN (
      SELECT client_id, COUNT(*) as count
      FROM public.client_projects
      GROUP BY client_id
    ) proj ON c.id = proj.client_id
    WHERE inc.total IS NOT NULL OR exp.total IS NOT NULL
    ORDER BY gross_profit DESC
    LIMIT limit_results;
    
  ELSIF analysis_type = 'category' THEN
    RETURN QUERY
    SELECT 
      COALESCE(combined.category, 'Sin categoría') as id,
      COALESCE(combined.category, 'Sin categoría') as name,
      COALESCE(combined.income_total, 0) as revenue,
      COALESCE(combined.expense_total, 0) as costs,
      COALESCE(combined.income_total, 0) - COALESCE(combined.expense_total, 0) as gross_profit,
      CASE 
        WHEN COALESCE(combined.income_total, 0) > 0 
        THEN ((COALESCE(combined.income_total, 0) - COALESCE(combined.expense_total, 0)) / COALESCE(combined.income_total, 0)) * 100
        ELSE 0 
      END as gross_margin,
      COALESCE(combined.total_transactions, 0) as transaction_count,
      jsonb_build_object(
        'income_transactions', COALESCE(combined.income_count, 0),
        'expense_transactions', COALESCE(combined.expense_count, 0)
      ) as additional_data
    FROM (
      SELECT 
        COALESCE(inc.category, exp.category) as category,
        COALESCE(inc.total, 0) as income_total,
        COALESCE(exp.total, 0) as expense_total,
        COALESCE(inc.count, 0) as income_count,
        COALESCE(exp.count, 0) as expense_count,
        COALESCE(inc.count, 0) + COALESCE(exp.count, 0) as total_transactions
      FROM (
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM public.incomes
        WHERE expense_date >= start_date AND expense_date <= end_date
        GROUP BY category
      ) inc
      FULL OUTER JOIN (
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM public.expenses
        WHERE expense_date >= start_date AND expense_date <= end_date
        GROUP BY category
      ) exp ON inc.category = exp.category
    ) combined
    ORDER BY gross_profit DESC
    LIMIT limit_results;
  END IF;
END;
$$;