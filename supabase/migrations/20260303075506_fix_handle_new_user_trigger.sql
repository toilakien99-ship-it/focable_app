
/*
  # Fix handle_new_user trigger

  ## Problem
  The trigger function fails with "database error saving new user" because:
  1. Missing SET search_path causes the function to not find the table in the correct schema
  2. The function needs explicit schema qualification

  ## Fix
  - Recreate the function with SET search_path = '' and fully-qualified table name
  - This ensures the function always finds public.user_profiles regardless of the calling context
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
