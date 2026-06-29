// Cron-driven pull-trigger push engine for chatters.
// Runs every 30 minutes via pg_cron. Evaluates per-chatter A-triggers
// and sends pushes scoped strictly to each individual chatter.
//
// Phase 1 triggers: morning_kickoff, inbox_pile_up, multi_day_inactive, streak_at_risk

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

// Returns Berlin-local hour (0-23). Good enough until per-user timezones land.
function berlinHour(d = new Date()): number {
  const s = d.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: "Europe/Berlin" });
  return parseInt(s, 10);
}

function todayBerlinDate(): string {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  return s; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const hour = berlinHour();
  const today = todayBerlinDate();
  const dow = new Date().toLocaleString("en-US", { weekday: "short", timeZone: "Europe/Berlin" });
  const isWeekend = dow === "Sat" || dow === "Sun";

  try {
    // 1. Find all active assignments (no FK embed — relation is missing).
    const { data: assignments, error: aaErr } = await admin
      .from("account_assignments")
      .select("user_id, profile_id, account_id")
      .is("end_date", null);
    if (aaErr) throw aaErr;

    // Resolve missing user_id via profile_id -> profiles.user_id
    const profileIds = Array.from(
      new Set(
        (assignments ?? [])
          .filter((a: any) => !a.user_id && a.profile_id)
          .map((a: any) => a.profile_id),
      ),
    );
    const profileUserMap = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: prows } = await admin
        .from("profiles")
        .select("id, user_id")
        .in("id", profileIds);
      for (const p of (prows ?? []) as any[]) {
        if (p.user_id) profileUserMap.set(p.id, p.user_id);
      }
    }

    // Fetch account -> model_id map, then models -> name
    const accountIds = Array.from(
      new Set((assignments ?? []).map((a: any) => a.account_id).filter(Boolean)),
    );
    const accountModelMap = new Map<string, string | null>();
    const modelIds = new Set<string>();
    if (accountIds.length > 0) {
      const { data: accs } = await admin
        .from("accounts")
        .select("id, model_id")
        .in("id", accountIds);
      for (const a of (accs ?? []) as any[]) {
        accountModelMap.set(a.id, a.model_id ?? null);
        if (a.model_id) modelIds.add(a.model_id);
      }
    }
    const modelNameMap = new Map<string, string>();
    if (modelIds.size > 0) {
      const { data: mods } = await admin
        .from("models")
        .select("id, name")
        .in("id", Array.from(modelIds));
      for (const m of (mods ?? []) as any[]) modelNameMap.set(m.id, m.name);
    }

    type ChatterCtx = {
      user_id: string;
      account_ids: string[];
      model_names: string[];
    };
    const byUser = new Map<string, ChatterCtx>();
    for (const a of (assignments ?? []) as any[]) {
      const uid = a.user_id || (a.profile_id ? profileUserMap.get(a.profile_id) : undefined);
      if (!uid) continue;
      if (!byUser.has(uid)) byUser.set(uid, { user_id: uid, account_ids: [], model_names: [] });
      const c = byUser.get(uid)!;
      if (a.account_id) c.account_ids.push(a.account_id);
      const modelId = a.account_id ? accountModelMap.get(a.account_id) : null;
      const mn = modelId ? modelNameMap.get(modelId) : undefined;
      if (mn) c.model_names.push(mn);
    }

    if (byUser.size === 0) {
      return new Response(JSON.stringify({ ok: true, chatters: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const userIds = Array.from(byUser.keys());

    // 2. Profiles (name, language, daily_goal).
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, name, group_name, ui_language, daily_goal")
      .in("user_id", userIds);
    const profMap = new Map<string, any>();
    for (const p of profiles ?? []) profMap.set((p as any).user_id, p);

    // 3. Latest accounts_data snapshot per account (for inbox sums + last activity).
    const allAccountIds = Array.from(new Set(Array.from(byUser.values()).flatMap((c) => c.account_ids)));
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: accData } = await admin
      .from("accounts_data")
      .select("account_id, date, total, unread_chats")
      .in("account_id", allAccountIds.length > 0 ? allAccountIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("date", since)
      .order("date", { ascending: false });

    // latest snapshot per account
    const latestByAcc = new Map<string, any>();
    for (const r of (accData ?? []) as any[]) {
      if (!latestByAcc.has(r.account_id)) latestByAcc.set(r.account_id, r);
    }
    // daily totals per user (date -> total) for streak + today
    const totalsByUser = new Map<string, Map<string, number>>();
    for (const [uid, ctx] of byUser.entries()) {
      const m = new Map<string, number>();
      for (const r of (accData ?? []) as any[]) {
        if (!ctx.account_ids.includes(r.account_id)) continue;
        const cur = m.get(r.date) ?? 0;
        m.set(r.date, cur + Number(r.total ?? 0));
      }
      totalsByUser.set(uid, m);
    }

    let sentCount = 0;
    const skip: Record<string, number> = {};

    for (const [uid, ctx] of byUser.entries()) {
      const prof = profMap.get(uid);
      const lang: "de" | "en" = prof?.ui_language === "en" ? "en" : "de";
      const name = (prof?.name || prof?.group_name || "").split(" ")[0] || (lang === "en" ? "there" : "du");
      const goal = Number(prof?.daily_goal ?? 0);
      const totals = totalsByUser.get(uid) ?? new Map();

      // ---- morning_kickoff (08:30–10:30 Berlin) ----
      if (force || (hour >= 8 && hour <= 10)) {
        const r = await sendChatterPush(admin, {
          user_id: uid, trigger_key: "morning_kickoff", lang,
          ctx: { name, goal: goal > 0 ? goal : (lang === "en" ? "—" : "—") },
        });
        if (r.sent) sentCount++; else skip[r.reason || "x"] = (skip[r.reason || "x"] || 0) + 1;
      }

      // ---- inbox_pile_up (anytime, biggest account) ----
      let maxUnread = 0;
      let maxModel = "";
      for (const accId of ctx.account_ids) {
        const snap = latestByAcc.get(accId);
        const u = Number(snap?.unread_chats ?? 0);
        if (u > maxUnread) {
          maxUnread = u;
          // pick model name (best effort)
          maxModel = ctx.model_names[0] || "";
        }
      }
      if (maxUnread > 20) {
        const r = await sendChatterPush(admin, {
          user_id: uid, trigger_key: "inbox_pile_up", lang,
          ctx: { count: maxUnread, model: maxModel || (lang === "en" ? "your account" : "deinem Account") },
        });
        if (r.sent) sentCount++;
      }

      // ---- multi_day_inactive (last 2 days total === 0) ----
      const yest = new Date(Date.now() - 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
      const dayBefore = new Date(Date.now() - 2 * 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
      const totYest = totals.get(yest) ?? 0;
      const totDB = totals.get(dayBefore) ?? 0;
      const totToday = totals.get(today) ?? 0;
      if (totYest === 0 && totDB === 0 && totToday === 0 && (force || hour === 11)) {
        const r = await sendChatterPush(admin, {
          user_id: uid, trigger_key: "multi_day_inactive", lang, ctx: {},
        });
        if (r.sent) sentCount++;
      }

      // ---- streak_at_risk (evening, streak >=3, today still 0) ----
      if (force || hour >= 19) {
        // count consecutive prior days with total > 0
        let streak = 0;
        for (let i = 1; i < 60; i++) {
          const d = new Date(Date.now() - i * 86400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
          if ((totals.get(d) ?? 0) > 0) streak++;
          else break;
        }
        if (streak >= 3 && totToday === 0) {
          const r = await sendChatterPush(admin, {
            user_id: uid, trigger_key: "streak_at_risk", lang, ctx: { streak },
          });
          if (r.sent) sentCount++;
        }
      }

      // ---- weekend_silent (Sa/So 11:00) ----
      if (isWeekend && (force || hour === 11) && totToday === 0) {
        const r = await sendChatterPush(admin, {
          user_id: uid, trigger_key: "weekend_silent", lang, ctx: {},
        });
        if (r.sent) sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, chatters: byUser.size, sent: sentCount, hour, today, skipped: skip }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("chatter-pulse-pushes error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
