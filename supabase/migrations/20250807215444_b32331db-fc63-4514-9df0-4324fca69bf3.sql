-- Agregar RLS policy a la vista materializada para resolver el warning de seguridad
ALTER MATERIALIZED VIEW public.financial_summary_by_client_project ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can view financial summary" 
ON public.financial_summary_by_client_project 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);