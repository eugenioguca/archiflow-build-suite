-- Agregar campos fiscales y de dirección faltantes a la tabla suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS razon_social text,
ADD COLUMN IF NOT EXISTS tipo_vialidad text,
ADD COLUMN IF NOT EXISTS nombre_vialidad text,
ADD COLUMN IF NOT EXISTS numero_exterior text,
ADD COLUMN IF NOT EXISTS numero_interior text,
ADD COLUMN IF NOT EXISTS colonia text,
ADD COLUMN IF NOT EXISTS localidad text,
ADD COLUMN IF NOT EXISTS municipio text,
ADD COLUMN IF NOT EXISTS estado_fiscal text,
ADD COLUMN IF NOT EXISTS dias_credito integer,
ADD COLUMN IF NOT EXISTS limite_credito numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ofrece_credito boolean DEFAULT false;

-- Agregar índices para mejorar performance en búsquedas
CREATE INDEX IF NOT EXISTS idx_suppliers_rfc ON public.suppliers(rfc);
CREATE INDEX IF NOT EXISTS idx_suppliers_razon_social ON public.suppliers(razon_social);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON public.suppliers(company_name);

-- Comentarios para documentar la estructura
COMMENT ON COLUMN public.suppliers.razon_social IS 'Razón social fiscal del proveedor';
COMMENT ON COLUMN public.suppliers.rfc IS 'Registro Federal de Contribuyentes';
COMMENT ON COLUMN public.suppliers.tipo_vialidad IS 'Tipo de vialidad (calle, avenida, etc.)';
COMMENT ON COLUMN public.suppliers.nombre_vialidad IS 'Nombre de la vialidad';
COMMENT ON COLUMN public.suppliers.numero_exterior IS 'Número exterior del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.numero_interior IS 'Número interior del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.colonia IS 'Colonia del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.localidad IS 'Localidad del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.municipio IS 'Municipio del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.estado_fiscal IS 'Estado del domicilio fiscal';
COMMENT ON COLUMN public.suppliers.dias_credito IS 'Días de crédito que ofrece el proveedor';
COMMENT ON COLUMN public.suppliers.limite_credito IS 'Límite de crédito del proveedor';
COMMENT ON COLUMN public.suppliers.ofrece_credito IS 'Indica si el proveedor ofrece crédito';