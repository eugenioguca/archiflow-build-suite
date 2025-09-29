-- Create table for user column preferences in Planning v2
CREATE TABLE IF NOT EXISTS public.planning_v2_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, budget_id)
);

-- Enable RLS
ALTER TABLE public.planning_v2_user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage their own column settings"
ON public.planning_v2_user_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_planning_v2_user_settings_updated_at
BEFORE UPDATE ON public.planning_v2_user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_planning_updated_at();

-- Add index for faster queries
CREATE INDEX idx_planning_v2_user_settings_user_budget 
ON public.planning_v2_user_settings(user_id, budget_id);