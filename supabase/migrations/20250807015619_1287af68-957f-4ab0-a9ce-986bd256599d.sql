-- Drop ALL existing RLS policies on payment_installments completely
DROP POLICY IF EXISTS "Employees and admins can manage payment installments" ON payment_installments;
DROP POLICY IF EXISTS "Clients can view their payment installments" ON payment_installments;
DROP POLICY IF EXISTS "Users can manage payment installments" ON payment_installments;
DROP POLICY IF EXISTS "payment_installments_policy" ON payment_installments;

-- Disable RLS temporarily
ALTER TABLE payment_installments DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- Create completely new, simple RLS policy
CREATE POLICY "allow_authenticated_users"
ON payment_installments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);