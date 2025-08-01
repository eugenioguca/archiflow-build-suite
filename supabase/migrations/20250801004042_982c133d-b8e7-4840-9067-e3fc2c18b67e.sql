-- Create Treasury Management System Tables

-- Cash accounts table for managing different cash accounts (general, petty cash, project funds)
CREATE TABLE public.cash_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'petty_cash', 'project_fund'
  project_id UUID, -- references projects, nullable for general accounts
  responsible_user_id UUID NOT NULL, -- who is responsible for this account
  current_balance NUMERIC NOT NULL DEFAULT 0,
  max_limit NUMERIC, -- maximum amount allowed in this account
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'closed'
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash transactions table for all cash movements
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_account_id UUID NOT NULL REFERENCES public.cash_accounts(id),
  transaction_type TEXT NOT NULL, -- 'income', 'expense', 'transfer_in', 'transfer_out'
  category TEXT NOT NULL, -- 'construction_expense', 'administrative', 'advance_payment', 'payroll', 'materials', etc.
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT, -- invoice number, receipt number, etc.
  project_id UUID, -- references projects for project-specific expenses
  supplier_id UUID, -- references suppliers for supplier payments
  client_id UUID, -- references clients for client payments
  expense_id UUID, -- references expenses table if applicable
  employee_name TEXT, -- for payroll or advance payments to employees
  requires_receipt BOOLEAN DEFAULT true, -- if this transaction requires fiscal receipt
  receipt_provided BOOLEAN DEFAULT false,
  receipt_url TEXT, -- path to uploaded receipt/proof
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID, -- who approved this transaction
  approved_at TIMESTAMP WITH TIME ZONE,
  fiscal_compliant BOOLEAN DEFAULT true, -- if this follows fiscal regulations
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee advances table for tracking advance payments
CREATE TABLE public.employee_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_position TEXT,
  project_id UUID, -- which project this advance is for
  advance_amount NUMERIC NOT NULL,
  advance_date DATE NOT NULL,
  purpose TEXT NOT NULL, -- why the advance was given
  due_date DATE NOT NULL, -- when receipts/justification is due
  amount_justified NUMERIC DEFAULT 0, -- how much has been justified with receipts
  amount_pending NUMERIC GENERATED ALWAYS AS (advance_amount - amount_justified) STORED,
  status TEXT DEFAULT 'pending', -- 'pending', 'justified', 'overdue', 'written_off'
  cash_transaction_id UUID REFERENCES public.cash_transactions(id),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Advance justifications table for tracking receipts provided for advances
CREATE TABLE public.advance_justifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advance_id UUID NOT NULL REFERENCES public.employee_advances(id),
  amount NUMERIC NOT NULL,
  receipt_date DATE NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT, -- uploaded receipt image/pdf
  supplier_name TEXT,
  fiscal_receipt BOOLEAN DEFAULT false, -- if this is a valid fiscal receipt
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash flow projections table
CREATE TABLE public.cash_flow_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID, -- nullable for general projections
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  projected_income NUMERIC DEFAULT 0,
  projected_expenses NUMERIC DEFAULT 0,
  projected_net_flow NUMERIC GENERATED ALWAYS AS (projected_income - projected_expenses) STORED,
  actual_income NUMERIC DEFAULT 0,
  actual_expenses NUMERIC DEFAULT 0,
  actual_net_flow NUMERIC GENERATED ALWAYS AS (actual_income - actual_expenses) STORED,
  variance NUMERIC GENERATED ALWAYS AS (actual_net_flow - projected_net_flow) STORED,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_accounts
CREATE POLICY "Employees and admins can manage cash accounts"
ON public.cash_accounts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for cash_transactions
CREATE POLICY "Employees and admins can manage cash transactions"
ON public.cash_transactions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for employee_advances
CREATE POLICY "Employees and admins can manage employee advances"
ON public.employee_advances
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for advance_justifications
CREATE POLICY "Employees and admins can manage advance justifications"
ON public.advance_justifications
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- RLS Policies for cash_flow_projections
CREATE POLICY "Employees and admins can manage cash flow projections"
ON public.cash_flow_projections
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_cash_accounts_updated_at
BEFORE UPDATE ON public.cash_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_transactions_updated_at
BEFORE UPDATE ON public.cash_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_advances_updated_at
BEFORE UPDATE ON public.employee_advances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advance_justifications_updated_at
BEFORE UPDATE ON public.advance_justifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_projections_updated_at
BEFORE UPDATE ON public.cash_flow_projections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update cash account balance automatically
CREATE OR REPLACE FUNCTION update_cash_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update balance for new transaction
    IF NEW.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    ELSIF NEW.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction effect
    IF OLD.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    ELSIF OLD.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    END IF;
    
    -- Apply new transaction effect
    IF NEW.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    ELSIF NEW.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.cash_account_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse transaction effect
    IF OLD.transaction_type IN ('income', 'transfer_in') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    ELSIF OLD.transaction_type IN ('expense', 'transfer_out') THEN
      UPDATE public.cash_accounts 
      SET current_balance = current_balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.cash_account_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically update cash account balances
CREATE TRIGGER cash_transaction_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
FOR EACH ROW
EXECUTE FUNCTION update_cash_account_balance();

-- Function to update advance amount justified when justifications are added
CREATE OR REPLACE FUNCTION update_advance_justified_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.employee_advances 
    SET amount_justified = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.advance_justifications 
      WHERE advance_id = NEW.advance_id AND approved = true
    ),
    updated_at = now()
    WHERE id = NEW.advance_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.employee_advances 
    SET amount_justified = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.advance_justifications 
      WHERE advance_id = OLD.advance_id AND approved = true
    ),
    updated_at = now()
    WHERE id = OLD.advance_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically update advance justified amounts
CREATE TRIGGER advance_justification_amount_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.advance_justifications
FOR EACH ROW
EXECUTE FUNCTION update_advance_justified_amount();

-- Create indexes for better performance
CREATE INDEX idx_cash_transactions_account_id ON public.cash_transactions(cash_account_id);
CREATE INDEX idx_cash_transactions_project_id ON public.cash_transactions(project_id);
CREATE INDEX idx_cash_transactions_created_at ON public.cash_transactions(created_at);
CREATE INDEX idx_cash_transactions_type ON public.cash_transactions(transaction_type);
CREATE INDEX idx_employee_advances_status ON public.employee_advances(status);
CREATE INDEX idx_employee_advances_due_date ON public.employee_advances(due_date);
CREATE INDEX idx_advance_justifications_advance_id ON public.advance_justifications(advance_id);