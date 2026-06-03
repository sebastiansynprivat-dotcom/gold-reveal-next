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

type Incoming = {
  account_id: string;
  purchase_id: string;
  date: string;
  platform: string;
  amount: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected || apiKey !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json();
    const rows: unknown[] = Array.isArray(body) ? body : [body];

    const validated: Incoming[] = [];
    for (const r of rows) {
      if (!r || typeof r !== "object") return json({ error: "Invalid row" }, 400);
      const { account_id, purchase_id, date, platform, amount } = r as Record<string, unknown>;
      if (typeof account_id !== "string" || !uuidRe.test(account_id))
        return json({ error: "account_id must be a UUID" }, 400);
      if (typeof purchase_id !== "string" || !purchase_id.trim())
        return json({ error: "purchase_id must be a non-empty string" }, 400);
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return json({ error: "date must be YYYY-MM-DD" }, 400);
      if (typeof platform !== "string" || !platform.trim())
        return json({ error: "platform must be a non-empty string" }, 400);
      if (typeof amount !== "number" || !Number.isFinite(amount))
        return json({ error: "amount must be a number" }, 400);
      validated.push({ account_id, purchase_id: purchase_id.trim(), date, platform, amount });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Group by (account_id, date, platform)
    const groups = new Map<string, Incoming[]>();
    for (const r of validated) {
      const key = `${r.account_id}|${r.date}|${r.platform}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    let processed = 0;
    let skipped_duplicates = 0;

    for (const [, items] of groups) {
      const { account_id, date, platform } = items[0];

      const { data: existing, error: selErr } = await supabase
        .from("accounts_revenue")
        .select("total, amounts")
        .eq("account_id", account_id)
        .eq("date", date)
        .eq("platform", platform)
        .maybeSingle();

      if (selErr) {
        console.error("Select error:", selErr);
        return json({ error: selErr.message }, 500);
      }

      const existingAmounts: Array<{ purchase_id: string; amount: number }> = Array.isArray(
        existing?.amounts,
      )
        ? (existing!.amounts as Array<{ purchase_id: string; amount: number }>)
        : [];
      const seen = new Set(existingAmounts.map((a) => a.purchase_id));

      const newEntries: Array<{ purchase_id: string; amount: number }> = [];
      let addedTotal = 0;
      for (const it of items) {
        if (seen.has(it.purchase_id)) {
          skipped_duplicates++;
          continue;
        }
        seen.add(it.purchase_id);
        newEntries.push({ purchase_id: it.purchase_id, amount: it.amount });
        addedTotal += it.amount;
      }

      if (newEntries.length === 0) continue;

      const newAmounts = [...existingAmounts, ...newEntries];
      const newTotal = Number(existing?.total ?? 0) + addedTotal;

      const { error: upErr } = await supabase
        .from("accounts_revenue")
        .upsert(
          { account_id, date, platform, total: newTotal, amounts: newAmounts },
          { onConflict: "account_id,date,platform" },
        );

      if (upErr) {
        console.error("Upsert error:", upErr);
        return json({ error: upErr.message }, 500);
      }
      processed += newEntries.length;
    }

    return json({ success: true, processed, skipped_duplicates });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", message);
    return json({ error: message }, 500);
  }
});
