-- Crear tablas para el módulo de construcción

-- 1. Anotaciones de presupuesto
CREATE TABLE public.budget_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  mayor_id UUID,
  partida_id UUID,
  subpartida_id UUID,
  annotation_type TEXT NOT NULL DEFAULT 'note', -- note, warning, critical
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Estados de abastecimiento de materiales
CREATE TABLE public.budget_supply_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  mayor_id UUID,
  partida_id UUID,
  subpartida_id UUID,
  supply_status TEXT NOT NULL DEFAULT 'not_required', -- not_required, required, requested, in_transit, delivered
  quantity_required NUMERIC DEFAULT 0,
  quantity_requested NUMERIC DEFAULT 0,
  quantity_delivered NUMERIC DEFAULT 0,
  supplier_id UUID,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Log de actividades del cronograma
CREATE TABLE public.gantt_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  activity_name TEXT NOT NULL,
  activity_reference TEXT, -- Referencia a la actividad original del gantt
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, blocked, completed
  progress_percentage INTEGER DEFAULT 0,
  actual_start_date DATE,
  actual_end_date DATE,
  planned_start_date DATE,
  planned_end_date DATE,
  delay_reason TEXT,
  responsible_user_id UUID,
  notes TEXT,
  evidence_photos JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Cuadrillas de construcción
CREATE TABLE public.construction_crews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  crew_name TEXT NOT NULL,
  specialty TEXT NOT NULL, -- albañilería, plomería, electricidad, etc.
  crew_leader_name TEXT,
  crew_leader_phone TEXT,
  hourly_rate NUMERIC DEFAULT 0,
  daily_rate NUMERIC DEFAULT 0,
  estimated_hours INTEGER DEFAULT 0,
  actual_hours INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, completed
  members JSONB DEFAULT '[]'::jsonb, -- Array de miembros con nombre, rol, etc.
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Plantillas de checklist de calidad
CREATE TABLE public.quality_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  phase_name TEXT NOT NULL,
  checklist_template JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de items del checklist
  inspection_date DATE,
  inspector_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, passed, failed, rework_required
  results JSONB DEFAULT '{}'::jsonb, -- Resultados de cada item
  photos JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  reinspection_required BOOLEAN DEFAULT false,
  reinspection_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Incidencias de seguridad
CREATE TABLE public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  incident_type TEXT NOT NULL, -- accident, near_miss, unsafe_condition, safety_violation
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  description TEXT NOT NULL,
  location_details TEXT,
  people_involved JSONB DEFAULT '[]'::jsonb,
  corrective_actions TEXT,
  preventive_actions TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
  evidence_photos JSONB DEFAULT '[]'::jsonb,
  reported_by UUID NOT NULL,
  investigated_by UUID,
  resolution_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Órdenes de cambio
CREATE TABLE public.change_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  change_order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason_for_change TEXT,
  cost_impact NUMERIC DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, on_hold
  requested_by UUID NOT NULL,
  approved_by UUID,
  approval_date DATE,
  implementation_status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
  attachments JSONB DEFAULT '[]'::jsonb,
  client_approval_required BOOLEAN DEFAULT true,
  client_approved BOOLEAN DEFAULT false,
  client_approval_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Equipo del proyecto (personas)
CREATE TABLE public.project_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  user_id UUID, -- Si es usuario interno del sistema
  external_name TEXT, -- Si es persona externa
  phone TEXT,
  email TEXT,
  company TEXT,
  role TEXT NOT NULL, -- project_manager, supervisor, foreman, worker, subcontractor
  specialty TEXT, -- arquitecto, ingeniero, albañil, plomero, etc.
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  is_internal BOOLEAN DEFAULT false, -- true para empleados, false para externos/subcontratistas
  hourly_rate NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Post-venta
CREATE TABLE public.post_sale_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'routine', -- routine, warranty, complaint, maintenance
  description TEXT NOT NULL,
  issues_found JSONB DEFAULT '[]'::jsonb,
  actions_taken TEXT,
  client_satisfaction INTEGER DEFAULT 5, -- 1-5 scale
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, resolved, closed
  photos JSONB DEFAULT '[]'::jsonb,
  cost_incurred NUMERIC DEFAULT 0,
  warranty_claim BOOLEAN DEFAULT false,
  visited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Registro de horas trabajadas (timesheets)
CREATE TABLE public.construction_timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  client_id UUID NOT NULL,
  crew_id UUID,
  team_member_id UUID,
  work_date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  activity_description TEXT,
  phase_reference TEXT,
  weather_conditions TEXT,
  productivity_rating INTEGER DEFAULT 3, -- 1-5 scale
  notes TEXT,
  approved_by UUID,
  approval_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.budget_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_supply_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gantt_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_sale_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_timesheets ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para empleados y admins
CREATE POLICY "Employees and admins can manage budget annotations" ON public.budget_annotations
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage budget supply status" ON public.budget_supply_status
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage gantt activity log" ON public.gantt_activity_log
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage construction crews" ON public.construction_crews
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage quality checklists" ON public.quality_checklists
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage security incidents" ON public.security_incidents
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage change orders" ON public.change_orders
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage project team members" ON public.project_team_members
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage post sale visits" ON public.post_sale_visits
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

CREATE POLICY "Employees and admins can manage construction timesheets" ON public.construction_timesheets
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])));

-- Crear índices para mejor rendimiento
CREATE INDEX idx_budget_annotations_project_id ON public.budget_annotations(project_id);
CREATE INDEX idx_budget_supply_status_project_id ON public.budget_supply_status(project_id);
CREATE INDEX idx_gantt_activity_log_project_id ON public.gantt_activity_log(project_id);
CREATE INDEX idx_construction_crews_project_id ON public.construction_crews(project_id);
CREATE INDEX idx_quality_checklists_project_id ON public.quality_checklists(project_id);
CREATE INDEX idx_security_incidents_project_id ON public.security_incidents(project_id);
CREATE INDEX idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX idx_project_team_members_project_id ON public.project_team_members(project_id);
CREATE INDEX idx_post_sale_visits_project_id ON public.post_sale_visits(project_id);
CREATE INDEX idx_construction_timesheets_project_id ON public.construction_timesheets(project_id);

-- Crear triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_annotations_updated_at BEFORE UPDATE ON public.budget_annotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_supply_status_updated_at BEFORE UPDATE ON public.budget_supply_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gantt_activity_log_updated_at BEFORE UPDATE ON public.gantt_activity_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_construction_crews_updated_at BEFORE UPDATE ON public.construction_crews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quality_checklists_updated_at BEFORE UPDATE ON public.quality_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON public.security_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_team_members_updated_at BEFORE UPDATE ON public.project_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_post_sale_visits_updated_at BEFORE UPDATE ON public.post_sale_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_construction_timesheets_updated_at BEFORE UPDATE ON public.construction_timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();