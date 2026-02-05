import { useAuth } from '@/contexts/AuthContext';
import { mockAssignments, mockQuizzes } from '@/data/mockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import type { LiveClassRow } from '@/components/live-classes/types';
import brightoriaLogo from '@/assets/brightoria-logo.png';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Brain, Trophy, Calendar, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useStudentEnrolledCourses } from '@/hooks/useStudentEnrolledCourses';

type PublicProfile = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

type CreatorRole = 'teacher' | 'admin';

type ApprovalRow = { user_id: string; approved: boolean };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || 'U';
}

export function StudentDashboard() {
  const { user } = useAuth();

  const { data: enrolledCourses = [], isLoading: isLoadingCourses } = useStudentEnrolledCourses(user?.id);
  const enrolledPreview = enrolledCourses.slice(0, 4);

  const upcomingAssignments = mockAssignments.filter(a => a.status === 'open').slice(0, 3);
  const recentQuizzes = mockQuizzes.slice(0, 2);

  const { data: liveClasses = [] } = useQuery({
    queryKey: ['student-live-classes-live-only'],
    queryFn: async (): Promise<LiveClassRow[]> => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data ?? []) as LiveClassRow[];
    },
  });

  const creatorIds = useMemo(() => {
    return Array.from(new Set(liveClasses.map((c) => c.created_by))).filter(Boolean);
  }, [liveClasses]);

  const { data: creatorsById = new Map<string, PublicProfile>() } = useQuery({
    queryKey: ['student-live-class-creators', creatorIds.join(',')],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id,name,avatar_url')
        .in('user_id', creatorIds);
      if (error) throw error;
      const rows = (data ?? []) as PublicProfile[];
      return new Map(rows.map((p) => [p.user_id, p] as const));
    },
  });

  const { data: creatorRolesById = new Map<string, CreatorRole>() } = useQuery({
    queryKey: ['student-live-class-creator-roles', creatorIds.join(',')],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id,role')
        .in('user_id', creatorIds)
        .in('role', ['teacher', 'admin']);

      if (error) throw error;

      const rows = (data ?? []) as { user_id: string; role: CreatorRole }[];
      const map = new Map<string, CreatorRole>();
      for (const r of rows) {
        const prev = map.get(r.user_id);
        if (!prev || (prev === 'teacher' && r.role === 'admin')) map.set(r.user_id, r.role);
      }
      return map;
    },
  });

  const { data: approvedById = new Map<string, boolean>() } = useQuery({
    queryKey: ['student-live-class-creator-approvals', creatorIds.join(',')],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teacher-approval-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: creatorIds }),
      });

      const json = (await res.json().catch(() => null)) as
        | { approvals?: ApprovalRow[]; error?: string }
        | null;
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);

      const rows = (json?.approvals ?? []) as ApprovalRow[];
      return new Map(rows.map((r) => [r.user_id, Boolean(r.approved)] as const));
    },
  });

  const isVerifiedHost = (userId: string, role?: CreatorRole) => {
    if (role === 'admin') return true;
    return approvedById.get(userId) === true;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue your learning journey where you left off
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/ai-tutor">
            <Button variant="hero" className="gap-2">
              <Brain className="w-4 h-4" />
              AI Tutor
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Enrolled Courses"
          value={isLoadingCourses ? '—' : enrolledCourses.length}
          change="+2 this month"
          changeType="positive"
          icon={BookOpen}
        />
        <StatsCard
          title="Assignments Due"
          value={upcomingAssignments.length}
          change="3 pending"
          changeType="neutral"
          icon={ClipboardList}
        />
        <StatsCard
          title="Quizzes Completed"
          value={12}
          change="85% avg score"
          changeType="positive"
          icon={Trophy}
        />
        <StatsCard
          title="Study Streak"
          value="7 days"
          change="Keep it up!"
          changeType="positive"
          icon={Calendar}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">My Courses</h2>
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingCourses ? (
              <p className="text-sm text-muted-foreground">Loading your courses…</p>
            ) : enrolledPreview.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-6 text-center">
                <p className="font-display font-semibold text-card-foreground">No enrolled courses yet</p>
                <p className="text-sm text-muted-foreground mt-1">Go to Courses and enroll to see them here.</p>
                <div className="mt-4">
                  <Button asChild variant="hero">
                    <Link to="/courses">Browse courses</Link>
                  </Button>
                </div>
              </div>
            ) : (
              enrolledPreview.map((course, index) => (
                <div key={course.id} className={`animate-slide-up stagger-${index + 1}`}>
                  <CourseCard course={course} showTeacher={false} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Live Classes */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold">Live Classes</h3>
              <Link to="/live-classes">
                <Button variant="ghost" size="sm" className="gap-1">
                  View <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {liveClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No live classes right now. Check back later.
                </p>
              ) : (
                <>
                  {/* Primary CTA */}
                  <div className="rounded-xl border border-border p-4 bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Happening now</p>
                        <p className="font-display font-semibold text-base truncate mt-1">{liveClasses[0]?.title}</p>
                        <div className="mt-2 flex items-center gap-2 min-w-0">
                          {(() => {
                            const lc = liveClasses[0];
                            if (!lc) return null;
                            const creator = creatorsById.get(lc.created_by);
                            const role = creatorRolesById.get(lc.created_by);
                            const name = (creator?.name ?? '').trim() || 'Unknown';
                            const verified = isVerifiedHost(lc.created_by, role);
                            return (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={creator?.avatar_url ?? undefined}
                                    alt={creator?.name ? `${creator.name} avatar` : 'Host avatar'}
                                  />
                                  <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-muted-foreground truncate">{name}</p>
                                {verified ? (
                                  <img
                                    src={brightoriaLogo}
                                    alt="Verified"
                                    className="h-3.5 w-3.5 shrink-0"
                                    loading="lazy"
                                  />
                                ) : null}
                                {role ? (
                                  <Badge
                                    variant={role === 'admin' ? 'default' : 'secondary'}
                                    className="h-5 px-2 text-[10px] capitalize"
                                  >
                                    {role}
                                  </Badge>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 truncate">
                          {liveClasses[0]?.provider === 'brightoria_webrtc' ? 'In-app room' : 'External link'}
                        </p>
                      </div>
                      <Badge variant="default" className="shrink-0">LIVE</Badge>
                    </div>
                    <div className="mt-4">
                      <Button asChild variant="hero" className="w-full">
                        <Link to={`/live-classes?classId=${encodeURIComponent(liveClasses[0].id)}`}>Join now</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Other live sessions */}
                  {liveClasses.slice(1, 4).map((c) => (
                    <Link
                      key={c.id}
                      to={`/live-classes?classId=${encodeURIComponent(c.id)}`}
                      className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.title}</p>

                          <div className="mt-2 flex items-center gap-2 min-w-0">
                            {(() => {
                              const creator = creatorsById.get(c.created_by);
                              const role = creatorRolesById.get(c.created_by);
                              const name = (creator?.name ?? '').trim() || 'Unknown';
                              const verified = isVerifiedHost(c.created_by, role);
                              return (
                                <>
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage
                                      src={creator?.avatar_url ?? undefined}
                                      alt={creator?.name ? `${creator.name} avatar` : 'Host avatar'}
                                    />
                                    <AvatarFallback className="text-[9px]">{initials(name)}</AvatarFallback>
                                  </Avatar>
                                  <p className="text-xs text-muted-foreground truncate">Live host: {name}</p>
                                  {verified ? (
                                    <img
                                      src={brightoriaLogo}
                                      alt="Verified"
                                      className="h-3 w-3 shrink-0"
                                      loading="lazy"
                                    />
                                  ) : null}
                                  {role ? (
                                    <Badge
                                      variant={role === 'admin' ? 'default' : 'secondary'}
                                      className="h-5 px-2 text-[10px] capitalize"
                                    >
                                      {role}
                                    </Badge>
                                  ) : null}
                                </>
                              );
                            })()}
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {c.provider === 'brightoria_webrtc' ? 'In-app room' : 'External link'}
                          </p>
                        </div>
                        <Badge variant="default" className="shrink-0">LIVE</Badge>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>

            <Link to="/live-classes" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                Go to Live Classes
              </Button>
            </Link>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{assignment.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant={new Date(assignment.dueDate) < new Date(Date.now() + 86400000 * 3) ? 'warning' : 'secondary'}>
                    {Math.ceil((new Date(assignment.dueDate).getTime() - Date.now()) / 86400000)}d
                  </Badge>
                </div>
              ))}
            </div>
            <Link to="/assignments" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View All Assignments
              </Button>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/ai-tutor" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                  <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">AI Tutor</p>
                    <p className="text-xs text-muted-foreground">Get explanations</p>
                  </div>
                </Button>
              </Link>
              <Link to="/quizzes" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Practice Quiz</p>
                    <p className="text-xs text-muted-foreground">Test yourself</p>
                  </div>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
