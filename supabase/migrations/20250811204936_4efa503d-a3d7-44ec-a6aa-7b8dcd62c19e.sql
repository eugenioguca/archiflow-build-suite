-- Update existing client_projects to have correct probability percentages
UPDATE client_projects 
SET probability_percentage = CASE 
  WHEN sales_pipeline_stage = 'nuevo_lead' THEN 25
  WHEN sales_pipeline_stage = 'en_contacto' THEN 50
  WHEN sales_pipeline_stage = 'cliente_cerrado' THEN 100
  WHEN sales_pipeline_stage = 'lead_perdido' THEN 0
  ELSE COALESCE(probability_percentage, 0)
END
WHERE probability_percentage != CASE 
  WHEN sales_pipeline_stage = 'nuevo_lead' THEN 25
  WHEN sales_pipeline_stage = 'en_contacto' THEN 50
  WHEN sales_pipeline_stage = 'cliente_cerrado' THEN 100
  WHEN sales_pipeline_stage = 'lead_perdido' THEN 0
  ELSE COALESCE(probability_percentage, 0)
END;