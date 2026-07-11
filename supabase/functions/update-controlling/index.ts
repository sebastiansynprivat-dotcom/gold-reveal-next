import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("CONTROLLING_DASH");
    if (!expected || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Profiles with telegram_id
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, user_id, telegram_id, name")
      .not("telegram_id", "is", null)
      .neq("telegram_id", "");
    if (pErr) return json({ error: pErr.message }, 500);

    const userIds = new Set<string>();
    const profileIds = new Set<string>();
    for (const p of profiles ?? []) {
      if (p.user_id) userIds.add(p.user_id as string);
      if (p.id) profileIds.add(p.id as string);
    }

    // 2. Open assignments
    const assignments: { account_id: string; user_id: string | null; profile_id: string | null }[] = [];
    if (userIds.size > 0) {
      const { data, error } = await supabase
        .from("account_assignments")
        .select("account_id, user_id, profile_id")
        .is("end_date", null)
        .in("user_id", Array.from(userIds));
      if (error) return json({ error: error.message }, 500);
      if (data) assignments.push(...(data as any));
    }
    if (profileIds.size > 0) {
      const { data, error } = await supabase
        .from("account_assignments")
        .select("account_id, user_id, profile_id")
        .is("end_date", null)
        .in("profile_id", Array.from(profileIds));
      if (error) return json({ error: error.message }, 500);
      if (data) assignments.push(...(data as any));
    }

    const accountIds = Array.from(new Set(assignments.map((a) => a.account_id).filter(Boolean)));

    // 3. Accounts
    const accountsMap = new Map<string, { id: string; platform: string | null; username: string | null; account_email: string | null }>();
    if (accountIds.length > 0) {
      const BATCH = 200;
      for (let i = 0; i < accountIds.length; i += BATCH) {
        const batch = accountIds.slice(i, i + BATCH);
        const { data, error } = await supabase
          .from("accounts")
          .select("id, platform, username, account_email")
          .in("id", batch);
        if (error) return json({ error: error.message }, 500);
        for (const a of data ?? []) accountsMap.set(a.id as string, a as any);
      }
    }

    // 4. Latest accounts_data per account_id
    const latestByAccount = new Map<string, { date: string; amounts: unknown; total: number; mass_dms: number; unread_chats: number; oldest_chat: number }>();
    if (accountIds.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < accountIds.length; i += BATCH) {
        const batch = accountIds.slice(i, i + BATCH);
        const { data, error } = await supabase
          .from("accounts_data")
          .select("account_id, date, amounts, total, mass_dms, unread_chats, oldest_chat")
          .in("account_id", batch)
          .order("date", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        for (const row of data ?? []) {
          const aid = row.account_id as string;
          const existing = latestByAccount.get(aid);
          if (!existing || (row.date as string) > existing.date) {
            latestByAccount.set(aid, {
              date: row.date as string,
              amounts: row.amounts ?? [],
              total: Number(row.total ?? 0),
              mass_dms: Number(row.mass_dms ?? 0),
              unread_chats: Number(row.unread_chats ?? 0),
              oldest_chat: Number(row.oldest_chat ?? 0),
            });
          }
        }
      }
    }

    // Build lookup: which chatter (profile) does each assignment belong to?
    // Prefer profile lookup by user_id, fallback to profile_id.
    const profileByUserId = new Map<string, any>();
    const profileById = new Map<string, any>();
    for (const p of profiles ?? []) {
      if (p.user_id) profileByUserId.set(p.user_id as string, p);
      if (p.id) profileById.set(p.id as string, p);
    }

    // chatterKey → list of account_ids
    const chatterAccounts = new Map<string, { profile: any; accountIds: Set<string> }>();
    for (const p of profiles ?? []) {
      chatterAccounts.set(p.id as string, { profile: p, accountIds: new Set() });
    }
    for (const a of assignments) {
      let profile: any = null;
      if (a.user_id && profileByUserId.has(a.user_id)) profile = profileByUserId.get(a.user_id);
      else if (a.profile_id && profileById.has(a.profile_id)) profile = profileById.get(a.profile_id);
      if (!profile) continue;
      const entry = chatterAccounts.get(profile.id as string);
      if (entry && a.account_id) entry.accountIds.add(a.account_id);
    }

    const todayStr = todayISO();

    const result = [] as any[];
    for (const { profile, accountIds: aids } of chatterAccounts.values()) {
      const platforms: Record<string, Record<string, any>> = {};
      let latestISO: string | null = null;

      // Track duplicate usernames per platform for suffixing
      const usedKeys = new Map<string, number>(); // key = platform::baseName

      for (const aid of aids) {
        const acc = accountsMap.get(aid);
        if (!acc) continue;
        const platform = (acc.platform ?? "unknown").toLowerCase();
        const baseName = (acc.username && acc.username.trim())
          ? acc.username.trim()
          : (acc.account_email ?? aid);

        const dupKey = `${platform}::${baseName}`;
        const count = (usedKeys.get(dupKey) ?? 0) + 1;
        usedKeys.set(dupKey, count);
        const finalName = count === 1 ? baseName : `${baseName} #${count}`;

        const latest = latestByAccount.get(aid);
        if (latest) {
          if (!latestISO || latest.date > latestISO) latestISO = latest.date;
        }

        if (!platforms[platform]) platforms[platform] = {};
        platforms[platform][finalName] = {
          amounts: latest?.amounts ?? [],
          total: latest?.total ?? 0,
          mass_dms: latest?.mass_dms ?? 0,
          unread_chats: latest?.unread_chats ?? 0,
          oldest_chat: latest?.oldest_chat ?? 0,
        };
      }

      result.push({
        chatter_name: profile.name ?? null,
        telegram_id: profile.telegram_id ? String(profile.telegram_id).replace(/^@/, "") : null,
        date: latestISO ?? todayStr,
        platforms,
      });
    }

    return json(result);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
