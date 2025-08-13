-- Update the departments table structure to be simpler
ALTER TABLE public.chart_of_accounts_departamentos 
  DROP COLUMN codigo,
  DROP COLUMN nombre,
  DROP COLUMN descripcion,
  ADD COLUMN departamento TEXT NOT NULL UNIQUE;

-- Insert existing departments from unified transactions if they exist
INSERT INTO public.chart_of_accounts_departamentos (departamento, created_by)
SELECT DISTINCT 
  UNNEST(ARRAY['Ventas', 'Diseño', 'Construcción', 'Finanzas', 'Contabilidad', 'Recursos Humanos', 'Dirección General']) as departamento,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) as created_by
ON CONFLICT (departamento) DO NOTHING;