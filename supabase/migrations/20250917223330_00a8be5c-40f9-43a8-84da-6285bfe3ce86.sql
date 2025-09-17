-- Create table for Gantt reference lines (red lines)
CREATE TABLE public.cronograma_gantt_reference_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.cronograma_gantt_plan(id) ON DELETE CASCADE,
  position_month TEXT NOT NULL, -- Month identifier (e.g., "2024-01", "2024-02")
  position_week INTEGER NOT NULL CHECK (position_week BETWEEN 1 AND 4), -- Week within the month (1-4)
  label TEXT DEFAULT 'Línea de Referencia', -- Optional label for the line
  color TEXT DEFAULT '#ef4444', -- Red color by default
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cronograma_gantt_reference_lines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage reference lines" 
ON public.cronograma_gantt_reference_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create indexes for performance
CREATE INDEX idx_reference_lines_plan_id ON public.cronograma_gantt_reference_lines(plan_id);
CREATE INDEX idx_reference_lines_position ON public.cronograma_gantt_reference_lines(position_month, position_week);

-- Add trigger for updated_at
CREATE TRIGGER update_reference_lines_updated_at
  BEFORE UPDATE ON public.cronograma_gantt_reference_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cronograma_matriz_manual_updated_at();