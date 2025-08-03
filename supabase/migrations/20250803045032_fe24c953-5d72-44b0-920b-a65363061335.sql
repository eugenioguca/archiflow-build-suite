-- =====================================================
-- DATOS DE PRUEBA BÁSICOS PARA MÓDULO DE FINANZAS
-- =====================================================

DO $$
DECLARE
    admin_profile_id UUID;
    cliente_reyna_id UUID;
    cliente_valle_id UUID;
    cuenta_general_id UUID;
BEGIN
    -- Obtener perfil admin
    SELECT id INTO admin_profile_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_profile_id IS NULL THEN
        RAISE NOTICE 'No se encontró un perfil de administrador. Saltando creación de datos.';
        RETURN;
    END IF;

    -- Crear clientes básicos
    INSERT INTO public.clients (full_name, email, phone, notes)
    SELECT 'Inmobiliaria Reyna Demo', 'demo@inmobiliariareyna.com', '55-1234-5678', 'Cliente de demostración'
    WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE full_name = 'Inmobiliaria Reyna Demo');

    INSERT INTO public.clients (full_name, email, phone, notes)
    SELECT 'Constructora del Valle Demo', 'demo@constructoradelvalle.com', '55-9876-5432', 'Cliente de demostración'
    WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE full_name = 'Constructora del Valle Demo');

    -- Obtener IDs de clientes
    SELECT id INTO cliente_reyna_id FROM public.clients WHERE full_name = 'Inmobiliaria Reyna Demo' LIMIT 1;
    SELECT id INTO cliente_valle_id FROM public.clients WHERE full_name = 'Constructora del Valle Demo' LIMIT 1;

    -- Crear cuenta de efectivo
    INSERT INTO public.cash_accounts (name, account_type, current_balance, status, responsible_user_id, description, created_by)
    SELECT 'Caja Demo', 'general', 500000.00, 'active', admin_profile_id, 'Cuenta de demostración', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_accounts WHERE name = 'Caja Demo');

    SELECT id INTO cuenta_general_id FROM public.cash_accounts WHERE name = 'Caja Demo' LIMIT 1;

    -- Crear ingresos básicos
    INSERT INTO public.incomes (client_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_reyna_id, 'Servicios de construcción enero', 2500000.00, 'construction_service', '2024-01-15', 'paid', 'active', 'FAC-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-001');

    INSERT INTO public.incomes (client_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_valle_id, 'Consultoría de diseño', 1500000.00, 'consultation', '2024-01-20', 'paid', 'active', 'FAC-DEMO-002', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-002');

    INSERT INTO public.incomes (client_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_reyna_id, 'Servicios adicionales febrero', 1800000.00, 'construction_service', '2024-02-01', 'paid', 'active', 'FAC-DEMO-003', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-003');

    -- Crear gastos básicos
    INSERT INTO public.expenses (client_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT cliente_reyna_id, 'Materiales de construcción', 650000.00, 'construction', '2024-01-25', 'active', 'PROV-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'PROV-DEMO-001');

    INSERT INTO public.expenses (description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT 'Gastos administrativos enero', 125000.00, 'administration', '2024-01-30', 'active', 'ADMIN-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'ADMIN-DEMO-001');

    INSERT INTO public.expenses (description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT 'Campaña publicitaria', 95000.00, 'sales', '2024-02-05', 'active', 'SALES-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'SALES-DEMO-001');

    INSERT INTO public.expenses (client_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT cliente_valle_id, 'Herramientas y equipo', 280000.00, 'construction', '2024-02-10', 'active', 'PROV-DEMO-002', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'PROV-DEMO-002');

    -- Crear transacciones de efectivo básicas
    INSERT INTO public.cash_transactions (cash_account_id, client_id, transaction_type, category, description, amount, approval_status, fiscal_compliant, receipt_provided, notes, created_by)
    SELECT cuenta_general_id, cliente_reyna_id, 'income', 'construction_service', 'Ingreso servicios enero', 2500000.00, 'approved', true, true, 'Pago de servicios', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_transactions WHERE description = 'Ingreso servicios enero');

    INSERT INTO public.cash_transactions (cash_account_id, transaction_type, category, description, amount, approval_status, fiscal_compliant, receipt_provided, notes, created_by)
    SELECT cuenta_general_id, 'expense', 'administration', 'Gastos administrativos enero', 125000.00, 'approved', true, true, 'Gastos de oficina', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_transactions WHERE description = 'Gastos administrativos enero');

    -- Crear anticipos de empleados
    INSERT INTO public.employee_advances (employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
    SELECT 'Carlos Martínez', 35000.00, 20000.00, 15000.00, 'pending', '2024-01-15', '2024-03-01', 'Gastos de obra', 'Pendiente justificación', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.employee_advances WHERE employee_name = 'Carlos Martínez');

    INSERT INTO public.employee_advances (employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
    SELECT 'Ana López', 25000.00, 25000.00, 0.00, 'justified', '2024-01-20', '2024-02-20', 'Materiales urgentes', 'Completamente justificado', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.employee_advances WHERE employee_name = 'Ana López');

    -- Crear proyecciones de flujo básicas
    INSERT INTO public.cash_flow_projections (period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
    SELECT '2024-03-01', '2024-03-31', 2800000.00, 2200000.00, 2650000.00, 2150000.00, 'Proyección marzo 2024', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_flow_projections WHERE notes = 'Proyección marzo 2024');

    INSERT INTO public.cash_flow_projections (period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
    SELECT '2024-04-01', '2024-04-30', 3200000.00, 2800000.00, 0.00, 0.00, 'Proyección abril 2024', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_flow_projections WHERE notes = 'Proyección abril 2024');

    RAISE NOTICE 'Datos de prueba creados: % clientes, % ingresos, % gastos, % transacciones efectivo', 
        (SELECT COUNT(*) FROM public.clients WHERE full_name LIKE '%Demo'),
        (SELECT COUNT(*) FROM public.incomes WHERE invoice_number LIKE 'FAC-DEMO-%'),
        (SELECT COUNT(*) FROM public.expenses WHERE reference_number LIKE '%-DEMO-%'),
        (SELECT COUNT(*) FROM public.cash_transactions WHERE description LIKE '%enero%');

END $$;