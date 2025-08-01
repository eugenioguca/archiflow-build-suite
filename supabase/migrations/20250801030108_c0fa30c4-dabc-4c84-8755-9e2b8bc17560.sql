-- Check and add only missing foreign key relationships
DO $$
BEGIN
    -- Add foreign key for cash_accounts.responsible_user_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cash_accounts_responsible_user'
    ) THEN
        ALTER TABLE public.cash_accounts 
        ADD CONSTRAINT fk_cash_accounts_responsible_user 
        FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id);
    END IF;

    -- Add foreign key for cash_accounts.created_by if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cash_accounts_created_by'
    ) THEN
        ALTER TABLE public.cash_accounts 
        ADD CONSTRAINT fk_cash_accounts_created_by 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
    END IF;

    -- Add foreign key for cash_accounts.project_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cash_accounts_project'
    ) THEN
        ALTER TABLE public.cash_accounts 
        ADD CONSTRAINT fk_cash_accounts_project 
        FOREIGN KEY (project_id) REFERENCES public.projects(id);
    END IF;

    -- Add foreign key for cash_transactions.created_by if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cash_transactions_created_by'
    ) THEN
        ALTER TABLE public.cash_transactions 
        ADD CONSTRAINT fk_cash_transactions_created_by 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
    END IF;

    -- Add foreign key for cash_transactions.project_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cash_transactions_project'
    ) THEN
        ALTER TABLE public.cash_transactions 
        ADD CONSTRAINT fk_cash_transactions_project 
        FOREIGN KEY (project_id) REFERENCES public.projects(id);
    END IF;
END $$;