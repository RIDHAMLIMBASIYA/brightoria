import { mockQuizzes, mockCourses } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, HelpCircle, Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DbQuiz = {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  questionsCount: number;
  course: { id: string; title: string; category: string } | null;
};

type QuizCardItem = {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  questionsCount: number;
  courseId: string;
  course?: { title: string; category: string };
  source: 'db' | 'mock';
};

export default function Quizzes() {
  const {
    data: dbData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['quizzes', 'db'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('quizzes-list');
      if (error) throw error;
      return (data ?? {}) as { quizzes?: DbQuiz[] };
    },
  });

  const quizzesWithCourse = useMemo<QuizCardItem[]>(() => {
    const mock = mockQuizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      duration: quiz.duration,
      totalMarks: quiz.totalMarks,
      questionsCount: quiz.questionsCount,
      courseId: quiz.courseId,
      course: (() => {
        const c = mockCourses.find((x) => x.id === quiz.courseId);
        return c ? { title: c.title, category: c.category } : undefined;
      })(),
      source: 'mock' as const,
    }));

    const db = (dbData?.quizzes ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      duration: q.duration,
      totalMarks: q.totalMarks,
      questionsCount: q.questionsCount,
      courseId: q.course?.id ?? q.id,
      course: q.course ? { title: q.course.title, category: q.course.category } : undefined,
      source: 'db' as const,
    }));

    // Merge (DB first), then hide quizzes with 0 questions (per requested behavior)
    return [...db, ...mock].filter((q) => (q.questionsCount ?? 0) > 0);
  }, [dbData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Quizzes 📝
        </h1>
        <p className="text-muted-foreground mt-1">
          Test your knowledge and track your progress
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
              <Skeleton className="h-14 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Couldn’t load quizzes</h3>
          <p className="text-muted-foreground max-w-sm">Please try again in a moment.</p>
        </div>
      ) : quizzesWithCourse.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">No quizzes yet</h3>
          <p className="text-muted-foreground max-w-sm">When quizzes have questions added, you’ll see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzesWithCourse.map((quiz, index) => (
            <div
              key={quiz.id}
              className={`bg-card rounded-xl border border-border overflow-hidden hover-lift animate-slide-up stagger-${(index % 5) + 1}`}
            >
              <div className="hero-gradient p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    {quiz.course?.category || 'General'}
                  </Badge>
                  <div className="flex items-center gap-1 text-primary-foreground/80 text-sm">
                    <HelpCircle className="w-4 h-4" />
                    {quiz.questionsCount} Qs
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display font-semibold text-lg mb-2">{quiz.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {quiz.course?.title || 'Unknown Course'}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {quiz.totalMarks} marks
                  </span>
                </div>

                <Link to={`/quizzes/${quiz.id}`}>
                  <Button className="w-full gap-2">
                    Start Quiz
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
