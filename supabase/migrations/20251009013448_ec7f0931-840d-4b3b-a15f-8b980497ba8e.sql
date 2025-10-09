-- RLS policies for event_alerts table
-- Users can read their own alerts
CREATE POLICY "Users can view their own alerts"
ON public.event_alerts
FOR SELECT
TO authenticated
USING (
  event_id IN (
    SELECT id FROM public.personal_calendar_events
    WHERE user_id = auth.uid()
  )
);

-- Users can insert their own alerts
CREATE POLICY "Users can create their own alerts"
ON public.event_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  event_id IN (
    SELECT id FROM public.personal_calendar_events
    WHERE user_id = auth.uid()
  )
);

-- Users can update their own alerts (for marking as triggered)
CREATE POLICY "Users can update their own alerts"
ON public.event_alerts
FOR UPDATE
TO authenticated
USING (
  event_id IN (
    SELECT id FROM public.personal_calendar_events
    WHERE user_id = auth.uid()
  )
);

-- Worker (service_role) can update any alerts
CREATE POLICY "Worker can update alerts"
ON public.event_alerts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Worker (service_role) can read all alerts for dispatch
CREATE POLICY "Worker can read all alerts"
ON public.event_alerts
FOR SELECT
TO service_role
USING (true);

-- RLS policies for push_subscriptions table already created in previous migration
-- Verify that service_role has access
CREATE POLICY "Worker can read push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO service_role
USING (true);