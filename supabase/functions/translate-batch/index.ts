// Batch translator via Lovable AI Gateway with shared DB cache.
// Body: { strings: string[], sourceLang?: "de"|"en", targetLang?: "de"|"en" }
// Default: de -> en. Returns { translations: string[] } in same order.
// First checks public.translation_cache; only sends uncached strings to the AI gateway,
// then writes the new translations back to the cache so every chatter benefits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // ---- Shared DB cache lookup ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const out: string[] = new Array(inputs.length).fill("");
    const uniqueSources = Array.from(new Set(inputs.filter((s) => s.length > 0)));

    const cacheMap = new Map<string, string>();
    if (uniqueSources.length > 0) {
      // Query in chunks (avoid overly long IN lists)
      const CHUNK = 100;
      for (let i = 0; i < uniqueSources.length; i += CHUNK) {
        const chunk = uniqueSources.slice(i, i + CHUNK);
        const { data, error } = await admin
          .from("translation_cache")
          .select("source_text, translated_text")
          .eq("source_lang", sourceLang)
          .eq("target_lang", targetLang)
          .in("source_text", chunk);
        if (error) {
          console.error("cache lookup error", error);
        } else if (data) {
          for (const row of data) cacheMap.set(row.source_text as string, row.translated_text as string);
        }
      }
    }

    // Fill cached + collect misses
    const missIndexes: number[] = [];
    const missTexts: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const s = inputs[i];
      if (!s) { out[i] = s; continue; }
      const hit = cacheMap.get(s);
      if (hit !== undefined) {
        out[i] = hit;
      } else {
        missIndexes.push(i);
        missTexts.push(s);
      }
    }

    // Deduplicate misses before sending to AI
    const uniqMiss = Array.from(new Set(missTexts));

    if (uniqMiss.length > 0) {
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
            { role: "user", content: JSON.stringify({ strings: uniqMiss }) },
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
                    t: { type: "array", items: { type: "string" }, minItems: uniqMiss.length, maxItems: uniqMiss.length },
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
      let translated: string[] = Array.isArray(parsed?.t) ? parsed.t.map((s: unknown) => String(s ?? "")) : [];
      if (translated.length < uniqMiss.length) translated = [...translated, ...uniqMiss.slice(translated.length)];
      else if (translated.length > uniqMiss.length) translated = translated.slice(0, uniqMiss.length);

      // Map back & persist
      const newMap = new Map<string, string>();
      for (let i = 0; i < uniqMiss.length; i++) newMap.set(uniqMiss[i], translated[i]);
      for (const idx of missIndexes) out[idx] = newMap.get(inputs[idx]) ?? inputs[idx];

      // Write back to cache (best-effort)
      const rows = uniqMiss.map((src) => ({
        source_lang: sourceLang,
        target_lang: targetLang,
        source_text: src,
        translated_text: newMap.get(src) ?? src,
      }));
      // Upsert in chunks to stay well below request limits
      const UPSERT_CHUNK = 100;
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK);
        const { error } = await admin
          .from("translation_cache")
          .upsert(chunk, { onConflict: "source_lang,target_lang,source_text", ignoreDuplicates: true });
        if (error) console.error("cache upsert error", error);
      }
    }

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
