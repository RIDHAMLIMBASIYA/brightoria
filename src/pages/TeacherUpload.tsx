import { useState } from 'react';
import { mockCourses } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Video, Image, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TeacherUpload() {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [uploadType, setUploadType] = useState<'notes' | 'assignment' | 'quiz'>('notes');
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    if (files.length === 0) {
      toast.error('Please add at least one file');
      return;
    }
    
    toast.success('Files uploaded successfully!');
    setFiles([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Upload Content 📤
        </h1>
        <p className="text-muted-foreground mt-1">
          Add notes, assignments, and quizzes to your courses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Selection */}
          <div className="bg-card rounded-xl border border-border p-5">
            <Label className="mb-3 block">Select Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {mockCourses.filter(c => c.teacherId === '2').map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Type Tabs */}
          <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              <TabsTrigger value="assignment" className="flex-1">Assignment</TabsTrigger>
              <TabsTrigger value="quiz" className="flex-1">Quiz</TabsTrigger>
            </TabsList>

            {/* Notes Upload */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="noteTitle">Note Title</Label>
                <Input id="noteTitle" placeholder="e.g., Chapter 1 - Introduction" />
              </div>

              {/* File Drop Zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-border',
                  'hover:border-primary/50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp4,.webm"
                  onChange={handleFileChange}
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl hero-gradient flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="font-medium mb-1">Drop files here or click to upload</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, TXT, Images, Videos (max 50MB)
                  </p>
                </label>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFile(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Assignment Upload */}
            <TabsContent value="assignment" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="assignmentTitle">Assignment Title</Label>
                <Input id="assignmentTitle" placeholder="e.g., Week 1 Assignment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Describe the assignment requirements..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxScore">Max Score</Label>
                  <Input id="maxScore" type="number" placeholder="100" />
                </div>
              </div>
            </TabsContent>

            {/* Quiz Upload */}
            <TabsContent value="quiz" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="quizTitle">Quiz Title</Label>
                <Input id="quizTitle" placeholder="e.g., Chapter 1 Quiz" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input id="duration" type="number" placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <Input id="totalMarks" type="number" placeholder="50" />
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Questions</Label>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Question
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                  Click "Add Question" to create MCQ questions
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button onClick={handleUpload} className="w-full" size="lg">
            <Check className="w-5 h-5 mr-2" />
            Upload Content
          </Button>
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold mb-4">Upload Tips</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-primary-foreground font-bold">1</span>
                </div>
                <span className="text-muted-foreground">
                  Use descriptive titles for better student navigation
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-primary-foreground font-bold">2</span>
                </div>
                <span className="text-muted-foreground">
                  PDF files work best for notes - they preserve formatting
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-primary-foreground font-bold">3</span>
                </div>
                <span className="text-muted-foreground">
                  Keep video files under 100MB for faster loading
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-primary-foreground font-bold">4</span>
                </div>
                <span className="text-muted-foreground">
                  AI features work best with text-based PDFs
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-accent/10 rounded-xl border border-accent/30 p-5">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">✨</span>
              AI Integration
            </h3>
            <p className="text-sm text-muted-foreground">
              Uploaded notes will be automatically indexed for the AI Tutor and Chat-with-Notes features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
