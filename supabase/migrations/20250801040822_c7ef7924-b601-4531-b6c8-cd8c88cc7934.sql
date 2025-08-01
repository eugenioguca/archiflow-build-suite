-- Fix function search_path security issues by setting search_path for existing functions
-- This addresses the WARN linter issues for mutable search_path

-- Update function to handle updated_at timestamps with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create or replace the handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;

-- Update auth configuration to fix OTP expiry and enable leaked password protection
-- Note: These settings need to be configured in the Supabase dashboard:
-- 1. Go to Authentication > Settings
-- 2. Set OTP expiry to 300 seconds (5 minutes) or less
-- 3. Enable "Leaked password protection"

-- Create a notification for admin to update auth settings
COMMENT ON SCHEMA public IS 'ADMIN ACTION REQUIRED: Please update Authentication settings in Supabase dashboard - Set OTP expiry to 300 seconds and enable leaked password protection';