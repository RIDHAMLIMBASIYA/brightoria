import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Course } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function Courses() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const canManageEnrollment = user?.role === 'student';

  const loadCourses = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: coursesRows, error: coursesError } = await supabase
        .from('courses')
        .select('id, teacher_id, title, description, category, thumbnail_url, created_at')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      const teacherIds = Array.from(new Set((coursesRows ?? []).map((c) => c.teacher_id)));

      const [{ data: profilesRows }, { data: lessonsRows }, { data: enrollmentsRows }] =
        await Promise.all([
          teacherIds.length
            ? supabase.from('profiles').select('user_id, name').in('user_id', teacherIds)
            : Promise.resolve({ data: [] as { user_id: string; name: string }[] }),
          supabase.from('lessons').select('course_id'),
          // For students, RLS returns only their enrollments; for admins it returns all.
          supabase.from('enrollments').select('course_id, student_id'),
        ]);

      const teacherNameById = new Map<string, string>(
        (profilesRows ?? []).map((p: { user_id: string; name: string }) => [p.user_id, p.name])
      );

      const lessonsCountByCourseId = new Map<string, number>();
      for (const row of lessonsRows ?? []) {
        const id = (row as any).course_id as string;
        lessonsCountByCourseId.set(id, (lessonsCountByCourseId.get(id) ?? 0) + 1);
      }

      const enrolledCountByCourseId = new Map<string, number>();
      for (const row of enrollmentsRows ?? []) {
        const id = (row as any).course_id as string;
        enrolledCountByCourseId.set(id, (enrolledCountByCourseId.get(id) ?? 0) + 1);
      }

      // Student-only: build a set for status badges + enroll/unenroll UI.
      if (user?.role === 'student') {
        const own = new Set<string>();
        for (const row of enrollmentsRows ?? []) {
          const r: any = row;
          if (r.student_id === user.id) own.add(String(r.course_id));
        }
        setEnrolledCourseIds(own);
      } else {
        setEnrolledCourseIds(new Set());
      }

      const mapped: Course[] = (coursesRows ?? []).map((c: any) => ({
        id: c.id,
        teacherId: c.teacher_id,
        teacherName: teacherNameById.get(c.teacher_id) ?? 'Teacher',
        title: c.title,
        description: c.description ?? '',
        category: c.category ?? 'General',
        thumbnail: c.thumbnail_url ?? undefined,
        enrolledCount: enrolledCountByCourseId.get(c.id) ?? 0,
        lessonsCount: lessonsCountByCourseId.get(c.id) ?? 0,
        createdAt: new Date(c.created_at),
      }));

      setCourses(mapped);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const toggleEnrollment = async (courseId: string) => {
    if (!user || user.role !== 'student') return;
    if (busyCourseId) return;
    setBusyCourseId(courseId);

    try {
      const isEnrolled = enrolledCourseIds.has(courseId);

      if (isEnrolled) {
        const { error } = await supabase
          .from('enrollments')
          .delete()
          .eq('course_id', courseId)
          .eq('student_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('enrollments')
          .insert({ course_id: courseId, student_id: user.id });
        if (error) throw error;
      }

      await loadCourses();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update enrollment');
    } finally {
      setBusyCourseId(null);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category))).sort(),
    [courses]
  );
  
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            My Courses 📚
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and continue your enrolled courses
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <div className="pt-2">
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <div key={course.id} className={`animate-slide-up stagger-${(index % 5) + 1}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {canManageEnrollment ? (
                    <Badge variant={enrolledCourseIds.has(course.id) ? 'success' : 'outline'}>
                      {enrolledCourseIds.has(course.id) ? 'Enrolled' : 'Not enrolled'}
                    </Badge>
                  ) : (
                    <span />
                  )}
                </div>

                <CourseCard course={course} />

                {canManageEnrollment ? (
                  <Button
                    variant={enrolledCourseIds.has(course.id) ? 'outline' : 'default'}
                    className="w-full"
                    disabled={busyCourseId === course.id}
                    onClick={() => toggleEnrollment(course.id)}
                  >
                    {busyCourseId === course.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Please wait…
                      </>
                    ) : enrolledCourseIds.has(course.id) ? (
                      'Unenroll'
                    ) : (
                      'Enroll'
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">No courses found</h3>
          <p className="text-muted-foreground max-w-sm">
            Try adjusting your search or filter to find what you're looking for
          </p>
        </div>
      )}
    </div>
  );
}
