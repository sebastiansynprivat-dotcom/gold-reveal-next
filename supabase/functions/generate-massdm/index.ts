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
- Ton: locker, neugierig, ein bisschen flirty aber NICHT sexuell oder explizit
- Beispiele für den Stil: "Hey, bist du gerade zufällig auch online? 😊", "Was geht bei dir gerade so?", "Bist du gerade auch so gelangweilt wie ich? 😅"
- Maximal 1-2 kurze Sätze
- Nutze Emojis sparsam (max 1-2)
- WICHTIG: Variiere das Wording jedes Mal stark, damit sich keine Nachricht mit der eines anderen Chatters doppelt. Nutze unterschiedliche Formulierungen, Satzstrukturen und Wörter.
- Antworte NUR mit der Nachricht selbst, keine Erklärungen drumherum`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "Generiere eine neue MassDM-Nachricht." },
          ],
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
