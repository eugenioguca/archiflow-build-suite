-- Crear el enum sales_pipeline_stage con las 4 fases del CRM
CREATE TYPE sales_pipeline_stage AS ENUM (
  'nuevo_lead',
  'en_contacto', 
  'lead_perdido',
  'cliente_cerrado'
);

-- Actualizar la columna de texto a enum
ALTER TABLE client_projects 
ALTER COLUMN sales_pipeline_stage TYPE sales_pipeline_stage 
USING CASE 
  WHEN sales_pipeline_stage = 'lead' THEN 'nuevo_lead'::sales_pipeline_stage
  ELSE 'nuevo_lead'::sales_pipeline_stage
END;

-- Establecer valor por defecto
ALTER TABLE client_projects 
ALTER COLUMN sales_pipeline_stage SET DEFAULT 'nuevo_lead'::sales_pipeline_stage;

-- Agregar campos para constancia de situación fiscal
ALTER TABLE client_projects 
ADD COLUMN IF NOT EXISTS constancia_situacion_fiscal_url TEXT,
ADD COLUMN IF NOT EXISTS constancia_situacion_fiscal_uploaded BOOLEAN DEFAULT FALSE;