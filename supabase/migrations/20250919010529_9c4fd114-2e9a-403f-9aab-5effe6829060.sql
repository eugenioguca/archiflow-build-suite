-- Create table for matrix explanations
CREATE TABLE public.matrix_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.cronograma_gantt_plan(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.matrix_explanations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access based on correct table structure
CREATE POLICY "Users can view matrix explanations for their projects" 
ON public.matrix_explanations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    JOIN public.client_projects cp ON cgp.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cgp.id = matrix_explanations.plan_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Users can create matrix explanations for their projects" 
ON public.matrix_explanations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    JOIN public.client_projects cp ON cgp.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cgp.id = matrix_explanations.plan_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Users can update matrix explanations for their projects" 
ON public.matrix_explanations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    JOIN public.client_projects cp ON cgp.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cgp.id = matrix_explanations.plan_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Users can delete matrix explanations for their projects" 
ON public.matrix_explanations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    JOIN public.client_projects cp ON cgp.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cgp.id = matrix_explanations.plan_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id
      OR cp.construction_supervisor_id = p.id
    )
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_matrix_explanations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_matrix_explanations_updated_at
  BEFORE UPDATE ON public.matrix_explanations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_matrix_explanations_updated_at();

-- Create index for better performance
CREATE INDEX idx_matrix_explanations_plan_id ON public.matrix_explanations(plan_id);
CREATE INDEX idx_matrix_explanations_order ON public.matrix_explanations(plan_id, order_index);