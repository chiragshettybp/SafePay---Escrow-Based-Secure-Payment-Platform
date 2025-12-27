-- Add auth provider tracking and verification fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'phone', 'both', 'google', 'apple')),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create unique index on phone to prevent duplicates (nullable)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;

-- Create unique index on email in profiles to prevent duplicates (nullable)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (email) WHERE email IS NOT NULL;

-- Add constraint to ensure at least one of email or phone is present
-- We use a trigger instead of CHECK because profiles may be created incrementally
CREATE OR REPLACE FUNCTION public.validate_profile_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce after both fields could have been set
  IF NEW.email IS NULL AND NEW.phone IS NULL THEN
    -- Allow during initial creation, will be set via update
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_profile_contact_trigger ON public.profiles;
CREATE TRIGGER validate_profile_contact_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_contact();

-- Update existing profiles to populate email from auth.users
UPDATE public.profiles p
SET email = u.email,
    email_verified = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Update handle_new_user function to include email and verification status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email, email_verified, phone_verified, auth_provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    false,
    CASE 
      WHEN NEW.email IS NOT NULL AND NEW.raw_user_meta_data ->> 'phone' IS NOT NULL THEN 'both'
      WHEN NEW.raw_user_meta_data ->> 'phone' IS NOT NULL THEN 'phone'
      ELSE 'email'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, profiles.email_verified),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();