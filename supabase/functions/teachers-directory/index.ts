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

type TeacherDirectoryItem = {
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

async function fetchAll<T>(
  queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
  pageSize = 1000,
  maxRows = 50_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await queryFactory(from, to);
    if (error) throw new Error(error.message ?? "Failed to fetch data");
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return out;
}

function approvalStatusFor(
  approvalById: Map<string, boolean>,
  userId: string,
): TeacherDirectoryItem["approvalStatus"] {
  if (!approvalById.has(userId)) return "missing";
  return approvalById.get(userId) ? "approved" : "pending";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });

    const url = new URL(req.url);
    const teacherId = (url.searchParams.get("teacherId") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? "200") || 200));

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // All teachers (including pending) from roles table.
    const teacherRoles = await fetchAll<{ user_id: string; role: string }>(async (from, to) => {
      const { data, error } = await adminClient
        .from("user_roles")
        .select("user_id,role")
        .eq("role", "teacher")
        .range(from, to);
      return { data, error };
    });
    const teacherIds = teacherRoles.map((r) => r.user_id).filter(Boolean);

    if (teacherId && !teacherIds.includes(teacherId)) return json(404, { error: "Not found" });
    if (!teacherId && teacherIds.length === 0) {
      const empty: TeachersDirectoryResponse = { teachers: [], page, pageSize, total: 0 };
      return json(200, empty);
    }

    const idsToFetch = teacherId ? [teacherId] : teacherIds;

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("user_id,name,avatar_url,subject,qualification,experience_years,university,bio,created_at")
      .in("user_id", idsToFetch);
    if (profilesError) throw new Error(profilesError.message);

    const { data: approvals, error: approvalsError } = await adminClient
      .from("teacher_approvals")
      .select("user_id,approved")
      .in("user_id", idsToFetch);
    if (approvalsError) throw new Error(approvalsError.message);

    const approvalById = new Map<string, boolean>();
    (approvals ?? []).forEach((r: any) => approvalById.set(r.user_id, Boolean(r.approved)));

    // Sort by name, then paginate.
    const base = (profiles ?? [])
      .map((p: any) => ({
        id: p.user_id as string,
        name: p.name as string,
        avatarUrl: p.avatar_url ?? null,
        subject: p.subject ?? null,
        qualification: p.qualification ?? null,
        experienceYears: typeof p.experience_years === "number" ? p.experience_years : null,
        university: p.university ?? null,
        bio: p.bio ?? null,
        joinedAt: p.created_at as string,
        approvalStatus: approvalStatusFor(approvalById, p.user_id as string),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (teacherId) {
      const one = base[0];
      if (!one) return json(200, null);
      const { data: authUser } = await adminClient.auth.admin.getUserById(one.id);
      const payload: TeacherDirectoryItem = {
        ...one,
        email: authUser?.user?.email ?? null,
      };
      return json(200, payload);
    }

    const total = base.length;
    const start = (page - 1) * pageSize;
    const pageItems = base.slice(start, start + pageSize);
    const emails = await Promise.all(
      pageItems.map(async (t) => {
        const { data } = await adminClient.auth.admin.getUserById(t.id);
        return [t.id, data?.user?.email ?? null] as const;
      }),
    );
    const emailById = new Map<string, string | null>(emails);

    const teachers: TeacherDirectoryItem[] = pageItems.map((t) => {
      const item: TeacherDirectoryItem = {
        ...t,
        email: emailById.get(t.id) ?? null,
      };
      return item;
    });

    const payload: TeachersDirectoryResponse = { teachers, page, pageSize, total };
    return json(200, payload);
  } catch (e) {
    console.error("teachers-directory error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
