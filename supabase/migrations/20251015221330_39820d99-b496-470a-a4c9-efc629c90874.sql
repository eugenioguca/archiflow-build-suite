-- Ensure push_subscriptions table has correct structure and RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "own subs read" ON public.push_subscriptions;
DROP POLICY IF EXISTS "own subs upsert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "own subs update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "worker read all" ON public.push_subscriptions;

-- Ensure RLS is enabled
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create specific RLS policies as requested
CREATE POLICY "own subs read" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "own subs upsert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own subs update" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "worker read all" ON public.push_subscriptions
  FOR SELECT TO service_role
  USING (true);