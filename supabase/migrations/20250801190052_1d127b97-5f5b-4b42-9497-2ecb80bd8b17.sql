-- Create Mexican states table
CREATE TABLE public.mexican_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert Mexican states
INSERT INTO public.mexican_states (name, code) VALUES
('Aguascalientes', 'AGS'),
('Baja California', 'BC'),
('Baja California Sur', 'BCS'),
('Campeche', 'CAM'),
('Chiapas', 'CHIS'),
('Chihuahua', 'CHIH'),
('Ciudad de México', 'CDMX'),
('Coahuila', 'COAH'),
('Colima', 'COL'),
('Durango', 'DGO'),
('Estado de México', 'EDOMEX'),
('Guanajuato', 'GTO'),
('Guerrero', 'GRO'),
('Hidalgo', 'HGO'),
('Jalisco', 'JAL'),
('Michoacán', 'MICH'),
('Morelos', 'MOR'),
('Nayarit', 'NAY'),
('Nuevo León', 'NL'),
('Oaxaca', 'OAX'),
('Puebla', 'PUE'),
('Querétaro', 'QRO'),
('Quintana Roo', 'QROO'),
('San Luis Potosí', 'SLP'),
('Sinaloa', 'SIN'),
('Sonora', 'SON'),
('Tabasco', 'TAB'),
('Tamaulipas', 'TAMP'),
('Tlaxcala', 'TLAX'),
('Veracruz', 'VER'),
('Yucatán', 'YUC'),
('Zacatecas', 'ZAC');

-- Create branch offices table
CREATE TABLE public.branch_offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_id UUID REFERENCES public.mexican_states(id),
  phone TEXT,
  email TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new fields to profiles table for employee cards
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';

-- Add new fields to clients table for complete file
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.mexican_states(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS branch_office_id UUID REFERENCES public.branch_offices(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS land_square_meters NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_referral_details TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS curp TEXT;

-- Create client documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'curp', 'constancia_fiscal', 'contract', 'other'
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'design', 'construction', 'combo'
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project team members table
CREATE TABLE public.project_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL, -- 'sales_advisor', 'architect', 'project_manager', 'engineer'
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  responsibilities TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, role)
);

-- Create design phases table
CREATE TABLE public.design_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL, -- 'zonificacion', 'volumetria', 'acabados', 'ajustes', 'renders', 'completado'
  phase_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  estimated_delivery_date DATE,
  actual_completion_date DATE,
  days_elapsed INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create design appointments table
CREATE TABLE public.design_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  attendees UUID[] NOT NULL, -- Array of profile IDs
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project budgets table
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  budget_name TEXT NOT NULL DEFAULT 'Presupuesto de Obra',
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'rejected'
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget items table
CREATE TABLE public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  item_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.mexican_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Mexican states are viewable by everyone" ON public.mexican_states FOR SELECT USING (true);

CREATE POLICY "Employees and admins can manage branch offices" ON public.branch_offices FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Employees and admins can manage client documents" ON public.client_documents FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Employees and admins can manage contract templates" ON public.contract_templates FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Employees and admins can manage project team members" ON public.project_team_members FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Team members can view their project phases" ON public.design_phases FOR SELECT 
USING (project_id IN (SELECT project_id FROM project_team_members WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) 
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Team members can manage their project phases" ON public.design_phases FOR INSERT, UPDATE, DELETE
USING (project_id IN (SELECT project_id FROM project_team_members WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) 
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Team members can view design appointments" ON public.design_appointments FOR SELECT
USING ((SELECT id FROM profiles WHERE user_id = auth.uid()) = ANY(attendees) 
       OR project_id IN (SELECT project_id FROM project_team_members WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Team members can manage design appointments" ON public.design_appointments FOR INSERT, UPDATE, DELETE
USING (project_id IN (SELECT project_id FROM project_team_members WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) 
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Employees and admins can manage project budgets" ON public.project_budgets FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

CREATE POLICY "Employees and admins can manage budget items" ON public.budget_items FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')));

-- Create triggers for updated_at columns
CREATE TRIGGER update_branch_offices_updated_at
  BEFORE UPDATE ON public.branch_offices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_design_phases_updated_at
  BEFORE UPDATE ON public.design_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_design_appointments_updated_at
  BEFORE UPDATE ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default contract templates
INSERT INTO public.contract_templates (name, content, template_type, created_by) VALUES
('Contrato de Diseño Estándar', 
'CONTRATO DE PRESTACIÓN DE SERVICIOS DE DISEÑO ARQUITECTÓNICO

PARTES:
Cliente: {client_name}
RFC: {client_rfc}
Domicilio: {client_address}

DOVITA CONSTRUCCIONES
RFC: [RFC_EMPRESA]
Domicilio: [DOMICILIO_EMPRESA]

OBJETO: Prestación de servicios de diseño arquitectónico para proyecto residencial.

MONTO: ${amount} {currency}

FORMA DE PAGO: {payment_plan}

ENTREGABLES:
- Planos arquitectónicos
- Renders 3D
- Especificaciones técnicas

TIEMPO DE ENTREGA: {delivery_time}

[Términos y condiciones adicionales]',
'design',
(SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),

('Contrato de Construcción Estándar',
'CONTRATO DE OBRA CIVIL

PARTES:
Cliente: {client_name}
RFC: {client_rfc}
Domicilio: {client_address}

DOVITA CONSTRUCCIONES
RFC: [RFC_EMPRESA]
Domicilio: [DOMICILIO_EMPRESA]

OBJETO: Construcción de vivienda según planos y especificaciones acordadas.

MONTO TOTAL: ${amount} {currency}

FORMA DE PAGO: {payment_plan}

TIEMPO DE EJECUCIÓN: {execution_time}

[Términos y condiciones de construcción]',
'construction',
(SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- Insert default budget items for construction projects
CREATE FUNCTION insert_default_budget_items(budget_id_param UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.budget_items (budget_id, item_name, description, unit_price, total_price, item_order) VALUES
  (budget_id_param, 'Tierra', 'Trabajos de excavación y movimiento de tierra', 0, 0, 1),
  (budget_id_param, 'Cimentación', 'Zapatas, contratrabes y cadenas de desplante', 0, 0, 2),
  (budget_id_param, 'Muros PB', 'Muros de planta baja', 0, 0, 3),
  (budget_id_param, 'Losa', 'Losa de entrepiso y azotea', 0, 0, 4),
  (budget_id_param, 'Muros PA', 'Muros de planta alta', 0, 0, 5),
  (budget_id_param, 'Tapalosa/Pretiles', 'Pretiles y acabados de losa', 0, 0, 6),
  (budget_id_param, 'Aplanados int/ext', 'Aplanados interiores y exteriores', 0, 0, 7),
  (budget_id_param, 'Carpinterías', 'Puertas y elementos de madera', 0, 0, 8),
  (budget_id_param, 'Cancelería', 'Ventanas y canceles', 0, 0, 9),
  (budget_id_param, 'Pintura', 'Pintura interior y exterior', 0, 0, 10),
  (budget_id_param, 'Limpieza', 'Limpieza general de obra', 0, 0, 11),
  (budget_id_param, 'Jardín', 'Trabajos de jardinería y paisajismo', 0, 0, 12);
END;
$$ LANGUAGE plpgsql;