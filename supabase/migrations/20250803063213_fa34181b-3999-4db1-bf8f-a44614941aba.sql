-- Primero actualizar los datos existentes para usar estados en español
UPDATE public.material_requirements 
SET status = CASE 
    WHEN status = 'required' THEN 'requerido'
    WHEN status = 'quoted' THEN 'cotizado'
    WHEN status = 'ordered' THEN 'ordenado'
    WHEN status = 'delivered' THEN 'ordenado' -- Mapear delivered a ordenado
    WHEN status = 'partial_delivery' THEN 'ordenado' -- Mapear partial_delivery a ordenado
    WHEN status = 'cancelled' THEN 'cotizado' -- Mapear cancelled a cotizado
    ELSE status
END;

-- Eliminar el check constraint existente
ALTER TABLE public.material_requirements DROP CONSTRAINT IF EXISTS material_requirements_status_check;

-- Crear nuevo check constraint con valores en español
ALTER TABLE public.material_requirements 
ADD CONSTRAINT material_requirements_status_check 
CHECK (status IN ('cotizado', 'requerido', 'ordenado'));