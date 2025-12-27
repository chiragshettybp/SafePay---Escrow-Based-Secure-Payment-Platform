-- Fix handle_new_user trigger to always write phone into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    full_name,
    phone,
    account_source,
    account_claimed,
    auth_provider,
    phone_verified
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data ->> 'account_source', 'direct_signup'),
    COALESCE((NEW.raw_user_meta_data ->> 'account_claimed')::boolean, 
             CASE WHEN NEW.raw_user_meta_data ->> 'account_source' = 'payment_link' THEN false ELSE true END),
    COALESCE(NEW.raw_user_meta_data ->> 'auth_provider', 
             CASE WHEN NEW.phone IS NOT NULL THEN 'phone' ELSE 'email' END),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    account_source = COALESCE(EXCLUDED.account_source, public.profiles.account_source),
    account_claimed = COALESCE(EXCLUDED.account_claimed, public.profiles.account_claimed),
    auth_provider = COALESCE(EXCLUDED.auth_provider, public.profiles.auth_provider),
    phone_verified = COALESCE(EXCLUDED.phone_verified, public.profiles.phone_verified),
    updated_at = now();
  
  -- Add customer role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();