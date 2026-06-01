import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify admin role
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => ["admin", "super_admin", "sub_admin"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const model_id = String(body.model_id || "");
    const month = Number(body.month);
    const year = Number(body.year);
    if (!model_id || !month || !year || month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: "Invalid input: model_id, month, year required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load model + accounts
    const { data: model, error: modelErr } = await admin.from("models").select("id, name").eq("id", model_id).maybeSingle();
    if (modelErr || !model) {
      return new Response(JSON.stringify({ error: "Model not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: accounts } = await admin
      .from("accounts")
      .select("id, platform, account_email, account_password")
      .eq("model_id", model_id);

    // Call external backend
    const BACKEND_URL = Deno.env.get("REVENUE_BACKEND_URL");
    const BACKEND_TOKEN = Deno.env.get("REVENUE_BACKEND_TOKEN");
    if (!BACKEND_URL || !BACKEND_TOKEN) {
      return new Response(JSON.stringify({ error: "Backend not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = `${BACKEND_URL.replace(/\/$/, "")}/getmonthlyrevenue`;
    const payload = {
      month,
      year,
      model: { id: model.id, name: model.name },
      accounts: (accounts || []).map((a: any) => ({
        id: a.id,
        platform: a.platform,
        email: a.account_email,
        password: a.account_password,
      })),
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": BACKEND_TOKEN },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Backend ${upstream.status}: ${text.slice(0, 500)}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await upstream.json();

    const fourbased = Number(result.fourbased_revenue) || 0;
    const maloum = Number(result.maloum_revenue) || 0;
    const brezzels = Number(result.brezzels_revenue) || 0;
    const monthly = fourbased + maloum + brezzels;

    // Upsert into model_dashboard keyed by model_id
    const { data: existing } = await admin
      .from("model_dashboard")
      .select("id")
      .eq("model_id", model_id)
      .maybeSingle();

    const updateRow: Record<string, any> = {
      model_id,
      fourbased_revenue: fourbased,
      maloum_revenue: maloum,
      brezzels_revenue: brezzels,
      monthly_revenue: monthly,
      last_fetched_at: new Date().toISOString(),
      last_fetched_month: month,
      last_fetched_year: year,
    };

    let saved;
    if (existing) {
      const { data, error } = await admin.from("model_dashboard").update(updateRow).eq("model_id", model_id).select().maybeSingle();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await admin.from("model_dashboard").insert(updateRow).select().maybeSingle();
      if (error) throw error;
      saved = data;
    }

    return new Response(JSON.stringify({ ok: true, row: saved, backend: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fetch-model-revenue error", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
