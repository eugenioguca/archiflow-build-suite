-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to be approved (so current users aren't blocked)
UPDATE public.profiles SET approval_status = 'approved';