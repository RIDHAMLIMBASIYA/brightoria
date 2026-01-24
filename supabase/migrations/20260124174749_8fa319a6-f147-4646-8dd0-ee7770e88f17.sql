-- Recreate profiles_public as an invoker-security view and restrict access to authenticated users only.
-- This prevents unauthenticated scraping of user IDs, names, and avatar URLs.

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on)
AS
  SELECT
    user_id,
    created_at,
    updated_at,
    name,
    avatar_url
  FROM public.profiles;

-- Remove public access
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM authenticated;

-- Allow only logged-in users to read the public profile view
GRANT SELECT ON public.profiles_public TO authenticated;
