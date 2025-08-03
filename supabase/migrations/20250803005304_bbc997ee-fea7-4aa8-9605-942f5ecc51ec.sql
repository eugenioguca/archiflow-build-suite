-- FASE 1: REESTRUCTURACIÓN DE DATOS PARA ARQUITECTURA CLIENTE-PROYECTO

-- 1. Asegurar que todas las tablas financieras tengan referencias a client_projects
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);

ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);

-- 2. Crear índices para optimizar filtros por cliente-proyecto
CREATE INDEX IF NOT EXISTS idx_expenses_client_project ON public.expenses(client_id, project_id);
CREATE INDEX IF NOT EXISTS idx_incomes_client_project ON public.incomes(client_id, project_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_client_project ON public.cash_transactions(client_id, project_id);

-- 3. Función para heredar datos de client_projects automáticamente
CREATE OR REPLACE FUNCTION public.inherit_client_project_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se proporciona project_id pero no client_id, heredar client_id del proyecto
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM public.client_projects
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers para herencia automática de datos
CREATE TRIGGER trigger_expenses_inherit_client_project
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_project_data();

CREATE TRIGGER trigger_incomes_inherit_client_project
  BEFORE INSERT OR UPDATE ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_project_data();

CREATE TRIGGER trigger_cash_transactions_inherit_client_project
  BEFORE INSERT OR UPDATE ON public.cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_client_project_data();

-- 5. Función para conectar automáticamente diseño con finanzas
CREATE OR REPLACE FUNCTION public.create_design_expense()
RETURNS TRIGGER AS $$
DECLARE
  project_client_id UUID;
  expense_description TEXT;
BEGIN
  -- Obtener client_id del proyecto
  SELECT client_id INTO project_client_id
  FROM public.client_projects
  WHERE id = NEW.project_id;
  
  -- Crear descripción del gasto
  expense_description := 'Costo de diseño - Fase: ' || NEW.phase_name;
  
  -- Solo crear gasto si la fase está completada y no existe ya un gasto relacionado
  IF NEW.status = 'completed' AND NEW.actual_completion_date IS NOT NULL THEN
    -- Verificar si ya existe un gasto para esta fase
    IF NOT EXISTS (
      SELECT 1 FROM public.expenses 
      WHERE description LIKE '%' || NEW.phase_name || '%' 
      AND project_id = NEW.project_id
    ) THEN
      -- Crear gasto automático por diseño (costo estimado base)
      INSERT INTO public.expenses (
        project_id,
        client_id,
        category,
        description,
        amount,
        expense_date,
        created_by
      ) VALUES (
        NEW.project_id,
        project_client_id,
        'design',
        expense_description,
        CASE NEW.phase_name
          WHEN 'Zonificación' THEN 15000
          WHEN 'Volumetría' THEN 20000
          WHEN 'Acabados' THEN 25000
          WHEN 'Renders' THEN 30000
          ELSE 10000
        END,
        NEW.actual_completion_date,
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para conectar diseño con finanzas
CREATE TRIGGER trigger_design_phases_create_expense
  AFTER UPDATE ON public.design_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.create_design_expense();

-- 7. Función para conectar construcción con finanzas
CREATE OR REPLACE FUNCTION public.update_construction_costs()
RETURNS TRIGGER AS $$
DECLARE
  project_client_id UUID;
BEGIN
  -- Obtener client_id del proyecto
  SELECT client_id INTO project_client_id
  FROM public.client_projects
  WHERE id = NEW.project_id;
  
  -- Si se ejecuta cantidad real, crear/actualizar gasto
  IF NEW.executed_amount > OLD.executed_amount THEN
    -- Insertar o actualizar gasto de construcción
    INSERT INTO public.expenses (
      project_id,
      client_id,
      category,
      description,
      amount,
      expense_date,
      created_by
    ) VALUES (
      NEW.project_id,
      project_client_id,
      'construction',
      'Ejecución: ' || NEW.item_name,
      NEW.executed_amount - OLD.executed_amount,
      CURRENT_DATE,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para actualizar costos de construcción
CREATE TRIGGER trigger_construction_budget_update_costs
  AFTER UPDATE ON public.construction_budget_items
  FOR EACH ROW
  WHEN (NEW.executed_amount > OLD.executed_amount)
  EXECUTE FUNCTION public.update_construction_costs();

-- 9. Vista materializada para reportes financieros por cliente-proyecto
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
  cp.status as project_status,
  cp.sales_pipeline_stage,
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

-- 10. Crear índice en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_summary_project_id 
ON public.financial_summary_by_client_project(project_id);

-- 11. Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION public.refresh_financial_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.financial_summary_by_client_project;
END;
$$ LANGUAGE plpgsql;

-- 12. Trigger para refrescar automáticamente la vista cuando cambien los datos
CREATE OR REPLACE FUNCTION public.trigger_refresh_financial_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Ejecutar refresh en background (se puede optimizar con jobs)
  PERFORM public.refresh_financial_summary();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de refresh
CREATE TRIGGER trigger_expenses_refresh_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_financial_summary();

CREATE TRIGGER trigger_incomes_refresh_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.incomes
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_financial_summary();