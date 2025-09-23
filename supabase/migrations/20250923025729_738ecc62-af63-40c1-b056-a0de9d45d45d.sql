-- Agregar campo de estado a unified_financial_transactions si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_financial_transactions' 
                   AND column_name = 'status') THEN
        ALTER TABLE unified_financial_transactions 
        ADD COLUMN status TEXT DEFAULT 'draft';
        
        -- Crear índice para el campo de estado
        CREATE INDEX idx_unified_transactions_status ON unified_financial_transactions(status);
        
        -- Actualizar transacciones existentes a 'approved' por defecto
        UPDATE unified_financial_transactions SET status = 'approved' WHERE status IS NULL;
    END IF;
END $$;

-- Crear función para sincronizar snapshot de presupuesto de construcción
CREATE OR REPLACE FUNCTION sync_construction_budget_snapshot(project_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  -- Insertar/actualizar items del presupuesto ejecutivo en construction_budget_items
  INSERT INTO construction_budget_items (
    project_id,
    source_budget_item_id,
    item_name,
    item_description,
    category,
    unit_of_measure,
    baseline_quantity,
    baseline_unit_price,
    baseline_total,
    quantity,
    unit_price,
    total_price,
    item_order,
    current_eac_method,
    is_baseline_locked,
    created_by
  )
  SELECT 
    pes.proyecto_id,
    pes.id,
    pes.nombre_snapshot,
    'Subpartida del presupuesto ejecutivo',
    COALESCE(coa_m.nombre, 'General') as category,
    pes.unidad,
    pes.cantidad,
    pes.precio_unitario,
    pes.importe,
    pes.cantidad,
    pes.precio_unitario,
    pes.importe,
    ROW_NUMBER() OVER (ORDER BY pes.created_at),
    'weighted_avg',
    TRUE,
    pes.created_by
  FROM presupuesto_ejecutivo_subpartida pes
  LEFT JOIN presupuesto_ejecutivo_partida pep ON pes.partida_ejecutivo_id = pep.id
  LEFT JOIN chart_of_accounts_subpartidas coa_s ON pes.subpartida_id = coa_s.id
  LEFT JOIN chart_of_accounts_partidas coa_p ON coa_s.partida_id = coa_p.id
  LEFT JOIN chart_of_accounts_mayor coa_m ON coa_p.mayor_id = coa_m.id
  WHERE pes.proyecto_id = project_id_param
  AND NOT EXISTS (
    SELECT 1 FROM construction_budget_items cbi 
    WHERE cbi.source_budget_item_id = pes.id
  )
  ON CONFLICT (project_id, source_budget_item_id) DO UPDATE SET
    item_name = EXCLUDED.item_name,
    baseline_quantity = EXCLUDED.baseline_quantity,
    baseline_unit_price = EXCLUDED.baseline_unit_price,
    baseline_total = EXCLUDED.baseline_total,
    updated_at = now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$;

-- Crear vista para rollup de presupuesto de construcción
CREATE OR REPLACE VIEW v_construction_budget_rollup AS
WITH budget_calculations AS (
  SELECT 
    cbi.*,
    -- Calcular comprado (transacciones aprobadas)
    COALESCE(SUM(ta.allocated_quantity), 0) as purchased_quantity,
    COALESCE(SUM(ta.allocated_amount), 0) as purchased_amount,
    -- Precio promedio ponderado
    CASE 
      WHEN SUM(ta.allocated_quantity) > 0 
      THEN SUM(ta.allocated_amount) / SUM(ta.allocated_quantity)
      ELSE 0 
    END as avg_unit_price,
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
    ) as last_unit_price
  FROM construction_budget_items cbi
  LEFT JOIN transaction_allocations ta ON cbi.id = ta.budget_item_id
  LEFT JOIN unified_financial_transactions uft ON ta.unified_transaction_id = uft.id 
    AND uft.status IN ('approved', 'completed')
  GROUP BY cbi.id
)
SELECT 
  bc.*,
  -- Saldo pendiente
  (bc.baseline_quantity - bc.purchased_quantity) as remaining_quantity,
  
  -- EAC según método
  CASE 
    WHEN bc.current_eac_method = 'manual' AND bc.manual_eac_price IS NOT NULL 
    THEN bc.manual_eac_price * bc.baseline_quantity
    
    WHEN bc.current_eac_method = 'last' AND bc.last_unit_price > 0 
    THEN bc.last_unit_price * bc.baseline_quantity
    
    WHEN bc.current_eac_method = 'weighted_avg' AND bc.avg_unit_price > 0 
    THEN bc.avg_unit_price * bc.baseline_quantity
    
    ELSE bc.baseline_total
  END as eac_total,
  
  -- Variación
  CASE 
    WHEN bc.current_eac_method = 'manual' AND bc.manual_eac_price IS NOT NULL 
    THEN (bc.manual_eac_price * bc.baseline_quantity) - bc.baseline_total
    
    WHEN bc.current_eac_method = 'last' AND bc.last_unit_price > 0 
    THEN (bc.last_unit_price * bc.baseline_quantity) - bc.baseline_total
    
    WHEN bc.current_eac_method = 'weighted_avg' AND bc.avg_unit_price > 0 
    THEN (bc.avg_unit_price * bc.baseline_quantity) - bc.baseline_total
    
    ELSE 0
  END as cost_variance,
  
  -- Porcentaje de completado
  CASE 
    WHEN bc.baseline_quantity > 0 
    THEN (bc.purchased_quantity / bc.baseline_quantity) * 100
    ELSE 0 
  END as completion_percentage,
  
  -- Estado de suministro
  CASE 
    WHEN bc.purchased_quantity = 0 THEN 'pendiente'
    WHEN bc.purchased_quantity >= bc.baseline_quantity THEN 'completo'
    ELSE 'parcial'
  END as supply_status
  
FROM budget_calculations bc;