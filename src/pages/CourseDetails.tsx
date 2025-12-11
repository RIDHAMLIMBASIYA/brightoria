import { useParams, Link } from 'react-router-dom';
import { mockCourses, mockLessons, mockAssignments, mockQuizzes, mockNotes } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Video, 
  FileText, 
  ClipboardList, 
  Users, 
  Clock,
  Play,
  Download,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CourseDetails() {
  const { courseId } = useParams();
  const course = mockCourses.find(c => c.id === courseId);
  const lessons = mockLessons.filter(l => l.courseId === courseId);
  const assignments = mockAssignments.filter(a => a.courseId === courseId);
  const quizzes = mockQuizzes.filter(q => q.courseId === courseId);
  const notes = mockNotes.filter(n => n.courseId === courseId);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="font-display text-xl font-semibold mb-2">Course not found</h2>
        <Link to="/courses">
          <Button>Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link to="/courses">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Button>
      </Link>

      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200'}
            alt={course.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-transparent" />
        </div>
        
        <div className="relative z-10 p-6 md:p-10 pt-32 md:pt-40">
          <Badge variant="accent" className="mb-4">{course.category}</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            {course.title}
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mb-6">
            {course.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/70">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {course.enrolledCount} students
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {lessons.length} lessons
            </span>
            <span className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              {quizzes.length} quizzes
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {assignments.length} assignments
            </span>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="lessons" className="space-y-6">
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          <TabsTrigger value="lessons" className="gap-2">
            <Video className="w-4 h-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="w-4 h-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          {lessons.length > 0 ? lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className={cn(
                'bg-card rounded-xl border border-border p-5 hover-lift animate-slide-up',
                `stagger-${(index % 5) + 1}`
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  lesson.resourceType === 'video' ? 'hero-gradient' : 'bg-secondary'
                )}>
                  {lesson.resourceType === 'video' ? (
                    <Play className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-secondary-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-primary">Lesson {lesson.order}</span>
                    <Badge variant="outline" className="text-xs">
                      {lesson.resourceType}
                    </Badge>
                  </div>
                  <h3 className="font-semibold">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{lesson.content}</p>
                </div>

                {lesson.duration && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {lesson.duration} min
                  </span>
                )}

                <Button variant="outline" size="sm">
                  {lesson.resourceType === 'video' ? 'Watch' : 'View'}
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-muted-foreground">
              No lessons available yet
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">{notes.length} notes available</p>
            <Link to="/ai-tutor">
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat with Notes
              </Button>
            </Link>
          </div>

          {notes.length > 0 ? notes.map((note, index) => (
            <div
              key={note.id}
              className={cn(
                'bg-card rounded-xl border border-border p-5 hover-lift animate-slide-up',
                `stagger-${(index % 5) + 1}`
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{note.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{note.fileType.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-muted-foreground">
              No notes available yet
            </div>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {assignments.length > 0 ? assignments.map((assignment, index) => (
            <div
              key={assignment.id}
              className={cn(
                'bg-card rounded-xl border border-border p-5 hover-lift animate-slide-up',
                `stagger-${(index % 5) + 1}`
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={assignment.status === 'open' ? 'success' : 'secondary'}>
                    {assignment.status}
                  </Badge>
                  <Button size="sm">Submit</Button>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-muted-foreground">
              No assignments available yet
            </div>
          )}
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          {quizzes.length > 0 ? quizzes.map((quiz, index) => (
            <div
              key={quiz.id}
              className={cn(
                'bg-card rounded-xl border border-border p-5 hover-lift animate-slide-up',
                `stagger-${(index % 5) + 1}`
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{quiz.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{quiz.questionsCount} questions</span>
                    <span>{quiz.duration} minutes</span>
                    <span>{quiz.totalMarks} marks</span>
                  </div>
                </div>
                <Link to={`/quizzes/${quiz.id}`}>
                  <Button>Start Quiz</Button>
                </Link>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 text-muted-foreground">
              No quizzes available yet
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
