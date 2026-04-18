import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateHexCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password } = await req.json();
    if (!email || !password || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    });

    const normalizedEmail = email.trim().toLowerCase();

    // Create user (auto-confirmed) via admin API. If user already exists, return clear error.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      const msg = (createErr?.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return new Response(JSON.stringify({ error: "This email is already registered. Please log in instead." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Failed to create user:", createErr);
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create account" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invalidate old codes for this email
    await supabase.from("login_codes").update({ used: true }).eq("email", normalizedEmail).eq("used", false);

    const code = generateHexCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("login_codes").insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("Failed to store signup code:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to generate code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the verification code (reuse the login-verification-code template)
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "login-verification-code",
          recipientEmail: normalizedEmail,
          idempotencyKey: `signup-code-${code}`,
          templateData: { code },
        },
      });
    } catch (e) {
      console.log("Transactional email send failed (code still stored):", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-signup-code error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
