import { useAuth } from '@/contexts/AuthContext';
import { mockCourses, mockAssignments, mockQuizzes } from '@/data/mockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { LiveClassRow } from '@/components/live-classes/types';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Brain, Trophy, Calendar, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function StudentDashboard() {
  const { user } = useAuth();
  const enrolledCourses = mockCourses.slice(0, 3);
  const upcomingAssignments = mockAssignments.filter(a => a.status === 'open').slice(0, 3);
  const recentQuizzes = mockQuizzes.slice(0, 2);

  const { data: liveClasses = [] } = useQuery({
    queryKey: ['student-live-classes'],
    queryFn: async (): Promise<LiveClassRow[]> => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*')
        // show currently live first, then scheduled
        .in('status', ['live', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data ?? []) as LiveClassRow[];
    },
  });

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
          value={enrolledCourses.length}
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
            {enrolledCourses.map((course, index) => (
              <div key={course.id} className={`animate-slide-up stagger-${index + 1}`}>
                <CourseCard course={course} showTeacher={false} />
              </div>
            ))}
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
                liveClasses.map((c) => (
                  <Link
                    key={c.id}
                    to="/live-classes"
                    className="block rounded-lg border border-border p-3 hover:bg-muted/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {c.provider === 'brightoria_webrtc' ? 'In-app room' : 'External link'}
                        </p>
                      </div>
                      <Badge variant={c.status === 'live' ? 'default' : 'secondary'} className="shrink-0 capitalize">
                        {c.status}
                      </Badge>
                    </div>
                  </Link>
                ))
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
