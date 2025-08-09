-- Fix calendar system: Complete implementation

-- 1. Fix personal_events table to use user_id consistently
ALTER TABLE public.personal_events 
DROP CONSTRAINT IF EXISTS personal_events_created_by_fkey;

-- Add user_id column if it doesn't exist
ALTER TABLE public.personal_events 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update existing records to set user_id from profiles
UPDATE public.personal_events 
SET user_id = p.user_id 
FROM public.profiles p 
WHERE personal_events.created_by = p.id 
AND personal_events.user_id IS NULL;

-- Make user_id required
ALTER TABLE public.personal_events 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Fix event_invitations table structure
ALTER TABLE public.event_invitations 
DROP CONSTRAINT IF EXISTS event_invitations_inviter_id_fkey;

ALTER TABLE public.event_invitations 
DROP CONSTRAINT IF EXISTS event_invitations_invitee_id_fkey;

-- Add user_id columns for inviter and invitee
ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS inviter_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.event_invitations 
ADD COLUMN IF NOT EXISTS invitee_user_id uuid REFERENCES auth.users(id);

-- Update existing records
UPDATE public.event_invitations 
SET inviter_user_id = p.user_id 
FROM public.profiles p 
WHERE event_invitations.inviter_id = p.id 
AND event_invitations.inviter_user_id IS NULL;

UPDATE public.event_invitations 
SET invitee_user_id = p.user_id 
FROM public.profiles p 
WHERE event_invitations.invitee_id = p.id 
AND event_invitations.invitee_user_id IS NULL;

-- Make user_id columns required (only if they have data)
UPDATE public.event_invitations 
SET inviter_user_id = (SELECT user_id FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000'::uuid LIMIT 1)
WHERE inviter_user_id IS NULL;

UPDATE public.event_invitations 
SET invitee_user_id = (SELECT user_id FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000'::uuid LIMIT 1)
WHERE invitee_user_id IS NULL;

-- 3. Fix event_participants table
ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS participant_user_id uuid REFERENCES auth.users(id);

-- Update existing records
UPDATE public.event_participants 
SET participant_user_id = p.user_id 
FROM public.profiles p 
WHERE event_participants.user_id = p.id 
AND event_participants.participant_user_id IS NULL;

-- Update user_id to be auth user_id directly
UPDATE public.event_participants 
SET user_id = participant_user_id 
WHERE participant_user_id IS NOT NULL;