import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = {
  page?: number;
  pageSize?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client: validate JWT + check caller role via RLS-safe read of own role.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const { data: callerRole, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleError) {
      return new Response(JSON.stringify({ error: "Authorization check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerRole?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const page = Math.max(1, Number(body.page ?? 1));
    const pageSize = Math.min(200, Math.max(10, Number(body.pageSize ?? 50)));

    // Admin client: read auth users (email) + profiles (name)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (usersError) {
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUsers = usersData.users ?? [];
    const userIds = authUsers.map((u) => u.id);

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("user_id, name")
      .in("user_id", userIds);

    if (profilesError) {
      return new Response(JSON.stringify({ error: profilesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nameByUserId = new Map<string, string>();
    for (const p of profiles ?? []) {
      const row = p as any;
      if (row?.user_id) nameByUserId.set(row.user_id, row.name ?? "");
    }

    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) {
      return new Response(JSON.stringify({ error: rolesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bestRoleByUserId = new Map<string, string>();
    const priority: Record<string, number> = { admin: 3, teacher: 2, student: 1 };
    for (const r of roles ?? []) {
      const row = r as any;
      const uid = row?.user_id as string | undefined;
      const role = row?.role as string | undefined;
      if (!uid || !role) continue;
      const existing = bestRoleByUserId.get(uid);
      if (!existing || (priority[role] ?? 0) > (priority[existing] ?? 0)) {
        bestRoleByUserId.set(uid, role);
      }
    }

    const results = authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name:
        nameByUserId.get(u.id) ||
        (u.user_metadata?.name as string | undefined) ||
        (u.email ? u.email.split("@")[0] : ""),
      role: bestRoleByUserId.get(u.id) ?? "student",
      createdAt: u.created_at,
    }));

    return new Response(
      JSON.stringify({
        users: results,
        page,
        pageSize,
        hasMore: results.length === pageSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-list-users error:", error);
    return new Response(JSON.stringify({ error: "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
