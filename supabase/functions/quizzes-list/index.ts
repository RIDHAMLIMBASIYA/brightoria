import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type QuizListItem = {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  questionsCount: number;
  course: {
    id: string;
    title: string;
    category: string;
  } | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });

    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: quizzes, error: qErr } = await svc
      .from("quizzes")
      .select("id,title,duration,total_marks,course_id,created_at")
      .order("created_at", { ascending: false });

    if (qErr) throw new Error(qErr.message);

    const quizRows = (quizzes ?? []) as Array<any>;
    const quizIds = quizRows.map((q) => q.id as string);
    const courseIds = Array.from(new Set(quizRows.map((q) => q.course_id as string).filter(Boolean)));

    const courseById = new Map<string, { id: string; title: string; category: string }>();
    if (courseIds.length > 0) {
      const { data: courses, error: cErr } = await svc
        .from("courses")
        .select("id,title,category")
        .in("id", courseIds);
      if (cErr) throw new Error(cErr.message);
      (courses ?? []).forEach((c: any) => {
        courseById.set(c.id, {
          id: c.id,
          title: c.title ?? "Untitled",
          category: c.category ?? "General",
        });
      });
    }

    const countByQuizId = new Map<string, number>();
    if (quizIds.length > 0) {
      // Fetch only quiz_id to compute counts without exposing answers.
      const { data: qq, error: qqErr } = await svc
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", quizIds);
      if (qqErr) throw new Error(qqErr.message);

      (qq ?? []).forEach((row: any) => {
        const id = row.quiz_id as string;
        countByQuizId.set(id, (countByQuizId.get(id) ?? 0) + 1);
      });
    }

    const items: QuizListItem[] = quizRows.map((q) => {
      const courseId = q.course_id as string;
      return {
        id: q.id,
        title: q.title,
        duration: Number(q.duration ?? 0),
        totalMarks: Number(q.total_marks ?? 0),
        questionsCount: countByQuizId.get(q.id) ?? 0,
        course: courseById.get(courseId) ?? null,
      };
    });

    return json(200, { quizzes: items });
  } catch (e) {
    console.error("quizzes-list error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
