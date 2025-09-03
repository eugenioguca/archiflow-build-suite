-- Create presupuesto_parametrico table
CREATE TABLE public.presupuesto_parametrico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  departamento TEXT NOT NULL DEFAULT 'Construcción',
  mayor_id UUID NOT NULL,
  partida_id UUID NOT NULL,
  cantidad_requerida NUMERIC NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  monto_total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cronograma_gantt table
CREATE TABLE public.cronograma_gantt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  departamento TEXT NOT NULL DEFAULT 'Construcción',
  mayor_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  duracion INTEGER GENERATED ALWAYS AS (fecha_fin - fecha_inicio) STORED,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create presupuesto_ejecutivo table
CREATE TABLE public.presupuesto_ejecutivo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  presupuesto_parametrico_id UUID NOT NULL,
  departamento TEXT NOT NULL DEFAULT 'Construcción',
  mayor_id UUID NOT NULL,
  partida_id UUID NOT NULL,
  subpartida_id UUID NOT NULL,
  unidad TEXT NOT NULL,
  cantidad_requerida NUMERIC NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  monto_total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.presupuesto_parametrico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_gantt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_ejecutivo ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees and admins
CREATE POLICY "Employees and admins can manage presupuesto parametrico"
ON public.presupuesto_parametrico
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can manage cronograma gantt"
ON public.cronograma_gantt
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees and admins can manage presupuesto ejecutivo"
ON public.presupuesto_ejecutivo
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Add foreign key constraints
ALTER TABLE public.presupuesto_parametrico
ADD CONSTRAINT fk_presupuesto_parametrico_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clients(id);

ALTER TABLE public.presupuesto_parametrico
ADD CONSTRAINT fk_presupuesto_parametrico_proyecto
FOREIGN KEY (proyecto_id) REFERENCES public.client_projects(id);

ALTER TABLE public.presupuesto_parametrico
ADD CONSTRAINT fk_presupuesto_parametrico_mayor
FOREIGN KEY (mayor_id) REFERENCES public.chart_of_accounts_mayor(id);

ALTER TABLE public.presupuesto_parametrico
ADD CONSTRAINT fk_presupuesto_parametrico_partida
FOREIGN KEY (partida_id) REFERENCES public.chart_of_accounts_partidas(id);

ALTER TABLE public.cronograma_gantt
ADD CONSTRAINT fk_cronograma_gantt_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clients(id);

ALTER TABLE public.cronograma_gantt
ADD CONSTRAINT fk_cronograma_gantt_proyecto
FOREIGN KEY (proyecto_id) REFERENCES public.client_projects(id);

ALTER TABLE public.cronograma_gantt
ADD CONSTRAINT fk_cronograma_gantt_mayor
FOREIGN KEY (mayor_id) REFERENCES public.chart_of_accounts_mayor(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clients(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_proyecto
FOREIGN KEY (proyecto_id) REFERENCES public.client_projects(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_parametrico
FOREIGN KEY (presupuesto_parametrico_id) REFERENCES public.presupuesto_parametrico(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_mayor
FOREIGN KEY (mayor_id) REFERENCES public.chart_of_accounts_mayor(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_partida
FOREIGN KEY (partida_id) REFERENCES public.chart_of_accounts_partidas(id);

ALTER TABLE public.presupuesto_ejecutivo
ADD CONSTRAINT fk_presupuesto_ejecutivo_subpartida
FOREIGN KEY (subpartida_id) REFERENCES public.chart_of_accounts_subpartidas(id);

-- Create triggers to update monto_total automatically
CREATE OR REPLACE FUNCTION update_presupuesto_parametrico_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monto_total = NEW.cantidad_requerida * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_presupuesto_ejecutivo_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monto_total = NEW.cantidad_requerida * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_presupuesto_parametrico_total
  BEFORE INSERT OR UPDATE ON public.presupuesto_parametrico
  FOR EACH ROW EXECUTE FUNCTION update_presupuesto_parametrico_total();

CREATE TRIGGER tr_update_presupuesto_ejecutivo_total
  BEFORE INSERT OR UPDATE ON public.presupuesto_ejecutivo
  FOR EACH ROW EXECUTE FUNCTION update_presupuesto_ejecutivo_total();