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
const MAX_ROWS = 10_000;

type Incoming = {
  account_id: string;
  purchase_id: string;
  date: string;
  platform: string;
  amount: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rid = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  console.log(`[${rid}] ${req.method} ${new URL(req.url).pathname} start`);

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected) {
      console.error(`[${rid}] REVENUE_INGEST_API_KEY not configured`);
      return json({ error: "Server misconfigured: missing REVENUE_INGEST_API_KEY" }, 500);
    }
    if (!apiKey) {
      console.warn(`[${rid}] 401: missing x-api-key header`);
      return json({ error: "Unauthorized: missing x-api-key header" }, 401);
    }
    if (apiKey !== expected) {
      console.warn(`[${rid}] 401: x-api-key mismatch (len=${apiKey.length}, expected len=${expected.length})`);
      return json({ error: "Unauthorized: x-api-key mismatch" }, 401);
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      console.warn(`[${rid}] 400: invalid JSON`, (e as Error).message);
      return json({ error: "Invalid JSON body" }, 400);
    }
    const rows: unknown[] = Array.isArray(body) ? body : [body];
    console.log(`[${rid}] received ${rows.length} row(s)`);

    if (rows.length > MAX_ROWS) {
      console.warn(`[${rid}] 400: too many rows (${rows.length} > ${MAX_ROWS})`);
      return json({ error: `Too many rows: ${rows.length} (max ${MAX_ROWS})` }, 400);
    }

    const validated: Incoming[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || typeof r !== "object") return json({ error: `Invalid row at index ${i}` }, 400);
      const { account_id, purchase_id, date, platform, amount } = r as Record<string, unknown>;
      if (typeof account_id !== "string" || !uuidRe.test(account_id))
        return json({ error: `Row ${i}: account_id must be a UUID`, got: account_id }, 400);
      if (typeof purchase_id !== "string" || !purchase_id.trim())
        return json({ error: `Row ${i}: purchase_id must be a non-empty string` }, 400);
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return json({ error: `Row ${i}: date must be YYYY-MM-DD`, got: date }, 400);
      if (typeof platform !== "string" || !platform.trim())
        return json({ error: `Row ${i}: platform must be a non-empty string` }, 400);
      if (typeof amount !== "number" || !Number.isFinite(amount))
        return json({ error: `Row ${i}: amount must be a number`, got: amount }, 400);
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
    console.log(`[${rid}] grouped into ${groups.size} (account,date,platform) bucket(s)`);

    // Batch fetch existing rows
    const accountIds = Array.from(new Set(validated.map((r) => r.account_id)));
    const dates = Array.from(new Set(validated.map((r) => r.date)));
    const platforms = Array.from(new Set(validated.map((r) => r.platform)));

    const tSel = Date.now();
    const { data: existingRows, error: selErr } = await supabase
      .from("accounts_revenue")
      .select("account_id, date, platform, total, amounts")
      .in("account_id", accountIds)
      .in("date", dates)
      .in("platform", platforms);

    if (selErr) {
      console.error(`[${rid}] Select error:`, selErr);
      return json({ error: selErr.message }, 500);
    }
    console.log(`[${rid}] fetched ${existingRows?.length ?? 0} existing row(s) in ${Date.now() - tSel}ms`);

    const existingMap = new Map<string, { total: number; amounts: Array<{ purchase_id: string; amount: number }> }>();
    for (const er of existingRows ?? []) {
      const key = `${er.account_id}|${er.date}|${er.platform}`;
      existingMap.set(key, {
        total: Number(er.total ?? 0),
        amounts: Array.isArray(er.amounts) ? er.amounts as Array<{ purchase_id: string; amount: number }> : [],
      });
    }

    let processed = 0;
    let skipped_duplicates = 0;
    const upsertPayload: Array<{
      account_id: string;
      date: string;
      platform: string;
      total: number;
      amounts: Array<{ purchase_id: string; amount: number }>;
    }> = [];

    for (const [key, items] of groups) {
      const { account_id, date, platform } = items[0];
      const existing = existingMap.get(key) ?? { total: 0, amounts: [] };
      const seen = new Set(existing.amounts.map((a) => a.purchase_id));

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

      upsertPayload.push({
        account_id,
        date,
        platform,
        total: existing.total + addedTotal,
        amounts: [...existing.amounts, ...newEntries],
      });
      processed += newEntries.length;
    }

    if (upsertPayload.length > 0) {
      const tUp = Date.now();
      const { error: upErr } = await supabase
        .from("accounts_revenue")
        .upsert(upsertPayload, { onConflict: "account_id,date,platform" });
      if (upErr) {
        console.error(`[${rid}] Upsert error:`, upErr);
        return json({ error: upErr.message }, 500);
      }
      console.log(`[${rid}] upserted ${upsertPayload.length} row(s) in ${Date.now() - tUp}ms`);
    } else {
      console.log(`[${rid}] nothing to upsert`);
    }

    console.log(`[${rid}] done in ${Date.now() - t0}ms · processed=${processed} duplicates=${skipped_duplicates}`);
    return json({ success: true, processed, skipped_duplicates, groups: groups.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${rid}] Handler error:`, message, err instanceof Error ? err.stack : "");
    return json({ error: message }, 500);
  }
});
