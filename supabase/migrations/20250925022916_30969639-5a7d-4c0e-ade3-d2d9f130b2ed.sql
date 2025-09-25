-- Create read-only VIEW for Planning Gantt data consumption from Construction
CREATE OR REPLACE VIEW v_planning_gantt_for_construction AS
SELECT
  ggl.id                       AS source_activity_id,
  ggl.plan_id,
  (SELECT proyecto_id FROM cronograma_gantt_plan WHERE id = ggl.plan_id) AS project_id,
  ggl.mayor_id,
  cam.codigo                   AS mayor_codigo,
  cam.nombre                   AS mayor_nombre,
  ggl.label                    AS nombre_actividad,
  gga.start_month,
  gga.start_week,
  gga.end_month,
  gga.end_week,
  ggl.amount,
  ggl.order_index,
  ggl.is_discount,
  -- Calculate approximate dates from month/week
  (DATE_TRUNC('month', (gga.start_month || '-01')::date) + INTERVAL '1 week' * (gga.start_week - 1))::date AS start_date_plan,
  (DATE_TRUNC('month', (gga.end_month || '-01')::date) + INTERVAL '1 week' * gga.end_week - INTERVAL '1 day')::date AS end_date_plan,
  -- Calculate duration in days using EXTRACT
  EXTRACT(EPOCH FROM (
    (DATE_TRUNC('month', (gga.end_month || '-01')::date) + INTERVAL '1 week' * gga.end_week - INTERVAL '1 day') - 
    (DATE_TRUNC('month', (gga.start_month || '-01')::date) + INTERVAL '1 week' * (gga.start_week - 1))
  ))::integer / 86400 AS duration_days_plan
FROM cronograma_gantt_line ggl
LEFT JOIN chart_of_accounts_mayor cam ON cam.id = ggl.mayor_id
LEFT JOIN cronograma_gantt_activity gga ON gga.line_id = ggl.id
WHERE ggl.is_discount = false
  AND cam.activo = true;

-- Grant SELECT permissions on the view
GRANT SELECT ON v_planning_gantt_for_construction TO authenticated;
GRANT SELECT ON v_planning_gantt_for_construction TO anon;