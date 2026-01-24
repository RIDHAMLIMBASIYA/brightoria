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
  subject: string | null;
  qualification: string | null;
  experienceYears: number | null;
  university: string | null;
  joinedAt: string;
};

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Approved teachers only.
    const { data: approvals, error: approvalsError } = await adminClient
      .from("teacher_approvals")
      .select("user_id")
      .eq("approved", true);
    if (approvalsError) throw new Error(approvalsError.message);

    const approvedIds = (approvals ?? []).map((r) => r.user_id as string).filter(Boolean);
    if (approvedIds.length === 0) return json(200, teacherId ? null : []);

    if (teacherId && !approvedIds.includes(teacherId)) return json(404, { error: "Not found" });

    const idsToFetch = teacherId ? [teacherId] : approvedIds;

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("user_id,name,avatar_url,subject,qualification,experience_years,university,created_at")
      .in("user_id", idsToFetch);
    if (profilesError) throw new Error(profilesError.message);

    // Extra guard: only keep users that are teachers.
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", idsToFetch);
    if (rolesError) throw new Error(rolesError.message);

    const isTeacher = new Set(
      (roles ?? []).filter((r) => r.role === "teacher").map((r) => r.user_id as string),
    );

    const items: TeacherDirectoryItem[] = (profiles ?? [])
      .filter((p: any) => isTeacher.has(p.user_id))
      .map((p: any) => ({
        id: p.user_id,
        name: p.name,
        avatarUrl: p.avatar_url ?? null,
        subject: p.subject ?? null,
        qualification: p.qualification ?? null,
        experienceYears: typeof p.experience_years === "number" ? p.experience_years : null,
        university: p.university ?? null,
        joinedAt: p.created_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (teacherId) return json(200, items[0] ?? null);
    return json(200, items);
  } catch (e) {
    console.error("teachers-directory error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
