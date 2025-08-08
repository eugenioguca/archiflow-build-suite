-- Enable realtime properly by altering publication
ALTER PUBLICATION supabase_realtime ADD TABLE event_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;  
ALTER PUBLICATION supabase_realtime ADD TABLE event_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE personal_events;