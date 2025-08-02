-- Create enums for construction module (skip if exists)
DO $$ BEGIN
    CREATE TYPE construction_phase_status AS ENUM ('not_started', 'in_progress', 'paused', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE construction_phase_type AS ENUM ('preliminares', 'cimentacion', 'estructura', 'albanileria', 'instalaciones', 'acabados', 'exteriores', 'limpieza');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE progress_milestone_type AS ENUM ('start', 'inspection', 'delivery', 'completion', 'quality_check');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE partida_category AS ENUM ('mano_obra', 'materiales', 'herramientas', 'transporte', 'otros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quality_check_status AS ENUM ('pending', 'passed', 'failed', 'needs_rework');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Construction projects - extensión especializada
CREATE TABLE IF NOT EXISTS public.construction_projects (
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
CREATE TABLE IF NOT EXISTS public.construction_phases (
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
CREATE TABLE IF NOT EXISTS public.construction_timelines (
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
CREATE TABLE IF NOT EXISTS public.progress_milestones (
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
CREATE TABLE IF NOT EXISTS public.partidas_catalog (
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
CREATE TABLE IF NOT EXISTS public.construction_expenses (
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
CREATE TABLE IF NOT EXISTS public.construction_materials (
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
CREATE TABLE IF NOT EXISTS public.quality_checks (
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

-- Update progress_photos table with new fields for construction module
DO $$ BEGIN
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS construction_project_id uuid REFERENCES construction_projects(id) ON DELETE CASCADE;
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES construction_phases(id);
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES progress_milestones(id);
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS coordinates jsonb;
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS camera_angle text;
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS weather_conditions text;
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS taken_by uuid REFERENCES profiles(id);
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS taken_at timestamptz DEFAULT now();
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS is_before_photo boolean DEFAULT false;
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS before_photo_id uuid REFERENCES progress_photos(id);
  ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'internal';
EXCEPTION
  WHEN others THEN null;
END $$;

-- Construction teams - equipos de trabajo
CREATE TABLE IF NOT EXISTS public.construction_teams (
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
CREATE TABLE IF NOT EXISTS public.construction_deliveries (
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

-- Create indexes for better performance (only if not exists)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_construction_projects_project_id ON construction_projects(project_id);
  CREATE INDEX IF NOT EXISTS idx_construction_phases_project_id ON construction_phases(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_construction_phases_status ON construction_phases(status);
  CREATE INDEX IF NOT EXISTS idx_construction_timelines_project_id ON construction_timelines(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_construction_timelines_critical_path ON construction_timelines(is_critical_path);
  CREATE INDEX IF NOT EXISTS idx_progress_milestones_project_id ON progress_milestones(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_partidas_catalog_codigo ON partidas_catalog(codigo);
  CREATE INDEX IF NOT EXISTS idx_partidas_catalog_parent_id ON partidas_catalog(parent_id);
  CREATE INDEX IF NOT EXISTS idx_construction_expenses_project_id ON construction_expenses(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_construction_expenses_status ON construction_expenses(status);
  CREATE INDEX IF NOT EXISTS idx_construction_materials_project_id ON construction_materials(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_quality_checks_project_id ON quality_checks(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_quality_checks_status ON quality_checks(status);
  CREATE INDEX IF NOT EXISTS idx_construction_teams_project_id ON construction_teams(construction_project_id);
  CREATE INDEX IF NOT EXISTS idx_construction_deliveries_project_id ON construction_deliveries(construction_project_id);
EXCEPTION
  WHEN others THEN null;
END $$;

-- Enable RLS on all tables
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_deliveries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees and admins
DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction projects" ON construction_projects FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction phases" ON construction_phases FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction timelines" ON construction_timelines FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage progress milestones" ON progress_milestones FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage partidas catalog" ON partidas_catalog FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction expenses" ON construction_expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction materials" ON construction_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage quality checks" ON quality_checks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction teams" ON construction_teams FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Employees and admins can manage construction deliveries" ON construction_deliveries FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee'))
  );
EXCEPTION
  WHEN others THEN null;
END $$;

-- Insert default partidas catalog structure individually
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  -- Insert main categories
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('01', 'PRELIMINARES', 'Trabajos preliminares y preparación del sitio', 'm²', 'otros'::partida_category, 1, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('01.01', 'Limpieza del terreno', 'Desmonte, despalme y limpieza general', 'm²', 'mano_obra'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('01.02', 'Trazo y nivelación', 'Trazo de ejes y niveles de referencia', 'm²', 'mano_obra'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('01.03', 'Excavación', 'Excavación para cimentación', 'm³', 'mano_obra'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('02', 'CIMENTACIÓN', 'Trabajos de cimentación y desplante', 'm³', 'otros'::partida_category, 1, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('02.01', 'Zapatas aisladas', 'Excavación, armado y colado de zapatas', 'pza', 'materiales'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('02.02', 'Contratrabes', 'Armado y colado de contratrabes de liga', 'm', 'materiales'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('02.03', 'Cadenas de desplante', 'Armado y colado de cadenas perimetrales', 'm', 'materiales'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  -- Continue with structure, acabados, etc.
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('03', 'ESTRUCTURA', 'Elementos estructurales verticales y horizontales', 'm²', 'otros'::partida_category, 1, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('06', 'ACABADOS', 'Acabados finales y terminaciones', 'm²', 'otros'::partida_category, 1, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('06.01', 'Aplanados', 'Repello y afinado de muros', 'm²', 'mano_obra'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('06.02', 'Pisos', 'Colocación de pisos cerámicos', 'm²', 'materiales'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
  
  INSERT INTO partidas_catalog (codigo, nombre, descripcion, unidad, categoria, nivel, created_by)
  VALUES ('06.04', 'Pintura', 'Aplicación de pintura vinílica', 'm²', 'materiales'::partida_category, 2, admin_id)
  ON CONFLICT (codigo) DO NOTHING;
END $$;

-- Update parent_id for hierarchical structure
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '01') WHERE codigo LIKE '01.%' AND codigo != '01' AND parent_id IS NULL;
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '02') WHERE codigo LIKE '02.%' AND codigo != '02' AND parent_id IS NULL;
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '03') WHERE codigo LIKE '03.%' AND codigo != '03' AND parent_id IS NULL;
UPDATE partidas_catalog SET parent_id = (SELECT id FROM partidas_catalog WHERE codigo = '06') WHERE codigo LIKE '06.%' AND codigo != '06' AND parent_id IS NULL;