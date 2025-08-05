-- Manually transition "Proyecto Principal" to design status since it meets all requirements
UPDATE client_projects 
SET status = 'design'
WHERE id = 'feb3173c-6180-4104-87c8-f3d3cbe13115'
  AND sales_pipeline_stage = 'cliente_cerrado'
  AND constancia_situacion_fiscal_uploaded = true
  AND contract_uploaded = true;