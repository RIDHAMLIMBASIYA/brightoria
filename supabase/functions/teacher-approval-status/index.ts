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

type Body = {
  userIds?: string[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is authenticated.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json(401, { error: "Unauthorized" });

    const body = (await req.json().catch(() => ({}))) as Body;
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (userIds.length === 0) return json(200, { approvals: [] });
    if (userIds.length > 2000) return json(400, { error: "Too many userIds" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient
      .from("teacher_approvals")
      .select("user_id,approved")
      .in("user_id", userIds);
    if (error) throw new Error(error.message);

    const approvals = (data ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      approved: Boolean(r.approved),
    }));

    return json(200, { approvals });
  } catch (e) {
    console.error("teacher-approval-status error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
