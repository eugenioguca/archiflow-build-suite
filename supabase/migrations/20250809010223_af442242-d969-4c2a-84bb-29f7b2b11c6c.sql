-- Fix calendar system: Step 2 - RLS policies and functions

-- 4. Drop and recreate RLS policies for personal_events
DROP POLICY IF EXISTS "Users can manage their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can view events where they are participants" ON public.personal_events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can view events where they are invited" ON public.personal_events;

-- Create simple, safe RLS policies for personal_events
CREATE POLICY "Users can manage their own events" 
ON public.personal_events FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Users can view events where they are invited" 
ON public.personal_events FOR SELECT 
USING (
  id IN (
    SELECT event_id FROM public.event_participants 
    WHERE user_id = auth.uid() AND participation_status = 'confirmed'
  )
);

-- 5. Drop and recreate RLS policies for event_invitations
DROP POLICY IF EXISTS "Users can view sent invitations" ON public.event_invitations;
DROP POLICY IF EXISTS "Users can view received invitations" ON public.event_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their events" ON public.event_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON public.event_invitations;

-- Create safe RLS policies for event_invitations using new user_id columns
CREATE POLICY "Users can view sent invitations" 
ON public.event_invitations FOR SELECT 
USING (inviter_user_id = auth.uid());

CREATE POLICY "Users can view received invitations" 
ON public.event_invitations FOR SELECT 
USING (invitee_user_id = auth.uid());

CREATE POLICY "Users can create invitations for their events" 
ON public.event_invitations FOR INSERT 
WITH CHECK (
  inviter_user_id = auth.uid() AND 
  event_id IN (SELECT id FROM public.personal_events WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update received invitations" 
ON public.event_invitations FOR UPDATE 
USING (invitee_user_id = auth.uid());

-- 6. RLS policies for event_participants
DROP POLICY IF EXISTS "Users can view their participations" ON public.event_participants;
DROP POLICY IF EXISTS "Event creators can manage participants" ON public.event_participants;
DROP POLICY IF EXISTS "System can create participants" ON public.event_participants;

CREATE POLICY "Users can view their participations" 
ON public.event_participants FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Event creators can manage participants" 
ON public.event_participants FOR ALL 
USING (
  event_id IN (SELECT id FROM public.personal_events WHERE user_id = auth.uid())
);

CREATE POLICY "System can create participants" 
ON public.event_participants FOR INSERT 
WITH CHECK (true);