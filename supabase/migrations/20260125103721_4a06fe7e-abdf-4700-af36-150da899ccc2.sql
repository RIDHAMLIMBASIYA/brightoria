-- Live classes

-- 1) Enum for status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_class_status') THEN
    CREATE TYPE public.live_class_status AS ENUM ('scheduled', 'live', 'ended');
  END IF;
END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS public.live_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  meeting_url text NOT NULL,
  status public.live_class_status NOT NULL DEFAULT 'live',
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,

  CONSTRAINT live_classes_title_len CHECK (char_length(title) BETWEEN 1 AND 140),
  CONSTRAINT live_classes_url_len CHECK (char_length(meeting_url) BETWEEN 10 AND 2000),
  CONSTRAINT live_classes_url_http CHECK (meeting_url ~* '^https?://')
);

-- 3) RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can view ("all students can see")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'Authenticated users can view live classes'
  ) THEN
    CREATE POLICY "Authenticated users can view live classes"
    ON public.live_classes
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Teachers/Admins can create
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'Teachers/admins can create live classes'
  ) THEN
    CREATE POLICY "Teachers/admins can create live classes"
    ON public.live_classes
    FOR INSERT
    WITH CHECK (
      auth.uid() = created_by
      AND (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
    );
  END IF;
END $$;

-- Creator or admin can update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'Creators/admins can update live classes'
  ) THEN
    CREATE POLICY "Creators/admins can update live classes"
    ON public.live_classes
    FOR UPDATE
    USING (
      auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    WITH CHECK (
      auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

-- Creator or admin can delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'Creators/admins can delete live classes'
  ) THEN
    CREATE POLICY "Creators/admins can delete live classes"
    ON public.live_classes
    FOR DELETE
    USING (
      auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

-- 4) updated_at trigger function (create if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_classes_updated_at ON public.live_classes;
CREATE TRIGGER trg_live_classes_updated_at
BEFORE UPDATE ON public.live_classes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_live_classes_status_created_at ON public.live_classes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_classes_created_by ON public.live_classes (created_by);