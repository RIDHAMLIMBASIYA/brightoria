-- 1) Prevent students from reading quiz correct answers directly.
-- Remove the overly-permissive policy that exposes quiz_questions (including correct_answer).
DROP POLICY IF EXISTS "Anyone can view quiz questions " ON public.quiz_questions;

-- 2) Reduce exposure of phone numbers in profiles.
-- Teachers do NOT need phone numbers; they can use profiles_public for names/avatars.
DROP POLICY IF EXISTS "Teachers/admins can view relevant profiles " ON public.profiles;

-- Admins can view all profiles (including phone) for management.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can view all profiles'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admins can view all profiles"
      ON public.profiles
      FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
    $pol$;
  END IF;
END $$;
