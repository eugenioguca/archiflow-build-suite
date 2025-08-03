-- Corregir advertencias de seguridad: establecer search_path en funciones

-- 1. Actualizar función inherit_client_project_data con search_path
CREATE OR REPLACE FUNCTION public.inherit_client_project_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si se proporciona project_id pero no client_id, heredar client_id del proyecto
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT client_id INTO NEW.client_id
    FROM public.client_projects
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Actualizar función create_design_expense con search_path
CREATE OR REPLACE FUNCTION public.create_design_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 3. Actualizar función update_construction_costs con search_path
CREATE OR REPLACE FUNCTION public.update_construction_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 4. Actualizar función refresh_financial_summary con search_path
CREATE OR REPLACE FUNCTION public.refresh_financial_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.financial_summary_by_client_project;
END;
$$;

-- 5. Actualizar función trigger_refresh_financial_summary con search_path
CREATE OR REPLACE FUNCTION public.trigger_refresh_financial_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ejecutar refresh en background (se puede optimizar con jobs)
  PERFORM public.refresh_financial_summary();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Proteger la vista materializada con RLS
ALTER TABLE public.financial_summary_by_client_project ENABLE ROW LEVEL SECURITY;

-- 7. Política RLS para la vista materializada
CREATE POLICY "Employees and admins can view financial summary"
ON public.financial_summary_by_client_project
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);