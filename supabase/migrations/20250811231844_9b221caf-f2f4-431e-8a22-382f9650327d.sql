-- Update RLS policies for client_portal_chat to use correct function signature

-- Drop existing policies
DROP POLICY IF EXISTS "Clients can view their project chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Clients can create their project chat messages" ON public.client_portal_chat;

-- Recreate policies with correct function call
CREATE POLICY "Clients can view their project chat messages" ON public.client_portal_chat
FOR SELECT USING (public.is_client_of_project(project_id, auth.uid()));

CREATE POLICY "Clients can create their project chat messages" ON public.client_portal_chat
FOR INSERT WITH CHECK (
  public.is_client_of_project(project_id, auth.uid()) AND is_client_message = true
);