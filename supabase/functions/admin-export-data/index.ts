// Admin-only data export (data-only, ZIP of JSON)
// Exports are generated server-side, uploaded to private storage, and returned as a short-lived signed URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExportRequest = {
  scope?: "admin_tables";
  format?: "zip_json";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing backend env vars");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user with anon key
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("auth.getUser failed", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Service client for privileged reads + storage operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleRows, error: roleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (roleErr) {
      console.error("role check failed", roleErr);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ExportRequest = req.body ? await req.json().catch(() => ({})) : {};
    if (body.scope && body.scope !== "admin_tables") {
      return new Response(JSON.stringify({ error: "Invalid scope" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.format && body.format !== "zip_json") {
      return new Response(JSON.stringify({ error: "Invalid format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting admin export", { userId, scope: body.scope ?? "admin_tables" });

    const [profilesRes, rolesRes, approvalsRes] = await Promise.all([
      adminClient.from("profiles").select("*").order("created_at", { ascending: true }),
      adminClient.from("user_roles").select("*").order("user_id", { ascending: true }),
      adminClient.from("teacher_approvals").select("*").order("created_at", { ascending: true }),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (rolesRes.error) throw rolesRes.error;
    if (approvalsRes.error) throw approvalsRes.error;

    const zip = new JSZip();
    zip.file("profiles.json", JSON.stringify(profilesRes.data ?? [], null, 2));
    zip.file("user_roles.json", JSON.stringify(rolesRes.data ?? [], null, 2));
    zip.file("teacher_approvals.json", JSON.stringify(approvalsRes.data ?? [], null, 2));
    zip.file(
      "README.txt",
      [
        "Brightoria admin export",
        "",
        "Contents: profiles, user_roles, teacher_approvals",
        "Format: JSON (data-only export)",
      ].join("\n"),
    );

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `admin-export-${timestamp}.zip`;
    const objectPath = `admin-exports/${userId}/${filename}`;

    const { error: uploadErr } = await adminClient.storage
      .from("uploads")
      .upload(objectPath, zipBytes, {
        contentType: "application/zip",
        upsert: true,
      });
    if (uploadErr) {
      console.error("upload failed", uploadErr);
      return new Response(JSON.stringify({ error: "Export upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signedErr } = await adminClient.storage
      .from("uploads")
      .createSignedUrl(objectPath, 60);
    if (signedErr || !signed?.signedUrl) {
      console.error("signed url failed", signedErr);
      return new Response(JSON.stringify({ error: "Export signing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl: signed.signedUrl, filename }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-export-data error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
