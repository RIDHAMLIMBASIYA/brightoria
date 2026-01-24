import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: "student" | "teacher" | "admin";
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role;

    if (!name) return json(400, { error: "Name is required" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Valid email is required" });
    if (!password || password.length < 8) return json(400, { error: "Password must be at least 8 characters" });
    if (!role || !["student", "teacher", "admin"].includes(role)) return json(400, { error: "Invalid role" });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !created?.user?.id) return json(400, { error: createError?.message ?? "Failed to create user" });

    const newUserId = created.user.id;

    // Ensure profile name is set.
    await adminClient.from("profiles").update({ name }).eq("user_id", newUserId);

    // Enforce a single role row per user: replace any existing roles.
    await adminClient.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleInsertError } = await adminClient.from("user_roles").insert({ user_id: newUserId, role });
    if (roleInsertError) return json(500, { error: roleInsertError.message });

    return json(200, { ok: true, userId: newUserId });
  } catch (error) {
    console.error("admin-create-user error:", error);
    return json(500, { error: "Unknown error" });
  }
});
