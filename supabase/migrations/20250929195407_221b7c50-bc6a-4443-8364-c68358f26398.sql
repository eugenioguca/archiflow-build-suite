-- Phase 8: Permissions, Audit, Events for Planning v2

-- =====================================================
-- ROLES ESPECÍFICOS PLANNING_V2
-- =====================================================

-- Enum para roles de Planning v2
CREATE TYPE public.planning_v2_role AS ENUM (
  'viewer',    -- Solo lectura
  'editor',    -- Editar presupuestos
  'publisher'  -- Publicar presupuestos
);

-- Tabla de asignaciones de roles Planning v2
CREATE TABLE IF NOT EXISTS public.planning_v2_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role planning_v2_role NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = sin expiración
  notes TEXT,
  UNIQUE(user_id, role)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planning_v2_user_roles_user ON public.planning_v2_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_v2_user_roles_role ON public.planning_v2_user_roles(role);

-- RLS para roles
ALTER TABLE public.planning_v2_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and publishers can manage Planning v2 roles"
ON public.planning_v2_user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND (
      p.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.planning_v2_user_roles r
        WHERE r.user_id = p.id
        AND r.role = 'publisher'
        AND (r.expires_at IS NULL OR r.expires_at > now())
      )
    )
  )
);

-- Función de seguridad para verificar rol Planning v2
CREATE OR REPLACE FUNCTION public.has_planning_v2_role(_user_id uuid, _role planning_v2_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Admins tienen todos los permisos
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.role = 'admin'
  ) OR EXISTS (
    SELECT 1
    FROM public.planning_v2_user_roles r
    JOIN public.profiles p ON r.user_id = p.id
    WHERE p.user_id = _user_id
    AND r.role = _role
    AND (r.expires_at IS NULL OR r.expires_at > now())
  );
$$;

-- =====================================================
-- AUDITORÍA
-- =====================================================

-- Tabla de auditoría para cambios en Planning v2
CREATE TABLE IF NOT EXISTS public.planning_v2_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL, -- 'planning_conceptos', 'planning_template_fields', etc.
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Cambios específicos
  field_name TEXT, -- Campo modificado (ej: 'cantidad_real', 'formula', 'wbs_code')
  old_value TEXT, -- Valor anterior
  new_value TEXT, -- Valor nuevo
  
  -- Contexto adicional
  budget_id UUID, -- Presupuesto afectado
  change_reason TEXT, -- Razón del cambio (opcional)
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para consultas comunes
CREATE INDEX IF NOT EXISTS idx_planning_v2_audit_log_record ON public.planning_v2_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_planning_v2_audit_log_changed_by ON public.planning_v2_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_planning_v2_audit_log_changed_at ON public.planning_v2_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_planning_v2_audit_log_budget ON public.planning_v2_audit_log(budget_id);

-- RLS para auditoría
ALTER TABLE public.planning_v2_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publishers and admins can view audit log"
ON public.planning_v2_audit_log
FOR SELECT
USING (
  public.has_planning_v2_role(auth.uid(), 'publisher')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Solo el sistema puede insertar en audit log
CREATE POLICY "System can insert audit log"
ON public.planning_v2_audit_log
FOR INSERT
WITH CHECK (true);

-- Función para registrar cambio en audit log
CREATE OR REPLACE FUNCTION public.log_planning_v2_change(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_field_name TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_budget_id UUID DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id UUID;
  v_log_id UUID;
BEGIN
  -- Obtener profile_id del usuario actual
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Insertar registro de auditoría
  INSERT INTO public.planning_v2_audit_log (
    table_name,
    record_id,
    action,
    changed_by,
    field_name,
    old_value,
    new_value,
    budget_id,
    change_reason
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    v_profile_id,
    p_field_name,
    p_old_value,
    p_new_value,
    p_budget_id,
    p_change_reason
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Trigger function para auditoría automática en conceptos
CREATE OR REPLACE FUNCTION public.audit_planning_conceptos_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  -- Obtener budget_id del concepto
  SELECT p.budget_id INTO v_budget_id
  FROM public.planning_partidas p
  WHERE p.id = COALESCE(NEW.partida_id, OLD.partida_id);

  IF TG_OP = 'UPDATE' THEN
    -- Auditar cambios en campos clave
    IF OLD.cantidad_real IS DISTINCT FROM NEW.cantidad_real THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'cantidad_real',
        OLD.cantidad_real::TEXT, NEW.cantidad_real::TEXT, v_budget_id, NULL
      );
    END IF;

    IF OLD.desperdicio_pct IS DISTINCT FROM NEW.desperdicio_pct THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'desperdicio_pct',
        OLD.desperdicio_pct::TEXT, NEW.desperdicio_pct::TEXT, v_budget_id, NULL
      );
    END IF;

    IF OLD.precio_real IS DISTINCT FROM NEW.precio_real THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'precio_real',
        OLD.precio_real::TEXT, NEW.precio_real::TEXT, v_budget_id, NULL
      );
    END IF;

    IF OLD.honorarios_pct IS DISTINCT FROM NEW.honorarios_pct THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'honorarios_pct',
        OLD.honorarios_pct::TEXT, NEW.honorarios_pct::TEXT, v_budget_id, NULL
      );
    END IF;

    IF OLD.wbs_code IS DISTINCT FROM NEW.wbs_code THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'wbs_code',
        OLD.wbs_code, NEW.wbs_code, v_budget_id, NULL
      );
    END IF;

    IF OLD.long_description IS DISTINCT FROM NEW.long_description THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'long_description',
        OLD.long_description, NEW.long_description, v_budget_id, NULL
      );
    END IF;

    IF OLD.provider IS DISTINCT FROM NEW.provider THEN
      PERFORM public.log_planning_v2_change(
        'planning_conceptos', NEW.id, 'UPDATE', 'provider',
        OLD.provider, NEW.provider, v_budget_id, NULL
      );
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_planning_v2_change(
      'planning_conceptos', NEW.id, 'INSERT', NULL, NULL, NULL, v_budget_id,
      'Concepto creado: ' || NEW.short_description
    );

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_planning_v2_change(
      'planning_conceptos', OLD.id, 'DELETE', NULL, NULL, NULL, v_budget_id,
      'Concepto eliminado: ' || OLD.short_description
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger de auditoría a conceptos
CREATE TRIGGER trigger_audit_planning_conceptos
AFTER INSERT OR UPDATE OR DELETE ON public.planning_conceptos
FOR EACH ROW
EXECUTE FUNCTION public.audit_planning_conceptos_changes();

-- Trigger function para auditoría en template fields (fórmulas)
CREATE OR REPLACE FUNCTION public.audit_planning_template_fields_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.formula IS DISTINCT FROM NEW.formula THEN
      PERFORM public.log_planning_v2_change(
        'planning_template_fields', NEW.id, 'UPDATE', 'formula',
        OLD.formula, NEW.formula, NULL, 'Fórmula modificada en plantilla'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_planning_template_fields
AFTER UPDATE ON public.planning_template_fields
FOR EACH ROW
EXECUTE FUNCTION public.audit_planning_template_fields_changes();

-- =====================================================
-- EVENTOS Y WEBHOOKS
-- =====================================================

-- Tabla de webhooks configurados
CREATE TABLE IF NOT EXISTS public.planning_v2_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['planning_v2.budget.published', 'planning_v2.budget.exported']
  secret TEXT, -- Para validar payload con HMAC
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planning_v2_webhooks_active ON public.planning_v2_webhooks(is_active);

-- RLS
ALTER TABLE public.planning_v2_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publishers and admins can manage webhooks"
ON public.planning_v2_webhooks
FOR ALL
USING (
  public.has_planning_v2_role(auth.uid(), 'publisher')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Tabla de eventos disparados
CREATE TABLE IF NOT EXISTS public.planning_v2_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'planning_v2.budget.published', 'planning_v2.budget.exported'
  budget_id UUID REFERENCES public.planning_budgets(id),
  snapshot_id UUID REFERENCES public.planning_budget_snapshots(id),
  triggered_by UUID NOT NULL REFERENCES public.profiles(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  webhooks_sent INTEGER DEFAULT 0,
  webhooks_failed INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planning_v2_events_type ON public.planning_v2_events(event_type);
CREATE INDEX IF NOT EXISTS idx_planning_v2_events_budget ON public.planning_v2_events(budget_id);
CREATE INDEX IF NOT EXISTS idx_planning_v2_events_triggered_at ON public.planning_v2_events(triggered_at DESC);

-- RLS
ALTER TABLE public.planning_v2_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publishers and admins can view events"
ON public.planning_v2_events
FOR SELECT
USING (
  public.has_planning_v2_role(auth.uid(), 'publisher')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "System can insert events"
ON public.planning_v2_events
FOR INSERT
WITH CHECK (true);

-- Función para disparar evento
CREATE OR REPLACE FUNCTION public.trigger_planning_v2_event(
  p_event_type TEXT,
  p_budget_id UUID,
  p_snapshot_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id UUID;
  v_event_id UUID;
BEGIN
  -- Obtener profile_id del usuario actual
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Insertar evento
  INSERT INTO public.planning_v2_events (
    event_type,
    budget_id,
    snapshot_id,
    triggered_by,
    payload
  ) VALUES (
    p_event_type,
    p_budget_id,
    p_snapshot_id,
    v_profile_id,
    p_payload
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER trigger_update_planning_v2_webhooks_updated_at
BEFORE UPDATE ON public.planning_v2_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_planning_template_updated_at();