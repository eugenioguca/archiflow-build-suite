-- Eliminar todos los datos mock/placeholder del sistema financiero
-- Borrar todos los gastos mock
DELETE FROM public.expenses;

-- Borrar todos los ingresos mock  
DELETE FROM public.incomes;

-- Borrar todas las cuentas de efectivo mock
DELETE FROM public.cash_accounts;

-- Borrar todas las cuentas bancarias mock
DELETE FROM public.bank_accounts;

-- Borrar todas las proyecciones de flujo de efectivo mock
DELETE FROM public.cash_flow_projections;

-- Borrar todas las transacciones de tesorería mock
DELETE FROM public.treasury_transactions;

-- Borrar todos los pagos de proveedores mock
DELETE FROM public.supplier_payments;

-- Borrar todas las cuentas por pagar mock
DELETE FROM public.accounts_payable;

-- Borrar todos los pagos de clientes mock
DELETE FROM public.client_payments;

-- Borrar todas las facturas/invoices mock
DELETE FROM public.invoices;

-- Borrar todos los planes de pago mock
DELETE FROM public.payment_installments;
DELETE FROM public.payment_plans;

-- Borrar datos mock de CRM
DELETE FROM public.crm_metrics;
DELETE FROM public.crm_activities;
DELETE FROM public.crm_proposals;