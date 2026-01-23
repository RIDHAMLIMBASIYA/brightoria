-- Allow admins to manage user roles (required for Admin → User Management)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT: admins can see all roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles"
    ON public.user_roles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  -- INSERT: admins can assign roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can insert roles'
  ) THEN
    CREATE POLICY "Admins can insert roles"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  -- UPDATE: admins can change roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can update roles'
  ) THEN
    CREATE POLICY "Admins can update roles"
    ON public.user_roles
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  -- DELETE: admins can remove role rows (rare but useful)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND policyname = 'Admins can delete roles'
  ) THEN
    CREATE POLICY "Admins can delete roles"
    ON public.user_roles
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
