-- Eliminar todos los datos de prueba de la plataforma

-- Eliminar recordatorios CRM
DELETE FROM crm_reminders;

-- Eliminar actividades CRM
DELETE FROM crm_activities;

-- Eliminar clientes
DELETE FROM clients;

-- Eliminar proyectos (si los hubiera)
DELETE FROM projects;

-- Eliminar propuestas CRM
DELETE FROM crm_proposals;

-- Eliminar gastos
DELETE FROM expenses;

-- Eliminar ingresos
DELETE FROM incomes;

-- Eliminar documentos
DELETE FROM documents;

-- Eliminar fotos de progreso
DELETE FROM progress_photos;

-- Eliminar cuentas por cobrar
DELETE FROM accounts_receivable;

-- Eliminar métricas CRM
DELETE FROM crm_metrics;

-- Reset de secuencias si las hubiera (esto asegura que los IDs empiecen desde 1 nuevamente)
-- No aplicable ya que usamos UUIDs

-- Opcional: Limpiar configuraciones de plataforma que no sean críticas
-- DELETE FROM platform_settings WHERE setting_key NOT IN ('required_setting1', 'required_setting2');

-- Mensaje de confirmación
SELECT 'Todos los datos de prueba han sido eliminados exitosamente' as mensaje;