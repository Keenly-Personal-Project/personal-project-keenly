import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isImageRequest(messages: { role: string; content: string }[]): boolean {
  const triggers = [
    'generate image', 'create image', 'draw ', 'draw me', 'make a picture',
    'make an image', 'generate a picture', 'create a picture', 'show me an image',
    'illustrate', 'paint ', 'paint me', 'sketch ', 'sketch me', 'design an image',
    'generate a photo', 'create a visual', 'make a visual', 'generate art',
    'create art', 'draw an image', 'make image', 'generate picture',
    'generate an image', 'image of', 'picture of',
  ];

  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return false;
  const lower = lastUser.content.toLowerCase();
  if (triggers.some(t => lower.includes(t))) return true;

  const recentMessages = messages.slice(-4);
  const assistantMentionedImage = recentMessages.some(
    m => m.role === "assistant" && /generat|draw|image|picture|illustrat|paint|sketch/i.test(m.content)
  );
  const userMentionedImage = recentMessages.some(
    m => m.role === "user" && triggers.some(t => m.content.toLowerCase().includes(t))
  );

  if (assistantMentionedImage && userMentionedImage) return true;

  const prevAssistant = [...messages].reverse().find(m => m.role === "assistant");
  if (prevAssistant && /what.*(?:draw|generat|creat|image|picture)|tell me.*(?:draw|image)/i.test(prevAssistant.content)) {
    return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const shouldGenerateImage = isImageRequest(messages);

    if (shouldGenerateImage) {
      const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "system",
              content: "You are Ryu, a helpful AI study assistant. Generate images based on the user's description. Provide a brief, friendly description of what you created.",
            },
            { role: "user", content: lastUser?.content || "Generate an image" },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image gen error:", response.status, t);
        return new Response(
          JSON.stringify({ error: "Failed to generate image. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "Here's the image I generated for you!";
      const images = (data.choices?.[0]?.message?.images || [])
        .map((img: any) => img.image_url?.url)
        .filter(Boolean);

      return new Response(
        JSON.stringify({ type: "image", content, images }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normal streaming text response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are Ryu, a helpful AI study assistant. Help students with their questions about classes, assignments, notes, and general studying. Keep answers clear, concise, and encouraging. You can also generate images — if a user wants an image, tell them to say something like 'generate image of...' or 'draw me a...'. IMPORTANT: Never output JSON actions, code blocks with dalle/image actions, or tool-use formatted responses. Just respond naturally in plain text.",
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
