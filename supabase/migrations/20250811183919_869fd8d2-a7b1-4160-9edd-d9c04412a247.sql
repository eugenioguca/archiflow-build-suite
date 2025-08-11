-- Create alerts table for client project calendar events
CREATE TABLE public.client_project_calendar_event_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.client_project_calendar_events(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('minutes', 'hours', 'days')),
  alert_value INTEGER NOT NULL CHECK (alert_value > 0),
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_type TEXT DEFAULT 'soft-alert' CHECK (sound_type IN ('soft-alert', 'professional-alert', 'loud-alert', 'icq-message')),
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_project_calendar_event_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for client project calendar event alerts
CREATE POLICY "Team members can view project calendar event alerts" 
ON public.client_project_calendar_event_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.client_project_calendar_events cpce
    JOIN public.client_projects cp ON cpce.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cpce.id = client_project_calendar_event_alerts.event_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id  
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Team members can create project calendar event alerts" 
ON public.client_project_calendar_event_alerts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_project_calendar_events cpce
    JOIN public.client_projects cp ON cpce.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cpce.id = client_project_calendar_event_alerts.event_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id  
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Team members can update project calendar event alerts" 
ON public.client_project_calendar_event_alerts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.client_project_calendar_events cpce
    JOIN public.client_projects cp ON cpce.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cpce.id = client_project_calendar_event_alerts.event_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id  
      OR cp.construction_supervisor_id = p.id
    )
  )
);

CREATE POLICY "Team members can delete project calendar event alerts" 
ON public.client_project_calendar_event_alerts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.client_project_calendar_events cpce
    JOIN public.client_projects cp ON cpce.client_project_id = cp.id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE cpce.id = client_project_calendar_event_alerts.event_id
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id  
      OR cp.construction_supervisor_id = p.id
    )
  )
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_client_project_calendar_event_alerts_updated_at
  BEFORE UPDATE ON public.client_project_calendar_event_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_project_calendar_events_updated_at();

-- Create function to get upcoming alerts for client project calendar
CREATE OR REPLACE FUNCTION public.get_upcoming_client_project_alerts(user_uuid uuid)
RETURNS TABLE(
  event_id uuid, 
  event_title text, 
  event_start_date timestamp with time zone, 
  alert_id uuid, 
  alert_type text, 
  alert_value integer, 
  sound_enabled boolean, 
  sound_type text,
  project_id uuid,
  project_name text,
  client_name text
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
    a.sound_type,
    cp.id as project_id,
    cp.project_name,
    c.full_name as client_name
  FROM public.client_project_calendar_events e
  JOIN public.client_project_calendar_event_alerts a ON e.id = a.event_id
  JOIN public.client_projects cp ON e.client_project_id = cp.id
  JOIN public.clients c ON cp.client_id = c.id
  JOIN public.profiles p ON p.user_id = user_uuid
  WHERE e.start_date > now()
    AND a.is_triggered = false
    AND (
      (a.alert_type = 'minutes' AND e.start_date <= now() + INTERVAL '1 minute' * a.alert_value) OR
      (a.alert_type = 'hours' AND e.start_date <= now() + INTERVAL '1 hour' * a.alert_value) OR
      (a.alert_type = 'days' AND e.start_date <= now() + INTERVAL '1 day' * a.alert_value)
    )
    AND (
      p.role = 'admin'
      OR cp.assigned_advisor_id = p.id
      OR cp.project_manager_id = p.id  
      OR cp.construction_supervisor_id = p.id
    )
  ORDER BY e.start_date ASC;
END;
$$;