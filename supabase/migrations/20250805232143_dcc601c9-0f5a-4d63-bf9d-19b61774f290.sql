-- Enable realtime for existing tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_installments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.electronic_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_portal_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_notifications;

-- Create function to notify team members of new client messages
CREATE OR REPLACE FUNCTION public.notify_team_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  team_member_id UUID;
  project_data RECORD;
BEGIN
  -- Only notify for client messages
  IF NEW.is_client_message = true THEN
    -- Get project team data
    SELECT 
      cp.assigned_advisor_id,
      cp.project_manager_id, 
      cp.construction_supervisor_id,
      c.full_name as client_name,
      cp.project_name
    INTO project_data
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    WHERE cp.id = NEW.project_id;
    
    -- Create notifications for each team member
    FOR team_member_id IN 
      SELECT unnest(ARRAY[
        project_data.assigned_advisor_id,
        project_data.project_manager_id,
        project_data.construction_supervisor_id
      ]) 
      WHERE unnest IS NOT NULL
    LOOP
      -- Get user_id from profile
      INSERT INTO public.module_notifications (
        user_id,
        client_id,
        source_module,
        target_module,
        notification_type,
        title,
        message
      )
      SELECT 
        p.user_id,
        NEW.client_id,
        'client_portal',
        CASE 
          WHEN p.id = project_data.assigned_advisor_id THEN 'sales'
          WHEN p.id = project_data.project_manager_id THEN 'design'
          WHEN p.id = project_data.construction_supervisor_id THEN 'construction'
          ELSE 'general'
        END,
        'new_chat_message',
        'Nuevo mensaje del cliente',
        'El cliente ' || project_data.client_name || ' escribió en el proyecto ' || project_data.project_name
      FROM public.profiles p
      WHERE p.id = team_member_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path TO 'public';

-- Create trigger for chat notifications
CREATE TRIGGER trigger_notify_team_new_chat_message
AFTER INSERT ON public.client_portal_chat
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_new_chat_message();

-- Create function to auto-update payment installment status in real-time
CREATE OR REPLACE FUNCTION public.notify_payment_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When installment status changes, create notification for client
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.client_portal_notifications (
      client_id,
      project_id,
      notification_type,
      title,
      message,
      metadata
    )
    SELECT 
      pp.client_projects.client_id,
      pp.client_project_id,
      'payment_status_update',
      'Actualización de pago',
      'El estado de su parcialidad #' || NEW.installment_number || ' ha cambiado a: ' || 
      CASE NEW.status
        WHEN 'paid' THEN 'Pagada'
        WHEN 'overdue' THEN 'Vencida'
        WHEN 'pending' THEN 'Pendiente'
        ELSE NEW.status
      END,
      jsonb_build_object(
        'installment_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount', NEW.amount
      )
    FROM public.payment_plans pp
    JOIN public.client_projects ON client_projects.id = pp.client_project_id
    WHERE pp.id = NEW.payment_plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Create trigger for payment status notifications
CREATE TRIGGER trigger_notify_payment_status_update
AFTER UPDATE ON public.payment_installments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_update();