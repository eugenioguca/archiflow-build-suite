-- Actualizar el check constraint para incluir "cancelado"
ALTER TABLE public.material_requirements DROP CONSTRAINT IF EXISTS material_requirements_status_check;

-- Crear nuevo check constraint con "cancelado" incluido
ALTER TABLE public.material_requirements 
ADD CONSTRAINT material_requirements_status_check 
CHECK (status IN ('cotizado', 'requerido', 'ordenado', 'cancelado'));