// Updates all wallet passes with current revenue. Called by cron + after each sale.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PASSNINJA_BASE, TEMPLATE_ID, passninjaHeaders, buildPassFieldVariants } from "../_shared/passninja-revenue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: passes, error } = await supabase
      .from("wallet_passes").select("id, serial_number, user_id");
    if (error) throw error;
    if (!passes || passes.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no passes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = (await buildPassFieldVariants())[0].fields;

    const results = [];
    for (const p of passes) {
      try {
        const res = await fetch(`${PASSNINJA_BASE}/passes/${TEMPLATE_ID}/${p.serial_number}`, {
          method: "PUT",
          headers: passninjaHeaders(),
          body: JSON.stringify({ pass: fields }),
        });
        const ok = res.ok;
        const body = await res.text();
        if (!ok) console.error("Update failed for", p.serial_number, res.status, body);
        else {
          await supabase.from("wallet_passes")
            .update({ last_payload: fields, updated_at: new Date().toISOString() })
            .eq("id", p.id);
        }
        results.push({ id: p.id, ok, status: res.status });
      } catch (e) {
        console.error("Error updating", p.serial_number, e);
        results.push({ id: p.id, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ updated: results.length, results, fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
