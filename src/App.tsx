import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import Assignments from "./pages/Assignments";
import Quizzes from "./pages/Quizzes";
import QuizAttempt from "./pages/QuizAttempt";
import AITutor from "./pages/AITutor";
import TeacherUpload from "./pages/TeacherUpload";
import TeacherCourses from "./pages/TeacherCourses";
import TeacherSubmissions from "./pages/TeacherSubmissions";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:courseId" element={<CourseDetails />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/quizzes" element={<Quizzes />} />
                <Route path="/quizzes/:quizId" element={<QuizAttempt />} />
                <Route path="/ai-tutor" element={<AITutor />} />
                <Route path="/doubt-bot" element={<Navigate to="/ai-tutor" replace />} />
              <Route
                path="/teacher/courses"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                    <TeacherCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/upload"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                    <TeacherUpload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/submissions"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                    <TeacherSubmissions />
                  </ProtectedRoute>
                }
              />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
