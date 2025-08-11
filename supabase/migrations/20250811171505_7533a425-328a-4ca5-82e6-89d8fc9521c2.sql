-- Ensure get_upcoming_alerts function exists and is working correctly
CREATE OR REPLACE FUNCTION public.get_upcoming_alerts(user_uuid uuid)
 RETURNS TABLE(event_id uuid, event_title text, event_start_date timestamp with time zone, alert_id uuid, alert_type text, alert_value integer, sound_enabled boolean, sound_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;