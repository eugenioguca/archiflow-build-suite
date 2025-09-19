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

-- Create policies for user access
CREATE POLICY "Users can view matrix explanations for their projects" 
ON public.matrix_explanations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    WHERE cgp.id = matrix_explanations.plan_id
    AND cgp.client_project_id IN (
      SELECT cp.id FROM public.client_projects cp 
      WHERE cp.client_id IN (
        SELECT uc.client_id FROM public.user_clients uc 
        WHERE uc.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create matrix explanations for their projects" 
ON public.matrix_explanations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    WHERE cgp.id = matrix_explanations.plan_id
    AND cgp.client_project_id IN (
      SELECT cp.id FROM public.client_projects cp 
      WHERE cp.client_id IN (
        SELECT uc.client_id FROM public.user_clients uc 
        WHERE uc.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update matrix explanations for their projects" 
ON public.matrix_explanations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    WHERE cgp.id = matrix_explanations.plan_id
    AND cgp.client_project_id IN (
      SELECT cp.id FROM public.client_projects cp 
      WHERE cp.client_id IN (
        SELECT uc.client_id FROM public.user_clients uc 
        WHERE uc.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete matrix explanations for their projects" 
ON public.matrix_explanations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.cronograma_gantt_plan cgp
    WHERE cgp.id = matrix_explanations.plan_id
    AND cgp.client_project_id IN (
      SELECT cp.id FROM public.client_projects cp 
      WHERE cp.client_id IN (
        SELECT uc.client_id FROM public.user_clients uc 
        WHERE uc.user_id = auth.uid()
      )
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