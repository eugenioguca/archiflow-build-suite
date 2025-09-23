-- Corregir la vista de rollup del presupuesto de construcción
DROP VIEW IF EXISTS v_construction_budget_rollup;

CREATE OR REPLACE VIEW v_construction_budget_rollup AS
WITH budget_calculations AS (
  SELECT 
    cbi.*,
    -- Calcular comprado (transacciones aprobadas)
    COALESCE(SUM(ta.allocated_quantity), 0) as calc_purchased_quantity,
    COALESCE(SUM(ta.allocated_amount), 0) as calc_purchased_amount,
    -- Precio promedio ponderado
    CASE 
      WHEN SUM(ta.allocated_quantity) > 0 
      THEN SUM(ta.allocated_amount) / SUM(ta.allocated_quantity)
      ELSE 0 
    END as calc_avg_unit_price,
    -- Último precio unitario de transacciones
    COALESCE(
      (SELECT ta2.unit_price 
       FROM transaction_allocations ta2 
       JOIN unified_financial_transactions uft2 ON ta2.unified_transaction_id = uft2.id
       WHERE ta2.budget_item_id = cbi.id 
       AND uft2.status IN ('approved', 'completed')
       ORDER BY uft2.created_at DESC 
       LIMIT 1), 
      0
    ) as calc_last_unit_price
  FROM construction_budget_items cbi
  LEFT JOIN transaction_allocations ta ON cbi.id = ta.budget_item_id
  LEFT JOIN unified_financial_transactions uft ON ta.unified_transaction_id = uft.id 
    AND uft.status IN ('approved', 'completed')
  GROUP BY cbi.id
)
SELECT 
  bc.*,
  -- Renombrar campos calculados para evitar conflicto
  bc.calc_purchased_quantity as purchased_quantity,
  bc.calc_purchased_amount as purchased_amount,
  bc.calc_avg_unit_price as avg_unit_price,
  bc.calc_last_unit_price as last_unit_price,
  
  -- Saldo pendiente calculado
  (bc.baseline_quantity - bc.calc_purchased_quantity) as calc_remaining_quantity,
  
  -- EAC según método
  CASE 
    WHEN bc.current_eac_method = 'manual' AND bc.manual_eac_price IS NOT NULL 
    THEN bc.manual_eac_price * bc.baseline_quantity
    
    WHEN bc.current_eac_method = 'last' AND bc.calc_last_unit_price > 0 
    THEN bc.calc_last_unit_price * bc.baseline_quantity
    
    WHEN bc.current_eac_method = 'weighted_avg' AND bc.calc_avg_unit_price > 0 
    THEN bc.calc_avg_unit_price * bc.baseline_quantity
    
    ELSE bc.baseline_total
  END as eac_total,
  
  -- Variación
  CASE 
    WHEN bc.current_eac_method = 'manual' AND bc.manual_eac_price IS NOT NULL 
    THEN (bc.manual_eac_price * bc.baseline_quantity) - bc.baseline_total
    
    WHEN bc.current_eac_method = 'last' AND bc.calc_last_unit_price > 0 
    THEN (bc.calc_last_unit_price * bc.baseline_quantity) - bc.baseline_total
    
    WHEN bc.current_eac_method = 'weighted_avg' AND bc.calc_avg_unit_price > 0 
    THEN (bc.calc_avg_unit_price * bc.baseline_quantity) - bc.baseline_total
    
    ELSE 0
  END as cost_variance,
  
  -- Porcentaje de completado
  CASE 
    WHEN bc.baseline_quantity > 0 
    THEN (bc.calc_purchased_quantity / bc.baseline_quantity) * 100
    ELSE 0 
  END as completion_percentage,
  
  -- Estado de suministro
  CASE 
    WHEN bc.calc_purchased_quantity = 0 THEN 'pendiente'
    WHEN bc.calc_purchased_quantity >= bc.baseline_quantity THEN 'completo'
    ELSE 'parcial'
  END as supply_status
  
FROM budget_calculations bc;