-- Update constraints for both alert tables to allow all sound types
ALTER TABLE public.event_alerts DROP CONSTRAINT IF EXISTS event_alerts_sound_type_check;
ALTER TABLE public.event_alerts ADD CONSTRAINT event_alerts_sound_type_check 
CHECK (sound_type IN ('soft', 'professional', 'loud', 'uh-oh', 'airport'));

ALTER TABLE public.client_project_calendar_event_alerts DROP CONSTRAINT IF EXISTS client_project_calendar_event_alerts_sound_type_check;
ALTER TABLE public.client_project_calendar_event_alerts ADD CONSTRAINT client_project_calendar_event_alerts_sound_type_check 
CHECK (sound_type IN ('soft', 'professional', 'loud', 'uh-oh', 'airport'));

-- Update any existing data that might have old sound names
UPDATE public.event_alerts SET sound_type = 'soft' WHERE sound_type = 'soft-alert';
UPDATE public.event_alerts SET sound_type = 'professional' WHERE sound_type = 'professional-alert';
UPDATE public.event_alerts SET sound_type = 'loud' WHERE sound_type = 'loud-alert';

UPDATE public.client_project_calendar_event_alerts SET sound_type = 'soft' WHERE sound_type = 'soft-alert';
UPDATE public.client_project_calendar_event_alerts SET sound_type = 'professional' WHERE sound_type = 'professional-alert';
UPDATE public.client_project_calendar_event_alerts SET sound_type = 'loud' WHERE sound_type = 'loud-alert';