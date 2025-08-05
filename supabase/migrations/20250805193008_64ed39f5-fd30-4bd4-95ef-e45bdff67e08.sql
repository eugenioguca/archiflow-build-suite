-- Add missing expense_date column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN expense_date DATE;

-- Populate expense_date with invoice_date where available, otherwise use created_at::date
UPDATE public.expenses 
SET expense_date = COALESCE(invoice_date, created_at::date);

-- Make expense_date NOT NULL after populating data
ALTER TABLE public.expenses 
ALTER COLUMN expense_date SET NOT NULL;

-- Set default for future inserts
ALTER TABLE public.expenses 
ALTER COLUMN expense_date SET DEFAULT CURRENT_DATE;