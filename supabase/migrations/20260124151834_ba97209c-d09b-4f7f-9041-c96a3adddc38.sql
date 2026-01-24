-- Add extended profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS school_college text,
  ADD COLUMN IF NOT EXISTS strong_subject text,
  ADD COLUMN IF NOT EXISTS weak_subject text,
  ADD COLUMN IF NOT EXISTS hobbies text[],
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS qualification text;

-- Basic integrity (immutable checks only)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_experience_years_non_negative,
  ADD CONSTRAINT profiles_experience_years_non_negative CHECK (experience_years IS NULL OR experience_years >= 0);

-- Ensure users can create their own profile row if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;