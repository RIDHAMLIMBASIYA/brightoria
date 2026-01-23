import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  path?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { path } = (await req.json().catch(() => ({}))) as Payload;
    const objectPath = (path ?? "").trim();
    if (!objectPath) {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-context client: validates JWT.
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client: used to sign URLs after we perform explicit authorization checks.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = (claimsData.claims as any)?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role check (service role to avoid any RLS edge cases).
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = (roleRow as any)?.role as string | undefined;
    const isAdmin = role === "admin";

    // Authorize via DB references to this object path.
    // 1) Notes attachment
    const { data: noteRow } = await supabaseAdmin
      .from("notes")
      .select("course_id")
      .eq("file_url", objectPath)
      .maybeSingle();

    if (noteRow?.course_id) {
      if (isAdmin) {
        // ok
      } else {
        const { data: courseRow } = await supabaseAdmin
          .from("courses")
          .select("teacher_id")
          .eq("id", noteRow.course_id)
          .maybeSingle();

        const isTeacher = courseRow?.teacher_id === userId;
        if (!isTeacher) {
          const { data: enrollment } = await supabaseAdmin
            .from("enrollments")
            .select("id")
            .eq("course_id", noteRow.course_id)
            .eq("student_id", userId)
            .maybeSingle();

          if (!enrollment) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } else {
      // 2) Assignment submission attachment
      const { data: subRow } = await supabaseAdmin
        .from("assignment_submissions")
        .select("student_id, assignment_id")
        .eq("file_url", objectPath)
        .maybeSingle();

      if (!subRow) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!isAdmin && subRow.student_id !== userId) {
        const { data: assignmentRow } = await supabaseAdmin
          .from("assignments")
          .select("course_id")
          .eq("id", subRow.assignment_id)
          .maybeSingle();

        if (!assignmentRow?.course_id) {
          return new Response(JSON.stringify({ error: "File not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: courseRow } = await supabaseAdmin
          .from("courses")
          .select("teacher_id")
          .eq("id", assignmentRow.course_id)
          .maybeSingle();

        const isTeacher = courseRow?.teacher_id === userId;
        if (!isTeacher) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("uploads")
      .createSignedUrl(objectPath, 60 * 60); // 1 hour

    if (signError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to sign URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
