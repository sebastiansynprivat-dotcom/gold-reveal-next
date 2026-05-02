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
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("ACCOUNTS_SECRET_KEY");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { platform, account_email, updates } = body ?? {};

    if (typeof platform !== "string" || !platform.trim()) return json({ error: "platform required" }, 400);
    if (typeof account_email !== "string" || !account_email.trim()) return json({ error: "account_email required" }, 400);
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) return json({ error: "updates object required" }, 400);

    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (ALLOWED.has(k)) sanitized[k] = v;
    }
    if (Object.keys(sanitized).length === 0) return json({ error: "No allowed fields in updates" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
