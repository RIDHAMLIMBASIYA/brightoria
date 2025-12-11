import { useAuth } from '@/contexts/AuthContext';
import { mockCourses, mockAssignments } from '@/data/mockData';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FileText, Upload, Plus, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function TeacherDashboard() {
  const { user } = useAuth();
  const teacherCourses = mockCourses.filter(c => c.teacherId === '2');
  const pendingSubmissions = 15;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Welcome, {user?.name?.split(' ')[0]}! 👨‍🏫
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your courses and track student progress
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/teacher/upload">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Content
            </Button>
          </Link>
          <Link to="/teacher/courses">
            <Button variant="hero" className="gap-2">
              <Plus className="w-4 h-4" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Courses"
          value={teacherCourses.length}
          change="+1 this month"
          changeType="positive"
          icon={BookOpen}
        />
        <StatsCard
          title="Total Students"
          value={teacherCourses.reduce((acc, c) => acc + c.enrolledCount, 0)}
          change="+45 this week"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Pending Reviews"
          value={pendingSubmissions}
          change="5 urgent"
          changeType="negative"
          icon={FileText}
        />
        <StatsCard
          title="Course Rating"
          value="4.8"
          change="⭐ Excellent"
          changeType="positive"
          icon={BookOpen}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">My Courses</h2>
            <Link to="/teacher/courses">
              <Button variant="ghost" size="sm" className="gap-1">
                Manage all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teacherCourses.map((course, index) => (
              <div key={course.id} className={`animate-slide-up stagger-${index + 1}`}>
                <CourseCard 
                  course={course} 
                  showTeacher={false} 
                  actionLabel="Manage Course"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Pending Submissions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Recent Submissions
            </h3>
            <div className="space-y-3">
              {[
                { student: 'Alice Johnson', assignment: 'Portfolio Project', time: '2h ago' },
                { student: 'Bob Smith', assignment: 'CSS Grid Exercise', time: '5h ago' },
                { student: 'Carol Davis', assignment: 'Portfolio Project', time: '1d ago' },
              ].map((submission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{submission.student}</p>
                    <p className="text-xs text-muted-foreground truncate">{submission.assignment}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {submission.time}
                    </span>
                    <Badge variant="warning">Review</Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/teacher/submissions" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View All Submissions
              </Button>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/teacher/upload" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                  <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                    <Upload className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Upload Notes</p>
                    <p className="text-xs text-muted-foreground">PDF, Video, Text</p>
                  </div>
                </Button>
              </Link>
              <Link to="/teacher/courses" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                  <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
                    <Plus className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Create Quiz</p>
                    <p className="text-xs text-muted-foreground">MCQ questions</p>
                  </div>
                </Button>
              </Link>
              <Link to="/teacher/submissions" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Grade Assignments</p>
                    <p className="text-xs text-muted-foreground">{pendingSubmissions} pending</p>
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
