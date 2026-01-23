import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Course } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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
            supabase.from('enrollments').select('course_id'),
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

        if (!cancelled) setCourses(mapped);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? 'Failed to load courses');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
              <CourseCard course={course} />
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
