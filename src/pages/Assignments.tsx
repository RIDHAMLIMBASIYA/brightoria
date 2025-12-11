import { mockAssignments, mockCourses } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Upload, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Assignments() {
  const assignmentsWithCourse = mockAssignments.map(assignment => ({
    ...assignment,
    course: mockCourses.find(c => c.id === assignment.courseId),
  }));

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Assignments 📄
        </h1>
        <p className="text-muted-foreground mt-1">
          View and submit your course assignments
        </p>
      </div>

      <div className="space-y-4">
        {assignmentsWithCourse.map((assignment, index) => {
          const daysUntilDue = getDaysUntilDue(assignment.dueDate);
          const isUrgent = daysUntilDue <= 3 && daysUntilDue > 0;
          const isOverdue = daysUntilDue < 0;

          return (
            <div
              key={assignment.id}
              className={cn(
                'bg-card rounded-xl border border-border p-5 hover-lift animate-slide-up',
                `stagger-${(index % 5) + 1}`
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  isOverdue ? 'bg-destructive/20' : isUrgent ? 'bg-warning/20' : 'bg-primary/10'
                )}>
                  <FileText className={cn(
                    'w-6 h-6',
                    isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-primary'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold text-lg">{assignment.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.course?.title || 'Unknown Course'}
                      </p>
                    </div>
                    <Badge
                      variant={isOverdue ? 'destructive' : isUrgent ? 'warning' : assignment.status === 'open' ? 'success' : 'secondary'}
                    >
                      {isOverdue ? 'Overdue' : assignment.status === 'open' ? 'Open' : 'Closed'}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {assignment.instructions}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {isOverdue ? (
                        <span className="text-destructive">{Math.abs(daysUntilDue)} days overdue</span>
                      ) : daysUntilDue === 0 ? (
                        <span className="text-warning">Due today</span>
                      ) : (
                        `${daysUntilDue} days left`
                      )}
                    </span>
                    <Badge variant="outline">
                      Max: {assignment.maxScore} points
                    </Badge>
                  </div>
                </div>

                <div className="md:ml-4">
                  <Button
                    variant={isOverdue ? 'outline' : 'default'}
                    disabled={isOverdue || assignment.status === 'closed'}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
