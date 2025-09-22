-- Crear tabla transaction_allocations para vincular transacciones con items de presupuesto
CREATE TABLE IF NOT EXISTS public.transaction_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unified_transaction_id UUID NOT NULL REFERENCES public.unified_financial_transactions(id) ON DELETE CASCADE,
  budget_item_id UUID NOT NULL REFERENCES public.construction_budget_items(id) ON DELETE CASCADE,
  allocated_quantity NUMERIC NOT NULL DEFAULT 0,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  allocation_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unified_transaction_id, budget_item_id)
);

-- Crear tabla budget_supply_status para el estado de suministro
CREATE TABLE IF NOT EXISTS public.budget_supply_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id UUID NOT NULL REFERENCES public.construction_budget_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, solicitado, parcial, completo
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla construction_settings para configuraciones
CREATE TABLE IF NOT EXISTS public.construction_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  lead_days_default INTEGER NOT NULL DEFAULT 4,
  alert_threshold_days INTEGER NOT NULL DEFAULT 7,
  eac_method_default TEXT NOT NULL DEFAULT 'actual_cost',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Crear tabla budget_annotations para notas del presupuesto
CREATE TABLE IF NOT EXISTS public.budget_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id UUID NOT NULL REFERENCES public.construction_budget_items(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL DEFAULT 'note', -- note, alert, issue, resolution
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar campos necesarios a construction_budget_items si no existen
ALTER TABLE public.construction_budget_items 
ADD COLUMN IF NOT EXISTS source_budget_item_id UUID REFERENCES public.presupuesto_ejecutivo_subpartida(id),
ADD COLUMN IF NOT EXISTS baseline_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_unit_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_eac_method TEXT DEFAULT 'actual_cost',
ADD COLUMN IF NOT EXISTS manual_eac_price NUMERIC,
ADD COLUMN IF NOT EXISTS is_baseline_locked BOOLEAN DEFAULT true;

-- RLS Policies
ALTER TABLE public.transaction_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_supply_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_annotations ENABLE ROW LEVEL SECURITY;

-- Policies para transaction_allocations
CREATE POLICY "Employees can manage transaction allocations" ON public.transaction_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

-- Policies para budget_supply_status  
CREATE POLICY "Employees can manage budget supply status" ON public.budget_supply_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

-- Policies para construction_settings
CREATE POLICY "Employees can manage construction settings" ON public.construction_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

-- Policies para budget_annotations
CREATE POLICY "Employees can manage budget annotations" ON public.budget_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

-- Vista para rollup del presupuesto de construcción
CREATE OR REPLACE VIEW public.v_construction_budget_rollup AS
SELECT 
  cbi.id,
  cbi.project_id,
  cbi.item_name,
  cbi.item_description,
  cbi.category,
  cbi.unit_of_measure,
  cbi.baseline_quantity,
  cbi.baseline_unit_price,
  cbi.baseline_total,
  cbi.current_eac_method,
  cbi.manual_eac_price,
  
  -- Cantidades y montos comprados
  COALESCE(ta.purchased_quantity, 0) as purchased_quantity,
  COALESCE(ta.purchased_amount, 0) as purchased_amount,
  COALESCE(ta.avg_unit_price, 0) as avg_unit_price,
  
  -- Saldos
  (cbi.baseline_quantity - COALESCE(ta.purchased_quantity, 0)) as remaining_quantity,
  
  -- EAC (Estimate at Completion)
  CASE 
    WHEN cbi.current_eac_method = 'manual' THEN 
      cbi.manual_eac_price * cbi.baseline_quantity
    WHEN cbi.current_eac_method = 'weighted_avg' AND COALESCE(ta.avg_unit_price, 0) > 0 THEN 
      ta.avg_unit_price * cbi.baseline_quantity
    ELSE 
      cbi.baseline_total
  END as eac_total,
  
  -- Variaciones
  CASE 
    WHEN cbi.current_eac_method = 'manual' THEN 
      (cbi.manual_eac_price * cbi.baseline_quantity) - cbi.baseline_total
    WHEN cbi.current_eac_method = 'weighted_avg' AND COALESCE(ta.avg_unit_price, 0) > 0 THEN 
      (ta.avg_unit_price * cbi.baseline_quantity) - cbi.baseline_total
    ELSE 0
  END as cost_variance,
  
  -- Estado de suministro
  COALESCE(bss.status, 'pendiente') as supply_status,
  
  -- Porcentaje de completado
  CASE 
    WHEN cbi.baseline_quantity > 0 THEN 
      (COALESCE(ta.purchased_quantity, 0) / cbi.baseline_quantity) * 100
    ELSE 0
  END as completion_percentage,
  
  -- Datos relacionados del catálogo de cuentas
  cbi.source_budget_item_id,
  pes.mayor_id,
  pes.partida_id, 
  pes.subpartida_id,
  cam.nombre as mayor_nombre,
  cap.nombre as partida_nombre,
  cas.nombre as subpartida_nombre
  
FROM public.construction_budget_items cbi
LEFT JOIN public.presupuesto_ejecutivo_subpartida pes ON cbi.source_budget_item_id = pes.id
LEFT JOIN public.chart_of_accounts_mayor cam ON pes.mayor_id = cam.id
LEFT JOIN public.chart_of_accounts_partidas cap ON pes.partida_id = cap.id
LEFT JOIN public.chart_of_accounts_subpartidas cas ON pes.subpartida_id = cas.id
LEFT JOIN public.budget_supply_status bss ON cbi.id = bss.budget_item_id
LEFT JOIN (
  SELECT 
    ta.budget_item_id,
    SUM(ta.allocated_quantity) as purchased_quantity,
    SUM(ta.allocated_amount) as purchased_amount,
    CASE 
      WHEN SUM(ta.allocated_quantity) > 0 THEN 
        SUM(ta.allocated_amount) / SUM(ta.allocated_quantity)
      ELSE 0
    END as avg_unit_price
  FROM public.transaction_allocations ta
  JOIN public.unified_financial_transactions uft ON ta.unified_transaction_id = uft.id
  WHERE uft.status = 'approved'
  GROUP BY ta.budget_item_id
) ta ON cbi.id = ta.budget_item_id;

-- Función para obtener alertas de materiales por cronograma
CREATE OR REPLACE FUNCTION public.get_material_alerts_by_schedule(project_id_param UUID)
RETURNS TABLE(
  mayor_id UUID,
  mayor_nombre TEXT,
  items_pending BIGINT,
  total_pending_amount NUMERIC,
  earliest_start_date DATE,
  alert_priority TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vr.mayor_id,
    vr.mayor_nombre,
    COUNT(*) as items_pending,
    SUM(vr.remaining_quantity * COALESCE(vr.avg_unit_price, vr.baseline_unit_price)) as total_pending_amount,
    MIN(cga.fecha_inicio)::DATE as earliest_start_date,
    CASE 
      WHEN MIN(cga.fecha_inicio)::DATE <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
      WHEN MIN(cga.fecha_inicio)::DATE <= CURRENT_DATE + INTERVAL '4 days' THEN 'high'
      ELSE 'medium'
    END as alert_priority
  FROM public.v_construction_budget_rollup vr
  JOIN public.cronograma_gantt_actividades cga ON vr.mayor_id = cga.mayor_id 
  WHERE vr.project_id = project_id_param
    AND vr.remaining_quantity > 0
    AND cga.fecha_inicio <= CURRENT_DATE + INTERVAL '7 days'
    AND cga.project_id = project_id_param
  GROUP BY vr.mayor_id, vr.mayor_nombre
  ORDER BY earliest_start_date ASC;
END;
$$;

-- Trigger para actualizar budget_supply_status automáticamente
CREATE OR REPLACE FUNCTION public.update_budget_supply_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estado basado en las transacciones asignadas
  UPDATE public.budget_supply_status 
  SET 
    status = CASE 
      WHEN vr.completion_percentage >= 100 THEN 'completo'
      WHEN vr.completion_percentage > 0 THEN 'parcial'
      WHEN EXISTS (
        SELECT 1 FROM public.transaction_allocations ta2
        JOIN public.unified_financial_transactions uft2 ON ta2.unified_transaction_id = uft2.id
        WHERE ta2.budget_item_id = NEW.budget_item_id 
        AND uft2.status IN ('pending', 'processing')
      ) THEN 'solicitado'
      ELSE 'pendiente'
    END,
    last_updated_at = now()
  FROM public.v_construction_budget_rollup vr
  WHERE budget_supply_status.budget_item_id = NEW.budget_item_id
    AND vr.id = NEW.budget_item_id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supply_status_on_allocation
  AFTER INSERT OR UPDATE ON public.transaction_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_supply_status();