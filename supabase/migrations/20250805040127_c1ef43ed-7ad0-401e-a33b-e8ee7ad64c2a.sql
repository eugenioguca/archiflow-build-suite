-- Fix Treasury Module Database Structure and Add Sample Data

-- 1. Add foreign key constraints to treasury_transactions
ALTER TABLE public.treasury_transactions
ADD CONSTRAINT fk_treasury_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.treasury_transactions
ADD CONSTRAINT fk_treasury_project_id 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE SET NULL;

ALTER TABLE public.treasury_transactions
ADD CONSTRAINT fk_treasury_supplier_id 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.treasury_transactions
ADD CONSTRAINT fk_treasury_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.treasury_transactions
ADD CONSTRAINT fk_treasury_approved_by 
FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add foreign key constraints to bank_accounts
ALTER TABLE public.bank_accounts
ADD CONSTRAINT fk_bank_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- 3. Add foreign key constraints to cash_accounts
ALTER TABLE public.cash_accounts
ADD CONSTRAINT fk_cash_responsible_user 
FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id);

ALTER TABLE public.cash_accounts
ADD CONSTRAINT fk_cash_project_id 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE SET NULL;

ALTER TABLE public.cash_accounts
ADD CONSTRAINT fk_cash_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- 4. Create sample bank accounts
INSERT INTO public.bank_accounts (
  account_holder,
  bank_name,
  account_number,
  account_type,
  current_balance,
  status,
  created_by
) VALUES 
(
  'ArchiFlow Build Suite S.A. de C.V.',
  'BBVA Bancomer',
  '0123456789',
  'checking',
  500000.00,
  'active',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),
(
  'ArchiFlow Build Suite S.A. de C.V.',
  'Santander',
  '9876543210',
  'savings',
  250000.00,
  'active',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
);

-- 5. Create sample cash accounts
INSERT INTO public.cash_accounts (
  name,
  description,
  account_type,
  current_balance,
  responsible_user_id,
  status,
  created_by
) VALUES 
(
  'Caja General Oficina',
  'Caja chica para gastos menores de oficina',
  'general',
  10000.00,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'active',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),
(
  'Caja Obras',
  'Efectivo para gastos directos en obra',
  'project',
  25000.00,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  'active',
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
);

-- 6. Create sample treasury transactions
WITH sample_data AS (
  SELECT 
    (SELECT id FROM public.bank_accounts LIMIT 1) as bank_id,
    (SELECT id FROM public.cash_accounts LIMIT 1) as cash_id,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) as admin_id,
    (SELECT id FROM public.clients LIMIT 1) as client_id,
    (SELECT id FROM public.client_projects LIMIT 1) as project_id
)
INSERT INTO public.treasury_transactions (
  transaction_type,
  account_type,
  account_id,
  client_id,
  project_id,
  department,
  transaction_date,
  amount,
  description,
  status,
  created_by
) 
SELECT * FROM (
  VALUES
  ('income', 'bank', (SELECT bank_id FROM sample_data), (SELECT client_id FROM sample_data), (SELECT project_id FROM sample_data), 'ventas', CURRENT_DATE - INTERVAL '5 days', 150000.00, 'Pago inicial proyecto residencial', 'approved', (SELECT admin_id FROM sample_data)),
  ('expense', 'bank', (SELECT bank_id FROM sample_data), (SELECT client_id FROM sample_data), (SELECT project_id FROM sample_data), 'construccion', CURRENT_DATE - INTERVAL '3 days', 45000.00, 'Compra de materiales de construcción', 'approved', (SELECT admin_id FROM sample_data)),
  ('income', 'cash', (SELECT cash_id FROM sample_data), NULL, NULL, 'ventas', CURRENT_DATE - INTERVAL '2 days', 5000.00, 'Pago en efectivo por consultoría', 'approved', (SELECT admin_id FROM sample_data)),
  ('expense', 'cash', (SELECT cash_id FROM sample_data), NULL, NULL, 'administracion', CURRENT_DATE - INTERVAL '1 day', 1200.00, 'Gastos de papelería y oficina', 'approved', (SELECT admin_id FROM sample_data))
) AS t(transaction_type, account_type, account_id, client_id, project_id, department, transaction_date, amount, description, status, created_by)
WHERE (SELECT admin_id FROM sample_data) IS NOT NULL;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_treasury_account_type_id ON public.treasury_transactions(account_type, account_id);
CREATE INDEX IF NOT EXISTS idx_treasury_client_project ON public.treasury_transactions(client_id, project_id);
CREATE INDEX IF NOT EXISTS idx_treasury_date ON public.treasury_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_treasury_status ON public.treasury_transactions(status);