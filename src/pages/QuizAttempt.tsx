import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockQuizzes, mockQuizQuestions } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function QuizAttempt() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const quiz = mockQuizzes.find(q => q.id === quizId);
  const questions = mockQuizQuestions.filter(q => q.quizId === quizId);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!quiz || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="font-display text-xl font-semibold mb-2">Quiz not found</h2>
        <Button onClick={() => navigate('/quizzes')}>Back to Quizzes</Button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [question.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const correctAnswers = questions.reduce((acc, q) => {
      if (answers[q.id] === q.correctAnswer) {
        return acc + q.marks;
      }
      return acc;
    }, 0);

    setScore(correctAnswers);
    setIsSubmitted(true);
    toast.success('Quiz submitted successfully!');
  };

  if (isSubmitted) {
    const percentage = (score / quiz.totalMarks) * 100;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className={cn(
            'w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center',
            percentage >= 70 ? 'bg-success/20' : percentage >= 50 ? 'bg-warning/20' : 'bg-destructive/20'
          )}>
            <Trophy className={cn(
              'w-10 h-10',
              percentage >= 70 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-destructive'
            )} />
          </div>
          
          <h2 className="font-display text-2xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-muted-foreground mb-6">{quiz.title}</p>
          
          <div className="text-5xl font-display font-bold mb-2">
            {score} / {quiz.totalMarks}
          </div>
          <Badge 
            variant={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'destructive'}
            className="text-lg px-4 py-1"
          >
            {percentage.toFixed(0)}%
          </Badge>

          <div className="mt-8 space-y-4">
            <h3 className="font-semibold">Question Review</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const isCorrect = answers[q.id] === q.correctAnswer;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center font-medium text-sm transition-all',
                      isCorrect
                        ? 'bg-success/20 text-success border-2 border-success'
                        : 'bg-destructive/20 text-destructive border-2 border-destructive'
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/quizzes')}>
              Back to Quizzes
            </Button>
            <Button onClick={() => {
              setIsSubmitted(false);
              setAnswers({});
              setCurrentQuestion(0);
            }}>
              Retry Quiz
            </Button>
          </div>
        </div>

        {/* Review Question */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Question {currentQuestion + 1}</span>
            {answers[question.id] === question.correctAnswer ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="w-3 h-3" /> Correct
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Incorrect
              </Badge>
            )}
          </div>
          <p className="font-medium text-lg mb-4">{question.questionText}</p>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  index === question.correctAnswer
                    ? 'border-success bg-success/10'
                    : answers[question.id] === index
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    index === question.correctAnswer
                      ? 'bg-success text-success-foreground'
                      : answers[question.id] === index
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  {index === question.correctAnswer && (
                    <CheckCircle className="w-5 h-5 text-success ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-xl font-bold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {quiz.duration} min
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </Badge>
        </div>
        
        <p className="font-medium text-lg mb-6">{question.questionText}</p>

        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              className={cn(
                'w-full p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                answers[question.id] === index
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  answers[question.id] === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-medium">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                currentQuestion === index
                  ? 'bg-primary text-primary-foreground'
                  : answers[questions[index].id] !== undefined
                  ? 'bg-success/20 text-success'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestion === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            className="gap-2"
          >
            Submit Quiz
            <CheckCircle className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleNext} className="gap-2">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
