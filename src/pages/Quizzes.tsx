import { mockQuizzes, mockCourses } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, HelpCircle, Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Quizzes() {
  const quizzesWithCourse = mockQuizzes.map(quiz => ({
    ...quiz,
    course: mockCourses.find(c => c.id === quiz.courseId),
  }));

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
    </div>
  );
}
