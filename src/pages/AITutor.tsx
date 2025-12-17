import { AIChatWindow } from '@/components/ai/AIChatWindow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, ChevronRight, Loader2, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  category: string;
  description: string | null;
}

interface Note {
  id: string;
  title: string;
  file_type: string;
  course_id: string;
}

export default function AITutor() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch enrolled courses for students or all courses
  useEffect(() => {
    async function fetchCourses() {
      setLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, category, description')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [user]);

  // Fetch notes when course is selected
  useEffect(() => {
    async function fetchNotes() {
      if (!selectedCourse) {
        setNotes([]);
        return;
      }

      setLoadingNotes(true);
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, file_type, course_id')
          .eq('course_id', selectedCourse)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoadingNotes(false);
      }
    }

    fetchNotes();
  }, [selectedCourse]);

  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          AI Tutor
          <Badge variant="secondary" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            RAG Powered
          </Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          Get detailed explanations using your course materials as knowledge base
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course & Note Selection */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Select Course
            </h3>
            
            {loadingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No courses available yet</p>
                <p className="text-xs mt-1">Ask a teacher to create courses</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course.id);
                      setSelectedNote(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedCourse === course.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCourse && (
            <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Select Note (Optional)
              </h3>
              
              {loadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No notes uploaded for this course</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note.id === selectedNote ? null : note.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedNote === note.id
                          ? 'bg-accent/20 border-2 border-accent'
                          : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{note.title}</p>
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            {note.file_type.toUpperCase()}
                          </Badge>
                        </div>
                        {selectedNote === note.id && (
                          <Badge variant="default" className="text-[10px] flex-shrink-0">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RAG Info Card */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
            <h4 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              How RAG Works
            </h4>
            <p className="text-xs text-muted-foreground">
              The AI retrieves relevant content from your course materials (notes, lessons) and uses it as context to provide accurate, course-specific answers.
            </p>
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          <AIChatWindow
            title="AI Tutor"
            subtitle={selectedCourseData 
              ? `Course: ${selectedCourseData.title}` 
              : 'Select a course to get started'}
            placeholder="Ask me anything about your course..."
            variant="tutor"
            courseId={selectedCourse}
            noteId={selectedNote}
          />
        </div>
      </div>
    </div>
  );
}
