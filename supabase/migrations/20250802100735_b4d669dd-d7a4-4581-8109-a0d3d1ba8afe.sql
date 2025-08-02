-- Construction Module Database Schema
-- Phase 1: Specialized Construction Tables

-- Construction phases (hierarchical structure)
CREATE TABLE public.construction_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_code TEXT, -- BIMSA or standard codes
  parent_phase_id UUID REFERENCES public.construction_phases(id),
  phase_order INTEGER NOT NULL DEFAULT 0,
  estimated_start_date DATE,
  estimated_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_duration_days INTEGER,
  actual_duration_days INTEGER,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  description TEXT,
  requirements JSONB DEFAULT '{}',
  deliverables JSONB DEFAULT '[]',
  dependencies JSONB DEFAULT '[]', -- Array of phase IDs this depends on
  critical_path BOOLEAN DEFAULT false,
  responsible_team_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Construction milestones within phases
CREATE TABLE public.construction_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.construction_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  milestone_code TEXT,
  milestone_order INTEGER NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  completion_date DATE,
  is_critical BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
  description TEXT,
  deliverable_requirements JSONB DEFAULT '[]',
  verification_criteria TEXT,
  responsible_person_id UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Advanced construction budget items (extends existing budget system)
CREATE TABLE public.construction_budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.construction_phases(id),
  budget_version INTEGER DEFAULT 1,
  item_code TEXT, -- Standard construction codes (BIMSA, etc.)
  item_name TEXT NOT NULL,
  item_description TEXT,
  category TEXT NOT NULL, -- estructura, acabados, instalaciones, etc.
  subcategory TEXT,
  specialty TEXT, -- albañilería, electricidad, plomería, etc.
  unit_of_measure TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  equipment_cost NUMERIC DEFAULT 0,
  overhead_percentage NUMERIC DEFAULT 0,
  profit_percentage NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  executed_quantity NUMERIC DEFAULT 0,
  remaining_quantity NUMERIC DEFAULT 0,
  executed_amount NUMERIC DEFAULT 0,
  item_order INTEGER NOT NULL DEFAULT 0,
  parent_item_id UUID REFERENCES public.construction_budget_items(id),
  level_depth INTEGER DEFAULT 0, -- For hierarchical structure
  price_analysis JSONB DEFAULT '{}', -- Detailed price breakdown
  specifications TEXT,
  drawing_references JSONB DEFAULT '[]',
  supplier_id UUID,
  estimated_start_date DATE,
  estimated_completion_date DATE,
  actual_start_date DATE,
  actual_completion_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  quality_requirements JSONB DEFAULT '{}',
  safety_requirements JSONB DEFAULT '{}',
  environmental_considerations TEXT,
  waste_factor NUMERIC DEFAULT 0,
  risk_factor NUMERIC DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Construction equipment management
CREATE TABLE public.construction_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_code TEXT,
  equipment_type TEXT NOT NULL, -- maquinaria, herramienta, vehiculo, etc.
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  depreciation_rate NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  monthly_rate NUMERIC DEFAULT 0,
  fuel_consumption_per_hour NUMERIC DEFAULT 0,
  maintenance_schedule JSONB DEFAULT '{}',
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_cost_total NUMERIC DEFAULT 0,
  operating_hours_total NUMERIC DEFAULT 0,
  location TEXT,
  current_phase_id UUID REFERENCES public.construction_phases(id),
  assigned_to_user_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'repair', 'retired')),
  condition_rating INTEGER DEFAULT 5 CHECK (condition_rating >= 1 AND condition_rating <= 5),
  insurance_policy TEXT,
  insurance_expiry DATE,
  operator_requirements JSONB DEFAULT '[]',
  safety_certifications JSONB DEFAULT '[]',
  usage_log JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quality inspections
CREATE TABLE public.quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.construction_phases(id),
  milestone_id UUID REFERENCES public.construction_milestones(id),
  budget_item_id UUID REFERENCES public.construction_budget_items(id),
  inspection_type TEXT NOT NULL, -- quality, safety, environmental, regulatory
  inspection_name TEXT NOT NULL,
  inspection_code TEXT,
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  inspector_name TEXT NOT NULL,
  inspector_certification TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'conditional', 'cancelled')),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  inspection_criteria JSONB NOT NULL DEFAULT '[]',
  results JSONB DEFAULT '{}',
  deficiencies JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  regulatory_compliance JSONB DEFAULT '{}',
  certifications_issued JSONB DEFAULT '[]',
  cost NUMERIC DEFAULT 0,
  duration_hours NUMERIC DEFAULT 0,
  weather_conditions TEXT,
  remarks TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approval_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Material requirements and tracking
CREATE TABLE public.material_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.construction_phases(id),
  budget_item_id UUID REFERENCES public.construction_budget_items(id),
  material_name TEXT NOT NULL,
  material_code TEXT,
  material_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  specifications JSONB DEFAULT '{}',
  unit_of_measure TEXT NOT NULL,
  quantity_required NUMERIC NOT NULL DEFAULT 0,
  quantity_ordered NUMERIC DEFAULT 0,
  quantity_delivered NUMERIC DEFAULT 0,
  quantity_used NUMERIC DEFAULT 0,
  quantity_wasted NUMERIC DEFAULT 0,
  quantity_remaining NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  supplier_id UUID,
  purchase_order_number TEXT,
  delivery_date_required DATE,
  delivery_date_actual DATE,
  storage_location TEXT,
  storage_requirements JSONB DEFAULT '{}',
  quality_standards JSONB DEFAULT '{}',
  environmental_impact JSONB DEFAULT '{}',
  sustainability_rating INTEGER CHECK (sustainability_rating >= 1 AND sustainability_rating <= 5),
  certifications JSONB DEFAULT '[]',
  warranty_period INTEGER, -- in months
  warranty_terms TEXT,
  status TEXT DEFAULT 'required' CHECK (status IN ('required', 'ordered', 'delivered', 'in_use', 'consumed', 'returned')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Construction timeline with dependencies
CREATE TABLE public.construction_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  activity_code TEXT,
  activity_type TEXT DEFAULT 'task', -- task, milestone, summary
  phase_id UUID REFERENCES public.construction_phases(id),
  parent_activity_id UUID REFERENCES public.construction_timeline(id),
  wbs_code TEXT, -- Work Breakdown Structure code
  level_depth INTEGER DEFAULT 0,
  activity_order INTEGER DEFAULT 0,
  estimated_start_date DATE,
  estimated_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_duration_days INTEGER DEFAULT 0,
  actual_duration_days INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  predecessor_activities JSONB DEFAULT '[]', -- Dependencies with lag times
  successor_activities JSONB DEFAULT '[]',
  critical_path BOOLEAN DEFAULT false,
  total_float_days INTEGER DEFAULT 0,
  free_float_days INTEGER DEFAULT 0,
  resource_requirements JSONB DEFAULT '{}',
  assigned_team_id UUID,
  assigned_resources JSONB DEFAULT '[]',
  resource_leveling JSONB DEFAULT '{}',
  baseline_start_date DATE,
  baseline_end_date DATE,
  baseline_duration INTEGER,
  variance_start_days INTEGER DEFAULT 0,
  variance_end_days INTEGER DEFAULT 0,
  variance_duration_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  constraints JSONB DEFAULT '[]',
  assumptions JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  deliverables JSONB DEFAULT '[]',
  quality_criteria JSONB DEFAULT '[]',
  acceptance_criteria TEXT,
  cost_budget NUMERIC DEFAULT 0,
  cost_actual NUMERIC DEFAULT 0,
  earned_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily work reports
CREATE TABLE public.work_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT DEFAULT 'day' CHECK (shift IN ('day', 'night', 'both')),
  weather_conditions TEXT,
  temperature_celsius NUMERIC,
  humidity_percentage NUMERIC,
  wind_conditions TEXT,
  work_performed JSONB NOT NULL DEFAULT '[]',
  equipment_used JSONB DEFAULT '[]',
  materials_consumed JSONB DEFAULT '[]',
  personnel_present JSONB DEFAULT '[]',
  safety_incidents JSONB DEFAULT '[]',
  quality_issues JSONB DEFAULT '[]',
  delays_encountered JSONB DEFAULT '[]',
  achievements JSONB DEFAULT '[]',
  planned_next_day JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  visitors JSONB DEFAULT '[]',
  deliveries_received JSONB DEFAULT '[]',
  inspections_conducted JSONB DEFAULT '[]',
  overall_progress_notes TEXT,
  safety_compliance_rating INTEGER DEFAULT 5 CHECK (safety_compliance_rating >= 1 AND safety_compliance_rating <= 5),
  quality_compliance_rating INTEGER DEFAULT 5 CHECK (quality_compliance_rating >= 1 AND quality_compliance_rating <= 5),
  productivity_rating INTEGER DEFAULT 3 CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
  supervisor_signature TEXT,
  client_signature TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approval_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Construction teams
CREATE TABLE public.construction_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_code TEXT,
  team_type TEXT NOT NULL, -- cuadrilla, especialistas, supervisión, etc.
  specialty TEXT NOT NULL, -- albañilería, electricidad, plomería, etc.
  team_leader_id UUID REFERENCES public.profiles(id),
  members JSONB NOT NULL DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  safety_training JSONB DEFAULT '[]',
  hourly_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  productivity_metrics JSONB DEFAULT '{}',
  equipment_assigned JSONB DEFAULT '[]',
  current_phase_id UUID REFERENCES public.construction_phases(id),
  current_location TEXT,
  work_schedule JSONB DEFAULT '{}',
  contact_information JSONB DEFAULT '{}',
  emergency_contacts JSONB DEFAULT '[]',
  insurance_coverage JSONB DEFAULT '{}',
  performance_rating NUMERIC DEFAULT 5.0 CHECK (performance_rating >= 1.0 AND performance_rating <= 5.0),
  safety_record JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'temporarily_assigned', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimize progress_photos for construction
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.construction_phases(id);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.construction_milestones(id);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS work_report_id UUID REFERENCES public.work_reports(id);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES public.quality_inspections(id);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.construction_equipment(id);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS photo_type TEXT DEFAULT 'progress' CHECK (photo_type IN ('progress', 'quality', 'safety', 'equipment', 'materials', 'before', 'after', 'inspection', 'incident'));
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS geolocation JSONB DEFAULT '{}';
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS weather_conditions TEXT;
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS photographer_name TEXT;
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS camera_settings JSONB DEFAULT '{}';
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS markup_data JSONB DEFAULT '{}';
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5);
ALTER TABLE public.progress_photos ADD COLUMN IF NOT EXISTS technical_specifications JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_construction_phases_project_id ON public.construction_phases(project_id);
CREATE INDEX idx_construction_phases_parent_phase_id ON public.construction_phases(parent_phase_id);
CREATE INDEX idx_construction_phases_status ON public.construction_phases(status);
CREATE INDEX idx_construction_milestones_project_id ON public.construction_milestones(project_id);
CREATE INDEX idx_construction_milestones_phase_id ON public.construction_milestones(phase_id);
CREATE INDEX idx_construction_budget_items_project_id ON public.construction_budget_items(project_id);
CREATE INDEX idx_construction_budget_items_phase_id ON public.construction_budget_items(phase_id);
CREATE INDEX idx_construction_budget_items_parent_item_id ON public.construction_budget_items(parent_item_id);
CREATE INDEX idx_construction_budget_items_item_code ON public.construction_budget_items(item_code);
CREATE INDEX idx_construction_equipment_project_id ON public.construction_equipment(project_id);
CREATE INDEX idx_construction_equipment_status ON public.construction_equipment(status);
CREATE INDEX idx_quality_inspections_project_id ON public.quality_inspections(project_id);
CREATE INDEX idx_quality_inspections_phase_id ON public.quality_inspections(phase_id);
CREATE INDEX idx_material_requirements_project_id ON public.material_requirements(project_id);
CREATE INDEX idx_material_requirements_phase_id ON public.material_requirements(phase_id);
CREATE INDEX idx_construction_timeline_project_id ON public.construction_timeline(project_id);
CREATE INDEX idx_construction_timeline_phase_id ON public.construction_timeline(phase_id);
CREATE INDEX idx_work_reports_project_id ON public.work_reports(project_id);
CREATE INDEX idx_work_reports_report_date ON public.work_reports(report_date);
CREATE INDEX idx_construction_teams_project_id ON public.construction_teams(project_id);
CREATE INDEX idx_progress_photos_phase_id ON public.progress_photos(phase_id);
CREATE INDEX idx_progress_photos_milestone_id ON public.progress_photos(milestone_id);

-- Enable RLS on all tables
ALTER TABLE public.construction_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for construction_phases
CREATE POLICY "Employees and admins can manage construction phases" 
ON public.construction_phases 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for construction_milestones
CREATE POLICY "Employees and admins can manage construction milestones" 
ON public.construction_milestones 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for construction_budget_items
CREATE POLICY "Employees and admins can manage construction budget items" 
ON public.construction_budget_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for construction_equipment
CREATE POLICY "Employees and admins can manage construction equipment" 
ON public.construction_equipment 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for quality_inspections
CREATE POLICY "Employees and admins can manage quality inspections" 
ON public.quality_inspections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for material_requirements
CREATE POLICY "Employees and admins can manage material requirements" 
ON public.material_requirements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for construction_timeline
CREATE POLICY "Employees and admins can manage construction timeline" 
ON public.construction_timeline 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for work_reports
CREATE POLICY "Employees and admins can manage work reports" 
ON public.work_reports 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for construction_teams
CREATE POLICY "Employees and admins can manage construction teams" 
ON public.construction_teams 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_construction_phases_updated_at
    BEFORE UPDATE ON public.construction_phases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_milestones_updated_at
    BEFORE UPDATE ON public.construction_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_budget_items_updated_at
    BEFORE UPDATE ON public.construction_budget_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_equipment_updated_at
    BEFORE UPDATE ON public.construction_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_inspections_updated_at
    BEFORE UPDATE ON public.quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_requirements_updated_at
    BEFORE UPDATE ON public.material_requirements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_timeline_updated_at
    BEFORE UPDATE ON public.construction_timeline
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_reports_updated_at
    BEFORE UPDATE ON public.work_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construction_teams_updated_at
    BEFORE UPDATE ON public.construction_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();