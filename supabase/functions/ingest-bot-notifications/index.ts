import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InRow {
  account_id?: string | null;
  account_email?: string | null;
  platform: string;
  date?: string | null;
  type: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const expected = Deno.env.get("BOT_NOTIF_KEY");
    if (!expected || key !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rows: InRow[] = Array.isArray(body?.rows) ? body.rows : Array.isArray(body) ? body : [];
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "rows array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve account_id from account_email + platform when missing
    const toResolve = rows.filter((r) => !r.account_id && r.account_email && r.platform);
    const emailMap = new Map<string, string>(); // `${platform}|${email}` -> id
    if (toResolve.length) {
      const emails = [...new Set(toResolve.map((r) => r.account_email!.toLowerCase()))];
      const { data: accs } = await admin
        .from("accounts")
        .select("id, account_email, platform")
        .in("account_email", emails);
      (accs || []).forEach((a: any) => {
        emailMap.set(`${(a.platform || "").toLowerCase()}|${(a.account_email || "").toLowerCase()}`, a.id);
      });
    }

    const inserts = rows
      .map((r, i) => {
        if (!r?.platform || !r?.type || !r?.message) {
          return { _err: `Row ${i}: platform, type and message are required` };
        }
        let account_id = r.account_id || null;
        if (!account_id && r.account_email && r.platform) {
          account_id =
            emailMap.get(`${r.platform.toLowerCase()}|${r.account_email.toLowerCase()}`) || null;
        }
        return {
          account_id,
          account_email: r.account_email || null,
          platform: r.platform,
          date: r.date || new Date().toISOString().slice(0, 10),
          type: r.type,
          message: r.message,
        };
      });

    const errors = inserts.filter((x: any) => x._err).map((x: any) => x._err);
    const clean = inserts.filter((x: any) => !x._err);

    let inserted = 0;
    if (clean.length) {
      const { error, count } = await admin
        .from("bot_notifications")
        .insert(clean, { count: "exact" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message, errors }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = count ?? clean.length;
    }

    return new Response(JSON.stringify({ inserted, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
