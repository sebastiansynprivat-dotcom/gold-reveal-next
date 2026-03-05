import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein Experte für MassDM-Nachrichten auf OnlyFans / Fansly.
Deine Aufgabe: Generiere eine kurze, lockere MassDM-Nachricht auf Deutsch, die sich natürlich anfühlt.

Regeln:
- Schreibe auf Deutsch, locker und umgangssprachlich
- Die Nachricht soll sich wie eine normale, spontane Nachricht anfühlen
- Ton: locker, neugierig, flirty – manchmal auch ein bisschen versaut/frech, aber nie vulgär oder extrem explizit
- Beispiele für den Stil: "Hey, bist du gerade zufällig auch online? 😊", "Was geht bei dir gerade so?", "Bist du gerade auch so gelangweilt wie ich? 😅", "Ich bin gerade so horny, bist du zufällig auch online? 😏", "Ich hab da was für dich... willst du's sehen? 🙈"
- Maximal 1-2 kurze Sätze
- Nutze Emojis sparsam (max 1-2)
- WICHTIG: Variiere das Wording jedes Mal stark, damit sich keine Nachricht mit der eines anderen Chatters doppelt. Nutze unterschiedliche Formulierungen, Satzstrukturen und Wörter.
- Antworte NUR mit der Nachricht selbst, keine Erklärungen drumherum`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { previousMessages = [] } = await req.json().catch(() => ({ previousMessages: [] }));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add previous messages as context so the AI avoids repeating them
    if (previousMessages.length > 0) {
      messages.push({
        role: "user",
        content: `Hier sind MassDM-Nachrichten die ich bereits generiert habe. Generiere eine KOMPLETT ANDERE Nachricht die sich deutlich davon unterscheidet:\n\n${previousMessages.map((m: string, i: number) => `${i + 1}. "${m}"`).join("\n")}`,
      });
      messages.push({
        role: "assistant",
        content: "Verstanden, ich generiere eine komplett andere Nachricht mit anderem Wording und Stil.",
      });
    }

    messages.push({
      role: "user",
      content: `Generiere jetzt eine neue, einzigartige MassDM-Nachricht. Timestamp: ${Date.now()}`,
    });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          temperature: 1.5,
          messages,
        }),
      }
    );
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte warte einen Moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Kontingent aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "KI-Service nicht verfügbar." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Fehler bei der Generierung.";

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-massdm error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
