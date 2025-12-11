export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Course {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  enrolledCount: number;
  lessonsCount: number;
  createdAt: Date;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  resourceType: 'video' | 'pdf' | 'text' | 'image';
  resourceLink?: string;
  duration?: number;
  order: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  dueDate: Date;
  status: 'open' | 'closed';
  maxScore: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  filename: string;
  submittedAt: Date;
  grade?: number;
  feedback?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  totalMarks: number;
  duration: number; // in minutes
  questionsCount: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  submittedAt: Date;
  answers: Record<string, number>;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AISession {
  id: string;
  userId: string;
  courseId?: string;
  type: 'tutor' | 'doubt' | 'chat-with-notes';
  messages: AIMessage[];
  noteId?: string;
  createdAt: Date;
}

export interface Analytics {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  quizPerformance: {
    averageScore: number;
    totalAttempts: number;
  };
  assignmentStats: {
    totalSubmissions: number;
    averageGrade: number;
  };
  userActivity: {
    hour: number;
    count: number;
  }[];
}

export interface Note {
  id: string;
  courseId: string;
  title: string;
  content: string;
  fileUrl?: string;
  fileType: 'pdf' | 'text' | 'image';
  createdAt: Date;
}
