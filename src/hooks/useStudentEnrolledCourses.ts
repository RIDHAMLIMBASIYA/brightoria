import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Course } from '@/types';

type PublicProfile = {
  user_id: string;
  name: string | null;
};

/**
 * Returns the logged-in student's enrolled courses (data-only, not mock).
 */
export function useStudentEnrolledCourses(studentId?: string) {
  return useQuery({
    queryKey: ['student-enrolled-courses', studentId],
    enabled: Boolean(studentId),
    queryFn: async (): Promise<Course[]> => {
      if (!studentId) return [];

      const { data: enrollmentRows, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId);
      if (enrollmentError) throw enrollmentError;

      const courseIds = Array.from(new Set((enrollmentRows ?? []).map((r: any) => String(r.course_id))));
      if (courseIds.length === 0) return [];

      const { data: coursesRows, error: coursesError } = await supabase
        .from('courses')
        .select('id, teacher_id, title, description, category, thumbnail_url, created_at')
        .in('id', courseIds)
        .order('created_at', { ascending: false });
      if (coursesError) throw coursesError;

      const teacherIds = Array.from(new Set((coursesRows ?? []).map((c: any) => String(c.teacher_id))));

      const [{ data: profilesRows }, { data: lessonsRows }, { data: enrollmentsAllRows }] = await Promise.all([
        teacherIds.length
          ? supabase.from('profiles_public').select('user_id,name').in('user_id', teacherIds)
          : Promise.resolve({ data: [] as PublicProfile[] }),
        supabase.from('lessons').select('course_id').in('course_id', courseIds),
        supabase.from('enrollments').select('course_id').in('course_id', courseIds),
      ]);

      const teacherNameById = new Map<string, string>(
        (profilesRows ?? []).map((p: any) => [String(p.user_id), String(p.name ?? '').trim()] as const)
      );

      const lessonsCountByCourseId = new Map<string, number>();
      for (const row of lessonsRows ?? []) {
        const id = String((row as any).course_id);
        lessonsCountByCourseId.set(id, (lessonsCountByCourseId.get(id) ?? 0) + 1);
      }

      const enrolledCountByCourseId = new Map<string, number>();
      for (const row of enrollmentsAllRows ?? []) {
        const id = String((row as any).course_id);
        enrolledCountByCourseId.set(id, (enrolledCountByCourseId.get(id) ?? 0) + 1);
      }

      return (coursesRows ?? []).map((c: any) => ({
        id: String(c.id),
        teacherId: String(c.teacher_id),
        teacherName: teacherNameById.get(String(c.teacher_id)) || 'Teacher',
        title: String(c.title ?? ''),
        description: String(c.description ?? ''),
        category: String(c.category ?? 'General'),
        thumbnail: c.thumbnail_url ?? undefined,
        enrolledCount: enrolledCountByCourseId.get(String(c.id)) ?? 0,
        lessonsCount: lessonsCountByCourseId.get(String(c.id)) ?? 0,
        createdAt: new Date(c.created_at),
      }));
    },
  });
}
