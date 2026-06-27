// Event-driven dopamine push engine.
// Called from ingest-revenue (after each new accounts_data snapshot is written).
//
// Input: { user_id, account_id?, model_name?, delta? (€ added vs previous total today) }
// Or:    { user_id, today_total, prev_today_total, model_name? }
//
// Sends:
//   sale_big        delta >= 50
//   sale_huge       delta >= 150
//   sale_combo      3 inserts within last hour
//   goal_reached    crossed daily_goal
//   goal_overshoot_150  / _200
//   personal_record_day today > best in last 30d

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendChatterPush } from "../_shared/sendChatterPush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function todayBerlinDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const user_id: string | undefined = body.user_id;
    const model_name: string = body.model_name || "";
    const delta: number = Number(body.delta ?? 0);
    const today_total: number | undefined = body.today_total !== undefined ? Number(body.today_total) : undefined;
    const prev_today_total: number = Number(body.prev_today_total ?? 0);

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profile (lang, goal, name).
    const { data: prof } = await admin
      .from("profiles")
      .select("ui_language, daily_goal, name, group_name")
      .eq("user_id", user_id)
      .maybeSingle();
    const lang: "de" | "en" = prof?.ui_language === "en" ? "en" : "de";
    const goal = Number(prof?.daily_goal ?? 0);

    const sent: string[] = [];

    // 1. Single-sale magnitude.
    if (delta >= 150) {
      const r = await sendChatterPush(admin, {
        user_id, trigger_key: "sale_huge", lang, ctx: { amount: delta.toFixed(0), model: model_name },
        skipCooldown: true,
      });
      if (r.sent) sent.push("sale_huge");
    } else if (delta >= 50) {
      const r = await sendChatterPush(admin, {
        user_id, trigger_key: "sale_big", lang, ctx: { amount: delta.toFixed(0), model: model_name },
        skipCooldown: true,
      });
      if (r.sent) sent.push("sale_big");
    }

    // 2. Sale combo (3 events in last hour).
    if (delta > 0) {
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await admin
        .from("chatter_push_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .in("trigger_key", ["sale_big", "sale_huge"])
        .gte("sent_at", hourAgo);
      if ((count ?? 0) >= 3) {
        const r = await sendChatterPush(admin, {
          user_id, trigger_key: "sale_combo", lang, ctx: {},
        });
        if (r.sent) sent.push("sale_combo");
      }
    }

    // 3. Goal crossings.
    if (goal > 0 && today_total !== undefined) {
      const wasBelow = prev_today_total < goal;
      if (wasBelow && today_total >= goal) {
        const r = await sendChatterPush(admin, {
          user_id, trigger_key: "goal_reached", lang, ctx: { goal: goal.toFixed(0) },
        });
        if (r.sent) sent.push("goal_reached");
      }
      if (prev_today_total < goal * 1.5 && today_total >= goal * 1.5) {
        const r = await sendChatterPush(admin, {
          user_id, trigger_key: "goal_overshoot_150", lang, ctx: {},
        });
        if (r.sent) sent.push("goal_overshoot_150");
      }
      if (prev_today_total < goal * 2 && today_total >= goal * 2) {
        const r = await sendChatterPush(admin, {
          user_id, trigger_key: "goal_overshoot_200", lang, ctx: {},
        });
        if (r.sent) sent.push("goal_overshoot_200");
      }
    }

    // 4. Personal record day (today > max of last 30d, excluding today).
    if (today_total !== undefined && today_total > 0) {
      const since = new Date(Date.now() - 31 * 86400_000).toISOString().slice(0, 10);
      const today = todayBerlinDate();
      // Aggregate via assignments
      const { data: assign } = await admin
        .from("account_assignments")
        .select("account_id")
        .eq("user_id", user_id)
        .is("end_date", null);
      const accIds = (assign ?? []).map((a: any) => a.account_id).filter(Boolean);
      if (accIds.length > 0) {
        const { data: rows } = await admin
          .from("accounts_data")
          .select("date,total")
          .in("account_id", accIds)
          .gte("date", since)
          .lt("date", today);
        const byDate = new Map<string, number>();
        for (const r of rows ?? []) {
          const d = (r as any).date;
          byDate.set(d, (byDate.get(d) ?? 0) + Number((r as any).total ?? 0));
        }
        let best = 0;
        for (const v of byDate.values()) if (v > best) best = v;
        if (best > 0 && today_total > best * 1.1) {
          const r = await sendChatterPush(admin, {
            user_id, trigger_key: "personal_record_day", lang, ctx: { amount: today_total.toFixed(0) },
          });
          if (r.sent) sent.push("personal_record_day");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("chatter-dopamine-pushes error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
