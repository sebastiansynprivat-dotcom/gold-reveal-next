import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AssignmentInput {
  platform: string;
  email: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: accept either an admin JWT or the REVENUE_INGEST_API_KEY shared secret
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("REVENUE_INGEST_API_KEY");
    let authorized = false;

    if (apiKey && expectedKey && apiKey === expectedKey) {
      authorized = true;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: isAdmin } = await userClient.rpc("is_admin");
        if (isAdmin) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const telegram_id: string | undefined = body.telegram_id ?? body.telegramId;
    const assignments: AssignmentInput[] = body.assignments ?? body.accounts ?? [];

    if (!telegram_id || !Array.isArray(assignments) || assignments.length === 0) {
      return new Response(
        JSON.stringify({ error: "telegram_id and non-empty assignments array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find chatter by telegram_id
    const normalizedTg = String(telegram_id).trim().replace(/^@/, "");
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, telegram_id")
      .ilike("telegram_id", normalizedTg)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile) {
      return new Response(
        JSON.stringify({ error: `No chatter found for telegram_id ${telegram_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = profile.user_id;
    const results: Array<{ platform: string; email: string; ok: boolean; error?: string; account_id?: string }> = [];

    for (const a of assignments) {
      const platform = String(a.platform || "").trim();
      const email = String(a.email || "").trim();
      if (!platform || !email) {
        results.push({ platform, email, ok: false, error: "platform and email required" });
        continue;
      }

      // Find the matching account
      const { data: account, error: accErr } = await supabase
        .from("accounts")
        .select("id, account_email, account_password, account_domain, drive_folder_id, platform, assigned_to")
        .eq("platform", platform)
        .ilike("account_email", email)
        .maybeSingle();

      if (accErr) {
        results.push({ platform, email, ok: false, error: accErr.message });
        continue;
      }
      if (!account) {
        results.push({ platform, email, ok: false, error: "Account not found" });
        continue;
      }

      // Assign
      const { error: updErr } = await supabase
        .from("accounts")
        .update({ assigned_to: userId, assigned_at: new Date().toISOString() })
        .eq("id", account.id);

      if (updErr) {
        results.push({ platform, email, ok: false, error: updErr.message, account_id: account.id });
        continue;
      }

      // Mirror credentials to profile (best-effort)
      await supabase
        .from("profiles")
        .update({
          account_email: account.account_email,
          account_password: account.account_password,
          account_domain: account.account_domain,
        })
        .eq("user_id", userId);

      // Share Drive folder (best-effort)
      if (account.drive_folder_id) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const loginEmail = userData?.user?.email;
          if (loginEmail) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/share-drive`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ folder_id: account.drive_folder_id, email: loginEmail }),
            });
          }
        } catch (e) {
          console.warn("Drive share failed:", e);
        }
      }

      results.push({ platform, email, ok: true, account_id: account.id });
    }

    const assignedCount = results.filter((r) => r.ok).length;

    return new Response(
      JSON.stringify({ user_id: userId, telegram_id: normalizedTg, assigned: assignedCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
