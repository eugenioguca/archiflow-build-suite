-- Create function to notify client when team responds in chat
CREATE OR REPLACE FUNCTION public.notify_client_new_chat_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_data RECORD;
BEGIN
  -- Only notify for team messages (not client messages)
  IF NEW.is_client_message = false THEN
    -- Get project and client data
    SELECT 
      cp.client_id,
      c.full_name as client_name,
      cp.project_name
    INTO project_data
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    WHERE cp.id = NEW.project_id;
    
    -- Create notification for client
    INSERT INTO public.client_portal_notifications (
      client_id,
      project_id,
      notification_type,
      title,
      message,
      metadata
    ) VALUES (
      project_data.client_id,
      NEW.project_id,
      'new_team_message',
      'Nuevo mensaje del equipo',
      'El equipo ha respondido en el chat del proyecto ' || project_data.project_name,
      jsonb_build_object(
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for client notifications on team responses
DROP TRIGGER IF EXISTS notify_client_team_response ON public.client_portal_chat;
CREATE TRIGGER notify_client_team_response
  AFTER INSERT ON public.client_portal_chat
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_new_chat_response();