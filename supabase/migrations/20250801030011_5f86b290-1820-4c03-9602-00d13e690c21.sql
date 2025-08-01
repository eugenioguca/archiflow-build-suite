-- Add missing foreign key relationships for cash_accounts table
ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_responsible_user 
FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id);

ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Add missing foreign key for cash_transactions
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_client 
FOREIGN KEY (client_id) REFERENCES public.clients(id);

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_approved_by 
FOREIGN KEY (approved_by) REFERENCES public.profiles(id);