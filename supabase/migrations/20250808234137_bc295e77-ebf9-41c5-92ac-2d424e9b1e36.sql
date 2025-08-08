-- Add realtime publication for calendar tables
INSERT INTO supabase_realtime.publication VALUES ('supabase_realtime', 'event_invitations', true);
INSERT INTO supabase_realtime.publication VALUES ('supabase_realtime', 'event_participants', true);
INSERT INTO supabase_realtime.publication VALUES ('supabase_realtime', 'event_alerts', true);
INSERT INTO supabase_realtime.publication VALUES ('supabase_realtime', 'personal_events', true);

-- Enable replica identity for realtime
ALTER TABLE public.event_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.event_participants REPLICA IDENTITY FULL;
ALTER TABLE public.personal_events REPLICA IDENTITY FULL;