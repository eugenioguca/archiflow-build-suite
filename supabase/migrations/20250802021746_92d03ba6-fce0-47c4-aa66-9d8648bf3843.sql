-- Actualizar el enum sales_pipeline_stage con las 4 fases del CRM
ALTER TYPE sales_pipeline_stage RENAME TO sales_pipeline_stage_old;

CREATE TYPE sales_pipeline_stage AS ENUM (
  'nuevo_lead',
  'en_contacto', 
  'lead_perdido',
  'cliente_cerrado'
);

-- Migrar datos existentes
ALTER TABLE client_projects 
ALTER COLUMN sales_pipeline_stage TYPE sales_pipeline_stage 
USING CASE 
  WHEN sales_pipeline_stage::text = 'lead' THEN 'nuevo_lead'::sales_pipeline_stage
  ELSE 'nuevo_lead'::sales_pipeline_stage
END;

-- Actualizar valor por defecto
ALTER TABLE client_projects 
ALTER COLUMN sales_pipeline_stage SET DEFAULT 'nuevo_lead'::sales_pipeline_stage;

-- Limpiar enum anterior
DROP TYPE sales_pipeline_stage_old;

-- Agregar campo para constancia de situación fiscal
ALTER TABLE client_projects 
ADD COLUMN constancia_situacion_fiscal_url TEXT,
ADD COLUMN constancia_situacion_fiscal_uploaded BOOLEAN DEFAULT FALSE;