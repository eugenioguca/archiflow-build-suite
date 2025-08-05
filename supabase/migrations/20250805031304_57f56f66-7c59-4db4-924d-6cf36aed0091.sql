-- Eliminar todos los datos mock/placeholder del sistema financiero
-- Borrar todos los gastos mock
DELETE FROM public.expenses;

-- Borrar todos los ingresos mock  
DELETE FROM public.incomes;

-- Borrar todas las cuentas de efectivo mock
DELETE FROM public.cash_accounts;

-- Borrar todas las cuentas bancarias mock
DELETE FROM public.bank_accounts;

-- Borrar datos mock de CRM
DELETE FROM public.crm_metrics;
DELETE FROM public.crm_activities;
DELETE FROM public.crm_proposals;