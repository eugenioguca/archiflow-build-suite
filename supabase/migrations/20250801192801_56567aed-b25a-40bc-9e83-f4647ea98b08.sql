-- Add missing columns to profiles table for user contact cards
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS department text, 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;