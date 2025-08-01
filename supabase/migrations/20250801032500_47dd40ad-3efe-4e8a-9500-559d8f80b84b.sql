-- Create SAT catalog tables for better validation and autocomplete
CREATE TABLE public.sat_product_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave text NOT NULL UNIQUE,
  descripcion text NOT NULL,
  incluye_complemento boolean DEFAULT false,
  fecha_inicio_vigencia date,
  fecha_fin_vigencia date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sat_unit_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  simbolo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create billing clients table for fiscal invoicing
CREATE TABLE public.billing_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfc text NOT NULL,
  razon_social text NOT NULL,
  nombre_comercial text,
  regimen_fiscal text NOT NULL,
  codigo_postal_fiscal text NOT NULL,
  domicilio_fiscal jsonb NOT NULL,
  uso_cfdi_default text DEFAULT 'G03',
  metodo_pago_default text DEFAULT 'PUE',
  forma_pago_default text DEFAULT '99',
  moneda_default text DEFAULT 'MXN',
  email text,
  telefono text,
  contacto_principal text,
  notas text,
  activo boolean DEFAULT true,
  -- Links to existing system
  client_id uuid, -- Link to existing sales client
  project_id uuid, -- Link to specific project
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.sat_product_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_unit_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_clients ENABLE ROW LEVEL SECURITY;

-- Create policies for SAT catalogs (readable by employees and admins)
CREATE POLICY "Employees and admins can view SAT product keys" 
ON public.sat_product_keys 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Only admins can manage SAT product keys" 
ON public.sat_product_keys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE POLICY "Employees and admins can view SAT unit keys" 
ON public.sat_unit_keys 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Only admins can manage SAT unit keys" 
ON public.sat_unit_keys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

-- Create policies for billing clients
CREATE POLICY "Employees and admins can manage billing clients" 
ON public.billing_clients 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

-- Create indexes for better performance
CREATE INDEX idx_sat_product_keys_clave ON public.sat_product_keys(clave);
CREATE INDEX idx_sat_product_keys_descripcion ON public.sat_product_keys USING GIN(to_tsvector('spanish', descripcion));
CREATE INDEX idx_sat_unit_keys_clave ON public.sat_unit_keys(clave);
CREATE INDEX idx_sat_unit_keys_nombre ON public.sat_unit_keys USING GIN(to_tsvector('spanish', nombre));
CREATE INDEX idx_billing_clients_rfc ON public.billing_clients(rfc);
CREATE INDEX idx_billing_clients_client_id ON public.billing_clients(client_id);
CREATE INDEX idx_billing_clients_project_id ON public.billing_clients(project_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_sat_product_keys_updated_at
BEFORE UPDATE ON public.sat_product_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sat_unit_keys_updated_at
BEFORE UPDATE ON public.sat_unit_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_clients_updated_at
BEFORE UPDATE ON public.billing_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some common SAT product keys for immediate use
INSERT INTO public.sat_product_keys (clave, descripcion) VALUES
('01010101', 'No existe en el catálogo'),
('50211503', 'Servicios de construcción de edificios comerciales'),
('50211504', 'Servicios de construcción de edificios industriales'),
('50211505', 'Servicios de construcción de edificios residenciales'),
('78101800', 'Servicios de arquitectura'),
('78101801', 'Servicios de arquitectura paisajista'),
('78121700', 'Servicios de ingeniería civil'),
('78121800', 'Servicios de ingeniería estructural'),
('86121600', 'Servicios de consultores en administración'),
('93141500', 'Servicios de diseño gráfico'),
('10101500', 'Software de aplicación'),
('43201600', 'Equipos de cómputo'),
('14111500', 'Materiales de construcción');

-- Insert common SAT unit keys
INSERT INTO public.sat_unit_keys (clave, nombre, descripcion, simbolo) VALUES
('E48', 'Unidad de servicio', 'Unidad de medida aplicable para la venta de servicios', 'Servicio'),
('H87', 'Pieza', 'Unidad de medida que expresa una cantidad contable de artículos', 'pza'),
('MTR', 'Metro', 'Unidad de longitud del Sistema Internacional de Unidades', 'm'),
('MTK', 'Metro cuadrado', 'Unidad de superficie del Sistema Internacional de Unidades', 'm²'),
('MTQ', 'Metro cúbico', 'Unidad de volumen del Sistema Internacional de Unidades', 'm³'),
('KGM', 'Kilogramo', 'Unidad de masa del Sistema Internacional de Unidades', 'kg'),
('HUR', 'Hora', 'Unidad de tiempo', 'hr'),
('DAY', 'Día', 'Unidad de tiempo equivalente a 24 horas', 'día'),
('MON', 'Mes', 'Unidad de tiempo', 'mes'),
('ANN', 'Año', 'Unidad de tiempo', 'año'),
('LTR', 'Litro', 'Unidad de volumen', 'L'),
('SET', 'Conjunto', 'Unidad de medida para artículos que se venden agrupados', 'conjunto');