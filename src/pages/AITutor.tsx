import { AIChatWindow } from '@/components/ai/AIChatWindow';
import { mockCourses, mockNotes } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function AITutor() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          AI Tutor 🤖
        </h1>
        <p className="text-muted-foreground mt-1">
          Get detailed explanations and practice questions from your AI teacher
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
            <div className="space-y-2">
              {mockCourses.slice(0, 4).map((course) => (
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
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.lessonsCount} lessons</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedCourse && (
            <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Select Note (Optional)
              </h3>
              <div className="space-y-2">
                {mockNotes.map((note) => (
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
                      <div>
                        <p className="font-medium text-sm">{note.title}</p>
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {note.fileType.toUpperCase()}
                        </Badge>
                      </div>
                      {selectedNote === note.id && (
                        <Badge variant="accent">Selected</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          <AIChatWindow
            title="AI Tutor"
            subtitle={selectedCourse ? `Course: ${mockCourses.find(c => c.id === selectedCourse)?.title}` : 'Select a course to get started'}
            placeholder="Ask me anything about your course..."
            variant="tutor"
          />
        </div>
      </div>
    </div>
  );
}
