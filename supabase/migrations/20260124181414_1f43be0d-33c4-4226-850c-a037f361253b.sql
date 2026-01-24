-- Fix linter: avoid SECURITY DEFINER behavior for profiles_public view.
-- Make the view run with the querying user's privileges so underlying RLS is enforced.

ALTER VIEW public.profiles_public SET (security_invoker = true);

-- Make access explicit (view is currently not used by the app; keep it restricted)
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM authenticated;
GRANT SELECT ON public.profiles_public TO authenticated;
