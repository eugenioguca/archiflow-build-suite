-- Create enums for construction module
CREATE TYPE construction_phase_status AS ENUM ('not_started', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE construction_phase_type AS ENUM ('preliminares', 'cimentacion', 'estructura', 'albanileria', 'instalaciones', 'acabados', 'exteriores', 'limpieza');
CREATE TYPE progress_milestone_type AS ENUM ('start', 'inspection', 'delivery', 'completion', 'quality_check');
CREATE TYPE partida_category AS ENUM ('mano_obra', 'materiales', 'herramientas', 'transporte', 'otros');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
CREATE TYPE quality_check_status AS ENUM ('pending', 'passed', 'failed', 'needs_rework');

-- Construction projects - extensión especializada
CREATE TABLE public.construction_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  construction_area numeric NOT NULL DEFAULT 0,
  total_budget numeric NOT NULL DEFAULT 0,
  spent_budget numeric NOT NULL DEFAULT 0,
  start_date date,
  estimated_completion_date date,
  actual_completion_date date,
  overall_progress_percentage integer DEFAULT 0 CHECK (overall_progress_percentage >= 0 AND overall_progress_percentage <= 100),
  project_manager_id uuid REFERENCES profiles(id),
  construction_supervisor_id uuid REFERENCES profiles(id),
  location_coordinates jsonb DEFAULT '{}',
  weather_considerations text,
  safety_requirements text,
  permit_status text DEFAULT 'pending',
  permit_expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction phases - fases personalizables del proyecto
CREATE TABLE public.construction_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  phase_type construction_phase_type NOT NULL,
  phase_order integer NOT NULL,
  status construction_phase_status DEFAULT 'not_started',
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_start_date date,
  actual_start_date date,
  estimated_end_date date,
  actual_end_date date,
  estimated_budget numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  dependencies uuid[] DEFAULT '{}',
  required_team_size integer DEFAULT 0,
  description text,
  special_requirements text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction timelines - timeline detallado con hitos
CREATE TABLE public.construction_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  activity_name text NOT NULL,
  description text,
  phase_id uuid REFERENCES construction_phases(id) ON DELETE CASCADE,
  planned_start_date date NOT NULL,
  planned_end_date date NOT NULL,
  actual_start_date date,
  actual_end_date date,
  duration_days integer,
  is_critical_path boolean DEFAULT false,
  depends_on uuid[] DEFAULT '{}',
  assigned_team_id uuid,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Progress milestones - hitos de progreso
CREATE TABLE public.progress_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES construction_phases(id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  milestone_type progress_milestone_type NOT NULL,
  target_date date NOT NULL,
  actual_date date,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed boolean DEFAULT false,
  verification_criteria text,
  responsible_person_id uuid REFERENCES profiles(id),
  approval_required boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Partidas catalog - catálogo profesional con estructura jerárquica
CREATE TABLE public.partidas_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  parent_id uuid REFERENCES partidas_catalog(id),
  nivel integer NOT NULL DEFAULT 1,
  nombre text NOT NULL,
  descripcion text,
  unidad text NOT NULL,
  categoria partida_category NOT NULL,
  precio_unitario_base numeric DEFAULT 0,
  rendimiento_mano_obra numeric DEFAULT 0,
  factor_desperdicio numeric DEFAULT 0.05,
  incluye_mano_obra boolean DEFAULT true,
  especificaciones_tecnicas text,
  normativa_aplicable text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction expenses - gastos vinculados a proveedores y partidas
CREATE TABLE public.construction_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES construction_phases(id),
  partida_id uuid REFERENCES partidas_catalog(id),
  supplier_id uuid REFERENCES suppliers(id),
  expense_type text NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'MXN',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  invoice_url text,
  receipt_url text,
  payment_method text,
  status expense_status DEFAULT 'pending',
  authorized_by uuid REFERENCES profiles(id),
  authorized_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction materials - inventario de materiales con tracking
CREATE TABLE public.construction_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  partida_id uuid REFERENCES partidas_catalog(id),
  supplier_id uuid REFERENCES suppliers(id),
  material_name text NOT NULL,
  material_code text,
  description text,
  unit text NOT NULL,
  quantity_required numeric NOT NULL DEFAULT 0,
  quantity_ordered numeric DEFAULT 0,
  quantity_delivered numeric DEFAULT 0,
  quantity_used numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  delivery_date date,
  location_stored text,
  quality_certified boolean DEFAULT false,
  certificate_url text,
  expiry_date date,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Quality checks - inspecciones y controles de calidad
CREATE TABLE public.quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES construction_phases(id),
  check_name text NOT NULL,
  check_type text NOT NULL,
  description text,
  inspection_date date NOT NULL,
  inspector_id uuid REFERENCES profiles(id),
  status quality_check_status DEFAULT 'pending',
  score integer CHECK (score >= 0 AND score <= 100),
  criteria_checked jsonb DEFAULT '[]',
  defects_found text,
  corrective_actions text,
  reinspection_required boolean DEFAULT false,
  reinspection_date date,
  photos jsonb DEFAULT '[]',
  documents jsonb DEFAULT '[]',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Progress photos - fotos de progreso georeferenciadas
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES construction_phases(id),
  milestone_id uuid REFERENCES progress_milestones(id),
  photo_url text NOT NULL,
  thumbnail_url text,
  caption text,
  location_description text,
  coordinates jsonb,
  camera_angle text,
  weather_conditions text,
  taken_by uuid REFERENCES profiles(id),
  taken_at timestamptz NOT NULL DEFAULT now(),
  tags text[] DEFAULT '{}',
  is_before_photo boolean DEFAULT false,
  before_photo_id uuid REFERENCES progress_photos(id),
  visibility text DEFAULT 'internal' CHECK (visibility IN ('internal', 'client', 'public')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction teams - equipos de trabajo
CREATE TABLE public.construction_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  team_lead_id uuid REFERENCES profiles(id),
  specialization text,
  team_members jsonb DEFAULT '[]',
  daily_rate numeric DEFAULT 0,
  hourly_rate numeric DEFAULT 0,
  active boolean DEFAULT true,
  assigned_phases uuid[] DEFAULT '{}',
  performance_rating numeric DEFAULT 0 CHECK (performance_rating >= 0 AND performance_rating <= 5),
  safety_record text,
  contact_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Construction deliveries - entregas de materiales
CREATE TABLE public.construction_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_project_id uuid NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id),
  delivery_date date NOT NULL,
  scheduled_time time,
  actual_arrival_time time,
  delivery_note_number text,
  materials_delivered jsonb NOT NULL DEFAULT '[]',
  total_items integer DEFAULT 0,
  delivery_person_name text,
  delivery_person_contact text,
  received_by uuid REFERENCES profiles(id),
  received_at timestamptz,
  inspection_passed boolean,
  inspection_notes text,
  delivery_photos jsonb DEFAULT '[]',
  delivery_status text DEFAULT 'scheduled',
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX idx_construction_projects_project_id ON construction_projects(project_id);
CREATE INDEX idx_construction_phases_project_id ON construction_phases(construction_project_id);
CREATE INDEX idx_construction_phases_status ON construction_phases(status);
CREATE INDEX idx_construction_timelines_project_id ON construction_timelines(construction_project_id);
CREATE INDEX idx_construction_timelines_critical_path ON construction_timelines(is_critical_path);
CREATE INDEX idx_progress_milestones_project_id ON progress_milestones(construction_project_id);
CREATE INDEX idx_partidas_catalog_codigo ON partidas_catalog(codigo);
CREATE INDEX idx_partidas_catalog_parent_id ON partidas_catalog(parent_id);
CREATE INDEX idx_construction_expenses_project_id ON construction_expenses(construction_project_id);
CREATE INDEX idx_construction_expenses_status ON construction_expenses(status);
CREATE INDEX idx_construction_materials_project_id ON construction_materials(construction_project_id);
CREATE INDEX idx_quality_checks_project_id ON quality_checks(construction_project_id);
CREATE INDEX idx_quality_checks_status ON quality_checks(status);
CREATE INDEX idx_progress_photos_project_id ON progress_photos(construction_project_id);
CREATE INDEX idx_progress_photos_taken_at ON progress_photos(taken_at);
CREATE INDEX idx_construction_teams_project_id ON construction_teams(construction_project_id);
CREATE INDEX idx_construction_deliveries_project_id ON construction_deliveries(construction_project_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_construction_projects_updated_at BEFORE UPDATE ON construction_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_phases_updated_at BEFORE UPDATE ON construction_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_timelines_updated_at BEFORE UPDATE ON construction_timelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_milestones_updated_at BEFORE UPDATE ON progress_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partidas_catalog_updated_at BEFORE UPDATE ON partidas_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_expenses_updated_at BEFORE UPDATE ON construction_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_materials_updated_at BEFORE UPDATE ON construction_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_checks_updated_at BEFORE UPDATE ON quality_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_photos_updated_at BEFORE UPDATE ON progress_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_teams_updated_at BEFORE UPDATE ON construction_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_construction_deliveries_updated_at BEFORE UPDATE ON construction_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_deliveries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees and admins
CREATE POLICY "Employees and admins can manage construction projects" ON construction_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage construction phases" ON construction_phases FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage construction timelines" ON construction_timelines FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage progress milestones" ON progress_milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage partidas catalog" ON partidas_catalog FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage construction expenses" ON construction_expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage construction materials" ON construction_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage quality checks" ON quality_checks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage progress photos" ON progress_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Clients can view their progress photos" ON progress_photos FOR SELECT USING (
  visibility IN ('client', 'public') AND 
  construction_project_id IN (
    SELECT cp.id FROM construction_projects cp
    JOIN client_projects pr ON cp.project_id = pr.id
    JOIN clients c ON pr.client_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Employees and admins can manage construction teams" ON construction_teams FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

CREATE POLICY "Employees and admins can manage construction deliveries" ON construction_deliveries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
);

-- Insert default partidas catalog structure
INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel) VALUES
('01', 'PRELIMINARES', 'Trabajos preliminares y preparación del sitio', 'm²', 'otros', 1),
('01.01', 'Limpieza del terreno', 'Desmonte, despalme y limpieza general', 'm²', 'mano_obra', 2),
('01.02', 'Trazo y nivelación', 'Trazo de ejes y niveles de referencia', 'm²', 'mano_obra', 2),
('01.03', 'Excavación', 'Excavación para cimentación', 'm³', 'mano_obra', 2),

('02', 'CIMENTACIÓN', 'Trabajos de cimentación y desplante', 'm³', 'otros', 1),
('02.01', 'Zapatas aisladas', 'Excavación, armado y colado de zapatas', 'pza', 'materiales', 2),
('02.02', 'Contratrabes', 'Armado y colado de contratrabes de liga', 'm', 'materiales', 2),
('02.03', 'Cadenas de desplante', 'Armado y colado de cadenas perimetrales', 'm', 'materiales', 2),

('03', 'ESTRUCTURA', 'Elementos estructurales verticales y horizontales', 'm²', 'otros', 1),
('03.01', 'Castillos', 'Armado y colado de castillos', 'pza', 'materiales', 2),
('03.02', 'Dalas y cerramientos', 'Elementos de confinamiento horizontal', 'm', 'materiales', 2),
('03.03', 'Losas', 'Armado y colado de losas de entrepiso', 'm²', 'materiales', 2),

('04', 'ALBAÑILERÍA', 'Muros y elementos de mampostería', 'm²', 'otros', 1),
('04.01', 'Muros de block', 'Construcción de muros con block de concreto', 'm²', 'materiales', 2),
('04.02', 'Muros de tabique', 'Construcción de muros con tabique rojo', 'm²', 'materiales', 2),
('04.03', 'Pretiles', 'Construcción de pretiles en azotea', 'm', 'materiales', 2),

('05', 'INSTALACIONES', 'Instalaciones hidrosanitarias y eléctricas', 'salida', 'otros', 1),
('05.01', 'Instalación hidráulica', 'Red de distribución de agua potable', 'salida', 'materiales', 2),
('05.02', 'Instalación sanitaria', 'Red de desagües y drenaje', 'salida', 'materiales', 2),
('05.03', 'Instalación eléctrica', 'Red eléctrica y contactos', 'salida', 'materiales', 2),

('06', 'ACABADOS', 'Acabados finales y terminaciones', 'm²', 'otros', 1),
('06.01', 'Aplanados', 'Repello y afinado de muros', 'm²', 'mano_obra', 2),
('06.02', 'Pisos', 'Colocación de pisos cerámicos', 'm²', 'materiales', 2),
('06.03', 'Azulejos', 'Colocación de azulejos en baños', 'm²', 'materiales', 2),
('06.04', 'Pintura', 'Aplicación de pintura vinílica', 'm²', 'materiales', 2),

('07', 'CARPINTERÍA', 'Elementos de madera y carpintería', 'pza', 'otros', 1),
('07.01', 'Puertas de madera', 'Suministro e instalación de puertas', 'pza', 'materiales', 2),
('07.02', 'Closets', 'Fabricación e instalación de closets', 'pza', 'materiales', 2),
('07.03', 'Muebles de cocina', 'Fabricación e instalación de cocina integral', 'm', 'materiales', 2),

('08', 'HERRERÍA', 'Elementos metálicos y herrería', 'kg', 'otros', 1),
('08.01', 'Ventanas de aluminio', 'Suministro e instalación de ventanería', 'm²', 'materiales', 2),
('08.02', 'Protecciones', 'Fabricación e instalación de protecciones', 'm²', 'materiales', 2),
('08.03', 'Escaleras metálicas', 'Fabricación e instalación de escaleras', 'pza', 'materiales', 2);

-- Update parent_id for hierarchical structure
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '01') WHERE codigo LIKE '01.%' AND codigo != '01';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '02') WHERE codigo LIKE '02.%' AND codigo != '02';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '03') WHERE codigo LIKE '03.%' AND codigo != '03';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '04') WHERE codigo LIKE '04.%' AND codigo != '04';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '05') WHERE codigo LIKE '05.%' AND codigo != '05';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '06') WHERE codigo LIKE '06.%' AND codigo != '06';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '07') WHERE codigo LIKE '07.%' AND codigo != '07';
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '08') WHERE codigo LIKE '08.%' AND codigo != '08';