-- Allow teachers to create their own pending approval record (cannot self-approve)

DROP POLICY IF EXISTS "Users can insert own pending approval" ON public.teacher_approvals;

CREATE POLICY "Users can insert own pending approval"
ON public.teacher_approvals
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND approved = false
  AND approved_at IS NULL
  AND approved_by IS NULL
);
