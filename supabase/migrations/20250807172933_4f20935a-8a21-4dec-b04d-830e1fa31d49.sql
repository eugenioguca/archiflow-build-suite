-- Crear tabla de planes de pago con soporte para múltiples planes por proyecto
CREATE TABLE public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('design_payment', 'construction_payment')),
  plan_sequence INTEGER NOT NULL DEFAULT 1,
  is_current_plan BOOLEAN NOT NULL DEFAULT true,
  plan_name TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints para múltiples planes
  UNIQUE(client_project_id, plan_type, plan_sequence),
  CONSTRAINT unique_current_plan UNIQUE(client_project_id, plan_type, is_current_plan) DEFERRABLE INITIALLY DEFERRED
);

-- Crear tabla de parcialidades
CREATE TABLE public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_date TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES public.profiles(id),
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(payment_plan_id, installment_number)
);

-- Índices para optimización con miles de registros
CREATE INDEX idx_payment_plans_project ON payment_plans(client_project_id);
CREATE INDEX idx_payment_plans_type ON payment_plans(plan_type);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);
CREATE INDEX idx_payment_plans_created_by ON payment_plans(created_by);
CREATE INDEX idx_payment_plans_current ON payment_plans(client_project_id, plan_type, is_current_plan) WHERE is_current_plan = true;

CREATE INDEX idx_installments_plan ON payment_installments(payment_plan_id);
CREATE INDEX idx_installments_status ON payment_installments(status);
CREATE INDEX idx_installments_due_date ON payment_installments(due_date);
CREATE INDEX idx_installments_overdue ON payment_installments(due_date, status) WHERE status = 'pending';

-- Políticas RLS para payment_plans
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage all payment plans" ON payment_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'employee'::user_role]))
  );

CREATE POLICY "Clients can view their payment plans" ON payment_plans
  FOR SELECT USING (
    client_project_id IN (
      SELECT cp.id FROM client_projects cp
      JOIN clients c ON c.id = cp.client_id
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
    )
  );

-- Políticas RLS para payment_installments
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage all installments" ON payment_installments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin'::user_role, 'employee'::user_role]))
  );

CREATE POLICY "Clients can view their installments" ON payment_installments
  FOR SELECT USING (
    payment_plan_id IN (
      SELECT pp.id FROM payment_plans pp
      JOIN client_projects cp ON cp.id = pp.client_project_id
      JOIN clients c ON c.id = cp.client_id
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
    )
  );

-- Función para manejar secuencias de planes automáticamente
CREATE OR REPLACE FUNCTION public.update_plan_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Al crear un nuevo plan, marcar el anterior como no actual
  IF TG_OP = 'INSERT' THEN
    UPDATE payment_plans 
    SET is_current_plan = false, updated_at = NOW()
    WHERE client_project_id = NEW.client_project_id 
    AND plan_type = NEW.plan_type 
    AND id != NEW.id;
    
    -- Establecer la secuencia correcta
    NEW.plan_sequence := COALESCE(
      (SELECT MAX(plan_sequence) + 1 
       FROM payment_plans 
       WHERE client_project_id = NEW.client_project_id 
       AND plan_type = NEW.plan_type), 
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_plan_sequence
  BEFORE INSERT ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_plan_sequence();

-- Función para transición automática Ventas → Diseño
CREATE OR REPLACE FUNCTION public.auto_transition_sales_to_design()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si hay plan de pago de diseño con primer anticipo pagado
  IF EXISTS (
    SELECT 1 FROM payment_plans pp
    JOIN payment_installments pi ON pp.id = pi.payment_plan_id
    WHERE pp.client_project_id = NEW.payment_plan_id
    AND pp.plan_type = 'design_payment'
    AND pp.is_current_plan = true
    AND pi.installment_number = 1
    AND pi.status = 'paid'
  ) AND TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    
    -- Actualizar el proyecto para transición a diseño
    UPDATE client_projects 
    SET status = 'design', updated_at = NOW()
    WHERE id = (
      SELECT pp.client_project_id 
      FROM payment_plans pp 
      WHERE pp.id = NEW.payment_plan_id
    ) AND status = 'potential'
    AND sales_pipeline_stage = 'cliente_cerrado'
    AND EXISTS (
      SELECT 1 FROM client_documents cd
      WHERE cd.project_id = client_projects.id 
      AND cd.document_type IN ('constancia_situacion_fiscal', 'contract')
      GROUP BY cd.project_id
      HAVING COUNT(DISTINCT cd.document_type) >= 2
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sales_to_design
  AFTER UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION auto_transition_sales_to_design();

-- Función para transición automática Diseño → Construcción
CREATE OR REPLACE FUNCTION public.auto_transition_design_to_construction()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si hay plan de pago de construcción con primer anticipo pagado
  IF EXISTS (
    SELECT 1 FROM payment_plans pp
    JOIN payment_installments pi ON pp.id = pi.payment_plan_id
    WHERE pp.client_project_id = NEW.payment_plan_id
    AND pp.plan_type = 'construction_payment'
    AND pp.is_current_plan = true
    AND pi.installment_number = 1
    AND pi.status = 'paid'
  ) AND TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    
    -- Actualizar el proyecto para transición a construcción
    UPDATE client_projects 
    SET status = 'construction', moved_to_construction_at = NOW(), updated_at = NOW()
    WHERE id = (
      SELECT pp.client_project_id 
      FROM payment_plans pp 
      WHERE pp.id = NEW.payment_plan_id
    ) AND status = 'design'
    AND construction_budget > 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_design_to_construction
  AFTER UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION auto_transition_design_to_construction();

-- Función para actualizar estado de planes automáticamente
CREATE OR REPLACE FUNCTION public.update_payment_plan_status()
RETURNS TRIGGER AS $$
DECLARE
  plan_record RECORD;
  total_paid NUMERIC;
  total_amount NUMERIC;
BEGIN
  -- Obtener información del plan
  SELECT pp.* INTO plan_record
  FROM payment_plans pp
  WHERE pp.id = NEW.payment_plan_id;
  
  -- Calcular total pagado
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payment_installments
  WHERE payment_plan_id = NEW.payment_plan_id
  AND status = 'paid';
  
  total_amount := plan_record.total_amount;
  
  -- Actualizar estado del plan
  IF total_paid >= total_amount THEN
    UPDATE payment_plans 
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.payment_plan_id;
  ELSIF total_paid > 0 THEN
    UPDATE payment_plans 
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.payment_plan_id AND status != 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_payment_plan_status
  AFTER UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_payment_plan_status();