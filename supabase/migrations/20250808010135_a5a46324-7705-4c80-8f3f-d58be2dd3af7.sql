-- Corregir planes de pago que tienen nombres de construcción pero tipo incorrecto
UPDATE payment_plans 
SET plan_type = 'construction_payment'
WHERE plan_type = 'design_payment' 
AND (
  LOWER(plan_name) LIKE '%construcción%' OR
  LOWER(plan_name) LIKE '%construccion%' OR
  LOWER(plan_name) LIKE '%obra%' OR
  LOWER(plan_name) LIKE '%building%'
);

-- Verificar corrección
SELECT 
  plan_name,
  plan_type,
  CASE 
    WHEN plan_type = 'design_payment' THEN 'Diseño'
    WHEN plan_type = 'construction_payment' THEN 'Construcción'
    ELSE 'Otro'
  END as tipo_legible
FROM payment_plans
ORDER BY plan_type, plan_name;