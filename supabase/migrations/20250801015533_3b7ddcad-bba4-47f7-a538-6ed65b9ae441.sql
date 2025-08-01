-- Fase 1: Agregar foreign keys faltantes para resolver errores de relaciones

-- Agregar foreign key para cash_accounts -> projects
ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Agregar foreign key para cash_accounts -> profiles (responsible_user)
ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_responsible_user 
FOREIGN KEY (responsible_user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Agregar foreign key para cash_accounts -> profiles (created_by)
ALTER TABLE public.cash_accounts 
ADD CONSTRAINT fk_cash_accounts_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Agregar foreign key para cash_flow_projections -> projects
ALTER TABLE public.cash_flow_projections 
ADD CONSTRAINT fk_cash_flow_projections_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Agregar foreign key para cash_flow_projections -> profiles (created_by)
ALTER TABLE public.cash_flow_projections 
ADD CONSTRAINT fk_cash_flow_projections_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Agregar foreign key para employee_advances -> projects
ALTER TABLE public.employee_advances 
ADD CONSTRAINT fk_employee_advances_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Agregar foreign key para employee_advances -> profiles (created_by)
ALTER TABLE public.employee_advances 
ADD CONSTRAINT fk_employee_advances_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Agregar foreign key para cash_transactions -> cash_accounts
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_cash_account 
FOREIGN KEY (cash_account_id) REFERENCES public.cash_accounts(id) ON DELETE RESTRICT;

-- Agregar foreign key para cash_transactions -> projects
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Agregar foreign key para cash_transactions -> profiles (created_by)
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Agregar foreign key para cash_transactions -> clients
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_client 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Agregar foreign key para cash_transactions -> suppliers
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT fk_cash_transactions_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Agregar foreign key para advance_justifications -> employee_advances
ALTER TABLE public.advance_justifications 
ADD CONSTRAINT fk_advance_justifications_advance 
FOREIGN KEY (advance_id) REFERENCES public.employee_advances(id) ON DELETE CASCADE;

-- Agregar foreign key para advance_justifications -> profiles (created_by)
ALTER TABLE public.advance_justifications 
ADD CONSTRAINT fk_advance_justifications_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_cash_accounts_project_id ON public.cash_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_responsible_user_id ON public.cash_accounts(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_projections_project_id ON public.cash_flow_projections(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_project_id ON public.employee_advances(project_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_cash_account_id ON public.cash_transactions(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_project_id ON public.cash_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_advance_justifications_advance_id ON public.advance_justifications(advance_id);