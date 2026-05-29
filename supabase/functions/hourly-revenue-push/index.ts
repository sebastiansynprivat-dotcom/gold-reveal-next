import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const since = new Date(now.getTime() - 60 * 60_000);

    const { data: events, error } = await supabase
      .from("revenue_sale_events")
      .select("amount, platform")
      .gte("occurred_at", since.toISOString());

    if (error) throw error;

    const count = events?.length ?? 0;
    if (count === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no sales" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = events!.reduce((a, r: any) => a + Number(r.amount || 0), 0);
    const byPlatform = new Map<string, number>();
    for (const e of events as any[]) {
      byPlatform.set(e.platform, (byPlatform.get(e.platform) ?? 0) + Number(e.amount || 0));
    }
    const icon = (p: string) =>
      p === "maloum" ? "🟠" : p === "brezzels" ? "🔵" : p === "4based" ? "🔴" : "⚪";
    const breakdown = Array.from(byPlatform.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([p, v]) => `${icon(p)} ${v.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`)
      .join(" · ");

    const totalStr = total.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
    const title = `⏰ LETZTE STUNDE: ${totalStr}`;
    const body = `${count} Sales · ${breakdown}`;

    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        event: "new_revenue",
        title,
        body,
        url: "/admin",
        tag: "hourly-revenue",
      }),
    });

    return new Response(JSON.stringify({ sent: true, count, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
