import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated, teacherApprovalStatus } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher' && teacherApprovalStatus !== 'approved') return <Navigate to="/login?pending=1" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
