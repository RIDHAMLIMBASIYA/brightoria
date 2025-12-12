import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, BookOpen, Users, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function TeacherCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setCourses(data);
    }
    setIsLoading(false);
  };

  const handleCreateCourse = async () => {
    if (!user || !title.trim() || !category.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const { error } = await supabase.from('courses').insert({
        teacher_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim(),
      });
      
      if (error) throw error;
      
      toast.success('Course created successfully!');
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setCategory('');
      fetchCourses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      toast.success('Course deleted');
      fetchCourses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete course');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            My Courses 📚
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your courses
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" className="gap-2">
              <Plus className="w-4 h-4" />
              New Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Web Development"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  placeholder="e.g., Programming, Marketing, Design"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what students will learn..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateCourse}
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Course'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <div
              key={course.id}
              className={`bg-card rounded-xl border border-border overflow-hidden hover-lift animate-slide-up stagger-${(index % 5) + 1}`}
            >
              <div className="aspect-video bg-muted relative">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full hero-gradient flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-primary-foreground/50" />
                  </div>
                )}
                <Badge className="absolute top-3 left-3" variant="accent">
                  {course.category}
                </Badge>
              </div>
              <div className="p-5">
                <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(course.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon-sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl hero-gradient flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h3 className="font-display font-semibold text-xl mb-2">No courses yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Create your first course to start teaching and sharing knowledge with students.
          </p>
          <Button variant="hero" onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Course
          </Button>
        </div>
      )}
    </div>
  );
}
