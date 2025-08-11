-- Crear tabla de eventos del calendario personal
CREATE TABLE public.personal_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de alertas de eventos
CREATE TABLE public.event_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.personal_calendar_events(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('minutes', 'hours', 'days')),
  alert_value INTEGER NOT NULL CHECK (alert_value > 0),
  sound_enabled BOOLEAN DEFAULT false,
  sound_type TEXT DEFAULT 'soft' CHECK (sound_type IN ('soft', 'professional', 'loud')),
  is_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Función para validar fechas de eventos
CREATE OR REPLACE FUNCTION validate_event_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar fechas
CREATE TRIGGER validate_event_dates_trigger
  BEFORE INSERT OR UPDATE ON public.personal_calendar_events
  FOR EACH ROW EXECUTE FUNCTION validate_event_dates();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_personal_calendar_events_updated_at
  BEFORE UPDATE ON public.personal_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_alerts_updated_at
  BEFORE UPDATE ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.personal_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para eventos del calendario
CREATE POLICY "Users can manage their own calendar events"
ON public.personal_calendar_events
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Políticas RLS para alertas de eventos
CREATE POLICY "Users can manage alerts for their own events"
ON public.event_alerts
FOR ALL
USING (event_id IN (
  SELECT id FROM public.personal_calendar_events
  WHERE user_id = auth.uid()
))
WITH CHECK (event_id IN (
  SELECT id FROM public.personal_calendar_events
  WHERE user_id = auth.uid()
));

-- Función para obtener eventos próximos con alertas
CREATE OR REPLACE FUNCTION get_upcoming_alerts(user_uuid UUID)
RETURNS TABLE(
  event_id UUID,
  event_title TEXT,
  event_start_date TIMESTAMP WITH TIME ZONE,
  alert_id UUID,
  alert_type TEXT,
  alert_value INTEGER,
  sound_enabled BOOLEAN,
  sound_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_date,
    a.id,
    a.alert_type,
    a.alert_value,
    a.sound_enabled,
    a.sound_type
  FROM public.personal_calendar_events e
  JOIN public.event_alerts a ON e.id = a.event_id
  WHERE e.user_id = user_uuid
    AND e.start_date > now()
    AND a.is_triggered = false
    AND (
      (a.alert_type = 'minutes' AND e.start_date <= now() + INTERVAL '1 minute' * a.alert_value) OR
      (a.alert_type = 'hours' AND e.start_date <= now() + INTERVAL '1 hour' * a.alert_value) OR
      (a.alert_type = 'days' AND e.start_date <= now() + INTERVAL '1 day' * a.alert_value)
    )
  ORDER BY e.start_date ASC;
END;
$$;