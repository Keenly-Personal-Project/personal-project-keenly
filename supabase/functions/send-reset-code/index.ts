import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateHexCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    // Check if user exists
    const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
    const userExists = users?.users?.some(u => u.email === email.toLowerCase());
    if (!userExists) {
      // Don't reveal whether email exists - still return success
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invalidate old codes for this email
    await supabase.from("password_reset_codes").update({ used: true }).eq("email", email.toLowerCase()).eq("used", false);

    // Generate hex code
    const code = generateHexCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

    // Store code
    const { error: insertErr } = await supabase.from("password_reset_codes").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("Failed to store code:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to generate code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the hex code via transactional email
    const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "password-reset-code",
        recipientEmail: email.toLowerCase(),
        idempotencyKey: `reset-code-${code}`,
        templateData: { code },
      },
    });

    if (emailErr) {
      console.error("Failed to send reset email:", emailErr);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-reset-code error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
