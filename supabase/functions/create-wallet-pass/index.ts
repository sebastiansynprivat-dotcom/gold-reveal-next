import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PASSNINJA_BASE, TEMPLATE_ID, passninjaHeaders, buildPassFields } from "../_shared/passninja-revenue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin check
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "sub_admin"]).maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    // Already exists?
    const { data: existing } = await supabaseAdmin
      .from("wallet_passes").select("*").eq("user_id", user.id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ passUrl: existing.pass_url, serialNumber: existing.serial_number }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = await buildPassFields();

    // Create pass at PassNinja
    const res = await fetch(`${PASSNINJA_BASE}/passes`, {
      method: "POST",
      headers: passninjaHeaders(),
      body: JSON.stringify({ passTemplate: TEMPLATE_ID, pass: fields }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("PassNinja create failed:", res.status, text);
      return new Response(JSON.stringify({ error: "PassNinja error", details: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(text);
    // PassNinja returns: { id, urls: { landing, download }, ... } – be defensive
    const passUrl = data?.urls?.landing || data?.urls?.download || data?.url || data?.landingUrl;
    const serial = data?.id || data?.serialNumber || data?.passId;

    if (!passUrl || !serial) {
      console.error("Unexpected PassNinja response shape:", data);
      return new Response(JSON.stringify({ error: "Unexpected response", data }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("wallet_passes").insert({
      user_id: user.id,
      serial_number: serial,
      pass_url: passUrl,
      last_payload: fields,
    });

    return new Response(JSON.stringify({ passUrl, serialNumber: serial }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
