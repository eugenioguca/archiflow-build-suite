-- Fix remaining database functions with missing search_path

-- Fix update_bank_account_balance
CREATE OR REPLACE FUNCTION public.update_bank_account_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix delete_project_cascade
CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Delete in order to respect foreign key constraints
  
  -- Delete client portal notifications for this project
  DELETE FROM public.client_portal_notifications WHERE project_id = project_id_param;
  
  -- Delete client portal chat messages for this project
  DELETE FROM public.client_portal_chat WHERE project_id = project_id_param;
  
  -- Delete client payment proofs for this project
  DELETE FROM public.client_payment_proofs WHERE project_id = project_id_param;
  
  -- Delete payment installments for this project
  DELETE FROM public.payment_installments 
  WHERE payment_plan_id IN (
    SELECT id FROM public.payment_plans WHERE client_project_id = project_id_param
  );
  
  -- Delete payment plans for this project
  DELETE FROM public.payment_plans WHERE client_project_id = project_id_param;
  
  -- Delete construction budget items for this project
  DELETE FROM public.construction_budget_items WHERE project_id = project_id_param;
  
  -- Delete budget change log for this project
  DELETE FROM public.budget_change_log WHERE project_id = project_id_param;
  
  -- Delete construction timeline for this project
  DELETE FROM public.construction_timeline WHERE project_id = project_id_param;
  
  -- Delete construction milestones for this project
  DELETE FROM public.construction_milestones WHERE project_id = project_id_param;
  
  -- Delete construction phases for this project
  DELETE FROM public.construction_phases WHERE project_id = project_id_param;
  
  -- Delete construction teams for this project
  DELETE FROM public.construction_teams WHERE project_id = project_id_param;
  
  -- Delete construction equipment for this project
  DELETE FROM public.construction_equipment WHERE project_id = project_id_param;
  
  -- Delete design phases for this project
  DELETE FROM public.design_phases WHERE project_id = project_id_param;
  
  -- Delete budget items for this project
  DELETE FROM public.budget_items 
  WHERE budget_id IN (
    SELECT id FROM public.project_budgets WHERE project_id = project_id_param
  );
  
  -- Delete project budgets for this project
  DELETE FROM public.project_budgets WHERE project_id = project_id_param;
  
  -- Delete material finance requests for this project
  DELETE FROM public.material_finance_requests WHERE project_id = project_id_param;
  
  -- Delete material requirements for this project
  DELETE FROM public.material_requirements WHERE project_id = project_id_param;
  
  -- Delete documents for this project
  DELETE FROM public.documents WHERE project_id = project_id_param;
  
  -- Delete client documents for this project
  DELETE FROM public.client_documents WHERE project_id = project_id_param;
  
  -- Delete expenses for this project
  DELETE FROM public.expenses WHERE project_id = project_id_param;
  
  -- Delete incomes for this project
  DELETE FROM public.incomes WHERE project_id = project_id_param;
  
  -- Delete billing clients for this project
  DELETE FROM public.billing_clients WHERE project_id = project_id_param;
  
  -- Delete CFDI documents for this project
  DELETE FROM public.cfdi_documents WHERE client_id = (
    SELECT client_id FROM public.client_projects WHERE id = project_id_param
  ) AND expense_id IN (
    SELECT id FROM public.expenses WHERE project_id = project_id_param
  );
  
  -- Delete CFDI documents for this project (income side)
  DELETE FROM public.cfdi_documents WHERE client_id = (
    SELECT client_id FROM public.client_projects WHERE id = project_id_param
  ) AND income_id IN (
    SELECT id FROM public.incomes WHERE project_id = project_id_param
  );
  
  -- Finally, delete the project
  DELETE FROM public.client_projects WHERE id = project_id_param;
  
END;
$function$;

-- Fix notify_payment_proof_uploaded
CREATE OR REPLACE FUNCTION public.notify_payment_proof_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
BEGIN
  -- Get assigned advisor and client name
  SELECT cp.assigned_advisor_id, c.full_name 
  INTO advisor_user_id, client_name
  FROM public.client_projects cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.id = NEW.project_id;
  
  -- Create notification for advisor if exists
  IF advisor_user_id IS NOT NULL THEN
    -- Get user_id from advisor profile
    SELECT p.user_id INTO advisor_user_id
    FROM public.profiles p
    WHERE p.id = advisor_user_id;
    
    INSERT INTO public.module_notifications (
      user_id,
      client_id,
      source_module,
      target_module,
      notification_type,
      title,
      message
    ) VALUES (
      advisor_user_id,
      NEW.client_id,
      'client_portal',
      'sales',
      'payment_proof_uploaded',
      'Nuevo comprobante de pago',
      'El cliente ' || client_name || ' ha subido un comprobante de pago para revisión'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix sync_payment_status_with_sales
CREATE OR REPLACE FUNCTION public.sync_payment_status_with_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When payment installment is marked as paid, update project payment status
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Check if all installments for this plan are paid
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_installments 
      WHERE payment_plan_id = NEW.payment_plan_id 
      AND status != 'paid'
    ) THEN
      -- All installments paid, update project status to cliente_cerrado (final stage)
      UPDATE public.client_projects 
      SET sales_pipeline_stage = 'cliente_cerrado'
      WHERE id = (
        SELECT client_project_id 
        FROM public.payment_plans 
        WHERE id = NEW.payment_plan_id
      );
    -- Si hay pagos parciales, mantener en 'en_contacto' no cambiar el stage
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;