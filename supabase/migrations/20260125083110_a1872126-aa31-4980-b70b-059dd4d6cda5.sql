-- Fix: reduce exposure of sensitive profile data (phone) by removing broad admin SELECT on profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can view all profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can view all profiles" ON public.profiles';
  END IF;
END $$;

-- Fix: harden profiles_public access controls
-- If profiles_public is a view, enforce invoker security and limit privileges to authenticated users.
DO $$
DECLARE
  obj_kind "char";
BEGIN
  SELECT c.relkind INTO obj_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles_public';

  -- relkind = 'v' for view, 'm' for materialized view
  IF obj_kind IN ('v','m') THEN
    EXECUTE 'ALTER VIEW public.profiles_public SET (security_invoker = true)';
  END IF;
END $$;

REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;
GRANT SELECT ON public.profiles_public TO authenticated;
