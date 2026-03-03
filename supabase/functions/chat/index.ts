import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist der Brezzels Support-Assistent. Du hilfst Chattern bei Fragen rund um die Plattform, ihr Earnings-Dashboard und technische Themen. Antworte immer auf Deutsch, freundlich und präzise.

FAQ-Wissen:

**Auszahlung:**
- Auszahlungen erfolgen am 1. und 15. jedes Monats.
- Mindestbetrag für eine Auszahlung: 50€.
- Auszahlungen werden per Banküberweisung oder PayPal abgewickelt.

**Provision & Gold-Status:**
- Starter-Rate: 20% Provision auf den gesamten Umsatz.
- Ab 2.000€ Gesamtumsatz wird automatisch der "Gold-Status" aktiviert.
- Im Gold-Status erhältst du 25% Provision – und zwar auf den GESAMTEN Umsatz, nicht nur auf den Teil über 2.000€.

**Rate erhöhen:**
- Erreiche 2.000€ Umsatz, um automatisch auf 25% aufzusteigen.
- Konzentriere dich auf regelmäßige Aktivität und qualitativ hochwertige Gespräche.

**Technische Probleme:**
- Bei Login-Problemen: Cache leeren und neu einloggen.
- Bei Telegram-Problemen: Telegram-ID im Dashboard prüfen und neu speichern.
- Bei anhaltenden Problemen: Support unter support@brezzels.com kontaktieren.

**Telegram-ID:**
- Die Telegram-ID findest du in der Telegram-App unter Einstellungen → Benutzername.
- Trage sie im Dashboard ein, damit du Benachrichtigungen erhältst.

Beantworte Fragen basierend auf diesem Wissen. Wenn du etwas nicht weißt, verweise auf support@brezzels.com.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
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
            ...messages,
          ],
          stream: true,
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
          JSON.stringify({ error: "KI-Kontingent aufgebraucht. Bitte später erneut versuchen." }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
