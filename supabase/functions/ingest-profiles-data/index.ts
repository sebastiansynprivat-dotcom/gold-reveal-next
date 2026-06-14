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

interface Row {
  telegram_id: string;
  date: string;
  revenue?: number;
  mass_dm?: number;
  unread_chats?: number;
  oldest_chat?: number;
  models?: unknown;
}

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

    const rawRows = Array.isArray(body) ? body : [body];
    if (rawRows.length === 0) return json({ error: "Empty payload" }, 400);

    const validated: Row[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i] as Record<string, unknown>;
      if (!r || typeof r !== "object") return json({ error: `Row ${i}: must be an object` }, 400);

      const telegram_id = typeof r.telegram_id === "string" ? r.telegram_id.trim() : "";
      if (!telegram_id) return json({ error: `Row ${i}: telegram_id required` }, 400);

      const date = typeof r.date === "string" ? r.date.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: `Row ${i}: date must be YYYY-MM-DD` }, 400);

      const num = (v: unknown, name: string, int = false): number | null => {
        if (v === undefined || v === null) return 0;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        if (int && !Number.isInteger(n)) return null;
        return n;
      };

      const revenue = num(r.revenue, "revenue");
      const mass_dm = num(r.mass_dm, "mass_dm", true);
      const unread_chats = num(r.unread_chats, "unread_chats", true);
      const oldest_chat = num(r.oldest_chat, "oldest_chat", true);

      if (revenue === null) return json({ error: `Row ${i}: revenue must be a number` }, 400);
      if (mass_dm === null) return json({ error: `Row ${i}: mass_dm must be an integer` }, 400);
      if (unread_chats === null) return json({ error: `Row ${i}: unread_chats must be an integer` }, 400);
      if (oldest_chat === null) return json({ error: `Row ${i}: oldest_chat must be an integer` }, 400);

      validated.push({
        telegram_id,
        date,
        revenue,
        mass_dm,
        unread_chats,
        oldest_chat,
        models: r.models ?? [],
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("profiles_data")
      .upsert(validated, { onConflict: "telegram_id,date" })
      .select();

    if (error) {
      console.error("Upsert error:", error);
      return json({ error: error.message }, 500);
    }
    return json({ success: true, count: data?.length ?? 0, rows: data });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
