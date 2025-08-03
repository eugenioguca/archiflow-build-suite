-- FASE 1: ELIMINACIÓN DEFINITIVA DE TODA LA MOCK DATA

-- Eliminar todos los datos relacionados con clientes demo
DELETE FROM public.cash_transactions 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

DELETE FROM public.expenses 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

DELETE FROM public.incomes 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

DELETE FROM public.payment_plans 
WHERE client_project_id IN (
  SELECT id FROM public.client_projects 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
  )
);

DELETE FROM public.payment_installments 
WHERE payment_plan_id IN (
  SELECT id FROM public.payment_plans 
  WHERE client_project_id IN (
    SELECT id FROM public.client_projects 
    WHERE client_id IN (
      SELECT id FROM public.clients 
      WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
    )
  )
);

DELETE FROM public.billing_clients 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

DELETE FROM public.client_documents 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

DELETE FROM public.construction_budget_items 
WHERE project_id IN (
  SELECT id FROM public.client_projects 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
  )
);

DELETE FROM public.design_phases 
WHERE project_id IN (
  SELECT id FROM public.client_projects 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
  )
);

DELETE FROM public.documents 
WHERE project_id IN (
  SELECT id FROM public.client_projects 
  WHERE client_id IN (
    SELECT id FROM public.clients 
    WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
  )
);

-- Eliminar proyectos de clientes demo
DELETE FROM public.client_projects 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo')
);

-- Eliminar clientes demo
DELETE FROM public.clients 
WHERE full_name IN ('Constructora del Valle Demo', 'Inmobiliaria Reyna Demo');