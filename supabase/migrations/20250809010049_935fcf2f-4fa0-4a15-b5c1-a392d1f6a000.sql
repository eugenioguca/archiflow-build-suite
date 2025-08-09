-- Fix calendar system: Step 1 - Fix event_alerts policies first

-- 1. Drop event_alerts policies that depend on created_by
DROP POLICY IF EXISTS "Users can manage their own event alerts" ON public.event_alerts;
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.event_alerts;
DROP POLICY IF EXISTS "Users can create their own alerts" ON public.event_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.event_alerts;
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.event_alerts;

-- 2. Add user_id column to event_alerts if not exists
ALTER TABLE public.event_alerts 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 3. Update existing event_alerts records to set user_id from profiles
UPDATE public.event_alerts 
SET user_id = p.user_id 
FROM public.profiles p 
WHERE event_alerts.created_by = p.id 
AND event_alerts.user_id IS NULL;

-- 4. Create new RLS policies for event_alerts using user_id
CREATE POLICY "Users can manage their own event alerts" 
ON public.event_alerts FOR ALL 
USING (user_id = auth.uid());