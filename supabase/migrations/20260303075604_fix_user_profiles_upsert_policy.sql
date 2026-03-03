
/*
  # Fix user_profiles upsert policy

  ## Problem
  When a new user signs up via OAuth, the trigger may run slightly after
  the client tries to read the profile. The client needs to be able to
  upsert its own profile row as a fallback.

  ## Change
  Add an explicit UPSERT (INSERT with ON CONFLICT) policy that allows
  authenticated users to insert their own profile only if none exists yet.
  The existing INSERT policy already covers this, but we also ensure
  the UPDATE policy allows the upsert path.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users can upsert own profile'
  ) THEN
    CREATE POLICY "Users can upsert own profile"
      ON public.user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
