-- Add provider fields to planning_conceptos
ALTER TABLE planning_conceptos 
ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS provider_notes text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_planning_conceptos_provider_id ON planning_conceptos(provider_id);