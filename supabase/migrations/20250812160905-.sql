-- Step 1: Create the missing employee_has_project_access function
CREATE OR REPLACE FUNCTION public.employee_has_project_access(profile_id_param UUID, project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins have access to all projects
  IF EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = profile_id_param 
    AND p.role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if employee is assigned to the project in any role
  RETURN EXISTS (
    SELECT 1 FROM client_projects cp
    WHERE cp.id = project_id_param
    AND (
      cp.assigned_advisor_id = profile_id_param OR
      cp.project_manager_id = profile_id_param OR
      cp.construction_supervisor_id = profile_id_param
    )
  );
END;
$$;

-- Step 2: Add sender information columns to project_chat table
ALTER TABLE public.project_chat 
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_avatar TEXT;

-- Step 3: Create function to check client project access using profiles.id
CREATE OR REPLACE FUNCTION public.client_has_project_access_by_profile_id(profile_id_param UUID, project_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM client_projects cp
    JOIN clients c ON cp.client_id = c.id
    WHERE cp.id = project_id_param 
    AND c.profile_id = profile_id_param
  );
END;
$$;

-- Step 4: Update project_chat RLS policies to use profiles.id consistently
DROP POLICY IF EXISTS "Employees can manage project chat" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can manage their project chat" ON public.project_chat;

-- New unified policies for project_chat
CREATE POLICY "Employees can manage project chat" 
ON public.project_chat 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
    AND public.employee_has_project_access(p.id, project_chat.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
    AND public.employee_has_project_access(p.id, project_chat.project_id)
    AND project_chat.sender_id = p.id
    AND project_chat.sender_type = 'employee'
  )
);

CREATE POLICY "Clients can manage their project chat" 
ON public.project_chat 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
    AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
    AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id)
    AND project_chat.sender_id = p.id
    AND project_chat.sender_type = 'client'
  )
);

-- Step 5: Update chat_notifications trigger to use profiles.id consistently
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_profile record;
BEGIN
  -- Create notifications for all team members with access to this project
  -- For employees
  FOR recipient_profile IN 
    SELECT p.id, 'employee' as user_type
    FROM profiles p
    WHERE p.role IN ('admin', 'employee')
    AND p.id != NEW.sender_id  -- Don't notify the sender
    AND public.employee_has_project_access(p.id, NEW.project_id)
  LOOP
    INSERT INTO public.chat_notifications (
      message_id,
      project_id,
      recipient_id,
      recipient_type
    ) VALUES (
      NEW.id,
      NEW.project_id,
      recipient_profile.id,
      recipient_profile.user_type
    );
  END LOOP;
  
  -- For clients (only the project owner)
  FOR recipient_profile IN 
    SELECT p.id, 'client' as user_type
    FROM profiles p
    JOIN clients c ON c.profile_id = p.id
    JOIN client_projects cp ON cp.client_id = c.id
    WHERE cp.id = NEW.project_id
    AND p.role = 'client'
    AND p.id != NEW.sender_id  -- Don't notify the sender
  LOOP
    INSERT INTO public.chat_notifications (
      message_id,
      project_id,
      recipient_id,
      recipient_type
    ) VALUES (
      NEW.id,
      NEW.project_id,
      recipient_profile.id,
      recipient_profile.user_type
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS create_chat_notification_trigger ON public.project_chat;
CREATE TRIGGER create_chat_notification_trigger
  AFTER INSERT ON public.project_chat
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_notification();