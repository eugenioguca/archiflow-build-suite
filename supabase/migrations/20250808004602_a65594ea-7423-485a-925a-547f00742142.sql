-- Update RLS policies for documents table to work with client_projects
-- Drop existing client policies that reference the old projects table
DROP POLICY IF EXISTS "Clients can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Clients can only view their client-accessible documents" ON public.documents;

-- Create new client policies that reference client_projects
CREATE POLICY "Clients can view their project documents"
ON public.documents
FOR SELECT
TO public
USING (
  -- Allow clients to see documents from their projects
  project_id IN (
    SELECT cp.id
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
  OR
  -- Allow clients to see documents where they are the direct client
  client_id IN (
    SELECT c.id
    FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

-- Update real-time subscription filter in ClientDocumentHub to use project_id instead of client_id
-- This is handled in the code, but we ensure the policy supports both access patterns