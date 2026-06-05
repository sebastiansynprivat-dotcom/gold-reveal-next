import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalize = (t: string) => t.trim().replace(/^@/, "").toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("ACCOUNTS_SECRET_KEY");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const rawItems = Array.isArray(body) ? body : [body];
    if (rawItems.length === 0) return json({ error: "Empty payload" }, 400);

    type Item = { telegram_id: string; name: string };
    const items: Item[] = [];
    for (const r of rawItems) {
      if (!r || typeof r !== "object") return json({ error: "Each item must be an object" }, 400);
      const { telegram_id, name } = r as Record<string, unknown>;
      if (typeof telegram_id !== "string" || !telegram_id.trim()) {
        return json({ error: "telegram_id must be a non-empty string" }, 400);
      }
      if (typeof name !== "string" || !name.trim()) {
        return json({ error: "name must be a non-empty string" }, 400);
      }
      items.push({ telegram_id: telegram_id.trim(), name: name.trim() });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: Array<{ telegram_id: string; updated: number; error?: string }> = [];
    let totalUpdated = 0;

    for (const item of items) {
      const norm = normalize(item.telegram_id);

      // Find matching profiles by normalized telegram_id
      const { data: matches, error: selErr } = await supabase
        .from("profiles")
        .select("id, telegram_id")
        .not("telegram_id", "is", null);

      if (selErr) {
        results.push({ telegram_id: item.telegram_id, updated: 0, error: selErr.message });
        continue;
      }

      const ids = (matches ?? [])
        .filter((p: any) => typeof p.telegram_id === "string" && normalize(p.telegram_id) === norm)
        .map((p: any) => p.id);

      if (ids.length === 0) {
        results.push({ telegram_id: item.telegram_id, updated: 0, error: "Not found" });
        continue;
      }

      const { data: updated, error: upErr } = await supabase
        .from("profiles")
        .update({ name: item.name })
        .in("id", ids)
        .select("id");

      if (upErr) {
        results.push({ telegram_id: item.telegram_id, updated: 0, error: upErr.message });
      } else {
        const n = updated?.length ?? 0;
        totalUpdated += n;
        results.push({ telegram_id: item.telegram_id, updated: n });
      }
    }

    return json({ success: true, total_updated: totalUpdated, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
