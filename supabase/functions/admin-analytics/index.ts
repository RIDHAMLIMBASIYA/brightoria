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

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function fetchAll<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
  maxRows = 50_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw new Error(error.message ?? String(error));
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

function bucketByHour24h(timestamps: string[], now = new Date()) {
  // Returns 24 points for the last 24 hours (UTC), oldest -> newest.
  const end = new Date(now);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const buckets = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(start.getTime() + i * 60 * 60 * 1000);
    return {
      hour: hourStart.getUTCHours(),
      isoHour: hourStart.toISOString().slice(0, 13) + ":00:00.000Z",
      count: 0,
    };
  });

  for (const ts of timestamps) {
    const d = new Date(ts);
    if (d < start || d > end) continue;
    const idx = Math.floor((d.getTime() - start.getTime()) / (60 * 60 * 1000));
    if (idx >= 0 && idx < 24) buckets[idx].count += 1;
  }

  return buckets;
}

function bucketDaily(
  timestamps: string[],
  days: number,
  now = new Date(),
): { date: string; count: number }[] {
  // days points for last N days including today (UTC), oldest -> newest.
  const todayStart = startOfDayUTC(now);
  const start = addDaysUTC(todayStart, -(days - 1));

  const buckets = Array.from({ length: days }, (_, i) => {
    const day = addDaysUTC(start, i);
    return { date: day.toISOString().slice(0, 10), count: 0 };
  });

  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));
  for (const ts of timestamps) {
    const d = new Date(ts);
    const key = d.toISOString().slice(0, 10);
    const idx = indexByDate.get(key);
    if (idx !== undefined) buckets[idx].count += 1;
  }

  return buckets;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller + authorize admin.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });

    const callerId = claimsData.claims.sub as string;
    const { data: callerRole, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    if (roleError) return json(500, { error: "Authorization check failed" });
    if (callerRole?.role !== "admin") return json(403, { error: "Forbidden" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = addDaysUTC(startOfDayUTC(now), -6).toISOString();

    // Activity = submissions in last 24h (quiz + assignment).
    const [quizSubs24, assignSubs24] = await Promise.all([
      fetchAll<{ submitted_at: string }>(async (from, to) =>
        await adminClient
          .from("quiz_submissions")
          .select("submitted_at")
          .gte("submitted_at", since24h)
          .range(from, to),
      ),
      fetchAll<{ submitted_at: string }>(async (from, to) =>
        await adminClient
          .from("assignment_submissions")
          .select("submitted_at")
          .gte("submitted_at", since24h)
          .range(from, to),
      ),
    ]);

    const activityTimestamps = [
      ...quizSubs24.map((r) => r.submitted_at),
      ...assignSubs24.map((r) => r.submitted_at),
    ];
    const userActivity24h = bucketByHour24h(activityTimestamps, now);

    // Weekly overview (last 7 days, UTC):
    // - users = profiles created
    // - quizzes = quizzes created
    // - assignments = assignments created
    const [profiles7, quizzes7, assignments7] = await Promise.all([
      fetchAll<{ created_at: string }>(async (from, to) =>
        await adminClient
          .from("profiles")
          .select("created_at")
          .gte("created_at", since7d)
          .range(from, to),
      ),
      fetchAll<{ created_at: string }>(async (from, to) =>
        await adminClient
          .from("quizzes")
          .select("created_at")
          .gte("created_at", since7d)
          .range(from, to),
      ),
      fetchAll<{ created_at: string }>(async (from, to) =>
        await adminClient
          .from("assignments")
          .select("created_at")
          .gte("created_at", since7d)
          .range(from, to),
      ),
    ]);

    const usersDaily = bucketDaily(profiles7.map((r) => r.created_at), 7, now);
    const quizzesDaily = bucketDaily(quizzes7.map((r) => r.created_at), 7, now);
    const assignmentsDaily = bucketDaily(assignments7.map((r) => r.created_at), 7, now);

    const weekly = usersDaily.map((u, idx) => ({
      date: u.date,
      users: u.count,
      quizzes: quizzesDaily[idx]?.count ?? 0,
      assignments: assignmentsDaily[idx]?.count ?? 0,
    }));

    // User distribution from user_roles (dedupe by best role).
    const roles = await fetchAll<{ user_id: string; role: string }>(async (from, to) =>
      await adminClient.from("user_roles").select("user_id, role").range(from, to),
    );
    const priority: Record<string, number> = { admin: 3, teacher: 2, student: 1 };
    const bestRoleByUser = new Map<string, string>();
    for (const r of roles) {
      const existing = bestRoleByUser.get(r.user_id);
      if (!existing || (priority[r.role] ?? 0) > (priority[existing] ?? 0)) {
        bestRoleByUser.set(r.user_id, r.role);
      }
    }
    let totalStudents = 0;
    let totalTeachers = 0;
    let totalAdmins = 0;
    for (const role of bestRoleByUser.values()) {
      if (role === "admin") totalAdmins += 1;
      else if (role === "teacher") totalTeachers += 1;
      else totalStudents += 1;
    }

    // Course enrollments (top 10): count enrollments per course + lessons per course + course title.
    const [courses, enrollments, lessons] = await Promise.all([
      fetchAll<{ id: string; title: string }>(async (from, to) =>
        await adminClient.from("courses").select("id, title").range(from, to),
      ),
      fetchAll<{ course_id: string }>(async (from, to) =>
        await adminClient.from("enrollments").select("course_id").range(from, to),
      ),
      fetchAll<{ course_id: string }>(async (from, to) =>
        await adminClient.from("lessons").select("course_id").range(from, to),
      ),
    ]);

    const enrollCountByCourse = new Map<string, number>();
    for (const e of enrollments) enrollCountByCourse.set(e.course_id, (enrollCountByCourse.get(e.course_id) ?? 0) + 1);

    const lessonCountByCourse = new Map<string, number>();
    for (const l of lessons) lessonCountByCourse.set(l.course_id, (lessonCountByCourse.get(l.course_id) ?? 0) + 1);

    const enrollmentsByCourse = courses
      .map((c) => ({
        courseId: c.id,
        title: c.title,
        students: enrollCountByCourse.get(c.id) ?? 0,
        lessons: lessonCountByCourse.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 10);

    return json(200, {
      userActivity24h,
      weekly,
      roleBreakdown: {
        students: totalStudents,
        teachers: totalTeachers,
        admins: totalAdmins,
      },
      enrollmentsByCourse,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("admin-analytics error:", error);
    return json(500, { error: (error as any)?.message ?? "Unknown error" });
  }
});
