-- Create bank accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking',
  account_holder TEXT NOT NULL,
  swift_code TEXT,
  branch TEXT,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treasury payment references table for grouping payments
CREATE TABLE public.treasury_payment_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  supplier_id UUID,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  account_type TEXT NOT NULL, -- 'bank' or 'cash'
  account_id UUID NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treasury transactions table (replacing/enhancing cash_transactions)
CREATE TABLE public.treasury_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type TEXT NOT NULL, -- 'income' or 'expense'
  account_type TEXT NOT NULL, -- 'bank' or 'cash'
  account_id UUID NOT NULL,
  client_id UUID,
  project_id UUID,
  supplier_id UUID,
  department TEXT,
  transaction_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  
  -- Granular accounting fields
  cuenta_mayor TEXT,
  partida TEXT,
  sub_partida TEXT,
  unit TEXT,
  quantity NUMERIC,
  cost_per_unit NUMERIC,
  
  -- Invoice and reference fields
  invoice_number TEXT,
  invoice_url TEXT,
  payment_reference_id UUID,
  
  -- Additional fields
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create general ledger accounts table
CREATE TABLE public.general_ledger_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
  parent_account_id UUID,
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees and admins
CREATE POLICY "Employees and admins can manage bank accounts" 
ON public.bank_accounts 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

CREATE POLICY "Employees and admins can manage treasury payment references" 
ON public.treasury_payment_references 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

CREATE POLICY "Employees and admins can manage treasury transactions" 
ON public.treasury_transactions 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

CREATE POLICY "Employees and admins can manage general ledger accounts" 
ON public.general_ledger_accounts 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create functions for automatic balance updates
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_type = 'bank' THEN
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      ELSIF NEW.transaction_type = 'expense' THEN
        UPDATE public.bank_accounts 
        SET current_balance = current_balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
    ELSIF NEW.account_type = 'cash' THEN
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.cash_accounts 
        SET current_balance = current_balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      ELSIF NEW.transaction_type = 'expense' THEN
        UPDATE public.cash_accounts 
        SET current_balance = current_balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for balance updates
CREATE TRIGGER update_account_balance_on_treasury_transaction
AFTER INSERT ON public.treasury_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_bank_account_balance();

-- Create function to generate payment reference codes
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
  sequence_num INTEGER;
  reference_code TEXT;
BEGIN
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_code, '-', 4) AS INTEGER)
  ), 0) + 1 INTO sequence_num
  FROM public.treasury_payment_references
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate reference code: PAG-YYYYMMDD-###
  reference_code := 'PAG-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN reference_code;
END;
$$ LANGUAGE plpgsql;

-- Insert some default general ledger accounts
INSERT INTO public.general_ledger_accounts (account_code, account_name, account_type, created_by) VALUES
('1000', 'Activos', 'asset', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('1100', 'Activos Circulantes', 'asset', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('1110', 'Bancos', 'asset', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('1120', 'Caja', 'asset', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('1130', 'Clientes', 'asset', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2000', 'Pasivos', 'liability', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2100', 'Pasivos Circulantes', 'liability', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2110', 'Proveedores', 'liability', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('3000', 'Capital', 'equity', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('4000', 'Ingresos', 'income', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('4100', 'Ventas', 'income', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('5000', 'Gastos', 'expense', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('5100', 'Gastos de Operación', 'expense', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('5110', 'Materiales', 'expense', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('5120', 'Mano de Obra', 'expense', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));