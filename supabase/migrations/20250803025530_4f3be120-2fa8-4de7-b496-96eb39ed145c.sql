-- =====================================================
-- FASE 3: DATOS DE PRUEBA PARA MÓDULO DE FINANZAS (FINAL)
-- =====================================================

-- Crear clientes de prueba si no existen
INSERT INTO public.clients (id, full_name, email, phone, address, state, notes)
VALUES 
  (gen_random_uuid(), 'Inmobiliaria Reyna', 'contacto@inmobiliariareyna.com', '55-1234-5678', 'Av. Revolución 1234, Col. Centro', 'CDMX', 'Cliente premium con múltiples proyectos'),
  (gen_random_uuid(), 'Constructora del Valle', 'ventas@constructoradelvalle.com', '55-9876-5432', 'Blvd. Manuel Ávila Camacho 567', 'Estado de México', 'Cliente corporativo importante'),
  (gen_random_uuid(), 'Desarrollos Urbanos SA', 'info@desarrollosurbanos.com', '55-5555-1234', 'Paseo de la Reforma 890', 'CDMX', 'Enfocado en desarrollos residenciales')
ON CONFLICT (id) DO NOTHING;

-- Obtener IDs de clientes creados y crear datos relacionados
DO $$
DECLARE
    cliente_reyna_id UUID;
    cliente_valle_id UUID;
    cliente_urbanos_id UUID;
    proyecto_pinos_id UUID;
    proyecto_torre_id UUID;
    proyecto_jardines_id UUID;
    admin_profile_id UUID;
    cuenta_general_id UUID;
    cuenta_proyecto_id UUID;
    cuenta_chica_id UUID;
BEGIN
    -- Obtener IDs necesarios
    SELECT id INTO cliente_reyna_id FROM public.clients WHERE full_name = 'Inmobiliaria Reyna' LIMIT 1;
    SELECT id INTO cliente_valle_id FROM public.clients WHERE full_name = 'Constructora del Valle' LIMIT 1;
    SELECT id INTO cliente_urbanos_id FROM public.clients WHERE full_name = 'Desarrollos Urbanos SA' LIMIT 1;
    SELECT id INTO admin_profile_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

    -- Salir si no hay admin
    IF admin_profile_id IS NULL THEN
        RAISE NOTICE 'No se encontró un perfil de administrador. Saltando creación de datos.';
        RETURN;
    END IF;

    -- Crear proyectos si no existen
    INSERT INTO public.client_projects (id, client_id, project_name, project_description, status, sales_pipeline_stage, budget, construction_budget, project_type, service_type, estimated_completion_date, construction_start_date, overall_progress_percentage)
    VALUES 
      (gen_random_uuid(), cliente_reyna_id, 'Residencial Los Pinos', 'Desarrollo residencial de 50 casas', 'construction', 'cliente_cerrado', 15000000, 12000000, 'residential', 'construcción', '2024-12-15', '2024-03-01', 45),
      (gen_random_uuid(), cliente_valle_id, 'Torre Corporativa Centro', 'Edificio de oficinas de 20 pisos', 'design', 'cliente_cerrado', 50000000, 45000000, 'commercial', 'diseño', '2025-06-30', null, 15),
      (gen_random_uuid(), cliente_urbanos_id, 'Conjunto Habitacional Jardines', 'Complejo de departamentos', 'construction', 'cliente_cerrado', 25000000, 22000000, 'residential', 'construcción', '2024-10-31', '2024-01-15', 70)
    ON CONFLICT (project_name) DO NOTHING;

    -- Obtener IDs de proyectos creados
    SELECT id INTO proyecto_pinos_id FROM public.client_projects WHERE project_name = 'Residencial Los Pinos' LIMIT 1;
    SELECT id INTO proyecto_torre_id FROM public.client_projects WHERE project_name = 'Torre Corporativa Centro' LIMIT 1;
    SELECT id INTO proyecto_jardines_id FROM public.client_projects WHERE project_name = 'Conjunto Habitacional Jardines' LIMIT 1;

    -- Crear cuentas de efectivo de prueba
    INSERT INTO public.cash_accounts (id, name, account_type, current_balance, max_limit, status, responsible_user_id, description, project_id, created_by)
    VALUES 
      (gen_random_uuid(), 'Caja General', 'general', 850000.00, 1000000.00, 'active', admin_profile_id, 'Cuenta principal de efectivo', null, admin_profile_id),
      (gen_random_uuid(), 'Fondo Proyecto Los Pinos', 'project_fund', 450000.00, 500000.00, 'active', admin_profile_id, 'Fondo específico para proyecto Los Pinos', proyecto_pinos_id, admin_profile_id),
      (gen_random_uuid(), 'Caja Chica Oficina', 'petty_cash', 25000.00, 50000.00, 'active', admin_profile_id, 'Gastos menores de oficina', null, admin_profile_id)
    ON CONFLICT (name) DO NOTHING;

    -- Crear ingresos de prueba
    INSERT INTO public.incomes (id, client_id, project_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
    VALUES 
      (gen_random_uuid(), cliente_reyna_id, proyecto_pinos_id, 'Anticipo Proyecto Los Pinos - 30%', 4500000.00, 'construction', '2024-01-15', 'paid', 'active', 'FAC-2024-001', admin_profile_id),
      (gen_random_uuid(), cliente_valle_id, proyecto_torre_id, 'Pago Diseño Torre Corporativa', 2500000.00, 'design', '2024-02-01', 'paid', 'active', 'FAC-2024-002', admin_profile_id),
      (gen_random_uuid(), cliente_urbanos_id, proyecto_jardines_id, 'Pago Avance Obra Jardines - 50%', 12500000.00, 'construction', '2024-01-30', 'paid', 'active', 'FAC-2024-003', admin_profile_id),
      (gen_random_uuid(), cliente_reyna_id, proyecto_pinos_id, 'Pago Avance Los Pinos - 25%', 3750000.00, 'construction', '2024-02-15', 'paid', 'active', 'FAC-2024-004', admin_profile_id)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Crear gastos de prueba
    INSERT INTO public.expenses (id, client_id, project_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
    VALUES 
      (gen_random_uuid(), cliente_reyna_id, proyecto_pinos_id, 'Materiales de construcción - Cemento y varilla', 850000.00, 'materials', '2024-01-20', 'active', 'PROV-2024-001', admin_profile_id),
      (gen_random_uuid(), cliente_valle_id, proyecto_torre_id, 'Honorarios arquitecto diseño', 450000.00, 'design', '2024-02-05', 'active', 'PROV-2024-002', admin_profile_id),
      (gen_random_uuid(), cliente_urbanos_id, proyecto_jardines_id, 'Mano de obra especializada', 2200000.00, 'labor', '2024-02-10', 'active', 'PROV-2024-003', admin_profile_id),
      (gen_random_uuid(), cliente_reyna_id, proyecto_pinos_id, 'Subcontratista electricidad', 650000.00, 'subcontractors', '2024-02-20', 'active', 'PROV-2024-004', admin_profile_id),
      (gen_random_uuid(), null, null, 'Gastos administrativos oficina', 85000.00, 'administration', '2024-02-01', 'active', 'ADMIN-2024-001', admin_profile_id),
      (gen_random_uuid(), null, null, 'Combustible vehículos empresa', 45000.00, 'operations', '2024-02-15', 'active', 'OP-2024-001', admin_profile_id)
    ON CONFLICT (reference_number) DO NOTHING;

    -- Crear proyecciones de flujo de efectivo de prueba
    INSERT INTO public.cash_flow_projections (id, project_id, period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
    VALUES 
      (gen_random_uuid(), proyecto_pinos_id, '2024-03-01', '2024-03-31', 3000000.00, 2500000.00, 3750000.00, 2200000.00, 'Proyección marzo - Los Pinos', admin_profile_id),
      (gen_random_uuid(), proyecto_torre_id, '2024-03-01', '2024-03-31', 1500000.00, 800000.00, 1200000.00, 650000.00, 'Proyección marzo - Torre Corporativa', admin_profile_id),
      (gen_random_uuid(), null, '2024-04-01', '2024-04-30', 5000000.00, 4200000.00, 0.00, 0.00, 'Proyección general abril', admin_profile_id);

    -- Crear anticipos de empleados de prueba
    INSERT INTO public.employee_advances (id, employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
    VALUES 
      (gen_random_uuid(), 'Juan Carlos Rodríguez', 50000.00, 30000.00, 20000.00, 'pending', '2024-02-01', '2024-03-15', 'Gastos de viaje para supervisión obra', 'Pendiente justificar gastos de hospedaje', admin_profile_id),
      (gen_random_uuid(), 'María Elena Sánchez', 35000.00, 35000.00, 0.00, 'justified', '2024-01-15', '2024-02-28', 'Materiales urgentes proyecto', 'Totalmente justificado con facturas', admin_profile_id),
      (gen_random_uuid(), 'Luis Fernando Gómez', 75000.00, 15000.00, 60000.00, 'overdue', '2024-01-01', '2024-02-15', 'Herramientas y equipo menor', 'Vencido - requiere seguimiento urgente', admin_profile_id);

    RAISE NOTICE 'Datos de prueba creados exitosamente para el módulo de finanzas.';

END $$;