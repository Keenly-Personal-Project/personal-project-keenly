import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { storagePath, mimeType, title, className, audioBase64: legacyB64 } = body ?? {};
    if (!mimeType) {
      return new Response(JSON.stringify({ error: "mimeType required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let audioBase64: string | undefined = legacyB64;

    // New path: download from storage server-side using service role.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!audioBase64 && storagePath) {
      // Enforce that the path starts with the caller's user id (matches storage RLS folder convention).
      if (!storagePath.startsWith(`${userId}/`)) {
        return new Response(JSON.stringify({ error: "Forbidden path" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: fileData, error: dlErr } = await adminClient.storage
        .from("meeting-recordings")
        .download(storagePath);
      if (dlErr || !fileData) {
        return new Response(JSON.stringify({ error: `Download failed: ${dlErr?.message}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const buf = new Uint8Array(await fileData.arrayBuffer());
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)));
      }
      audioBase64 = btoa(binary);
    }

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "storagePath or audioBase64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dataUrl = `data:${mimeType};base64,${audioBase64}`;

    const prompt = `You are summarizing a class recording${className ? ` for the class "${className}"` : ""}${title ? ` titled "${title}"` : ""}. Listen to the audio and produce a clear, well-structured summary for students.

Format your response in clean Markdown using these section headings (use "##" — never bold/asterisks):

## Overview
A 2-3 sentence paragraph summarizing what the recording covers.

## Key Points
- Bullet points of the most important ideas, concepts, or announcements.

## Action Items
- Only include this section if homework or follow-ups were actually mentioned.

Strict rules:
- Do NOT use bold (**), italics (*), or any asterisk-based emphasis. Use plain text and headings only.
- Use "-" for bullets.
- Write in a natural, readable tone — like a real study summary, not a transcript dump.
- Be concise, accurate, and faithful to what was actually said. Do not invent content.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    // Best-effort cleanup of the temp file.
    if (storagePath && storagePath.includes("/_summary_tmp/")) {
      adminClient.storage.from("meeting-recordings").remove([storagePath]).catch(() => {});
    }

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-recording error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
