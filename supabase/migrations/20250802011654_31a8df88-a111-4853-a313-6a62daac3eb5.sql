-- Primero eliminar la política problemática y recrearla apuntando a client_projects
DROP POLICY IF EXISTS "Users can view activities they created or for their assigned cl" ON public.crm_activities;

-- Crear nueva política que funcione con el nuevo sistema
CREATE POLICY "Users can view activities they created or for their assigned clients" 
ON public.crm_activities 
FOR SELECT 
USING (
  (user_id = auth.uid()) 
  OR 
  (client_id IN (
    SELECT cp.client_id 
    FROM public.client_projects cp 
    JOIN public.profiles p ON cp.assigned_advisor_id = p.id 
    WHERE p.user_id = auth.uid()
  )) 
  OR 
  (EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  ))
);

-- Ahora sí, eliminar las columnas de clients que migraremos a client_projects
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS project_size CASCADE,
DROP COLUMN IF EXISTS decision_maker_name CASCADE,
DROP COLUMN IF EXISTS decision_maker_role CASCADE,
DROP COLUMN IF EXISTS company_size CASCADE,
DROP COLUMN IF EXISTS website CASCADE,
DROP COLUMN IF EXISTS tags CASCADE,
DROP COLUMN IF EXISTS conversion_notes CASCADE,
DROP COLUMN IF EXISTS sales_pipeline_stage CASCADE,
DROP COLUMN IF EXISTS lead_referral_details CASCADE,
DROP COLUMN IF EXISTS curp CASCADE,
DROP COLUMN IF EXISTS state_name CASCADE,
DROP COLUMN IF EXISTS service_type CASCADE,
DROP COLUMN IF EXISTS payment_plan CASCADE,
DROP COLUMN IF EXISTS land_square_meters CASCADE,
DROP COLUMN IF EXISTS branch_office_id CASCADE,
DROP COLUMN IF EXISTS last_activity_date CASCADE,
DROP COLUMN IF EXISTS estimated_value CASCADE,
DROP COLUMN IF EXISTS probability_percentage CASCADE,
DROP COLUMN IF EXISTS conversion_date CASCADE,
DROP COLUMN IF EXISTS location_details CASCADE,
DROP COLUMN IF EXISTS preferred_contact_method CASCADE,
DROP COLUMN IF EXISTS next_contact_date CASCADE,
DROP COLUMN IF EXISTS last_contact_date CASCADE,
DROP COLUMN IF EXISTS lead_score CASCADE,
DROP COLUMN IF EXISTS social_media CASCADE,
DROP COLUMN IF EXISTS timeline_months CASCADE,
DROP COLUMN IF EXISTS project_type CASCADE,
DROP COLUMN IF EXISTS priority CASCADE,
DROP COLUMN IF EXISTS lead_source CASCADE,
DROP COLUMN IF EXISTS assigned_advisor_id CASCADE,
DROP COLUMN IF EXISTS budget CASCADE,
DROP COLUMN IF EXISTS status CASCADE,
DROP COLUMN IF EXISTS alliance_id CASCADE;