import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeacherDirectoryItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  subject: string | null;
  qualification: string | null;
  experienceYears: number | null;
  university: string | null;
  bio: string | null;
  approvalStatus: "pending" | "approved" | "missing";
  joinedAt: string;
};

type TeachersDirectoryResponse = {
  teachers: TeacherDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

async function fetchTeachers(params?: {
  teacherId?: string;
  page?: number;
  pageSize?: number;
}): Promise<TeachersDirectoryResponse | TeacherDirectoryItem | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teachers-directory`;
  const qs = new URLSearchParams();
  if (params?.teacherId) qs.set("teacherId", params.teacherId);
  if (typeof params?.page === "number") qs.set("page", String(params.page));
  if (typeof params?.pageSize === "number") qs.set("pageSize", String(params.pageSize));
  const url = qs.toString() ? `${baseUrl}?${qs.toString()}` : baseUrl;

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
    queryFn: async () => {
      const data = (await fetchTeachers({ page: 1, pageSize: 200 })) as TeachersDirectoryResponse;
      return data.teachers;
    },
  });
}

export function useTeacherProfile(teacherId: string) {
  return useQuery({
    queryKey: ["teachers-directory", teacherId],
    queryFn: async () => (await fetchTeachers({ teacherId })) as TeacherDirectoryItem | null,
    enabled: Boolean(teacherId),
  });
}
