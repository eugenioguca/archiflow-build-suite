-- Add sound_type column to event_alerts table
ALTER TABLE public.event_alerts 
ADD COLUMN sound_type text DEFAULT 'icq';

-- Update RLS policies for event_alerts
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own event alerts" 
ON public.event_alerts 
FOR ALL 
USING (
  event_id IN (
    SELECT id FROM public.personal_events 
    WHERE created_by = auth.uid()
  )
);

-- Enable realtime for event_alerts
ALTER TABLE public.event_alerts REPLICA IDENTITY FULL;