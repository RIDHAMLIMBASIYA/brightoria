-- Add bio/about field for teacher profiles (nullable)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text;

-- Optional index for simple search (not required, but harmless)
-- CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin (name gin_trgm_ops);
