-- Create client project calendar events table
CREATE TABLE public.client_project_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  location TEXT,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_project_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy for sales advisors to manage events for their assigned projects
CREATE POLICY "Sales advisors can manage events for assigned projects" 
ON public.client_project_calendar_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = client_project_id 
    AND cp.assigned_advisor_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Policy for project managers/architects to manage events for their assigned projects
CREATE POLICY "Project managers can manage events for assigned projects" 
ON public.client_project_calendar_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = client_project_id 
    AND cp.project_manager_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Policy for admins to manage all events
CREATE POLICY "Admins can manage all client project calendar events" 
ON public.client_project_calendar_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy for clients to view events for their projects
CREATE POLICY "Clients can view events for their projects" 
ON public.client_project_calendar_events 
FOR SELECT 
USING (
  client_project_id IN (
    SELECT cp.id 
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
  )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_client_project_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_project_calendar_events_updated_at
  BEFORE UPDATE ON public.client_project_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_project_calendar_events_updated_at();

-- Add index for better performance
CREATE INDEX idx_client_project_calendar_events_project_id ON public.client_project_calendar_events(client_project_id);
CREATE INDEX idx_client_project_calendar_events_start_date ON public.client_project_calendar_events(start_date);