-- =============================
-- Fix WARN findings (backend)
-- 1) uploads bucket policy overly permissive
-- 2) signup role assignment validation (prevent admin escalation)
-- =============================

-- ----------
-- 1) Storage: tighten uploads read policy
-- Note: We keep access via signed URLs through the existing backend function.
-- ----------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='storage'
      AND tablename='objects'
      AND policyname='Uploads readable by owner/teacher/admin'
  ) THEN
    DROP POLICY "Uploads readable by owner/teacher/admin" ON storage.objects;
  END IF;
END $$;

-- Owner can read their own folder; admins can read all. Teachers must use signed URLs.
CREATE POLICY "Uploads readable by owner/admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- ----------
-- 2) Auth trigger: validate role from user metadata
-- Prevent role escalation to admin (and any unexpected enum).
-- Allows only 'student' or 'teacher' from metadata; otherwise defaults to 'student'.
-- ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  INSERT INTO public.profiles (user_id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN requested_role IN ('student','teacher') THEN requested_role::app_role
      ELSE 'student'::app_role
    END
  );

  RETURN NEW;
END;
$$;
