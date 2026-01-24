import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminStats = {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
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

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json().catch(() => null)) as AdminStats | { error?: string } | null;
      if (!res.ok) throw new Error((json as any)?.error || `Request failed (${res.status})`);

      setStats(json as AdminStats);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load admin stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, isLoading, error, refresh };
}
