-- Create table for budget change history
CREATE TABLE IF NOT EXISTS public.construction_budget_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  previous_budget NUMERIC NOT NULL,
  new_budget NUMERIC NOT NULL,
  change_amount NUMERIC GENERATED ALWAYS AS (new_budget - previous_budget) STORED,
  change_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN previous_budget > 0 THEN ((new_budget - previous_budget) / previous_budget) * 100
      ELSE 0
    END
  ) STORED,
  change_reason TEXT NOT NULL,
  notes TEXT,
  authorized_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on budget changes
ALTER TABLE public.construction_budget_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for budget changes
CREATE POLICY "Employees and admins can view budget changes"
ON public.construction_budget_changes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Only admins can insert budget changes"
ON public.construction_budget_changes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create budget alerts table
CREATE TABLE IF NOT EXISTS public.construction_budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  construction_project_id UUID NOT NULL REFERENCES public.construction_projects(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('budget_exceeded', 'budget_warning', 'variance_high')),
  threshold_percentage NUMERIC NOT NULL,
  current_percentage NUMERIC NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on budget alerts
ALTER TABLE public.construction_budget_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for budget alerts
CREATE POLICY "Employees and admins can manage budget alerts"
ON public.construction_budget_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Function to check budget and create alerts
CREATE OR REPLACE FUNCTION public.check_budget_alerts(construction_project_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  project_budget NUMERIC;
  spent_amount NUMERIC;
  budget_percentage NUMERIC;
  alert_message TEXT;
BEGIN
  -- Get project budget and spending
  SELECT total_budget, spent_budget INTO project_budget, spent_amount
  FROM construction_projects 
  WHERE id = construction_project_id_param;
  
  IF project_budget > 0 THEN
    budget_percentage := (spent_amount / project_budget) * 100;
    
    -- Create alert if budget exceeds 100%
    IF budget_percentage >= 100 THEN
      INSERT INTO construction_budget_alerts (
        construction_project_id,
        alert_type,
        threshold_percentage,
        current_percentage,
        message
      ) VALUES (
        construction_project_id_param,
        'budget_exceeded',
        100,
        budget_percentage,
        'CRÍTICO: El presupuesto ha sido excedido en ' || ROUND(budget_percentage - 100, 2) || '%'
      );
    -- Create warning if budget exceeds 90%
    ELSIF budget_percentage >= 90 THEN
      INSERT INTO construction_budget_alerts (
        construction_project_id,
        alert_type,
        threshold_percentage,
        current_percentage,
        message
      ) VALUES (
        construction_project_id_param,
        'budget_warning',
        90,
        budget_percentage,
        'ADVERTENCIA: Se ha utilizado ' || ROUND(budget_percentage, 2) || '% del presupuesto'
      );
    END IF;
  END IF;
END;
$$;