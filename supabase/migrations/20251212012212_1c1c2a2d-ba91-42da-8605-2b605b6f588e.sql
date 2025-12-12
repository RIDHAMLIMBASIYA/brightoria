-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles enum and table
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  resource_type TEXT NOT NULL DEFAULT 'text',
  resource_url TEXT,
  duration INTEGER,
  lesson_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT,
  filename TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  grade INTEGER,
  feedback TEXT,
  UNIQUE (assignment_id, student_id)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 10,
  duration INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL DEFAULT 0,
  marks INTEGER NOT NULL DEFAULT 1,
  question_order INTEGER NOT NULL DEFAULT 1
);

-- Create quiz_submissions table
CREATE TABLE public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (quiz_id, student_id)
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (course_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create handle_new_user function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for courses
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can update own courses" ON public.courses FOR UPDATE TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can delete own courses" ON public.courses FOR DELETE TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage lessons" ON public.lessons FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for notes
CREATE POLICY "Anyone can view notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage notes" ON public.notes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for assignments
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage assignments" ON public.assignments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can view own submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create submissions" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Teachers can update submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quizzes
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage quizzes" ON public.quizzes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for quiz_questions
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage quiz questions" ON public.quiz_questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON q.course_id = c.id WHERE q.id = quiz_id AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- RLS Policies for quiz_submissions
CREATE POLICY "Students can view own quiz submissions" ON public.quiz_submissions FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can create quiz submissions" ON public.quiz_submissions FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- RLS Policies for enrollments
CREATE POLICY "Users can view enrollments" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can unenroll" ON public.enrollments FOR DELETE TO authenticated USING (student_id = auth.uid());

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);