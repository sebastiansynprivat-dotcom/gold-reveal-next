import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => ["admin", "super_admin", "sub_admin"].includes(r.role));
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const model_id = String(body.model_id || "");
    if (!model_id) return json({ error: "Invalid input: model_id required" }, 400);

    const hasMonth = body.month != null || body.year != null;
    const hasRange = body.from != null || body.to != null;
    if (hasMonth === hasRange) {
      return json({ error: "Invalid input: provide either (month, year) or (from, to)" }, 400);
    }

    let periodPayload: Record<string, unknown>;
    if (hasMonth) {
      const month = Number(body.month);
      const year = Number(body.year);
      if (!month || !year || month < 1 || month > 12) {
        return json({ error: "Invalid input: month (1-12) and year required" }, 400);
      }
      periodPayload = { month, year };
    } else {
      const from = String(body.from || "");
      const to = String(body.to || "");
      if (!MONTH_RE.test(from) || !MONTH_RE.test(to) || from > to) {
        return json({ error: "Invalid input: from/to must be YYYY-MM with from <= to" }, 400);
      }
      periodPayload = { from, to };
    }

    const { data: model, error: modelErr } = await admin
      .from("models").select("id, name").eq("id", model_id).maybeSingle();
    if (modelErr || !model) return json({ error: "Model not found" }, 404);

    const { data: accounts } = await admin
      .from("accounts")
      .select("id, platform, account_email, account_password")
      .eq("model_id", model_id);

    const BACKEND_URL = Deno.env.get("REVENUE_BACKEND_URL");
    const BACKEND_TOKEN = Deno.env.get("REVENUE_BACKEND_TOKEN");
    if (!BACKEND_URL || !BACKEND_TOKEN) return json({ error: "Backend not configured" }, 500);

    const payload = {
      ...periodPayload,
      model: { id: model.id, name: model.name },
      accounts: (accounts || []).map((a: any) => ({
        id: a.id,
        platform: a.platform,
        email: a.account_email,
        password: a.account_password,
      })),
    };

    const upstream = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/getpayoutstatements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": BACKEND_TOKEN },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return json({ error: `Backend ${upstream.status}: ${text.slice(0, 500)}` }, 502);
    }
    const result = await upstream.json();

    const statements = Array.isArray(result)
      ? result
      : Array.isArray(result?.statements)
        ? result.statements
        : Array.isArray(result?.payoutStatements)
          ? result.payoutStatements
          : [];
    const errors = Array.isArray(result?.errors) ? result.errors : [];

    return json({ ok: true, statements, errors });
  } catch (err) {
    console.error("fetch-payout-statements error", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
