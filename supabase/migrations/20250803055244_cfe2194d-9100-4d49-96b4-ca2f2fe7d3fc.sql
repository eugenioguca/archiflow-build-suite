-- Fase 1: Corrección de Datos de Prueba (CRÍTICO) - Versión Final Corregida
-- Crear relaciones cliente-proyecto coherentes y transacciones completas

-- Primero, limpiar datos incompletos para crear un conjunto coherente
DELETE FROM public.expenses WHERE project_id IS NULL;
DELETE FROM public.incomes WHERE project_id IS NULL;
DELETE FROM public.cash_transactions WHERE project_id IS NULL;

-- Crear más proyectos para clientes existentes para tener mejor distribución
INSERT INTO public.client_projects (
  id, client_id, project_name, project_description, status, sales_pipeline_stage, 
  budget, construction_budget, service_type
) VALUES 
-- Proyectos adicionales para María García
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 
 'Casa Residencial Premium - Fase 2', 'Ampliación y renovación de cocina y baños', 
 'construction', 'cliente_cerrado', 850000, 680000, 'construcción_ampliación'),

-- Proyectos para Juan Pérez
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222221', 
 'Oficinas Corporativas', 'Diseño y construcción de oficinas corporativas', 
 'design', 'en_contacto', 2500000, 2000000, 'oficinas'),

('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221', 
 'Local Comercial Downtown', 'Remodelación de local comercial en centro', 
 'construction', 'cliente_cerrado', 950000, 760000, 'comercial'),

-- Proyectos para Ana López
('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331', 
 'Complejo Residencial Bosques', 'Desarrollo habitacional de lujo', 
 'construction', 'cliente_cerrado', 4500000, 3800000, 'desarrollo_habitacional'),

('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333331', 
 'Casa de Campo', 'Casa de fin de semana estilo contemporáneo', 
 'design', 'en_contacto', 1200000, 960000, 'residencial'),

-- Proyectos para Carlos Martín
('44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444441', 
 'Torre de Apartamentos Centro', 'Construcción de torre residencial 15 pisos', 
 'construction', 'cliente_cerrado', 8500000, 7200000, 'torre_residencial'),

-- Proyectos para Laura Sánchez
('55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551', 
 'Restaurante Gourmet', 'Diseño interior y remodelación de restaurante', 
 'design_completed', 'cliente_cerrado', 750000, 600000, 'restaurante');

-- Insertar gastos realistas asociados a proyectos específicos
INSERT INTO public.expenses (
  id, project_id, client_id, category, description, amount, expense_date, 
  invoice_number, tax_amount, created_by
) VALUES 
-- Gastos para Casa Residencial Premium - Fase 2
('ee111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'construction', 'Materiales para cocina integral', 45000, '2024-01-15', 'MAT-001', 7200, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ee111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'construction', 'Mano de obra especializada plomería', 28000, '2024-01-22', 'PLO-002', 4480, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Gastos para Oficinas Corporativas
('ee222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222221',
 'design', 'Diseño arquitectónico y renders', 65000, '2024-02-01', 'DIS-003', 10400, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ee222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221',
 'construction', 'Demolición y obra gris', 120000, '2024-02-10', 'CON-004', 19200, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Gastos para Complejo Residencial Bosques
('ee333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331',
 'construction', 'Cimentación y estructura fase 1', 580000, '2024-01-25', 'EST-005', 92800, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ee333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333331',
 'design', 'Planimetría y estudios de suelo', 85000, '2024-03-01', 'EST-006', 13600, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Gastos para Torre de Apartamentos
('ee444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444441',
 'construction', 'Acero estructural y concreto', 950000, '2024-02-15', 'ACE-007', 152000, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Gastos para Restaurante Gourmet
('ee555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551',
 'design', 'Diseño interior y mobiliario', 95000, '2024-03-10', 'MOB-008', 15200, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Insertar ingresos realistas asociados a proyectos específicos
INSERT INTO public.incomes (
  id, project_id, client_id, category, description, amount, expense_date, 
  invoice_number, tax_amount, payment_status, created_by
) VALUES 
-- Ingresos para Casa Residencial Premium - Fase 2
('ii111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'construction_service', 'Anticipo fase ampliación 30%', 255000, '2024-01-10', 'FAC-001', 40800, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ii111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'construction_service', 'Pago avance obra 40%', 340000, '2024-02-15', 'FAC-002', 54400, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Ingresos para Oficinas Corporativas
('ii222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222221',
 'consultation', 'Diseño arquitectónico oficinas', 180000, '2024-02-05', 'FAC-003', 28800, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ii222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221',
 'construction_service', 'Anticipo remodelación local 25%', 237500, '2024-02-12', 'FAC-004', 38000, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Ingresos para Complejo Residencial Bosques
('ii333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331',
 'construction_service', 'Anticipo desarrollo habitacional 20%', 900000, '2024-01-20', 'FAC-005', 144000, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ii333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333331',
 'consultation', 'Estudios y diseño casa de campo', 120000, '2024-03-05', 'FAC-006', 19200, 'pending', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Ingresos para Torre de Apartamentos
('ii444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444441',
 'construction_service', 'Anticipo construcción torre 15%', 1275000, '2024-02-10', 'FAC-007', 204000, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Ingresos para Restaurante Gourmet
('ii555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551',
 'consultation', 'Diseño completo restaurante', 150000, '2024-03-08', 'FAC-008', 24000, 'paid', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Insertar transacciones de caja asociadas a proyectos
INSERT INTO public.cash_transactions (
  id, cash_account_id, project_id, client_id, transaction_type, category, 
  description, amount, fiscal_compliant, created_by
) VALUES 
-- Transacciones para proyectos de María García
('ct111111-1111-1111-1111-111111111112', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'income', 'construction_service', 'Cobro anticipo ampliación casa', 255000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ct111111-1111-1111-1111-111111111113', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'expense', 'construction', 'Pago materiales cocina integral', 45000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Transacciones para proyectos de Juan Pérez
('ct222222-2222-2222-2222-222222222222', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222221',
 'income', 'consultation', 'Cobro diseño oficinas corporativas', 180000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ct222222-2222-2222-2222-222222222223', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221',
 'expense', 'construction', 'Pago demolición local comercial', 120000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Transacciones para proyectos de Ana López
('ct333333-3333-3333-3333-333333333332', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331',
 'income', 'construction_service', 'Anticipo desarrollo habitacional', 900000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ct333333-3333-3333-3333-333333333333', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331',
 'expense', 'construction', 'Pago cimentación y estructura', 580000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Transacciones para Torre de Apartamentos
('ct444444-4444-4444-4444-444444444442', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444441',
 'income', 'construction_service', 'Anticipo construcción torre', 1275000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ct444444-4444-4444-4444-444444444443', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '44444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444441',
 'expense', 'construction', 'Pago acero estructural y concreto', 950000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Transacciones para Restaurante Gourmet
('ct555555-5555-5555-5555-555555555552', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551',
 'income', 'consultation', 'Cobro diseño restaurante', 150000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

('ct555555-5555-5555-5555-555555555553', 
 (SELECT id FROM public.cash_accounts WHERE name = 'Cuenta Principal' LIMIT 1),
 '55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551',
 'expense', 'design', 'Pago diseño interior y mobiliario', 95000, true, 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Actualizar proyecciones de flujo de caja con datos más realistas
INSERT INTO public.cash_flow_projections (
  id, project_id, period_start, period_end, projected_income, projected_expenses, 
  actual_income, actual_expenses, notes, created_by
) VALUES 
-- Proyección para Casa Residencial Premium - Fase 2
('cf111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112',
 '2024-01-01', '2024-03-31', 850000, 680000, 595000, 476000,
 'Proyecto ampliación en desarrollo, 70% completado', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Proyección para Oficinas Corporativas
('cf222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 '2024-02-01', '2024-06-30', 2500000, 2000000, 180000, 65000,
 'Fase de diseño completada, esperando aprobación para construcción', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Proyección para Complejo Residencial Bosques
('cf333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333332',
 '2024-01-01', '2024-12-31', 4500000, 3800000, 900000, 580000,
 'Desarrollo habitacional de lujo, fase inicial de construcción', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Proyección para Torre de Apartamentos
('cf444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444442',
 '2024-02-01', '2025-02-28', 8500000, 7200000, 1275000, 950000,
 'Torre residencial 15 pisos, construcción iniciada', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),

-- Proyección para Restaurante Gourmet
('cf555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555552',
 '2024-03-01', '2024-05-31', 750000, 600000, 150000, 95000,
 'Diseño interior completado, inicio de construcción pendiente', 
 (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));