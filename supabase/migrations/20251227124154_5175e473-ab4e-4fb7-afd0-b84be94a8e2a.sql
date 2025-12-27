-- Add phone_verified column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);

-- Update existing profiles with verified phones (from Supabase auth)
-- This is a one-time migration to sync with auth data
UPDATE public.profiles p
SET phone_verified = TRUE
WHERE p.phone IS NOT NULL 
AND p.account_source = 'direct_signup';