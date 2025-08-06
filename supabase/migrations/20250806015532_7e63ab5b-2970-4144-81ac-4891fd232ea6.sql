-- Create budget change log table for tracking all budget modifications
CREATE TABLE public.budget_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_item_id UUID NOT NULL,
  project_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('quantity', 'unit_price', 'total_price', 'status', 'description', 'created', 'deleted')),
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT NOT NULL,
  change_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_budget_change_log_changed_by 
    FOREIGN KEY (changed_by) REFERENCES public.profiles(id),
  CONSTRAINT fk_budget_change_log_project 
    FOREIGN KEY (project_id) REFERENCES public.client_projects(id)
);

-- Enable RLS on budget change log
ALTER TABLE public.budget_change_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for budget change log
CREATE POLICY "Employees and admins can manage budget change log" 
ON public.budget_change_log 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create indexes for better performance
CREATE INDEX idx_budget_change_log_budget_item_id ON public.budget_change_log(budget_item_id);
CREATE INDEX idx_budget_change_log_project_id ON public.budget_change_log(project_id);
CREATE INDEX idx_budget_change_log_created_at ON public.budget_change_log(created_at DESC);

-- Add function to automatically migrate budget items from design to construction
CREATE OR REPLACE FUNCTION public.migrate_design_budget_to_construction(
  p_project_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id UUID;
  budget_item RECORD;
BEGIN
  -- Get admin profile as creator
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- Check if construction budget items already exist for this project
  IF EXISTS (
    SELECT 1 FROM public.construction_budget_items 
    WHERE project_id = p_project_id
  ) THEN
    RETURN; -- Already migrated, don't duplicate
  END IF;
  
  -- Migrate budget items from project_budgets/budget_items to construction_budget_items
  FOR budget_item IN (
    SELECT bi.*, pb.status as budget_status
    FROM public.budget_items bi
    JOIN public.project_budgets pb ON pb.id = bi.budget_id
    WHERE pb.project_id = p_project_id 
    AND pb.status = 'approved'
    ORDER BY bi.item_order
  )
  LOOP
    INSERT INTO public.construction_budget_items (
      project_id,
      item_code,
      item_name,
      item_description,
      category,
      subcategory,
      unit_of_measure,
      quantity,
      unit_price,
      total_price,
      item_order,
      status,
      created_by,
      budget_version
    ) VALUES (
      p_project_id,
      COALESCE(budget_item.item_name, 'ITEM-' || budget_item.item_order),
      budget_item.item_name,
      budget_item.description,
      'General', -- Default category
      NULL,
      'PZA', -- Default unit
      COALESCE(budget_item.quantity, 1),
      budget_item.unit_price,
      budget_item.total_price,
      budget_item.item_order,
      'pending',
      admin_profile_id,
      1
    );
    
    -- Log the migration
    INSERT INTO public.budget_change_log (
      budget_item_id,
      project_id,
      changed_by,
      change_type,
      old_value,
      new_value,
      change_reason,
      change_comments
    ) VALUES (
      (SELECT id FROM public.construction_budget_items WHERE project_id = p_project_id AND item_order = budget_item.item_order LIMIT 1),
      p_project_id,
      admin_profile_id,
      'created',
      NULL,
      'Migrated from design budget',
      'Automatic migration from approved design budget',
      'Budget automatically loaded from design module for construction phase'
    );
  END LOOP;
END;
$function$;