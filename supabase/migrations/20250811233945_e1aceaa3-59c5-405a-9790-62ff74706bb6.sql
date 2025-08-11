-- Limpiar TODAS las políticas problemáticas de la tabla profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view employee profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Asegurar que la función is_admin esté bien configurada (sin recursión)
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::user_role
  );
$$;

-- Función auxiliar para verificar roles sin recursión
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role 
  FROM public.profiles 
  WHERE user_id = user_uuid 
  LIMIT 1;
$$;

-- 1. POLÍTICAS PARA VISUALIZACIÓN (SELECT)
-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT 
USING (user_id = auth.uid());

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (is_admin(auth.uid()));

-- Los empleados pueden ver perfiles de otros empleados y admins (no clientes)
CREATE POLICY "Employees can view staff profiles" 
ON public.profiles
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'employee'::user_role
  AND role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
);

-- 2. POLÍTICAS PARA ACTUALIZACIÓN (UPDATE)
-- Los usuarios pueden actualizar solo sus datos básicos (nombre, teléfono, etc.) pero NO su rol ni estado de aprobación
CREATE POLICY "Users can update own basic data" 
ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND role = get_user_role(auth.uid()) -- No pueden cambiar su rol
  AND approval_status = (
    SELECT approval_status FROM public.profiles WHERE user_id = auth.uid()
  ) -- No pueden cambiar su estado de aprobación
);

-- Los admins pueden actualizar cualquier perfil (incluyendo roles y aprobaciones)
CREATE POLICY "Admins can update any profile" 
ON public.profiles
FOR UPDATE 
USING (is_admin(auth.uid()));

-- 3. POLÍTICAS PARA INSERCIÓN (INSERT)
-- Los admins pueden crear perfiles
CREATE POLICY "Admins can create profiles" 
ON public.profiles
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Los usuarios pueden crear su propio perfil durante el registro
CREATE POLICY "Users can create own profile" 
ON public.profiles
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 4. POLÍTICAS PARA ELIMINACIÓN (DELETE)
-- Solo los admins pueden eliminar perfiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles
FOR DELETE 
USING (is_admin(auth.uid()));