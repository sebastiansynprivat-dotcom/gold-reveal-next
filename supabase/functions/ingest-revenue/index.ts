import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLATFORMS = ["new", "maloum", "4based", "brezzels"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected || apiKey !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rows = Array.isArray(body) ? body : [body];

    const validated = [];
    for (const r of rows) {
      if (!r || typeof r !== "object") {
        return new Response(JSON.stringify({ error: "Invalid row" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { date, platform, data, revenue_today } = r as Record<string, unknown>;
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof platform !== "string" || !ALLOWED_PLATFORMS.includes(platform)) {
        return new Response(
          JSON.stringify({ error: `platform must be one of ${ALLOWED_PLATFORMS.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (revenue_today !== undefined && revenue_today !== null && typeof revenue_today !== "number") {
        return new Response(JSON.stringify({ error: "revenue_today must be a number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validated.push({
        date,
        platform,
        data: data ?? null,
        revenue_today: revenue_today ?? null,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch existing rows so we can diff individual sales
    const keys = validated.map((r) => ({ date: r.date, platform: r.platform }));
    const { data: existingRows } = await supabase
      .from("revenue_report")
      .select("date, platform, data")
      .in("date", Array.from(new Set(keys.map((k) => k.date))))
      .in("platform", Array.from(new Set(keys.map((k) => k.platform))));
    const existingMap = new Map<string, any>();
    for (const er of existingRows ?? []) {
      existingMap.set(`${er.date}|${er.platform}`, er.data ?? {});
    }

    const { data: result, error } = await supabase
      .from("revenue_report")
      .upsert(validated, { onConflict: "date,platform" })
      .select();

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget admin push for each NEW individual sale (diff vs previous data)
    try {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      for (const r of validated) {
        const newData = (r.data ?? {}) as Record<string, number[]>;
        const oldData = (existingMap.get(`${r.date}|${r.platform}`) ?? {}) as Record<string, number[]>;
        if (!newData || typeof newData !== "object") continue;

        for (const [model, salesRaw] of Object.entries(newData)) {
          const sales = Array.isArray(salesRaw) ? salesRaw.map(Number).filter((n) => Number.isFinite(n)) : [];
          const oldSales = Array.isArray(oldData[model]) ? oldData[model].map(Number).filter((n) => Number.isFinite(n)) : [];

          // Multiset diff: count occurrences in old, subtract from new
          const counts = new Map<number, number>();
          for (const v of oldSales) counts.set(v, (counts.get(v) ?? 0) + 1);
          const newSales: number[] = [];
          for (const v of sales) {
            const c = counts.get(v) ?? 0;
            if (c > 0) counts.set(v, c - 1);
            else newSales.push(v);
          }

          for (const amount of newSales) {
            fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                event: "new_revenue",
                title: "Neuer Verkauf 💰",
                body: `${r.platform === "maloum" ? "🟠" : r.platform === "brezzels" ? "🔵" : "⚪"} ${r.platform.toUpperCase()} · ${model} · ${amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`,
                url: "/admin",
              }),
            }).catch(() => {});
          }
        }
      }
    } catch (_) { /* ignore */ }


    return new Response(JSON.stringify({ success: true, count: result?.length ?? 0, rows: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
