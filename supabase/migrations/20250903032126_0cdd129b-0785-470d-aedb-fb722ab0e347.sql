-- Create table for manual matrix overrides
CREATE TABLE cronograma_matriz_manual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  mes INTEGER NOT NULL,
  concepto TEXT NOT NULL CHECK (concepto IN ('gasto_obra', 'avance_parcial', 'avance_acumulado', 'ministraciones', 'inversion_acumulada', 'fecha_pago')),
  valor TEXT NOT NULL,
  sobrescribe BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, proyecto_id, mes, concepto)
);

-- Enable RLS
ALTER TABLE cronograma_matriz_manual ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage matriz manual overrides"
ON cronograma_matriz_manual
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid()
  AND p.role IN ('admin'::user_role, 'employee'::user_role)
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_cronograma_matriz_manual_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER update_cronograma_matriz_manual_updated_at
  BEFORE UPDATE ON cronograma_matriz_manual
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_matriz_manual_updated_at();