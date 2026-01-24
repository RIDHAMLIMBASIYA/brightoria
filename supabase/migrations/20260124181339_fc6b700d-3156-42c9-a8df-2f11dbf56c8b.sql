-- Make profiles_public view access intent explicit.
-- NOTE: Views don't support RLS. Instead we control access via GRANT/REVOKE and ensure the view is owned
-- by a privileged role so it can safely expose only non-sensitive columns.

-- Recreate the view to ensure it only exposes safe, public fields
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  p.user_id,
  p.created_at,
  p.updated_at,
  p.name,
  p.avatar_url
FROM public.profiles p;

-- Ensure it does NOT run with invoker rights (so it can be used safely even if underlying table has strict RLS)
ALTER VIEW public.profiles_public SET (security_invoker = false);

-- Ensure a stable owner (view owner privileges determine whether underlying RLS is applied)
ALTER VIEW public.profiles_public OWNER TO postgres;

-- Make access explicit: only allow reading; no accidental broader privileges
REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
