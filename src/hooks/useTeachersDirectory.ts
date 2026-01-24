import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeacherDirectoryItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  subject: string | null;
  qualification: string | null;
  experienceYears: number | null;
  university: string | null;
  joinedAt: string;
};

async function fetchTeachers(teacherId?: string): Promise<TeacherDirectoryItem[] | TeacherDirectoryItem> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teachers-directory`;
  const url = teacherId ? `${baseUrl}?teacherId=${encodeURIComponent(teacherId)}` : baseUrl;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to load teachers");
  }

  return res.json();
}

export function useTeachersDirectory() {
  return useQuery({
    queryKey: ["teachers-directory"],
    queryFn: () => fetchTeachers() as Promise<TeacherDirectoryItem[]>,
  });
}

export function useTeacherProfile(teacherId: string) {
  return useQuery({
    queryKey: ["teachers-directory", teacherId],
    queryFn: () => fetchTeachers(teacherId) as Promise<TeacherDirectoryItem>,
    enabled: Boolean(teacherId),
  });
}
