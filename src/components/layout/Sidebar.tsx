import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  Brain,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: ('student' | 'teacher' | 'admin')[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['student', 'teacher', 'admin'] },
  { label: 'My Courses', href: '/courses', icon: BookOpen, roles: ['student', 'teacher'] },
  { label: 'Assignments', href: '/assignments', icon: FileText, roles: ['student'] },
  { label: 'Quizzes', href: '/quizzes', icon: ClipboardList, roles: ['student'] },
  { label: 'AI Tutor', href: '/ai-tutor', icon: Brain, roles: ['student'] },
  { label: 'Doubt Bot', href: '/doubt-bot', icon: MessageCircle, roles: ['student'] },
  { label: 'Manage Courses', href: '/teacher/courses', icon: BookOpen, roles: ['teacher'] },
  { label: 'Upload Content', href: '/teacher/upload', icon: Upload, roles: ['teacher'] },
  { label: 'Submissions', href: '/teacher/submissions', icon: FileText, roles: ['teacher'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'All Courses', href: '/admin/courses', icon: BookOpen, roles: ['admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['student', 'teacher', 'admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const filteredItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside
      className={cn(
        'sidebar-gradient h-screen sticky top-0 flex flex-col border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-glow">
          <GraduationCap className="w-6 h-6 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display font-bold text-lg text-sidebar-foreground">LearnHub</h1>
            <p className="text-xs text-sidebar-foreground/60">AI-Powered LMS</p>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className={cn(
        'px-4 py-4 border-b border-sidebar-border',
        collapsed && 'flex justify-center'
      )}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
            alt={user.name}
            className="w-10 h-10 rounded-full ring-2 ring-sidebar-primary/30"
          />
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <p className="font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'animate-scale-in')} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            !collapsed && 'justify-start'
          )}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={logout}
          className={cn(
            'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            !collapsed && 'justify-start'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
