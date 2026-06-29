import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = Deno.env.get("CHAT_AI_TOOL");
  const provided = req.headers.get("x-api-key");
  if (!secret || provided !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const raw = body?.telegram_id;
  if (typeof raw !== "string" || !raw.trim()) {
    return json({ error: "telegram_id (non-empty string) is required" }, 400);
  }

  const normalized = raw.trim().replace(/^@/, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, user_id")
    .ilike("telegram_id", normalized)
    .limit(1)
    .maybeSingle();

  if (profileErr) {
    return json({ error: profileErr.message }, 500);
  }

  if (!profile) {
    return json({ exists: false, telegram_id: normalized, models: [] });
  }

  const accountIds = new Set<string>();

  // Open assignments by user_id or profile_id
  const orParts: string[] = [];
  if (profile.user_id) orParts.push(`user_id.eq.${profile.user_id}`);
  if (profile.id) orParts.push(`profile_id.eq.${profile.id}`);

  if (orParts.length > 0) {
    const { data: assignments, error: aErr } = await supabase
      .from("account_assignments")
      .select("account_id")
      .is("unassigned_at", null)
      .or(orParts.join(","));
    if (aErr) return json({ error: aErr.message }, 500);
    for (const row of assignments ?? []) {
      if (row.account_id) accountIds.add(row.account_id as string);
    }
  }

  // Also include accounts directly assigned_to the user
  if (profile.user_id) {
    const { data: directAccounts, error: dErr } = await supabase
      .from("accounts")
      .select("id")
      .eq("assigned_to", profile.user_id);
    if (dErr) return json({ error: dErr.message }, 500);
    for (const row of directAccounts ?? []) {
      if (row.id) accountIds.add(row.id as string);
    }
  }

  let models: { username: string | null; platform: string | null; email: string | null }[] = [];

  if (accountIds.size > 0) {
    const { data: accounts, error: accErr } = await supabase
      .from("accounts")
      .select("id, username, platform, account_email")
      .in("id", Array.from(accountIds));
    if (accErr) return json({ error: accErr.message }, 500);

    const seen = new Set<string>();
    for (const a of accounts ?? []) {
      const key = `${a.platform ?? ""}::${a.account_email ?? ""}::${a.username ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      models.push({
        username: a.username ?? null,
        platform: a.platform ?? null,
        email: a.account_email ?? null,
      });
    }
  }

  return json({ exists: true, telegram_id: normalized, models });
});
