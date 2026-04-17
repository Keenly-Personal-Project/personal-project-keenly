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
    const { email, password } = await req.json();
    if (!email || !password || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify the password is correct by attempting sign-in (anon client, no session persistence)
    const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError || !signInData.user) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign out the temporary session immediately - they need to verify the code first
    await anonClient.auth.signOut();

    // 2. Generate & store login code
    const supabase = createClient(supabaseUrl, serviceKey);
    const normalizedEmail = email.trim().toLowerCase();

    // Invalidate old codes
    await supabase.from("login_codes").update({ used: true }).eq("email", normalizedEmail).eq("used", false);

    const code = generateHexCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    const { error: insertErr } = await supabase.from("login_codes").insert({
      email: normalizedEmail,
      code,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("Failed to store login code:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to generate code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Send email via transactional system
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "login-verification-code",
          recipientEmail: normalizedEmail,
          idempotencyKey: `login-code-${code}`,
          templateData: { code },
        },
      });
    } catch (e) {
      console.log("Transactional email not configured — code stored in DB:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-login-code error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
