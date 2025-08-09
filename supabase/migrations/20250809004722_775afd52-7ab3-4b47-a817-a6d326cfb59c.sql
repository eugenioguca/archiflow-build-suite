-- Fix infinite recursion in event_invitations RLS policies
-- Drop existing problematic policies and create safe ones

DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.event_invitations;
DROP POLICY IF EXISTS "Users can respond to invitations" ON public.event_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their events" ON public.event_invitations;

-- Create safer RLS policies without recursion
CREATE POLICY "Users can view invitations they sent" 
ON public.event_invitations 
FOR SELECT 
USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations they received" 
ON public.event_invitations 
FOR SELECT 
USING (invitee_id = auth.uid());

CREATE POLICY "Users can create invitations for their events" 
ON public.event_invitations 
FOR INSERT 
WITH CHECK (
  inviter_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.personal_events pe 
    WHERE pe.id = event_id AND pe.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update invitations they received" 
ON public.event_invitations 
FOR UPDATE 
USING (invitee_id = auth.uid())
WITH CHECK (invitee_id = auth.uid());