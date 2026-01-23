-- Tighten teacher access for quiz submissions and enrollments

-- Quiz submissions: replace overly broad SELECT policy
DROP POLICY IF EXISTS "Students can view own quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Users can view appropriate quiz submissions" ON public.quiz_submissions;

CREATE POLICY "Users can view appropriate quiz submissions"
ON public.quiz_submissions
FOR SELECT
TO authenticated
USING (
  -- Students can see their own submissions
  student_id = auth.uid()

  -- Teachers can see submissions for quizzes in courses they teach
  OR EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = quiz_submissions.quiz_id
      AND c.teacher_id = auth.uid()
  )

  -- Admins can see everything
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Enrollments: replace overly broad SELECT policy
DROP POLICY IF EXISTS "Users can view enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view appropriate enrollments" ON public.enrollments;

CREATE POLICY "Users can view appropriate enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  -- Students can see their own enrollments
  student_id = auth.uid()

  -- Teachers can see enrollments for their courses
  OR EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = enrollments.course_id
      AND c.teacher_id = auth.uid()
  )

  -- Admins can see everything
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
