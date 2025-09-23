-- Crear tablas base primero (sin la vista problemática)
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

CREATE TABLE IF NOT EXISTS public.budget_supply_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id UUID NOT NULL REFERENCES public.construction_budget_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendiente',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.budget_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id UUID NOT NULL REFERENCES public.construction_budget_items(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar campos a construction_budget_items
ALTER TABLE public.construction_budget_items 
ADD COLUMN IF NOT EXISTS source_budget_item_id UUID,
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

CREATE POLICY "Employees can manage transaction allocations" ON public.transaction_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees can manage budget supply status" ON public.budget_supply_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees can manage construction settings" ON public.construction_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees can manage budget annotations" ON public.budget_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
  );