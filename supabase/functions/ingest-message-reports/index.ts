import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json();
    const rows = Array.isArray(body) ? body : [body];

    const validated: { account_id: string; date: string; main: number; follow: number }[] = [];
    for (const r of rows) {
      if (!r || typeof r !== "object") return json({ error: "Invalid row" }, 400);
      const { account_id, date, main, follow } = r as Record<string, unknown>;
      if (typeof account_id !== "string" || !uuidRe.test(account_id)) {
        return json({ error: "account_id must be a UUID" }, 400);
      }
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ error: "date must be YYYY-MM-DD" }, 400);
      }
      const mainN = Number(main);
      const followN = Number(follow);
      if (!Number.isInteger(mainN) || mainN < 0) return json({ error: "main must be a non-negative integer" }, 400);
      if (!Number.isInteger(followN) || followN < 0) return json({ error: "follow must be a non-negative integer" }, 400);
      validated.push({ account_id, date, main: mainN, follow: followN });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("message_reports")
      .upsert(validated, { onConflict: "account_id,date" })
      .select();

    if (error) {
      console.error("Upsert error:", error);
      return json({ error: error.message }, 500);
    }
    return json({ success: true, count: data?.length ?? 0, rows: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", message);
    return json({ error: message }, 500);
  }
});
