import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminAnalyticsPayload = {
  userActivity24h: { hour: number; isoHour: string; count: number }[];
  weekly: { date: string; users: number; quizzes: number; assignments: number }[];
  roleBreakdown: { students: number; teachers: number; admins: number };
  enrollmentsByCourse: { courseId: string; title: string; students: number; lessons: number }[];
  generatedAt: string;
};

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json().catch(() => null)) as AdminAnalyticsPayload | { error?: string } | null;
      if (!res.ok) throw new Error((json as any)?.error || `Request failed (${res.status})`);

      setData(json as AdminAnalyticsPayload);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error, refresh };
}
