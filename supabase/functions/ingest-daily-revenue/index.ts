import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected || apiKey !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // GET: list profiles with telegram_id (for the remote script to map telegram -> user_id)
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, telegram_id")
        .not("telegram_id", "is", null);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, count: data?.length ?? 0, profiles: data });
    }

    // POST: upsert daily_revenue rows [{ user_id, date, amount }]
    if (req.method === "POST") {
      const body = await req.json();
      const rows = Array.isArray(body) ? body : [body];

      const validated: { user_id: string; date: string; amount: number }[] = [];
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const r of rows) {
        if (!r || typeof r !== "object") return json({ error: "Invalid row" }, 400);
        const { user_id, date, amount } = r as Record<string, unknown>;
        if (typeof user_id !== "string" || !uuidRe.test(user_id)) {
          return json({ error: "user_id must be a UUID" }, 400);
        }
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return json({ error: "date must be YYYY-MM-DD" }, 400);
        }
        if (typeof amount !== "number" || !Number.isFinite(amount)) {
          return json({ error: "amount must be a number" }, 400);
        }
        validated.push({ user_id, date, amount });
      }

      const { data, error } = await supabase
        .from("daily_revenue")
        .upsert(validated, { onConflict: "user_id,date" })
        .select();

      if (error) {
        console.error("Upsert error:", error);
        return json({ error: error.message }, 500);
      }
      return json({ success: true, count: data?.length ?? 0, rows: data });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", message);
    return json({ error: message }, 500);
  }
});
