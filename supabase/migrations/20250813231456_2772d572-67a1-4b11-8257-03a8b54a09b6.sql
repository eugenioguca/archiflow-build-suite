-- Create departments table for chart of accounts
CREATE TABLE public.chart_of_accounts_departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.chart_of_accounts_departamentos ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Employees and admins can manage chart of accounts departamentos" 
ON public.chart_of_accounts_departamentos 
FOR ALL 
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::user_role, 'employee'::user_role])))
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_chart_of_accounts_departamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chart_of_accounts_departamentos_updated_at
  BEFORE UPDATE ON public.chart_of_accounts_departamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chart_of_accounts_departamentos_updated_at();