import { mockAnalytics, mockCourses } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookOpen, 
  Activity, 
  TrendingUp,
  Clock,
  Calendar,
  Download
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function AdminAnalytics() {
  const analytics = mockAnalytics;

  const chartData = analytics.userActivity.map(item => ({
    hour: `${item.hour}:00`,
    users: item.count,
  }));

  const courseData = mockCourses.map(course => ({
    name: course.title.substring(0, 20) + '...',
    students: course.enrolledCount,
    lessons: course.lessonsCount,
  }));

  const roleData = [
    { name: 'Students', value: analytics.totalStudents, color: 'hsl(186 72% 32%)' },
    { name: 'Teachers', value: analytics.totalTeachers, color: 'hsl(38 92% 50%)' },
    { name: 'Admins', value: 5, color: 'hsl(199 89% 48%)' },
  ];

  const weeklyData = [
    { day: 'Mon', users: 145, quizzes: 23, assignments: 12 },
    { day: 'Tue', users: 189, quizzes: 34, assignments: 18 },
    { day: 'Wed', users: 167, quizzes: 28, assignments: 15 },
    { day: 'Thu', users: 198, quizzes: 31, assignments: 22 },
    { day: 'Fri', users: 234, quizzes: 45, assignments: 28 },
    { day: 'Sat', users: 156, quizzes: 19, assignments: 8 },
    { day: 'Sun', users: 134, quizzes: 15, assignments: 5 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Analytics Dashboard 📊
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive platform insights and metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 days
          </Button>
          <Button variant="hero" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold font-display">{analytics.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-success mt-1">+12.5% from last month</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Courses</p>
              <p className="text-3xl font-bold font-display">{analytics.totalCourses}</p>
              <p className="text-xs text-success mt-1">+8 new this month</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Now</p>
              <p className="text-3xl font-bold font-display text-success">{analytics.activeUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">Real-time count</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Enrollments</p>
              <p className="text-3xl font-bold font-display">{analytics.totalEnrollments.toLocaleString()}</p>
              <p className="text-xs text-success mt-1">+23% growth rate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            User Activity (24 Hours)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(186 72% 32%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(186 72% 32%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="hour" stroke="hsl(215.4 16.3% 46.9%)" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(215.4 16.3% 46.9%)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="hsl(186 72% 32%)" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Distribution
          </h3>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-4">
              {roleData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Weekly Overview</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="day" stroke="hsl(215.4 16.3% 46.9%)" fontSize={12} tickLine={false} />
                <YAxis stroke="hsl(215.4 16.3% 46.9%)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="users" stroke="hsl(186 72% 32%)" strokeWidth={2} dot={{ fill: 'hsl(186 72% 32%)' }} />
                <Line type="monotone" dataKey="quizzes" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ fill: 'hsl(38 92% 50%)' }} />
                <Line type="monotone" dataKey="assignments" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={{ fill: 'hsl(199 89% 48%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-primary" />
              Users
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-accent" />
              Quizzes
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-info" />
              Assignments
            </span>
          </div>
        </div>

        {/* Course Enrollments */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Course Enrollments</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis type="number" stroke="hsl(215.4 16.3% 46.9%)" fontSize={12} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="hsl(215.4 16.3% 46.9%)" fontSize={10} tickLine={false} width={100} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(214.3 31.8% 91.4%)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="students" fill="hsl(186 72% 32%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Quiz Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-semibold">{analytics.quizPerformance.averageScore}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full hero-gradient rounded-full" style={{ width: `${analytics.quizPerformance.averageScore}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{analytics.quizPerformance.totalAttempts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold text-success">78%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold mb-4">Assignment Stats</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Average Grade</span>
                <span className="font-semibold">{analytics.assignmentStats.averageGrade}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full accent-gradient rounded-full" style={{ width: `${analytics.assignmentStats.averageGrade}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{analytics.assignmentStats.totalSubmissions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-time Rate</p>
                <p className="text-2xl font-bold text-success">89%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
