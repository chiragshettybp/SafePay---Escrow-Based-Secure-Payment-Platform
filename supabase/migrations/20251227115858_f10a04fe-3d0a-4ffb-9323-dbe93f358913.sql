-- Revert phone authentication changes to profiles table

-- Drop the updated trigger function and recreate original
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the new columns added for phone auth
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_verified;

-- Drop the unique indexes that were created
DROP INDEX IF EXISTS profiles_phone_unique;
DROP INDEX IF EXISTS profiles_email_unique;

-- Recreate the original handle_new_user function (without phone auth logic)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  );
  RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();