-- Create RLS policies for personal_calendar_events and event_alerts tables

-- Enable RLS on personal_calendar_events
ALTER TABLE public.personal_calendar_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on event_alerts  
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for personal_calendar_events: Users can only access their own events
CREATE POLICY "Users can manage their own calendar events"
ON public.personal_calendar_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for event_alerts: Users can only access alerts for their own events
CREATE POLICY "Users can manage alerts for their own events"
ON public.event_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.personal_calendar_events 
    WHERE id = event_alerts.event_id 
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.personal_calendar_events 
    WHERE id = event_alerts.event_id 
    AND user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON public.personal_calendar_events TO authenticated;
GRANT ALL ON public.event_alerts TO authenticated;