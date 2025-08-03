-- Desactivar temporalmente el trigger
DROP TRIGGER IF EXISTS auto_create_material_finance_request_trigger ON public.material_requirements;

-- Eliminar el check constraint existente
ALTER TABLE public.material_requirements DROP CONSTRAINT IF EXISTS material_requirements_status_check;

-- Actualizar los datos existentes para usar estados en español
UPDATE public.material_requirements 
SET status = CASE 
    WHEN status = 'required' THEN 'requerido'
    WHEN status = 'quoted' THEN 'cotizado'
    WHEN status = 'ordered' THEN 'ordenado'
    WHEN status = 'delivered' THEN 'ordenado'
    WHEN status = 'partial_delivery' THEN 'ordenado'
    WHEN status = 'cancelled' THEN 'cotizado'
    ELSE status
END;

-- Crear nuevo check constraint con valores en español
ALTER TABLE public.material_requirements 
ADD CONSTRAINT material_requirements_status_check 
CHECK (status IN ('cotizado', 'requerido', 'ordenado'));

-- Reactivar el trigger
CREATE TRIGGER auto_create_material_finance_request_trigger
  BEFORE INSERT OR UPDATE ON public.material_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_material_finance_request();