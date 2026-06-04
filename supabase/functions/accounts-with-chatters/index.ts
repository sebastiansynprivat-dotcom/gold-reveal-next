import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("ACCOUNTS_EXPORT_API_KEY");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ACCOUNT_COLS = [
      "id",
      "platform",
      "account_email",
      "account_password",
      "model_language",
      "model_active",
      "model_agency",
      "post",
      "message",
      "main_message",
      "follow_message",
      "media",
      "assigned_to",
    ].join(",");

    const { data: accounts, error: accErr } = await supabase
      .from("accounts")
      .select(ACCOUNT_COLS);
    if (accErr) return json({ error: accErr.message }, 500);

    const accountIds = (accounts ?? []).map((a: any) => a.id);

    const BATCH = 100;
    const assignments: { account_id: string; user_id: string }[] = [];
    for (let i = 0; i < accountIds.length; i += BATCH) {
      const batch = accountIds.slice(i, i + BATCH);
      const { data, error: asgErr } = await supabase
        .from("account_assignments")
        .select("account_id, user_id")
        .is("unassigned_at", null)
        .in("account_id", batch);
      if (asgErr) return json({ error: asgErr.message }, 500);
      if (data) assignments.push(...(data as any));
    }

    // Build account -> set of user_ids
    const accountUsers = new Map<string, Set<string>>();
    for (const a of accounts ?? []) {
      const set = new Set<string>();
      if (a.assigned_to) set.add(a.assigned_to);
      accountUsers.set(a.id, set);
    }
    for (const row of assignments ?? []) {
      if (!row.user_id) continue;
      const set = accountUsers.get(row.account_id) ?? new Set<string>();
      set.add(row.user_id);
      accountUsers.set(row.account_id, set);
    }

    // Collect all unique user_ids
    const allUserIds = new Set<string>();
    for (const set of accountUsers.values()) for (const u of set) allUserIds.add(u);

    let profilesById = new Map<string, any>();
    if (allUserIds.size > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, telegram_id, language, offer")
        .in("user_id", Array.from(allUserIds));
      if (pErr) return json({ error: pErr.message }, 500);
      profilesById = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    }

    const merged = (accounts ?? []).map((a: any) => {
      const userIds = Array.from(accountUsers.get(a.id) ?? []);
      const assigned_chatter = userIds
        .map((uid) => profilesById.get(uid))
        .filter(Boolean)
        .map((p: any) => ({
          user_id: p.user_id,
          telegram_id: p.telegram_id ?? null,
          language: p.language ?? null,
          offer: p.offer ?? null,
        }));
      return { ...a, assigned_chatter };
    });

    return json({ count: merged.length, accounts: merged });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
