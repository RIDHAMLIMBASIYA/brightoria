import { mockAnalytics, mockCourses } from '@/data/mockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, BarChart3, Activity, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAdminStats } from '@/hooks/useAdminStats';
import { AdminDatabaseExportDialog } from '@/components/admin/AdminDatabaseExportDialog';

export function AdminDashboard() {
  const analytics = mockAnalytics;
  const { stats } = useAdminStats();

  const chartData = analytics.userActivity.map(item => ({
    hour: `${item.hour}:00`,
    users: item.count,
  }));

  const courseData = mockCourses.map(course => ({
    name: course.title.substring(0, 15) + '...',
    students: course.enrolledCount,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Admin Dashboard 🎛️
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform performance and user activity
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Charts use mock data</Badge>
            <Badge variant="outline">Totals are live</Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <AdminDatabaseExportDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Clock className="w-4 h-4" />
                Download DB
              </Button>
            }
          />
          <Link to="/admin/users">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              Manage Users
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button variant="hero" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Full Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={(stats?.totalUsers ?? analytics.totalUsers).toLocaleString()}
          change="+12% this month"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Active Now"
          value="—"
          change="N/A"
          changeType="neutral"
          icon={Activity}
          iconColor="text-success"
        />
        <StatsCard
          title="Total Courses"
          value={stats?.totalCourses ?? analytics.totalCourses}
          change="+8 this month"
          changeType="positive"
          icon={BookOpen}
        />
        <StatsCard
          title="Enrollments"
          value={(stats?.totalEnrollments ?? analytics.totalEnrollments).toLocaleString()}
          change="+23% growth"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            User Activity (24h)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(186 72% 32%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(186 72% 32%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis 
                  dataKey="hour" 
                  stroke="hsl(215.4 16.3% 46.9%)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(215.4 16.3% 46.9%)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(186 72% 32%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Enrollments */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Course Enrollments
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(215.4 16.3% 46.9%)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(215.4 16.3% 46.9%)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="students" 
                  fill="hsl(38 92% 50%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quiz Performance */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Quiz Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-medium">{analytics.quizPerformance.averageScore}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full hero-gradient rounded-full"
                  style={{ width: `${analytics.quizPerformance.averageScore}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Total Attempts</span>
              <Badge variant="info">{analytics.quizPerformance.totalAttempts.toLocaleString()}</Badge>
            </div>
          </div>
        </div>

        {/* Assignment Stats */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Assignment Stats</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Average Grade</span>
                <span className="font-medium">{analytics.assignmentStats.averageGrade}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full accent-gradient rounded-full"
                  style={{ width: `${analytics.assignmentStats.averageGrade}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Submissions</span>
              <Badge variant="success">{analytics.assignmentStats.totalSubmissions.toLocaleString()}</Badge>
            </div>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">User Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full hero-gradient" />
                Students
              </span>
              <span className="font-medium">{analytics.totalStudents.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full accent-gradient" />
                Teachers
              </span>
              <span className="font-medium">{analytics.totalTeachers}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-success" />
                Active Now
              </span>
              <Badge variant="success">{analytics.activeUsers}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
