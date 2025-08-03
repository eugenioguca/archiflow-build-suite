-- =====================================================
-- FASE 3: DATOS DE PRUEBA PARA MÓDULO DE FINANZAS
-- =====================================================

-- Crear clientes de prueba si no existen
INSERT INTO public.clients (id, full_name, email, phone, address, state, notes)
VALUES 
  ('f1234567-89ab-cdef-0123-456789abcdef', 'Inmobiliaria Reyna', 'contacto@inmobiliariareyna.com', '55-1234-5678', 'Av. Revolución 1234, Col. Centro', 'CDMX', 'Cliente premium con múltiples proyectos'),
  ('a2345678-9abc-def0-1234-56789abcdef0', 'Constructora del Valle', 'ventas@constructoradelvalle.com', '55-9876-5432', 'Blvd. Manuel Ávila Camacho 567', 'Estado de México', 'Cliente corporativo importante'),
  ('b3456789-abcd-ef01-2345-6789abcdef01', 'Desarrollos Urbanos SA', 'info@desarrollosurbanos.com', '55-5555-1234', 'Paseo de la Reforma 890', 'CDMX', 'Enfocado en desarrollos residenciales')
ON CONFLICT (id) DO NOTHING;

-- Crear proyectos de prueba si no existen
INSERT INTO public.client_projects (id, client_id, project_name, project_description, status, sales_pipeline_stage, budget, construction_budget, project_type, service_type, estimated_completion_date, construction_start_date, overall_progress_percentage)
VALUES 
  ('p1111111-1111-1111-1111-111111111111', 'f1234567-89ab-cdef-0123-456789abcdef', 'Residencial Los Pinos', 'Desarrollo residencial de 50 casas', 'construction', 'cliente_cerrado', 15000000, 12000000, 'residential', 'construcción', '2024-12-15', '2024-03-01', 45),
  ('p2222222-2222-2222-2222-222222222222', 'a2345678-9abc-def0-1234-56789abcdef0', 'Torre Corporativa Centro', 'Edificio de oficinas de 20 pisos', 'design', 'cliente_cerrado', 50000000, 45000000, 'commercial', 'diseño', '2025-06-30', null, 15),
  ('p3333333-3333-3333-3333-333333333333', 'b3456789-abcd-ef01-2345-6789abcdef01', 'Conjunto Habitacional Jardines', 'Complejo de departamentos', 'construction', 'cliente_cerrado', 25000000, 22000000, 'residential', 'construcción', '2024-10-31', '2024-01-15', 70)
ON CONFLICT (id) DO NOTHING;

-- Crear cuentas de efectivo de prueba
INSERT INTO public.cash_accounts (id, name, account_type, current_balance, max_limit, status, responsible_user_id, description, project_id)
VALUES 
  ('ca111111-1111-1111-1111-111111111111', 'Caja General', 'general', 850000.00, 1000000.00, 'active', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), 'Cuenta principal de efectivo', null),
  ('ca222222-2222-2222-2222-222222222222', 'Fondo Proyecto Los Pinos', 'project_fund', 450000.00, 500000.00, 'active', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), 'Fondo específico para proyecto Los Pinos', 'p1111111-1111-1111-1111-111111111111'),
  ('ca333333-3333-3333-3333-333333333333', 'Caja Chica Oficina', 'petty_cash', 25000.00, 50000.00, 'active', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), 'Gastos menores de oficina', null)
ON CONFLICT (id) DO NOTHING;

-- Crear ingresos de prueba
INSERT INTO public.incomes (id, client_id, project_id, description, amount, category, invoice_date, payment_status, status_cfdi, invoice_number, created_by)
VALUES 
  ('in111111-1111-1111-1111-111111111111', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'Anticipo Proyecto Los Pinos - 30%', 4500000.00, 'construction', '2024-01-15', 'paid', 'active', 'FAC-2024-001', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('in222222-2222-2222-2222-222222222222', 'a2345678-9abc-def0-1234-56789abcdef0', 'p2222222-2222-2222-2222-222222222222', 'Pago Diseño Torre Corporativa', 2500000.00, 'design', '2024-02-01', 'paid', 'active', 'FAC-2024-002', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('in333333-3333-3333-3333-333333333333', 'b3456789-abcd-ef01-2345-6789abcdef01', 'p3333333-3333-3333-3333-333333333333', 'Pago Avance Obra Jardines - 50%', 12500000.00, 'construction', '2024-01-30', 'paid', 'active', 'FAC-2024-003', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('in444444-4444-4444-4444-444444444444', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'Pago Avance Los Pinos - 25%', 3750000.00, 'construction', '2024-02-15', 'paid', 'active', 'FAC-2024-004', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Crear gastos de prueba
INSERT INTO public.expenses (id, client_id, project_id, description, amount, category, invoice_date, status_cfdi, reference_number, created_by)
VALUES 
  ('ex111111-1111-1111-1111-111111111111', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'Materiales de construcción - Cemento y varilla', 850000.00, 'materials', '2024-01-20', 'active', 'PROV-2024-001', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ex222222-2222-2222-2222-222222222222', 'a2345678-9abc-def0-1234-56789abcdef0', 'p2222222-2222-2222-2222-222222222222', 'Honorarios arquitecto diseño', 450000.00, 'design', '2024-02-05', 'active', 'PROV-2024-002', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ex333333-3333-3333-3333-333333333333', 'b3456789-abcd-ef01-2345-6789abcdef01', 'p3333333-3333-3333-3333-333333333333', 'Mano de obra especializada', 2200000.00, 'labor', '2024-02-10', 'active', 'PROV-2024-003', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ex444444-4444-4444-4444-444444444444', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'Subcontratista electricidad', 650000.00, 'subcontractors', '2024-02-20', 'active', 'PROV-2024-004', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ex555555-5555-5555-5555-555555555555', null, null, 'Gastos administrativos oficina', 85000.00, 'administration', '2024-02-01', 'active', 'ADMIN-2024-001', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ex666666-6666-6666-6666-666666666666', null, null, 'Combustible vehículos empresa', 45000.00, 'operations', '2024-02-15', 'active', 'OP-2024-001', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Crear transacciones de efectivo de prueba
INSERT INTO public.cash_transactions (id, cash_account_id, client_id, project_id, transaction_type, category, description, amount, approval_status, fiscal_compliant, receipt_provided, notes, created_by)
VALUES 
  ('ct111111-1111-1111-1111-111111111111', 'ca111111-1111-1111-1111-111111111111', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'income', 'construction', 'Depósito anticipo Los Pinos', 4500000.00, 'approved', true, true, 'Primer pago del proyecto', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ct222222-2222-2222-2222-222222222222', 'ca222222-2222-2222-2222-222222222222', 'f1234567-89ab-cdef-0123-456789abcdef', 'p1111111-1111-1111-1111-111111111111', 'expense', 'materials', 'Pago materiales Los Pinos', 850000.00, 'approved', true, true, 'Compra de cemento y varilla', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ct333333-3333-3333-3333-333333333333', 'ca111111-1111-1111-1111-111111111111', 'a2345678-9abc-def0-1234-56789abcdef0', 'p2222222-2222-2222-2222-222222222222', 'income', 'design', 'Pago diseño Torre Corporativa', 2500000.00, 'approved', true, true, 'Pago por servicios de diseño', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ct444444-4444-4444-4444-444444444444', 'ca333333-3333-3333-3333-333333333333', null, null, 'expense', 'administration', 'Gastos oficina febrero', 85000.00, 'approved', true, true, 'Gastos administrativos del mes', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Crear proyecciones de flujo de efectivo de prueba
INSERT INTO public.cash_flow_projections (id, project_id, period_start, period_end, projected_income, projected_expenses, actual_income, actual_expenses, notes, created_by)
VALUES 
  ('cf111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', '2024-03-01', '2024-03-31', 3000000.00, 2500000.00, 3750000.00, 2200000.00, 'Proyección marzo - Los Pinos', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('cf222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', '2024-03-01', '2024-03-31', 1500000.00, 800000.00, 1200000.00, 650000.00, 'Proyección marzo - Torre Corporativa', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('cf333333-3333-3333-3333-333333333333', null, '2024-04-01', '2024-04-30', 5000000.00, 4200000.00, 0.00, 0.00, 'Proyección general abril', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Crear anticipos de empleados de prueba
INSERT INTO public.employee_advances (id, employee_name, advance_amount, amount_justified, amount_pending, status, advance_date, due_date, purpose, notes, created_by)
VALUES 
  ('ea111111-1111-1111-1111-111111111111', 'Juan Carlos Rodríguez', 50000.00, 30000.00, 20000.00, 'pending', '2024-02-01', '2024-03-15', 'Gastos de viaje para supervisión obra', 'Pendiente justificar gastos de hospedaje', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ea222222-2222-2222-2222-222222222222', 'María Elena Sánchez', 35000.00, 35000.00, 0.00, 'justified', '2024-01-15', '2024-02-28', 'Materiales urgentes proyecto', 'Totalmente justificado con facturas', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
  ('ea333333-3333-3333-3333-333333333333', 'Luis Fernando Gómez', 75000.00, 15000.00, 60000.00, 'overdue', '2024-01-01', '2024-02-15', 'Herramientas y equipo menor', 'Vencido - requiere seguimiento urgente', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (id) DO NOTHING;