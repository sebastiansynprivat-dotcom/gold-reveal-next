import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED = new Set([
  "account_email",
  "account_password",
  "account_domain",
  "platform",
  "folder_name",
  "subfolder_name",
  "drive_folder_id",
  "model_id",
  "model_agency",
  "model_language",
  "model_active",
  "is_manual",
  "assigned_to",
  "assigned_at",
  // New per-account fields
  "post",
  "message",
  "main_message",
  "follow_message",
  "media",
]);

const BATCH_FIELDS = ["post", "message", "main_message", "follow_message", "media"] as const;
const METRIC_FIELDS = ["oldest_chat", "unread_chats", "mass_dms"] as const;
type MetricField = typeof METRIC_FIELDS[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pickAllowed(updates: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED.has(k)) sanitized[k] = v;
  }
  return sanitized;
}

function extractBatchItem(raw: any) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (typeof raw.account_id !== "string" || !UUID_RE.test(raw.account_id)) return null;
  const updates: Record<string, unknown> = {};
  for (const k of BATCH_FIELDS) {
    if (k in raw) updates[k] = raw[k];
  }
  return { account_id: raw.account_id as string, updates };
}

function isMetricsItem(raw: any): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (typeof raw.account_id !== "string" || !UUID_RE.test(raw.account_id)) return false;
  if (typeof raw.date !== "string" || !DATE_RE.test(raw.date)) return false;
  return METRIC_FIELDS.some((f) => raw[f] !== undefined && raw[f] !== null);
}

function extractMetricsItem(raw: any):
  | { account_id: string; date: string; metrics: Partial<Record<MetricField, number>> }
  | { error: string } {
  const metrics: Partial<Record<MetricField, number>> = {};
  for (const f of METRIC_FIELDS) {
    const v = raw[f];
    if (v === undefined || v === null) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      return { error: `${f} must be an integer` };
    }
    metrics[f] = v;
  }
  return { account_id: raw.account_id as string, date: raw.date as string, metrics };
}

async function processMetricsItems(supabase: any, items: any[]) {
  const results: Array<{
    account_id: string;
    date: string;
    metrics_updated: boolean;
    error?: string;
  }> = [];

  const accountIds = Array.from(new Set(items.map((it) => it.account_id)));
  const { data: accs, error: accErr } = await supabase
    .from("accounts")
    .select("id, platform")
    .in("id", accountIds);
  if (accErr) return { error: accErr.message, results };

  const platformById = new Map<string, string>();
  for (const a of (accs ?? []) as any[]) {
    if (a.platform) platformById.set(a.id, a.platform);
  }

  for (const raw of items) {
    const parsed = extractMetricsItem(raw);
    if ("error" in parsed) {
      results.push({ account_id: raw.account_id, date: raw.date, metrics_updated: false, error: parsed.error });
      continue;
    }
    const platform = platformById.get(parsed.account_id);
    if (!platform) {
      results.push({
        account_id: parsed.account_id,
        date: parsed.date,
        metrics_updated: false,
        error: "Account not found or missing platform",
      });
      continue;
    }

    const { data: existing, error: selErr } = await supabase
      .from("accounts_data")
      .select("total, amounts")
      .eq("account_id", parsed.account_id)
      .eq("date", parsed.date)
      .eq("platform", platform)
      .maybeSingle();
    if (selErr) {
      results.push({ account_id: parsed.account_id, date: parsed.date, metrics_updated: false, error: selErr.message });
      continue;
    }

    const row: Record<string, unknown> = {
      account_id: parsed.account_id,
      date: parsed.date,
      platform,
      total: existing?.total ?? 0,
      amounts: existing?.amounts ?? [],
      ...parsed.metrics,
    };

    const { error: upErr } = await supabase
      .from("accounts_data")
      .upsert(row, { onConflict: "account_id,date,platform" });
    if (upErr) {
      results.push({ account_id: parsed.account_id, date: parsed.date, metrics_updated: false, error: upErr.message });
    } else {
      results.push({ account_id: parsed.account_id, date: parsed.date, metrics_updated: true });
    }
  }

  return { results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("ACCOUNTS_SECRET_KEY");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- New batch shape: array of items, or single object with account_id ---
    const asArray = Array.isArray(body) ? body : null;
    const isBatchItem =
      !asArray && body && typeof body === "object" && typeof (body as any).account_id === "string";

    if (asArray || isBatchItem) {
      const items = (asArray ?? [body])
        .map((it: any) => extractBatchItem(it))
        .filter(
          (it): it is { account_id: string; updates: Record<string, unknown> } => it !== null,
        );

      if (items.length === 0) {
        return json(
          { error: "No valid items (each needs account_id UUID + at least one allowed field)" },
          400,
        );
      }

      const results: Array<{ account_id: string; updated: number; error?: string }> = [];
      let totalUpdated = 0;

      for (const item of items) {
        if (Object.keys(item.updates).length === 0) {
          results.push({ account_id: item.account_id, updated: 0, error: "No fields to update" });
          continue;
        }
        const { data, error } = await supabase
          .from("accounts")
          .update(item.updates)
          .eq("id", item.account_id)
          .select("id");

        if (error) {
          results.push({ account_id: item.account_id, updated: 0, error: error.message });
        } else {
          const n = data?.length ?? 0;
          totalUpdated += n;
          results.push({
            account_id: item.account_id,
            updated: n,
            ...(n === 0 ? { error: "Not found" } : {}),
          });
        }
      }

      return json({ success: true, total_updated: totalUpdated, results });
    }

    // --- Legacy shape: { platform, account_email, updates } ---
    const { platform, account_email, updates } = body ?? {};
    if (typeof platform !== "string" || !platform.trim())
      return json({ error: "platform required" }, 400);
    if (typeof account_email !== "string" || !account_email.trim())
      return json({ error: "account_email required" }, 400);
    if (!updates || typeof updates !== "object" || Array.isArray(updates))
      return json({ error: "updates object required" }, 400);

    const sanitized = pickAllowed(updates);
    if (Object.keys(sanitized).length === 0)
      return json({ error: "No allowed fields in updates" }, 400);

    const { data, error } = await supabase
      .from("accounts")
      .update(sanitized)
      .eq("platform", platform)
      .eq("account_email", account_email)
      .select();

    if (error) return json({ error: error.message }, 500);
    if (!data || data.length === 0) return json({ error: "No account matched", updated: 0 }, 404);

    return json({ success: true, updated: data.length, accounts: data });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
