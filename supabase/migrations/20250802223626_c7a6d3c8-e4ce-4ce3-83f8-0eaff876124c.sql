-- Crear tabla para opciones de dropdowns inteligentes
CREATE TABLE public.material_dropdown_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dropdown_type TEXT NOT NULL CHECK (dropdown_type IN ('cuentas_mayor', 'partidas', 'descripciones_producto')),
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dropdown_type, option_value)
);

-- Enable RLS
ALTER TABLE public.material_dropdown_options ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage dropdown options" 
ON public.material_dropdown_options 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Crear trigger para updated_at
CREATE TRIGGER update_material_dropdown_options_updated_at
BEFORE UPDATE ON public.material_dropdown_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar opciones iniciales para Cuentas de Mayor
INSERT INTO public.material_dropdown_options (dropdown_type, option_value, option_label, order_index, created_by) VALUES
('cuentas_mayor', 'tierra', 'Tierra', 1, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'cimentacion', 'Cimentación', 2, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'muros_pb', 'Muros PB', 3, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'losa', 'Losa', 4, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'muros_pa', 'Muros PA', 5, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'tapalosa_pretiles', 'Tapalosa/Pretiles', 6, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'aplanados_int_ext', 'Aplanados int/ext', 7, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'carpinterias', 'Carpinterías', 8, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'canceleria', 'Cancelería', 9, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'pintura', 'Pintura', 10, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'limpieza', 'Limpieza', 11, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'jardin', 'Jardín', 12, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'alberca', 'Alberca', 13, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'sotano', 'Sótano', 14, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'terraza', 'Terraza', 15, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('cuentas_mayor', 'cochera', 'Cochera', 16, (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Actualizar tabla material_requirements con nuevos campos
ALTER TABLE public.material_requirements 
ADD COLUMN IF NOT EXISTS cuenta_mayor TEXT,
ADD COLUMN IF NOT EXISTS partida TEXT,
ADD COLUMN IF NOT EXISTS sub_partida INTEGER,
ADD COLUMN IF NOT EXISTS descripcion_producto TEXT,
ADD COLUMN IF NOT EXISTS notas_procuracion TEXT,
ADD COLUMN IF NOT EXISTS requisito_almacenamiento TEXT;