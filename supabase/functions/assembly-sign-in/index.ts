import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ result: "error", message: "Method not allowed" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ result: "auth_required" }, 401);

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!/^[A-Za-z0-9]{8,128}$/.test(token)) return json({ result: "not_found" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (userError || !userId) return json({ result: "auth_required" }, 401);

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: assembly, error: assemblyError } = await adminClient
      .from("assemblies")
      .select("id,title,late_time,absent_time,class_slug")
      .eq("qr_token", token)
      .maybeSingle();

    if (assemblyError) throw assemblyError;
    if (!assembly) return json({ result: "not_found" });

    const { data: member, error: memberError } = await adminClient
      .from("keen_members")
      .select("id")
      .eq("class_slug", assembly.class_slug)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return json({ result: "not_member", assembly_title: assembly.title, class_slug: assembly.class_slug, assembly_id: assembly.id });
    }

    const now = new Date();
    const lateTime = new Date(assembly.late_time);
    const absentTime = new Date(assembly.absent_time);
    if (now > absentTime) {
      return json({ result: "expired", attendance_status: "absent", assembly_title: assembly.title, class_slug: assembly.class_slug, assembly_id: assembly.id });
    }

    const attendanceStatus = now > lateTime ? "late" : "present";
    const { data: existing, error: existingError } = await adminClient
      .from("assembly_attendance")
      .select("id,status,signed_in_at")
      .eq("assembly_id", assembly.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing && existing.status !== "pending" && existing.signed_in_at) {
      return json({ result: "already", attendance_status: existing.status, assembly_title: assembly.title, class_slug: assembly.class_slug, assembly_id: assembly.id });
    }

    const payload = {
      assembly_id: assembly.id,
      user_id: userId,
      signed_in_at: now.toISOString(),
      status: attendanceStatus,
    };

    const write = existing
      ? adminClient.from("assembly_attendance").update(payload).eq("id", existing.id)
      : adminClient.from("assembly_attendance").insert(payload);

    const { error: writeError } = await write;
    if (writeError) throw writeError;

    return json({ result: "signed_in", attendance_status: attendanceStatus, assembly_title: assembly.title, class_slug: assembly.class_slug, assembly_id: assembly.id });
  } catch (error) {
    console.error("assembly-sign-in error:", error);
    return json({ result: "error", message: "Could not record attendance. Please retry." }, 500);
  }
});