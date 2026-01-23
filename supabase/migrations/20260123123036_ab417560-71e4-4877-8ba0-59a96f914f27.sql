-- SECURITY FIXES (error-level findings)

-- 1) profiles: prevent anonymous access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view all profiles'
  ) THEN
    DROP POLICY "Users can view all profiles" ON public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Authenticated users can view profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;


-- 2) quiz_questions: hide correct_answer from students by restricting SELECT on base table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='quiz_questions' AND policyname='Anyone can view quiz questions '
  ) THEN
    DROP POLICY "Anyone can view quiz questions " ON public.quiz_questions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='quiz_questions' AND policyname='Teachers/admins can view quiz questions'
  ) THEN
    CREATE POLICY "Teachers/admins can view quiz questions"
    ON public.quiz_questions
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'teacher'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;


-- 3) uploads bucket: make private + add authenticated-only policies
UPDATE storage.buckets
SET public = false
WHERE id = 'uploads';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can view uploads'
  ) THEN
    DROP POLICY "Anyone can view uploads" ON storage.objects;
  END IF;

  -- Users can read their own uploads; teachers/admins can read any uploads (for course operations)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Uploads readable by owner/teacher/admin'
  ) THEN
    CREATE POLICY "Uploads readable by owner/teacher/admin"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.has_role(auth.uid(), 'teacher'::public.app_role)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    );
  END IF;

  -- Upload (insert) limited to own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload to own folder'
  ) THEN
    CREATE POLICY "Users can upload to own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Update limited to owner (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update own uploads'
  ) THEN
    CREATE POLICY "Users can update own uploads"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Delete limited to owner (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete own uploads'
  ) THEN
    CREATE POLICY "Users can delete own uploads"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
