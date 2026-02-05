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
  ExternalLink,
  Loader2,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ResourcePreviewDialog } from '@/components/courses/ResourcePreviewDialog';

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v.trim());

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: string | undefined) {
  return !!value && UUID_RE.test(value);
}

type DbCourse = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

type DbLesson = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  resource_type: string;
  resource_url: string | null;
  duration: number | null;
  lesson_order: number;
};

type DbAssignment = {
  id: string;
  course_id: string;
  title: string;
  instructions: string | null;
  due_date: string;
  status: string;
  max_score: number;
};

type DbQuiz = {
  id: string;
  course_id: string;
  title: string;
  total_marks: number;
  duration: number;
};

type DbNote = {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_type: string;
  created_at: string;
};

export default function CourseDetails() {
  const { courseId } = useParams();

  const isDbCourse = isUuid(courseId);
  const [isLoading, setIsLoading] = useState(isDbCourse);

  const [dbCourse, setDbCourse] = useState<DbCourse | null>(null);
  const [dbLessons, setDbLessons] = useState<DbLesson[]>([]);
  const [dbAssignments, setDbAssignments] = useState<DbAssignment[]>([]);
  const [dbQuizzes, setDbQuizzes] = useState<Array<DbQuiz & { questionsCount: number }>>([]);
  const [dbNotes, setDbNotes] = useState<DbNote[]>([]);

  const course = useMemo(() => {
    if (!isDbCourse) return mockCourses.find((c) => c.id === courseId);
    if (!dbCourse) return null;
    return {
      id: dbCourse.id,
      teacherId: dbCourse.teacher_id,
      teacherName: 'Teacher',
      title: dbCourse.title,
      description: dbCourse.description ?? '',
      category: dbCourse.category ?? 'General',
      thumbnail: dbCourse.thumbnail_url ?? undefined,
      enrolledCount: 0,
      lessonsCount: dbLessons.length,
      createdAt: new Date(dbCourse.created_at),
    };
  }, [courseId, dbCourse, dbLessons.length, isDbCourse]);

  const lessons = useMemo(() => {
    if (!isDbCourse) return mockLessons.filter((l) => l.courseId === courseId);
    return dbLessons.map((l) => ({
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      content: l.content ?? '',
      resourceType: (l.resource_type as any) ?? 'text',
      resourceLink: l.resource_url ?? undefined,
      duration: l.duration ?? undefined,
      order: l.lesson_order ?? 1,
    }));
  }, [courseId, dbLessons, isDbCourse]);

  const assignments = useMemo(() => {
    if (!isDbCourse) return mockAssignments.filter((a) => a.courseId === courseId);
    return dbAssignments.map((a) => ({
      id: a.id,
      courseId: a.course_id,
      title: a.title,
      instructions: a.instructions ?? '',
      dueDate: new Date(a.due_date),
      status: (a.status as any) ?? 'open',
      maxScore: a.max_score ?? 100,
    }));
  }, [courseId, dbAssignments, isDbCourse]);

  const quizzes = useMemo(() => {
    if (!isDbCourse) return mockQuizzes.filter((q) => q.courseId === courseId);
    return dbQuizzes.map((q) => ({
      id: q.id,
      courseId: q.course_id,
      title: q.title,
      totalMarks: q.total_marks,
      duration: q.duration,
      questionsCount: q.questionsCount,
    }));
  }, [courseId, dbQuizzes, isDbCourse]);

  const notes = useMemo(() => {
    if (!isDbCourse) return mockNotes.filter((n) => n.courseId === courseId);
    return dbNotes.map((n) => ({
      id: n.id,
      courseId: n.course_id,
      title: n.title,
      content: n.content ?? '',
      fileUrl: n.file_url ?? undefined,
      fileType: (n.file_type as any) ?? 'text',
      createdAt: new Date(n.created_at),
    }));
  }, [courseId, dbNotes, isDbCourse]);

  const [tab, setTab] = useState<'lessons' | 'notes' | 'assignments' | 'quizzes'>('lessons');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'video' | 'link'>('link');
  const [previewUrlOrPath, setPreviewUrlOrPath] = useState<string>('');

  const [busyDownloadNoteId, setBusyDownloadNoteId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(() => new Set());

  const openPreview = (opts: { title: string; type: 'pdf' | 'image' | 'video' | 'link'; urlOrPath: string }) => {
    setPreviewTitle(opts.title);
    setPreviewType(opts.type);
    setPreviewUrlOrPath(opts.urlOrPath);
    setPreviewOpen(true);
  };

  const resolveResourceUrl = async (urlOrPath: string) => {
    const raw = (urlOrPath ?? '').trim();
    if (!raw) throw new Error('Missing file');
    if (isHttpUrl(raw)) return raw;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-upload-signed-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: raw }),
    });

    const json = (await res.json().catch(() => null)) as { signedUrl?: string; error?: string } | null;
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    if (!json?.signedUrl) throw new Error('No download URL returned');
    return json.signedUrl;
  };

  const downloadNoteFile = async (note: { id: string; title: string; fileType: string; fileUrl?: string }) => {
    if (!note.fileUrl) return;
    if (busyDownloadNoteId) return;
    setBusyDownloadNoteId(note.id);

    try {
      const signedUrl = await resolveResourceUrl(note.fileUrl);

      const ext =
        note.fileType?.toLowerCase() === 'pdf'
          ? 'pdf'
          : note.fileType?.toLowerCase() === 'image'
          ? 'png'
          : 'file';

      const safeBase = (note.title || 'note').replace(/[^a-z0-9\-_. ]/gi, '').trim() || 'note';
      const filename = safeBase.toLowerCase().endsWith(`.${ext}`) ? safeBase : `${safeBase}.${ext}`;

      const res = await fetch(signedUrl, { credentials: 'omit' });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 250);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to download file');
    } finally {
      setBusyDownloadNoteId(null);
    }
  };

  const firstLesson = useMemo(() => lessons[0], [lessons]);
  const firstQuiz = useMemo(() => quizzes[0], [quizzes]);

  useEffect(() => {
    let cancelled = false;

    const loadDb = async () => {
      if (!isDbCourse || !courseId) return;
      setIsLoading(true);
      try {
        const { data: cRow, error: cErr } = await supabase
          .from('courses')
          .select('id, teacher_id, title, description, category, thumbnail_url, created_at')
          .eq('id', courseId)
          .maybeSingle();
        if (cErr) throw cErr;
        if (!cRow) throw new Error('Course not found');

        const [lessonsRes, assignmentsRes, quizzesRes, notesRes] = await Promise.all([
          supabase
            .from('lessons')
            .select('id, course_id, title, content, resource_type, resource_url, duration, lesson_order')
            .eq('course_id', courseId)
            .order('lesson_order', { ascending: true }),
          supabase
            .from('assignments')
            .select('id, course_id, title, instructions, due_date, status, max_score')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false }),
          supabase
            .from('quizzes')
            .select('id, course_id, title, total_marks, duration, created_at')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false }),
          supabase
            .from('notes')
            .select('id, course_id, title, content, file_url, file_type, created_at')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false }),
        ]);

        if (lessonsRes.error) throw lessonsRes.error;
        if (assignmentsRes.error) throw assignmentsRes.error;
        if (quizzesRes.error) throw quizzesRes.error;
        if (notesRes.error) throw notesRes.error;

        const quizRows = (quizzesRes.data ?? []) as DbQuiz[];
        const quizIds = quizRows.map((q) => q.id);
        let counts = new Map<string, number>();
        if (quizIds.length > 0) {
          const { data: qq, error: qqErr } = await supabase.from('quiz_questions').select('quiz_id').in('quiz_id', quizIds);
          if (qqErr) {
            // Students can't select quiz_questions directly; counts will be 0 (and quizzes will still show).
            counts = new Map();
          } else {
            for (const row of qq ?? []) {
              const id = (row as any).quiz_id as string;
              counts.set(id, (counts.get(id) ?? 0) + 1);
            }
          }
        }

        if (cancelled) return;
        setDbCourse(cRow as any);
        setDbLessons((lessonsRes.data ?? []) as any);
        setDbAssignments((assignmentsRes.data ?? []) as any);
        setDbNotes((notesRes.data ?? []) as any);
        setDbQuizzes(
          quizRows.map((q) => ({
            ...q,
            questionsCount: counts.get(q.id) ?? 0,
          }))
        );
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to load course details');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDb();
    return () => {
      cancelled = true;
    };
  }, [courseId, isDbCourse]);

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
    <div className="space-y-6 animate-fade-in pb-24 md:pb-0">
      <ResourcePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        type={previewType}
        urlOrPath={previewUrlOrPath}
      />

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
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList
          className={cn(
            "w-full justify-start bg-muted/50 p-1",
            "flex flex-nowrap h-auto overflow-x-auto",
            "snap-x snap-mandatory"
          )}
        >
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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading lessons…</div>
          ) : lessons.length > 0 ? (
            lessons.map((lesson, index) => (
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = (lesson.resourceLink ?? '').trim();
                    if (!url) {
                      toast.message('No resource attached for this lesson');
                      return;
                    }
                    const t = (lesson.resourceType as any) as 'video' | 'pdf' | 'text' | 'image';
                    const preview: any =
                      t === 'pdf'
                        ? 'pdf'
                        : t === 'image'
                        ? 'image'
                        : t === 'video'
                        ? 'video'
                        : 'link';
                    openPreview({ title: lesson.title, type: preview, urlOrPath: url });
                  }}
                >
                  {lesson.resourceType === 'video' ? 'Watch' : 'Open'}
                </Button>
              </div>
            </div>
            ))
          ) : (
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

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading notes…</div>
          ) : notes.length > 0 ? notes.map((note, index) => (
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
                  {note.content ? (
                    <div className="mt-2">
                      <p className={cn('text-sm text-muted-foreground', expandedNoteIds.has(note.id) ? '' : 'line-clamp-2')}>
                        {note.content}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                        onClick={() => {
                          setExpandedNoteIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(note.id)) next.delete(note.id);
                            else next.add(note.id);
                            return next;
                          });
                        }}
                      >
                        {expandedNoteIds.has(note.id) ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{note.fileType.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {note.fileUrl ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const fileType = (note.fileType ?? 'text').toLowerCase();
                        const t: any = fileType === 'pdf' ? 'pdf' : fileType === 'image' ? 'image' : 'link';
                        openPreview({ title: note.title, type: t, urlOrPath: note.fileUrl! });
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={busyDownloadNoteId === note.id}
                      onClick={() => downloadNoteFile({ id: note.id, title: note.title, fileType: note.fileType, fileUrl: note.fileUrl })}
                    >
                      {busyDownloadNoteId === note.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    No file
                  </Button>
                )}
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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading assignments…</div>
          ) : assignments.length > 0 ? assignments.map((assignment, index) => (
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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading quizzes…</div>
          ) : quizzes.length > 0 ? quizzes.map((quiz, index) => (
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

      {/* Sticky mobile action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="border-t border-border bg-background/90 backdrop-blur-xl">
          <div className="p-3 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setTab('lessons')}
              disabled={!firstLesson}
            >
              Continue Lesson
            </Button>
            {firstQuiz ? (
              <Link to={`/quizzes/${firstQuiz.id}`} className="flex-1">
                <Button className="w-full">Start Quiz</Button>
              </Link>
            ) : (
              <Button className="flex-1" disabled>
                Start Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
