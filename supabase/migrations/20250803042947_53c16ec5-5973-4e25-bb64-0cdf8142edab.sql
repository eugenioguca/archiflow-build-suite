-- =====================================================
-- DATOS DE PRUEBA FINALES PARA MÓDULO DE FINANZAS
-- =====================================================

-- Crear datos de muestra usando DO block
DO $$
DECLARE
    cliente_reyna_id UUID;
    cliente_valle_id UUID;
    cliente_urbanos_id UUID;
    admin_profile_id UUID;
    proyecto_pinos_id UUID;
    proyecto_torre_id UUID;
    cuenta_general_id UUID;
BEGIN
    -- Verificar que tenemos datos básicos
    SELECT id INTO admin_profile_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_profile_id IS NULL THEN
        RAISE NOTICE 'No se encontró un perfil de administrador. Creando datos mínimos.';
        RETURN;
    END IF;

    -- Crear clientes básicos si no existen
    INSERT INTO public.clients (full_name, email, phone, address, state, notes)
    SELECT 'Inmobiliaria Reyna', 'contacto@inmobiliariareyna.com', '55-1234-5678', 'Av. Revolución 1234', 'CDMX', 'Cliente de prueba'
    WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE full_name = 'Inmobiliaria Reyna');

    INSERT INTO public.clients (full_name, email, phone, address, state, notes)
    SELECT 'Constructora del Valle', 'ventas@constructoradelvalle.com', '55-9876-5432', 'Blvd. Manuel Ávila Camacho 567', 'Estado de México', 'Cliente de prueba'
    WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE full_name = 'Constructora del Valle');

    -- Obtener IDs de clientes
    SELECT id INTO cliente_reyna_id FROM public.clients WHERE full_name = 'Inmobiliaria Reyna' LIMIT 1;
    SELECT id INTO cliente_valle_id FROM public.clients WHERE full_name = 'Constructora del Valle' LIMIT 1;

    -- Crear proyectos si no existen
    IF NOT EXISTS (SELECT 1 FROM public.client_projects WHERE project_name = 'Residencial Los Pinos') THEN
        INSERT INTO public.client_projects (client_id, project_name, project_description, status, sales_pipeline_stage, budget, construction_budget, project_type, service_type, overall_progress_percentage)
        VALUES (cliente_reyna_id, 'Residencial Los Pinos', 'Desarrollo residencial de 50 casas', 'construction', 'cliente_cerrado', 15000000, 12000000, 'residential', 'construcción', 45);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.client_projects WHERE project_name = 'Torre Corporativa Centro') THEN
        INSERT INTO public.client_projects (client_id, project_name, project_description, status, sales_pipeline_stage, budget, construction_budget, project_type, service_type, overall_progress_percentage)
        VALUES (cliente_valle_id, 'Torre Corporativa Centro', 'Edificio de oficinas de 20 pisos', 'design', 'cliente_cerrado', 50000000, 45000000, 'commercial', 'diseño', 15);
    END IF;

    -- Obtener IDs de proyectos
    SELECT id INTO proyecto_pinos_id FROM public.client_projects WHERE project_name = 'Residencial Los Pinos' LIMIT 1;
    SELECT id INTO proyecto_torre_id FROM public.client_projects WHERE project_name = 'Torre Corporativa Centro' LIMIT 1;

    -- Crear cuenta de efectivo general
    IF NOT EXISTS (SELECT 1 FROM public.cash_accounts WHERE name = 'Caja General Demo') THEN
        INSERT INTO public.cash_accounts (name, account_type, current_balance, max_limit, status, responsible_user_id, description, created_by)
        VALUES ('Caja General Demo', 'general', 850000.00, 1000000.00, 'active', admin_profile_id, 'Cuenta principal de efectivo', admin_profile_id);
    END IF;

    SELECT id INTO cuenta_general_id FROM public.cash_accounts WHERE name = 'Caja General Demo' LIMIT 1;

    -- Crear ingresos de ejemplo
    INSERT INTO public.incomes (client_id, project_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_reyna_id, proyecto_pinos_id, 'Anticipo Proyecto Los Pinos - 30%', 4500000.00, 'construction_service', '2024-01-15', 'paid', 'active', 'FAC-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-001');

    INSERT INTO public.incomes (client_id, project_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_valle_id, proyecto_torre_id, 'Pago Diseño Torre Corporativa', 2500000.00, 'consultation', '2024-02-01', 'paid', 'active', 'FAC-DEMO-002', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-002');

    INSERT INTO public.incomes (client_id, project_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    SELECT cliente_reyna_id, proyecto_pinos_id, 'Pago Avance Los Pinos - 25%', 3750000.00, 'construction_service', '2024-02-15', 'paid', 'active', 'FAC-DEMO-003', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.incomes WHERE invoice_number = 'FAC-DEMO-003');

    -- Crear gastos de ejemplo
    INSERT INTO public.expenses (client_id, project_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT cliente_reyna_id, proyecto_pinos_id, 'Materiales de construcción - Cemento y varilla', 850000.00, 'construction', '2024-01-20', 'active', 'PROV-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'PROV-DEMO-001');

    INSERT INTO public.expenses (client_id, project_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT cliente_valle_id, proyecto_torre_id, 'Honorarios arquitecto diseño', 450000.00, 'construction', '2024-02-05', 'active', 'PROV-DEMO-002', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'PROV-DEMO-002');

    INSERT INTO public.expenses (description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT 'Gastos administrativos oficina', 85000.00, 'administration', '2024-02-01', 'active', 'ADMIN-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'ADMIN-DEMO-001');

    INSERT INTO public.expenses (description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    SELECT 'Marketing y publicidad', 120000.00, 'sales', '2024-02-10', 'active', 'SALES-DEMO-001', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.expenses WHERE reference_number = 'SALES-DEMO-001');

    -- Crear transacciones de efectivo
    INSERT INTO public.cash_transactions (cash_account_id, client_id, project_id, transaction_type, category, description, amount, approval_status, fiscal_compliant, receipt_provided, notes, created_by)
    SELECT cuenta_general_id, cliente_reyna_id, proyecto_pinos_id, 'income', 'construction_service', 'Depósito anticipo Los Pinos', 4500000.00, 'approved', true, true, 'Primer pago del proyecto', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_transactions WHERE description = 'Depósito anticipo Los Pinos');

    INSERT INTO public.cash_transactions (cash_account_id, transaction_type, category, description, amount, approval_status, fiscal_compliant, receipt_provided, notes, created_by)
    SELECT cuenta_general_id, 'expense', 'administration', 'Gastos oficina febrero', 85000.00, 'approved', true, true, 'Gastos administrativos del mes', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_transactions WHERE description = 'Gastos oficina febrero');

    -- Crear anticipos de empleados
    INSERT INTO public.employee_advances (employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
    SELECT 'Juan Carlos Rodríguez', 50000.00, 30000.00, 20000.00, 'pending', '2024-02-01', '2024-03-15', 'Gastos de viaje para supervisión obra', 'Pendiente justificar gastos', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.employee_advances WHERE employee_name = 'Juan Carlos Rodríguez');

    INSERT INTO public.employee_advances (employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
    SELECT 'María Elena Sánchez', 35000.00, 35000.00, 0.00, 'justified', '2024-01-15', '2024-02-28', 'Materiales urgentes proyecto', 'Totalmente justificado', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.employee_advances WHERE employee_name = 'María Elena Sánchez');

    -- Crear proyecciones de flujo de efectivo
    INSERT INTO public.cash_flow_projections (project_id, period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
    SELECT proyecto_pinos_id, '2024-03-01', '2024-03-31', 3000000.00, 2500000.00, 3750000.00, 2200000.00, 'Proyección marzo - Los Pinos', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_flow_projections WHERE notes = 'Proyección marzo - Los Pinos');

    INSERT INTO public.cash_flow_projections (period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
    SELECT '2024-04-01', '2024-04-30', 5000000.00, 4200000.00, 0.00, 0.00, 'Proyección general abril', admin_profile_id
    WHERE NOT EXISTS (SELECT 1 FROM public.cash_flow_projections WHERE notes = 'Proyección general abril');

    RAISE NOTICE 'Datos de prueba creados exitosamente: % clientes, % proyectos, % ingresos, % gastos', 
        (SELECT COUNT(*) FROM public.clients WHERE full_name IN ('Inmobiliaria Reyna', 'Constructora del Valle')),
        (SELECT COUNT(*) FROM public.client_projects WHERE project_name IN ('Residencial Los Pinos', 'Torre Corporativa Centro')),
        (SELECT COUNT(*) FROM public.incomes WHERE invoice_number LIKE 'FAC-DEMO-%'),
        (SELECT COUNT(*) FROM public.expenses WHERE reference_number LIKE '%-DEMO-%');

END $$;