-- Drop existing policy if it exists and recreate with different name
DROP POLICY IF EXISTS "Employees and admins can manage client documents" ON public.client_documents;

-- Create policies for client_documents with unique names
CREATE POLICY "Staff can manage client lead documents" 
ON public.client_documents 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));