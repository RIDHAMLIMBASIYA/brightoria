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

async function countAuthUsers(adminClient: any) {
  const perPage = 200;
  let page = 1;
  let total = 0;
  // Hard safety cap.
  const maxPages = 200; // 40k users max for counting.

  while (page <= maxPages) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const chunk = data.users ?? [];
    total += chunk.length;

    if (chunk.length < perPage) break;
    page += 1;
  }

  return total;
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

    // User-scoped client: validate JWT + check caller role via RLS-safe read.
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

    const [totalUsers, coursesCount, enrollmentsCount] = await Promise.all([
      countAuthUsers(adminClient),
      adminClient.from("courses").select("id", { count: "exact", head: true }),
      adminClient.from("enrollments").select("id", { count: "exact", head: true }),
    ]);

    if (coursesCount.error) throw new Error(coursesCount.error.message);
    if (enrollmentsCount.error) throw new Error(enrollmentsCount.error.message);

    return json(200, {
      totalUsers,
      totalCourses: coursesCount.count ?? 0,
      totalEnrollments: enrollmentsCount.count ?? 0,
    });
  } catch (error) {
    console.error("admin-stats error:", error);
    return json(500, { error: (error as any)?.message ?? "Unknown error" });
  }
});
