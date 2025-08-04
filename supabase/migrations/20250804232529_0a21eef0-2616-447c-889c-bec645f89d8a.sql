-- FASE 1: ELIMINACIÓN DE TABLAS INNECESARIAS
-- Dropping tables that are not needed for a real finance module

DROP TABLE IF EXISTS accounts_payable CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS cash_flow_projections CASCADE;
DROP TABLE IF EXISTS advance_justifications CASCADE;
DROP TABLE IF EXISTS employee_advances CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;

-- FASE 2: MEJORA DEL SISTEMA PPD
-- Add client_id and project_id to payment_complements table to connect with client-project architecture
ALTER TABLE payment_complements 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES client_projects(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payment_complements_client_id ON payment_complements(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_complements_project_id ON payment_complements(project_id);

-- Create trigger to auto-populate client_id and project_id from CFDI documents
CREATE OR REPLACE FUNCTION auto_populate_complement_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Get client_id and project_id from the related CFDI document
  IF NEW.cfdi_document_id IS NOT NULL THEN
    SELECT cd.client_id, i.project_id
    INTO NEW.client_id, NEW.project_id
    FROM cfdi_documents cd
    LEFT JOIN incomes i ON cd.income_id = i.id
    WHERE cd.id = NEW.cfdi_document_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_populate_complement_references
  BEFORE INSERT OR UPDATE ON payment_complements
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_complement_references();