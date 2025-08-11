-- Enable real-time for client_project_calendar_events table
ALTER TABLE public.client_project_calendar_events REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_project_calendar_events;