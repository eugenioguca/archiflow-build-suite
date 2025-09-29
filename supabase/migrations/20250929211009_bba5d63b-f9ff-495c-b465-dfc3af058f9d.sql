-- Paso 1: Añadir columnas faltantes a planning_price_observations
ALTER TABLE planning_price_observations
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.planning_budgets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS concepto_id UUID REFERENCES public.planning_conceptos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS observation_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS pu_mxn NUMERIC(18, 6),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Paso 2: Actualizar pu_mxn para registros existentes
UPDATE planning_price_observations
SET pu_mxn = pu * exchange_rate
WHERE pu_mxn IS NULL;

-- Paso 3: Hacer pu_mxn NOT NULL después de actualizar
ALTER TABLE planning_price_observations
ALTER COLUMN pu_mxn SET NOT NULL;

-- Paso 4: Eliminar duplicados si existen (usando wbs_code + unit + date como criterio)
DELETE FROM planning_price_observations p
USING planning_price_observations q
WHERE p.id < q.id
  AND p.wbs_code = q.wbs_code
  AND p.unit = q.unit
  AND COALESCE(p.observation_date, p.date) = COALESCE(q.observation_date, q.date);

-- Paso 5: Añadir constraint UNIQUE para prevenir duplicados futuros
ALTER TABLE planning_price_observations
ADD CONSTRAINT unique_observation_per_version
UNIQUE (budget_id, wbs_code, unit, version_number);