-- Create gantt_activity_log table for construction annotations
CREATE TABLE IF NOT EXISTS public.gantt_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  source_activity_id UUID NOT NULL, -- References the planning gantt activity
  estado TEXT NOT NULL CHECK (estado IN ('no_iniciado', 'en_proceso', 'bloqueado', 'terminado')),
  avance_real_pct DECIMAL(5,2) DEFAULT 0,
  start_real DATE,
  end_real DATE,
  causa_retraso TEXT,
  nota TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gantt_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view gantt activity logs for their projects" 
ON public.gantt_activity_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_projects cp 
    WHERE cp.id = gantt_activity_log.project_id 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
    )
  )
);

CREATE POLICY "Users can create gantt activity logs for their projects" 
ON public.gantt_activity_log 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_projects cp 
    WHERE cp.id = gantt_activity_log.project_id 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
    )
  )
);

CREATE POLICY "Users can update gantt activity logs for their projects" 
ON public.gantt_activity_log 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM client_projects cp 
    WHERE cp.id = gantt_activity_log.project_id 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
    )
  )
);

-- Create index for better performance
CREATE INDEX idx_gantt_activity_log_project_activity ON public.gantt_activity_log(project_id, source_activity_id);
CREATE INDEX idx_gantt_activity_log_created_at ON public.gantt_activity_log(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gantt_activity_log_updated_at
BEFORE UPDATE ON public.gantt_activity_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();