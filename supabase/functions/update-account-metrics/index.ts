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

const METRIC_FIELDS = [
  "oldest_chat",
  "unread_chats",
  "mass_dms",
  "followers",
  "subscribers",
] as const;
type MetricField = typeof METRIC_FIELDS[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ParsedItem = {
  account_id: string;
  date: string;
  metrics: Partial<Record<MetricField, number>>;
};

function parseItem(raw: any): ParsedItem | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Item must be an object" };
  }
  if (typeof raw.account_id !== "string" || !UUID_RE.test(raw.account_id)) {
    return { error: "account_id must be a UUID" };
  }
  if (typeof raw.date !== "string" || !DATE_RE.test(raw.date)) {
    return { error: "date must be YYYY-MM-DD" };
  }
  const metrics: Partial<Record<MetricField, number>> = {};
  for (const f of METRIC_FIELDS) {
    const v = raw[f];
    if (v === undefined || v === null) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      return { error: `${f} must be an integer` };
    }
    metrics[f] = v;
  }
  if (Object.keys(metrics).length === 0) {
    return { error: `At least one metric field required (${METRIC_FIELDS.join(", ")})` };
  }
  return { account_id: raw.account_id, date: raw.date, metrics };
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

    const rawItems: any[] = Array.isArray(body) ? body : [body];
    if (rawItems.length === 0) return json({ error: "Empty payload" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Parse all items first
    const parsed: Array<ParsedItem | { error: string; account_id?: string; date?: string }> =
      rawItems.map((r) => {
        const p = parseItem(r);
        if ("error" in p) {
          return { error: p.error, account_id: r?.account_id, date: r?.date };
        }
        return p;
      });

    // Resolve platforms for valid account_ids
    const validIds = Array.from(
      new Set(
        parsed
          .filter((p): p is ParsedItem => !("error" in p))
          .map((p) => p.account_id),
      ),
    );

    const platformById = new Map<string, string>();
    if (validIds.length > 0) {
      const { data: accs, error: accErr } = await supabase
        .from("accounts")
        .select("id, platform")
        .in("id", validIds);
      if (accErr) return json({ error: accErr.message }, 500);
      for (const a of (accs ?? []) as any[]) {
        if (a.platform) platformById.set(a.id, a.platform);
      }
    }

    const results: Array<{
      account_id?: string;
      date?: string;
      metrics_updated: boolean;
      error?: string;
    }> = [];
    let updated = 0;

    for (const item of parsed) {
      if ("error" in item) {
        results.push({
          account_id: item.account_id,
          date: item.date,
          metrics_updated: false,
          error: item.error,
        });
        continue;
      }

      const platform = platformById.get(item.account_id);
      if (!platform) {
        results.push({
          account_id: item.account_id,
          date: item.date,
          metrics_updated: false,
          error: "Account not found or missing platform",
        });
        continue;
      }

      const { data: existing, error: selErr } = await supabase
        .from("accounts_data")
        .select("total, amounts")
        .eq("account_id", item.account_id)
        .eq("date", item.date)
        .eq("platform", platform)
        .maybeSingle();
      if (selErr) {
        results.push({
          account_id: item.account_id,
          date: item.date,
          metrics_updated: false,
          error: selErr.message,
        });
        continue;
      }

      const row: Record<string, unknown> = {
        account_id: item.account_id,
        date: item.date,
        platform,
        total: existing?.total ?? 0,
        amounts: existing?.amounts ?? [],
        ...item.metrics,
      };

      const { error: upErr } = await supabase
        .from("accounts_data")
        .upsert(row, { onConflict: "account_id,date,platform" });

      if (upErr) {
        results.push({
          account_id: item.account_id,
          date: item.date,
          metrics_updated: false,
          error: upErr.message,
        });
      } else {
        updated++;
        results.push({
          account_id: item.account_id,
          date: item.date,
          metrics_updated: true,
        });
      }
    }

    return json({ success: true, metrics_updated: updated, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
