// Batch translator via Lovable AI Gateway.
// Body: { strings: string[], sourceLang?: "de"|"en", targetLang?: "de"|"en" }
// Default: de -> en. Returns { translations: string[] } in same order.
// Public (verify_jwt = false) — short input cap (200) prevents abuse.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LANG_NAMES: Record<string, string> = { de: "German", en: "English" };

function systemPrompt(source: string, target: string) {
  return `You are a professional ${source}→${target} UI translator for a chatter/creator-economy dashboard.
Rules:
- Translate each input string to natural, concise ${target} suitable for app UI / push notifications / system prompts.
- Keep tone: friendly, motivating, slightly informal (use "you" / informal "du").
- Preserve emojis, numbers, placeholders like {name}, {{count}}, %s, and currency symbols exactly.
- Keep product names unchanged: SheX, BasedBuilders, Maloum, Brezzels, 4Based, Fanvue, Telegram, WhatsApp, Lovable, Loom, Trustpilot.
- Keep €, £, $ and amounts unchanged.
- Multi-line text: keep paragraph & list structure (newlines, dashes, numbered lists, emoji bullets).
- Do NOT add explanations, extra quotes, or extra punctuation. Do NOT escape quotes (write " not \\"). Do NOT add any non-Latin characters (no Chinese, Japanese, Korean, Arabic, etc.) unless the source already contains them.
- If a string is already in ${target}, return it unchanged.
- Return ONLY a JSON object: {"t": ["...", "...", ...]} with translations in the same order.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const strings: unknown = body?.strings;
    const sourceLang = body?.sourceLang === "en" ? "en" : "de";
    const targetLang = body?.targetLang === "de" ? "de" : "en";
    if (sourceLang === targetLang) {
      const passthrough = Array.isArray(strings) ? strings.map((s) => String(s ?? "")) : [];
      return new Response(JSON.stringify({ translations: passthrough }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(strings) || strings.length === 0) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inputs = strings.map((s) => String(s ?? "")).slice(0, 200);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt(LANG_NAMES[sourceLang], LANG_NAMES[targetLang]) },
          { role: "user", content: JSON.stringify({ strings: inputs }) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translations",
              description: `Return the ${LANG_NAMES[targetLang]} translations in input order.`,
              parameters: {
                type: "object",
                properties: {
                  t: { type: "array", items: { type: "string" }, minItems: inputs.length, maxItems: inputs.length },
                },
                required: ["t"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_translations" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("AI gateway error", resp.status, text);
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: "ai_gateway", status, detail: text.slice(0, 500) }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    let parsed: any = null;
    try { parsed = typeof args === "string" ? JSON.parse(args) : args; } catch {}
    let out: string[] = Array.isArray(parsed?.t) ? parsed.t.map((s: unknown) => String(s ?? "")) : [];
    if (out.length < inputs.length) out = [...out, ...inputs.slice(out.length)];
    else if (out.length > inputs.length) out = out.slice(0, inputs.length);

    return new Response(JSON.stringify({ translations: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-batch error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
