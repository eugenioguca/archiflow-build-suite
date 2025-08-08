-- FASE 1: Base de Datos - Sistema de Calendario Personal (CORREGIDO)

-- Tabla principal de eventos personales
CREATE TABLE public.personal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  event_type TEXT DEFAULT 'event', -- event, reminder, meeting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Tabla de alertas configurables
CREATE TABLE public.event_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.personal_events(id) ON DELETE CASCADE,
  alert_minutes_before INTEGER NOT NULL,
  alert_type TEXT DEFAULT 'popup', -- popup, email
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de invitaciones
CREATE TABLE public.event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.personal_events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id),
  invitee_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  response_date TIMESTAMPTZ,
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, invitee_id)
);

-- Tabla de participantes confirmados
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.personal_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  participation_status TEXT DEFAULT 'confirmed', -- confirmed, tentative, declined
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.personal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para personal_events
CREATE POLICY "Users can view their own events" ON public.personal_events
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view events they're invited to" ON public.personal_events
FOR SELECT USING (
  id IN (
    SELECT event_id FROM public.event_invitations 
    WHERE invitee_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ) AND status = 'accepted'
  )
);

CREATE POLICY "Users can create their own events" ON public.personal_events
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events" ON public.personal_events
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON public.personal_events
FOR DELETE USING (user_id = auth.uid());

-- Políticas RLS para event_alerts
CREATE POLICY "Users can manage alerts for their events" ON public.event_alerts
FOR ALL USING (
  event_id IN (
    SELECT id FROM public.personal_events WHERE user_id = auth.uid()
  )
);

-- Políticas RLS para event_invitations
CREATE POLICY "Users can view invitations they sent or received" ON public.event_invitations
FOR SELECT USING (
  inviter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  invitee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create invitations for their events" ON public.event_invitations
FOR INSERT WITH CHECK (
  inviter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
  event_id IN (SELECT id FROM public.personal_events WHERE user_id = auth.uid())
);

CREATE POLICY "Invitees can update their invitation status" ON public.event_invitations
FOR UPDATE USING (
  invitee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Event owners can delete invitations" ON public.event_invitations
FOR DELETE USING (
  inviter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Políticas RLS para event_participants
CREATE POLICY "Users can view participants of events they created or are invited to" ON public.event_participants
FOR SELECT USING (
  event_id IN (
    SELECT id FROM public.personal_events WHERE user_id = auth.uid()
    UNION
    SELECT event_id FROM public.event_invitations 
    WHERE invitee_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ) AND status = 'accepted'
  )
);

CREATE POLICY "Event owners can manage participants" ON public.event_participants
FOR ALL USING (
  event_id IN (
    SELECT id FROM public.personal_events WHERE user_id = auth.uid()
  )
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_personal_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_personal_events_updated_at
  BEFORE UPDATE ON public.personal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personal_events_updated_at();

-- Función para auto-agregar participantes cuando se acepta invitación
CREATE OR REPLACE FUNCTION public.auto_add_event_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la invitación fue aceptada, agregar como participante
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO public.event_participants (event_id, user_id, participation_status)
    VALUES (NEW.event_id, NEW.invitee_id, 'confirmed')
    ON CONFLICT (event_id, user_id) DO UPDATE SET
      participation_status = 'confirmed',
      added_at = now();
  -- Si la invitación fue declinada, remover como participante
  ELSIF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    DELETE FROM public.event_participants 
    WHERE event_id = NEW.event_id AND user_id = NEW.invitee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-gestionar participantes
CREATE TRIGGER auto_add_event_participant
  AFTER UPDATE ON public.event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_event_participant();

-- Función para obtener usuarios por proyecto
CREATE OR REPLACE FUNCTION public.get_project_team_members(project_id_param UUID)
RETURNS TABLE(
  user_id UUID,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  user_role TEXT,
  user_position TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position
  FROM public.profiles p
  WHERE p.id IN (
    SELECT cp.assigned_advisor_id FROM public.client_projects cp WHERE cp.id = project_id_param
    UNION
    SELECT cp.project_manager_id FROM public.client_projects cp WHERE cp.id = project_id_param  
    UNION
    SELECT cp.construction_supervisor_id FROM public.client_projects cp WHERE cp.id = project_id_param
  ) AND p.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios por departamento
CREATE OR REPLACE FUNCTION public.get_users_by_department(department_param TEXT)
RETURNS TABLE(
  user_id UUID,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  user_role TEXT,
  user_position TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position
  FROM public.profiles p
  WHERE p.department_enum = department_param
  AND p.role IN ('admin', 'employee')
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener usuarios por posición
CREATE OR REPLACE FUNCTION public.get_users_by_position(position_param TEXT)
RETURNS TABLE(
  user_id UUID,
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  user_role TEXT,
  department TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.department_enum::text as department
  FROM public.profiles p
  WHERE p.position_enum = position_param
  AND p.role IN ('admin', 'employee')
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;