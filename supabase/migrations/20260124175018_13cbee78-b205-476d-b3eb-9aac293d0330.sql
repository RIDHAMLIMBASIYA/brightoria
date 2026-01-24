-- Remove public access to quiz_questions (prevents leaking correct answers)
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;

-- Remove teacher SELECT access to profiles to prevent exposing phone numbers.
-- Teachers should use profiles_public (names/avatars) instead.
DROP POLICY IF EXISTS "Teachers/admins can view relevant profiles" ON public.profiles;
