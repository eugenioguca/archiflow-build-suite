-- Fix calendar system: ensure consistent user_id usage and proper RLS policies

-- 1. Fix personal_events table to use user_id consistently
ALTER TABLE public.personal_events 
DROP CONSTRAINT IF EXISTS personal_events_created_by_fkey;

ALTER TABLE public.personal_events 
ALTER COLUMN created_by TYPE uuid;

-- Add user_id column if it doesn't exist
ALTER TABLE public.personal_events 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing records to set user_id from profiles
UPDATE public.personal_events 
SET user_id = p.user_id 
FROM public.profiles p 
WHERE personal_events.created_by = p.id 
AND personal_events.user_id IS NULL;

-- Make user_id required
ALTER TABLE public.personal_events 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Fix event_invitations table structure
ALTER TABLE public.event_invitations 
DROP CONSTRAINT IF EXISTS event_invitations_inviter_id_fkey;

ALTER TABLE public.event_invitations 
DROP CONSTRAINT IF EXISTS event_invitations_invitee_id_fkey;

-- Add user_id columns for inviter and invitee
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS inviter_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS invitee_user_id uuid REFERENCES auth.users(id);

-- Update existing records
UPDATE public.event_invitations 
SET inviter_user_id = p.user_id 
FROM public.profiles p 
WHERE event_invitations.inviter_id = p.id 
AND event_invitations.inviter_user_id IS NULL;

UPDATE public.event_invitations 
SET invitee_user_id = p.user_id 
FROM public.profiles p 
WHERE event_invitations.invitee_id = p.id 
AND event_invitations.invitee_user_id IS NULL;

-- Make user_id columns required
ALTER TABLE public.event_invitations 
ALTER COLUMN inviter_user_id SET NOT NULL;

ALTER TABLE public.event_invitations 
ALTER COLUMN invitee_user_id SET NOT NULL;

-- 3. Fix event_participants table
ALTER TABLE public.event_participants 
DROP CONSTRAINT IF EXISTS event_participants_user_id_fkey;

ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS participant_user_id uuid REFERENCES auth.users(id);

-- Update existing records
UPDATE public.event_participants 
SET participant_user_id = p.user_id 
FROM public.profiles p 
WHERE event_participants.user_id = p.id 
AND event_participants.participant_user_id IS NULL;

-- Update user_id to be auth user_id directly
UPDATE public.event_participants 
SET user_id = participant_user_id 
WHERE participant_user_id IS NOT NULL;

-- 4. Drop and recreate RLS policies for personal_events
DROP POLICY IF EXISTS "Users can manage their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can view events where they are participants" ON public.personal_events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.personal_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.personal_events;

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

-- Create safe RLS policies for event_invitations
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

-- 7. Create notification trigger for client portal
CREATE OR REPLACE FUNCTION public.notify_client_event_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id_var uuid;
  project_id_var uuid;
  event_title_var text;
BEGIN
  -- Check if invitee is a client
  SELECT c.id, cp.id, pe.title
  INTO client_id_var, project_id_var, event_title_var
  FROM public.clients c
  JOIN public.profiles p ON p.id = c.profile_id
  JOIN public.personal_events pe ON pe.id = NEW.event_id
  LEFT JOIN public.client_projects cp ON cp.client_id = c.id
  WHERE p.user_id = NEW.invitee_user_id
  LIMIT 1;
  
  -- If it's a client, create portal notification
  IF client_id_var IS NOT NULL THEN
    INSERT INTO public.client_portal_notifications (
      client_id,
      project_id,
      notification_type,
      title,
      message,
      metadata
    ) VALUES (
      client_id_var,
      project_id_var,
      'event_invitation',
      'Nueva invitación a evento',
      'Has sido invitado al evento: ' || event_title_var,
      jsonb_build_object(
        'event_id', NEW.event_id,
        'invitation_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_client_event_invitation ON public.event_invitations;
CREATE TRIGGER trigger_notify_client_event_invitation
  AFTER INSERT ON public.event_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_event_invitation();

-- 8. Create function to accept invitation and create participant
CREATE OR REPLACE FUNCTION public.accept_event_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.event_invitations
  WHERE id = invitation_id 
  AND invitee_user_id = auth.uid()
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  -- Update invitation status
  UPDATE public.event_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation_id;
  
  -- Create participant record
  INSERT INTO public.event_participants (
    event_id, 
    user_id, 
    participation_status,
    added_at
  ) VALUES (
    invitation_record.event_id,
    invitation_record.invitee_user_id,
    'confirmed',
    now()
  ) ON CONFLICT (event_id, user_id) DO UPDATE SET
    participation_status = 'confirmed',
    added_at = now();
END;
$$;

-- 9. Create function to decline invitation
CREATE OR REPLACE FUNCTION public.decline_event_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update invitation status
  UPDATE public.event_invitations
  SET status = 'declined', responded_at = now()
  WHERE id = invitation_id 
  AND invitee_user_id = auth.uid()
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  -- Remove participant if exists
  DELETE FROM public.event_participants
  WHERE event_id = (
    SELECT event_id FROM public.event_invitations WHERE id = invitation_id
  ) AND user_id = auth.uid();
END;
$$;