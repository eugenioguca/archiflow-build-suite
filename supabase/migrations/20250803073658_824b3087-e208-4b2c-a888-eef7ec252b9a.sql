-- Update Jorge Garza's payment plan to make it active and improve the name
UPDATE public.payment_plans 
SET 
  status = 'active',
  plan_name = 'Plan de Pagos - Jorge Garza',
  updated_at = now()
WHERE id = '2a00b4be-d10c-4c5e-b455-268fc46976a0';