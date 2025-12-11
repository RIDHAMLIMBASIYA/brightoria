import { Link } from 'react-router-dom';
import { Course } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  variant?: 'default' | 'compact';
  showTeacher?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function CourseCard({
  course,
  variant = 'default',
  showTeacher = true,
  actionLabel = 'View Course',
  onAction,
}: CourseCardProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'group bg-card rounded-xl border border-border overflow-hidden hover-lift',
        isCompact ? 'flex gap-4 p-4' : 'flex flex-col'
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'relative overflow-hidden',
          isCompact ? 'w-32 h-24 rounded-lg flex-shrink-0' : 'aspect-video'
        )}
      >
        <img
          src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop'}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {!isCompact && (
          <Badge className="absolute top-3 left-3" variant="accent">
            {course.category}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col flex-1', !isCompact && 'p-5')}>
        {isCompact && (
          <Badge variant="secondary" className="w-fit mb-2 text-[10px]">
            {course.category}
          </Badge>
        )}
        
        <h3 className={cn(
          'font-display font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors',
          isCompact ? 'text-sm' : 'text-lg mb-2'
        )}>
          {course.title}
        </h3>

        {!isCompact && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.description}
          </p>
        )}

        {showTeacher && !isCompact && (
          <p className="text-sm text-muted-foreground mb-4">
            by <span className="text-foreground font-medium">{course.teacherName}</span>
          </p>
        )}

        {/* Stats */}
        <div className={cn(
          'flex items-center gap-4 text-xs text-muted-foreground',
          isCompact ? 'mt-auto' : 'mt-auto pt-4 border-t border-border'
        )}>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {course.enrolledCount}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {course.lessonsCount} lessons
          </span>
        </div>

        {!isCompact && (
          <Link to={`/courses/${course.id}`} className="mt-4">
            <Button variant="outline" className="w-full group/btn">
              {actionLabel}
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
