import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get"),
    quizId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("submit"),
    quizId: z.string().uuid(),
    // Record<questionId, optionIndex>
    answers: z.record(z.string().uuid(), z.number().int().min(0).max(20)),
  }),
]);

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client (for claims + identity)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = (claimsData.claims as any)?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Invalid request" }, 400);
    }

    // Service client for controlled access to correct answers
    const supabaseSvc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const quizId = parsed.data.quizId;
    const { data: quizRow, error: quizErr } = await supabaseSvc
      .from("quizzes")
      .select("id, title, duration, total_marks, course_id")
      .eq("id", quizId)
      .maybeSingle();

    if (quizErr || !quizRow) return json({ error: "Quiz not found" }, 404);

    // Role + enrollment / ownership checks
    const { data: roleRow } = await supabaseSvc
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = roleRow?.role as string | undefined;
    const isAdmin = role === "admin";

    let isTeacherOfCourse = false;
    if (!isAdmin) {
      const { data: courseRow } = await supabaseSvc
        .from("courses")
        .select("teacher_id")
        .eq("id", quizRow.course_id)
        .maybeSingle();

      isTeacherOfCourse = courseRow?.teacher_id === userId;

      if (!isTeacherOfCourse) {
        const { data: enrollment } = await supabaseSvc
          .from("enrollments")
          .select("id")
          .eq("course_id", quizRow.course_id)
          .eq("student_id", userId)
          .maybeSingle();

        if (!enrollment) {
          return json({ error: "You must be enrolled in this course to access this quiz" }, 403);
        }
      }
    }

    if (parsed.data.action === "get") {
      const { data: questions, error: qErr } = await supabaseSvc
        .from("quiz_questions")
        .select("id, question_text, options, marks, question_order")
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (qErr) return json({ error: "Failed to load questions" }, 500);

      return json({
        quiz: {
          id: quizRow.id,
          title: quizRow.title,
          duration: quizRow.duration,
          totalMarks: quizRow.total_marks,
        },
        questions: questions ?? [],
      });
    }

    // submit
    const answers = parsed.data.answers;

    const { data: questionsWithAnswers, error: q2Err } = await supabaseSvc
      .from("quiz_questions")
      .select("id, correct_answer, marks, question_order")
      .eq("quiz_id", quizId)
      .order("question_order", { ascending: true });

    if (q2Err) return json({ error: "Failed to grade quiz" }, 500);
    if (!questionsWithAnswers || questionsWithAnswers.length === 0) {
      return json({ error: "Quiz has no questions" }, 400);
    }

    // Require answers for every question
    for (const q of questionsWithAnswers) {
      if (answers[q.id] === undefined) {
        return json({ error: "Please answer all questions" }, 400);
      }
    }

    let score = 0;
    const review: Record<string, { correct: boolean; correctAnswer: number }> = {};

    for (const q of questionsWithAnswers) {
      const userAnswer = answers[q.id];
      const correct = userAnswer === q.correct_answer;
      if (correct) score += q.marks;
      review[q.id] = { correct, correctAnswer: q.correct_answer };
    }

    // Persist submission (for students, teachers/admins may also submit when testing)
    const { error: insertErr } = await supabaseSvc.from("quiz_submissions").insert({
      quiz_id: quizId,
      student_id: userId,
      score,
      answers,
    });

    if (insertErr) {
      return json({ error: "Failed to save submission" }, 500);
    }

    return json({
      score,
      totalMarks: quizRow.total_marks,
      review,
    });
  } catch (error) {
    console.error("quiz-attempt error", error);
    return json({ error: "Server error" }, 500);
  }
});
