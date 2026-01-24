-- =============================
-- Fix WARN findings:
-- 1) assignment_submissions: prevent cross-student visibility
-- 2) profiles: stop exposing personal info to all authenticated users
-- =============================

-- ----------
-- 1) assignment_submissions SELECT policy
-- ----------
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='assignment_submissions'
      AND policyname='Students can view own submissions'
  ) THEN
    DROP POLICY "Students can view own submissions" ON public.assignment_submissions;
  END IF;
END $$;

-- Replace with stricter, role-aware policy
CREATE POLICY "Users can view appropriate assignment submissions"
ON public.assignment_submissions
FOR SELECT
TO authenticated
USING (
  -- Students: only their own
  student_id = auth.uid()
  OR
  -- Teachers: only submissions for assignments in THEIR courses
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id
      AND c.teacher_id = auth.uid()
  )
  OR
  -- Admins: all
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ----------
-- 2) profiles: protect personal info
-- ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='Authenticated users can view profiles'
  ) THEN
    DROP POLICY "Authenticated users can view profiles" ON public.profiles;
  END IF;
END $$;

-- Allow users to view their own full profile (including personal fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow teachers to view full profiles of students enrolled in their courses; admins can view all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='profiles'
      AND policyname='Teachers/admins can view relevant profiles'
  ) THEN
    CREATE POLICY "Teachers/admins can view relevant profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.enrollments e
        JOIN public.courses c ON c.id = e.course_id
        WHERE e.student_id = profiles.user_id
          AND c.teacher_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Create a safe public view for common lookups (name + avatar only)
-- This avoids exposing phone/school/university/etc to other users.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT
    user_id,
    name,
    avatar_url,
    created_at,
    updated_at
  FROM public.profiles;
