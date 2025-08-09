-- Fix calendar system: Step 3 - Functions and triggers

-- 7. Create notification trigger for client portal
CREATE OR REPLACE FUNCTION public.notify_client_event_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
SET search_path = 'public'
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
SET search_path = 'public'
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