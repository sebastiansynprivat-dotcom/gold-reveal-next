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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
