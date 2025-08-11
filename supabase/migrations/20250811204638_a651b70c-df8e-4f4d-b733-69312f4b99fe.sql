-- Function to automatically update probability percentage based on sales pipeline stage
CREATE OR REPLACE FUNCTION update_probability_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update probability based on sales pipeline stage
  CASE NEW.sales_pipeline_stage
    WHEN 'nuevo_lead' THEN NEW.probability_percentage := 25;
    WHEN 'en_contacto' THEN NEW.probability_percentage := 50;
    WHEN 'cliente_cerrado' THEN NEW.probability_percentage := 100;
    WHEN 'lead_perdido' THEN NEW.probability_percentage := 0;
    ELSE NEW.probability_percentage := COALESCE(NEW.probability_percentage, 0);
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update probability on INSERT and UPDATE
DROP TRIGGER IF EXISTS update_client_project_probability ON client_projects;
CREATE TRIGGER update_client_project_probability
  BEFORE INSERT OR UPDATE OF sales_pipeline_stage
  ON client_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_probability_percentage();