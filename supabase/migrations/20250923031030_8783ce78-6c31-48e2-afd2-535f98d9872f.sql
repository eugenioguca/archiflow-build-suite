-- Function to sync construction budget snapshot from Planeación
CREATE OR REPLACE FUNCTION sync_construction_budget_snapshot(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  snapshot_exists boolean := false;
  project_in_construction boolean := false;
BEGIN
  -- Check if project is in construction (baseline should be locked)
  SELECT EXISTS(
    SELECT 1 FROM client_projects 
    WHERE id = project_id_param AND status = 'construction'
  ) INTO project_in_construction;
  
  -- Check if snapshot already exists
  SELECT EXISTS(
    SELECT 1 FROM construction_budget_items 
    WHERE project_id = project_id_param
  ) INTO snapshot_exists;
  
  -- If project is in construction and snapshot exists, don't update (baseline locked)
  IF project_in_construction AND snapshot_exists THEN
    RAISE NOTICE 'Project in construction - baseline locked';
    RETURN;
  END IF;
  
  -- Delete existing snapshot if updating
  IF snapshot_exists THEN
    DELETE FROM construction_budget_items WHERE project_id = project_id_param;
  END IF;
  
  -- Insert snapshot from Presupuesto Ejecutivo
  INSERT INTO construction_budget_items (
    project_id,
    source_budget_item_id,
    item_name,
    category,
    subcategory,
    unit_of_measure,
    baseline_quantity,
    baseline_unit_price,
    baseline_total,
    quantity,
    unit_price,
    total_price,
    current_eac_method,
    status,
    is_baseline_locked,
    created_by
  )
  SELECT 
    project_id_param,
    pes.id,
    pes.nombre_snapshot,
    COALESCE(m.nombre, 'Sin Mayor') as category,
    COALESCE(p.nombre, 'Sin Partida') as subcategory,
    COALESCE(pes.unidad, 'pza') as unit_of_measure,
    pes.cantidad,
    pes.precio_unitario,
    pes.importe,
    pes.cantidad,
    pes.precio_unitario,
    pes.importe,
    'weighted_avg'::text,
    'pending'::text,
    project_in_construction,
    pes.created_by
  FROM presupuesto_ejecutivo_subpartida pes
  LEFT JOIN presupuesto_ejecutivo_partida pep ON pes.partida_ejecutivo_id = pep.id
  LEFT JOIN presupuesto_parametrico pp ON pep.parametrico_id = pp.id
  LEFT JOIN chart_of_accounts_mayor m ON pp.mayor_id = m.id
  LEFT JOIN chart_of_accounts_partidas p ON pp.partida_id = p.id
  WHERE pes.proyecto_id = project_id_param;
  
  -- Create default supply status records
  INSERT INTO budget_supply_status (budget_item_id, status, updated_by)
  SELECT 
    cbi.id,
    'sin_requerir'::text,
    cbi.created_by
  FROM construction_budget_items cbi
  WHERE cbi.project_id = project_id_param
  ON CONFLICT (budget_item_id) DO NOTHING;
END;
$function$;

-- View for construction budget rollup with comparisons
CREATE OR REPLACE VIEW v_construction_budget_rollup AS
SELECT 
  cbi.id as budget_item_id,
  cbi.project_id,
  cbi.source_budget_item_id,
  cbi.item_name,
  cbi.category as mayor,
  cbi.subcategory as partida,
  cbi.item_name as subpartida,
  cbi.unit_of_measure as unidad,
  cbi.baseline_quantity as cantidad_base,
  cbi.baseline_unit_price as precio_base,
  cbi.baseline_total as total_base,
  
  -- Purchased amounts from allocated transactions
  COALESCE(ta_summary.comprado_qty, 0) as comprado_qty,
  COALESCE(ta_summary.comprado_total, 0) as comprado_total,
  CASE 
    WHEN COALESCE(ta_summary.comprado_qty, 0) > 0 
    THEN ta_summary.comprado_total / ta_summary.comprado_qty
    ELSE 0 
  END as precio_prom_ponderado,
  
  -- Remaining quantities
  cbi.baseline_quantity - COALESCE(ta_summary.comprado_qty, 0) as saldo_qty,
  
  -- EAC calculations
  CASE 
    WHEN cbi.current_eac_method = 'manual' THEN COALESCE(cbi.manual_eac_price, cbi.baseline_unit_price)
    WHEN cbi.current_eac_method = 'last' THEN COALESCE(ta_summary.last_unit_price, cbi.baseline_unit_price)
    ELSE -- weighted_avg
      CASE 
        WHEN COALESCE(ta_summary.comprado_qty, 0) > 0 
        THEN ta_summary.comprado_total / ta_summary.comprado_qty
        ELSE cbi.baseline_unit_price 
      END
  END as eac_unit_price,
  
  -- EAC total = purchased + (remaining * eac_unit_price)
  COALESCE(ta_summary.comprado_total, 0) + 
  ((cbi.baseline_quantity - COALESCE(ta_summary.comprado_qty, 0)) * 
    CASE 
      WHEN cbi.current_eac_method = 'manual' THEN COALESCE(cbi.manual_eac_price, cbi.baseline_unit_price)
      WHEN cbi.current_eac_method = 'last' THEN COALESCE(ta_summary.last_unit_price, cbi.baseline_unit_price)
      ELSE -- weighted_avg
        CASE 
          WHEN COALESCE(ta_summary.comprado_qty, 0) > 0 
          THEN ta_summary.comprado_total / ta_summary.comprado_qty
          ELSE cbi.baseline_unit_price 
        END
    END) as eac_total,
  
  -- Variance calculations
  (COALESCE(ta_summary.comprado_total, 0) + 
   ((cbi.baseline_quantity - COALESCE(ta_summary.comprado_qty, 0)) * 
     CASE 
       WHEN cbi.current_eac_method = 'manual' THEN COALESCE(cbi.manual_eac_price, cbi.baseline_unit_price)
       WHEN cbi.current_eac_method = 'last' THEN COALESCE(ta_summary.last_unit_price, cbi.baseline_unit_price)
       ELSE -- weighted_avg
         CASE 
           WHEN COALESCE(ta_summary.comprado_qty, 0) > 0 
           THEN ta_summary.comprado_total / ta_summary.comprado_qty
           ELSE cbi.baseline_unit_price 
         END
     END)) - cbi.baseline_total as variacion_total,
  
  -- Variance percentage
  CASE 
    WHEN cbi.baseline_total > 0 
    THEN ((COALESCE(ta_summary.comprado_total, 0) + 
           ((cbi.baseline_quantity - COALESCE(ta_summary.comprado_qty, 0)) * 
             CASE 
               WHEN cbi.current_eac_method = 'manual' THEN COALESCE(cbi.manual_eac_price, cbi.baseline_unit_price)
               WHEN cbi.current_eac_method = 'last' THEN COALESCE(ta_summary.last_unit_price, cbi.baseline_unit_price)
               ELSE -- weighted_avg
                 CASE 
                   WHEN COALESCE(ta_summary.comprado_qty, 0) > 0 
                   THEN ta_summary.comprado_total / ta_summary.comprado_qty
                   ELSE cbi.baseline_unit_price 
                 END
             END)) - cbi.baseline_total) / cbi.baseline_total * 100
    ELSE 0 
  END as variacion_pct,
  
  -- Completion percentage
  CASE 
    WHEN cbi.baseline_quantity > 0 
    THEN (COALESCE(ta_summary.comprado_qty, 0) / cbi.baseline_quantity) * 100
    ELSE 0 
  END as completion_percentage,
  
  -- Supply status
  COALESCE(bss.status, 'sin_requerir') as supply_status,
  cbi.current_eac_method,
  cbi.manual_eac_price,
  cbi.is_baseline_locked,
  cbi.created_at,
  cbi.updated_at

FROM construction_budget_items cbi
LEFT JOIN (
  SELECT 
    ta.budget_item_id,
    SUM(ta.allocated_quantity) as comprado_qty,
    SUM(ta.allocated_amount) as comprado_total,
    -- Last unit price from most recent transaction
    (
      SELECT ta2.allocated_amount / NULLIF(ta2.allocated_quantity, 0)
      FROM transaction_allocations ta2
      JOIN unified_financial_transactions uft2 ON ta2.unified_transaction_id = uft2.id
      WHERE ta2.budget_item_id = ta.budget_item_id
      AND uft2.departamento = 'construccion'
      AND uft2.tipo_movimiento = 'gasto'
      ORDER BY uft2.fecha DESC, uft2.created_at DESC
      LIMIT 1
    ) as last_unit_price
  FROM transaction_allocations ta
  JOIN unified_financial_transactions uft ON ta.unified_transaction_id = uft.id
  WHERE uft.departamento = 'construccion'
  AND uft.tipo_movimiento = 'gasto'
  -- Filter by eligible states (ordered or higher)
  AND (uft.state IS NULL OR uft.state != 'cancelled')
  GROUP BY ta.budget_item_id
) ta_summary ON cbi.id = ta_summary.budget_item_id
LEFT JOIN budget_supply_status bss ON cbi.id = bss.budget_item_id;