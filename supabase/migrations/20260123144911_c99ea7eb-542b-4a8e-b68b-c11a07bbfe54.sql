-- Tighten UPDATE authorization on assignment_submissions so teachers can only grade submissions for their own courses.

DROP POLICY IF EXISTS "Teachers can update submissions" ON public.assignment_submissions;

CREATE POLICY "Teachers can update submissions for their courses"
ON public.assignment_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id
      AND (
        c.teacher_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id
      AND (
        c.teacher_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);
