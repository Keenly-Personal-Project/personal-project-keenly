import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isImageRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const triggers = [
    'generate image', 'create image', 'draw ', 'draw me', 'make a picture',
    'make an image', 'generate a picture', 'create a picture', 'show me an image',
    'illustrate', 'paint ', 'paint me', 'sketch ', 'sketch me', 'design an image',
    'generate a photo', 'create a visual', 'make a visual', 'generate art',
    'create art', 'draw an image', 'make image', 'generate picture',
  ];
  return triggers.some(t => lower.includes(t));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const shouldGenerateImage = lastUserMsg && isImageRequest(lastUserMsg.content);

    if (shouldGenerateImage) {
      // Non-streaming image generation
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
            ...messages,
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
              "You are Ryu, a helpful AI study assistant. Help students with their questions about classes, assignments, notes, and general studying. Keep answers clear, concise, and encouraging. You can also generate images — if a user wants an image, tell them to say something like 'generate image of...' or 'draw me a...'.",
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
