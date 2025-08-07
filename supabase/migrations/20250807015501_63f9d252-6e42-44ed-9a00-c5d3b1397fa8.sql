-- Fix RLS policies for payment_installments table
-- The error indicates malformed SQL in existing policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Employees and admins can manage payment installments" ON payment_installments;
DROP POLICY IF EXISTS "Clients can view their payment installments" ON payment_installments;

-- Create corrected RLS policies for payment_installments
CREATE POLICY "Employees and admins can manage payment installments"
ON payment_installments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Clients can view their payment installments"
ON payment_installments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM payment_plans pp
    JOIN client_projects cp ON cp.id = pp.client_project_id
    JOIN clients c ON c.id = cp.client_id
    JOIN profiles p ON p.id = c.profile_id
    WHERE pp.id = payment_installments.payment_plan_id
    AND p.user_id = auth.uid()
    AND p.role = 'client'
  )
);