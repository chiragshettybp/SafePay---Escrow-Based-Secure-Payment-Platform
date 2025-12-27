-- Drop the problematic trigger that references email column which no longer exists
DROP TRIGGER IF EXISTS validate_profile_contact_trigger ON public.profiles;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.validate_profile_contact();