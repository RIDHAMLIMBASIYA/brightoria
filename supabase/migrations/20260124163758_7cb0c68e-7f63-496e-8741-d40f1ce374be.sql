-- Teacher approval gating (retry without CREATE POLICY IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.teacher_approvals (
  user_id uuid PRIMARY KEY,
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own approval" ON public.teacher_approvals;
DROP POLICY IF EXISTS "Admins can view all teacher approvals" ON public.teacher_approvals;
DROP POLICY IF EXISTS "Admins can insert teacher approvals" ON public.teacher_approvals;
DROP POLICY IF EXISTS "Admins can update teacher approvals" ON public.teacher_approvals;

-- Teachers can see their own approval status
CREATE POLICY "Teachers can view own approval"
ON public.teacher_approvals
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all approvals
CREATE POLICY "Admins can view all teacher approvals"
ON public.teacher_approvals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can insert approvals
CREATE POLICY "Admins can insert teacher approvals"
ON public.teacher_approvals
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can update approvals
CREATE POLICY "Admins can update teacher approvals"
ON public.teacher_approvals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_teacher_approvals_approved
ON public.teacher_approvals (approved);

CREATE INDEX IF NOT EXISTS idx_teacher_approvals_user_id
ON public.teacher_approvals (user_id);
