-- Allow authenticated users to read only teacher/admin roles (for public display badges)
-- Corrected migration: create policy with duplicate_object guard.

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Authenticated users can view teacher/admin roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (role IN ('teacher'::public.app_role, 'admin'::public.app_role));
  EXCEPTION
    WHEN duplicate_object THEN
      -- policy already exists
      NULL;
  END;
END $$;