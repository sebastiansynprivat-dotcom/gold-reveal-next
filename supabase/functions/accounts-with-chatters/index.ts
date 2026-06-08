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
    const assignments: { account_id: string; user_id: string | null; profile_id: string | null }[] = [];
    for (let i = 0; i < accountIds.length; i += BATCH) {
      const batch = accountIds.slice(i, i + BATCH);
      const { data, error: asgErr } = await supabase
        .from("account_assignments")
        .select("account_id, user_id, profile_id")
        .is("unassigned_at", null)
        .in("account_id", batch);
      if (asgErr) return json({ error: asgErr.message }, 500);
      if (data) assignments.push(...(data as any));
    }

    // Build account -> set of tagged identifiers (u:<user_id> or p:<profile_id>)
    const accountKeys = new Map<string, Set<string>>();
    for (const a of accounts ?? []) {
      const set = new Set<string>();
      if (a.assigned_to) set.add(`u:${a.assigned_to}`);
      accountKeys.set(a.id, set);
    }
    for (const row of assignments ?? []) {
      const set = accountKeys.get(row.account_id) ?? new Set<string>();
      if (row.user_id) {
        set.add(`u:${row.user_id}`);
      } else if (row.profile_id) {
        set.add(`p:${row.profile_id}`);
      }
      accountKeys.set(row.account_id, set);
    }

    // Collect all unique user_ids and profile_ids
    const allUserIds = new Set<string>();
    const allProfileIds = new Set<string>();
    for (const set of accountKeys.values()) {
      for (const tag of set) {
        const id = tag.slice(2);
        if (tag.startsWith("u:")) allUserIds.add(id);
        else if (tag.startsWith("p:")) allProfileIds.add(id);
      }
    }

    const profileByTag = new Map<string, any>();

    if (allUserIds.size > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, telegram_id, language, offer")
        .in("user_id", Array.from(allUserIds));
      if (pErr) return json({ error: pErr.message }, 500);
      for (const p of profiles ?? []) {
        profileByTag.set(`u:${p.user_id}`, p);
      }
    }

    if (allProfileIds.size > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, telegram_id, language, offer")
        .in("id", Array.from(allProfileIds));
      if (pErr) return json({ error: pErr.message }, 500);
      for (const p of profiles ?? []) {
        profileByTag.set(`p:${p.id}`, p);
      }
    }

    const merged = (accounts ?? []).map((a: any) => {
      const tags = Array.from(accountKeys.get(a.id) ?? []);
      const assigned_chatter = tags
        .map((tag) => profileByTag.get(tag))
        .filter(Boolean)
        .map((p: any) => ({
          user_id: p.user_id ?? null,
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
