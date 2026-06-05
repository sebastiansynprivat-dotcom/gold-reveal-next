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

const METRIC_FIELDS = ["followers", "subscribers", "oldest_chat", "unread_chats", "mass_dms"] as const;
type MetricField = typeof METRIC_FIELDS[number];

type Incoming = {
  account_id: string;
  date: string;
  platform: string;
  purchase_id?: string;
  amount?: number;
  metrics: Partial<Record<MetricField, number>>;
};

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);

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
    if (!apiKey) return json({ error: "Unauthorized: missing x-api-key header" }, 401);
    if (apiKey !== expected) return json({ error: "Unauthorized: x-api-key mismatch" }, 401);

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const rows: unknown[] = Array.isArray(body) ? body : [body];
    console.log(`[${rid}] received ${rows.length} row(s)`);

    if (rows.length > MAX_ROWS) {
      return json({ error: `Too many rows: ${rows.length} (max ${MAX_ROWS})` }, 400);
    }

    const validated: Incoming[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || typeof r !== "object") return json({ error: `Invalid row at index ${i}` }, 400);
      const obj = r as Record<string, unknown>;
      const { account_id, date, platform, purchase_id, amount } = obj;

      if (typeof account_id !== "string" || !uuidRe.test(account_id))
        return json({ error: `Row ${i}: account_id must be a UUID`, got: account_id }, 400);
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return json({ error: `Row ${i}: date must be YYYY-MM-DD`, got: date }, 400);
      if (typeof platform !== "string" || !platform.trim())
        return json({ error: `Row ${i}: platform must be a non-empty string` }, 400);

      const hasRevenue = purchase_id !== undefined || amount !== undefined;
      let revPid: string | undefined;
      let revAmt: number | undefined;
      if (hasRevenue) {
        if (typeof purchase_id !== "string" || !purchase_id.trim())
          return json({ error: `Row ${i}: purchase_id must be a non-empty string` }, 400);
        if (typeof amount !== "number" || !Number.isFinite(amount))
          return json({ error: `Row ${i}: amount must be a number`, got: amount }, 400);
        revPid = purchase_id.trim();
        revAmt = amount;
      }

      const metrics: Partial<Record<MetricField, number>> = {};
      for (const f of METRIC_FIELDS) {
        const v = obj[f];
        if (v === undefined || v === null) continue;
        if (!isInt(v)) return json({ error: `Row ${i}: ${f} must be an integer`, got: v }, 400);
        metrics[f] = v;
      }

      if (!hasRevenue && Object.keys(metrics).length === 0) {
        return json({ error: `Row ${i}: must contain at least one of: revenue (purchase_id+amount), ${METRIC_FIELDS.join(", ")}` }, 400);
      }

      validated.push({
        account_id,
        date,
        platform: platform.trim(),
        purchase_id: revPid,
        amount: revAmt,
        metrics,
      });
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
    console.log(`[${rid}] grouped into ${groups.size} bucket(s)`);

    const accountIds = Array.from(new Set(validated.map((r) => r.account_id)));
    const dates = Array.from(new Set(validated.map((r) => r.date)));
    const platforms = Array.from(new Set(validated.map((r) => r.platform)));

    const tSel = Date.now();
    const selectCols = `account_id, date, platform, total, amounts, ${METRIC_FIELDS.join(", ")}`;
    const { data: existingRows, error: selErr } = await supabase
      .from("accounts_data")
      .select(selectCols)
      .in("account_id", accountIds)
      .in("date", dates)
      .in("platform", platforms);

    if (selErr) {
      console.error(`[${rid}] Select error:`, selErr);
      return json({ error: selErr.message }, 500);
    }
    console.log(`[${rid}] fetched ${existingRows?.length ?? 0} existing row(s) in ${Date.now() - tSel}ms`);

    type ExistingRow = {
      total: number;
      amounts: Array<{ purchase_id: string; amount: number }>;
      metrics: Partial<Record<MetricField, number>>;
    };
    const existingMap = new Map<string, ExistingRow>();
    for (const er of (existingRows ?? []) as any[]) {
      const key = `${er.account_id}|${er.date}|${er.platform}`;
      const metrics: Partial<Record<MetricField, number>> = {};
      for (const f of METRIC_FIELDS) if (er[f] !== null && er[f] !== undefined) metrics[f] = er[f];
      existingMap.set(key, {
        total: Number(er.total ?? 0),
        amounts: Array.isArray(er.amounts) ? er.amounts : [],
        metrics,
      });
    }

    let processed = 0;
    let skipped_duplicates = 0;
    let metrics_updated = 0;
    const upsertPayload: Array<Record<string, unknown>> = [];

    for (const [key, items] of groups) {
      const { account_id, date, platform } = items[0];
      const existing = existingMap.get(key) ?? { total: 0, amounts: [], metrics: {} };
      const seen = new Set(existing.amounts.map((a) => a.purchase_id));

      const newEntries: Array<{ purchase_id: string; amount: number }> = [];
      let addedTotal = 0;
      const groupMetrics: Partial<Record<MetricField, number>> = { ...existing.metrics };
      let metricsChanged = false;

      for (const it of items) {
        if (it.purchase_id !== undefined && it.amount !== undefined) {
          if (seen.has(it.purchase_id)) {
            skipped_duplicates++;
          } else {
            seen.add(it.purchase_id);
            newEntries.push({ purchase_id: it.purchase_id, amount: it.amount });
            addedTotal += it.amount;
          }
        }
        for (const f of METRIC_FIELDS) {
          if (it.metrics[f] !== undefined) {
            groupMetrics[f] = it.metrics[f];
            metricsChanged = true;
          }
        }
      }

      const hasMetrics = Object.keys(groupMetrics).length > 0;
      // Upsert if new revenue entries OR any metrics provided (even if unchanged, to refresh updated_at)
      if (newEntries.length === 0 && !hasMetrics) continue;

      const row: Record<string, unknown> = {
        account_id,
        date,
        platform,
        total: existing.total + addedTotal,
        amounts: [...existing.amounts, ...newEntries],
      };
      for (const f of METRIC_FIELDS) {
        if (groupMetrics[f] !== undefined) row[f] = groupMetrics[f];
      }
      upsertPayload.push(row);
      processed += newEntries.length;
      if (metricsChanged) metrics_updated++;
    }

    if (upsertPayload.length > 0) {
      const tUp = Date.now();
      const { error: upErr } = await supabase
        .from("accounts_data")
        .upsert(upsertPayload, { onConflict: "account_id,date,platform" });
      if (upErr) {
        console.error(`[${rid}] Upsert error:`, upErr);
        return json({ error: upErr.message }, 500);
      }
      console.log(`[${rid}] upserted ${upsertPayload.length} row(s) in ${Date.now() - tUp}ms`);
    }

    console.log(`[${rid}] done in ${Date.now() - t0}ms · processed=${processed} dup=${skipped_duplicates} metrics=${metrics_updated}`);
    return json({ success: true, processed, skipped_duplicates, metrics_updated, groups: groups.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${rid}] Handler error:`, message, err instanceof Error ? err.stack : "");
    return json({ error: message }, 500);
  }
});
