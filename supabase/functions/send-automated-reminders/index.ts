// Sends automated push reminders to marketers and social-media models.
//
// Reminder types:
//  - marketer_inactive       (no login for >=2 days, cooldown 3d)
//  - marketer_tasks_today    (routine unlocked, today not ticked off, cooldown 1d)
//  - model_content_idle      (active content plan but no items done in 3d, cooldown 3d)
//
// Trigger: pg_cron, daily ~17:00 Berlin time. Body { force?: boolean, dry_run?: boolean }.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// No JWT gate: pg_cron triggers this with the anon key; cooldowns prevent spam.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReminderType =
  | "marketer_inactive"
  | "marketer_tasks_today"
  | "model_content_idle";

const COOLDOWN_DAYS: Record<ReminderType, number> = {
  marketer_inactive: 3,
  marketer_tasks_today: 1,
  model_content_idle: 3,
};

// Fallback messages (used when AI fails). Pairs: [title, body, title_en, body_en].
const FALLBACK: Record<ReminderType, { de: [string, string]; en: [string, string] }> = {
  marketer_inactive: {
    de: ["Wir vermissen dich 👀", "Schon ein paar Tage nichts gehört – schau kurz rein, dein Account braucht dich."],
    en: ["We miss you 👀", "Haven't seen you in a few days – pop in, your account needs you."],
  },
  marketer_tasks_today: {
    de: ["Tagesroutine offen ✅", "Hey, hast du heute schon was geschafft? Wenn ja, hak es kurz ab – sonst zählt der Streak nicht."],
    en: ["Today's routine still open ✅", "Hey, did you already get things done? If yes, tick them off – otherwise your streak won't count."],
  },
  model_content_idle: {
    de: ["Content-Liste wartet 🎬", "Seit ein paar Tagen ist nichts hochgeladen – denk bitte daran, deine Tasks abzuarbeiten."],
    en: ["Content list is waiting 🎬", "No uploads for a few days – please don't forget to work through your tasks."],
  },
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function aiVariant(type: ReminderType, lang: "de" | "en", name: string): Promise<{ title: string; body: string } | null> {
  if (!LOVABLE_API_KEY) return null;
  const ctx: Record<ReminderType, string> = {
    marketer_inactive: lang === "de"
      ? `Marketer "${name}" hat sich seit mehreren Tagen nicht eingeloggt. Locker, freundlich, nicht vorwurfsvoll. Push max. 60 Zeichen Body.`
      : `Marketer "${name}" hasn't logged in for several days. Friendly, casual, not judgemental. Push max 60 chars body.`,
    marketer_tasks_today: lang === "de"
      ? `Marketer "${name}" hat heute noch keine Aufgabe der Tagesroutine abgehakt. Erinnere freundlich: vielleicht hat er sie schon erledigt, dann nur abhaken. Max 80 Zeichen Body.`
      : `Marketer "${name}" hasn't ticked off any of today's daily routine tasks. Friendly nudge: maybe already done, then just tick it off. Max 80 chars body.`,
    model_content_idle: lang === "de"
      ? `Model "${name}" hat seit 2-3 Tagen keinen Content der zugewiesenen Content-Liste als erledigt markiert. Motivierend, kurz, kein Druck. Max 80 Zeichen Body.`
      : `Model "${name}" hasn't marked any content task from the assigned content list as done for 2-3 days. Motivating, short, no pressure. Max 80 chars body.`,
  };
  const system = lang === "de"
    ? "Du schreibst kurze, persönliche Push-Notifications (Deutsch, Du-Form, max 1 Emoji, kein Spam-Ton). Antworte NUR mit JSON: {\"title\":\"...\",\"body\":\"...\"}. Title max 32 Zeichen."
    : "You write short, personal push notifications (English, casual, max 1 emoji, no spam tone). Reply ONLY with JSON: {\"title\":\"...\",\"body\":\"...\"}. Title max 32 chars.";
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: ctx[type] },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const raw = j?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.title || !parsed?.body) return null;
    return { title: String(parsed.title).slice(0, 60), body: String(parsed.body).slice(0, 180) };
  } catch {
    return null;
  }
}

async function pushToUser(userId: string, title: string, body: string): Promise<{ sent: number; cleaned: number }> {
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, cleaned: 0 };
  const payload = JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-192.png" });
  let sent = 0, cleaned = 0;
  for (const s of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
        cleaned++;
      }
    }
  }
  return { sent, cleaned };
}

async function wasRecentlySent(userId: string, type: ReminderType, force: boolean): Promise<boolean> {
  if (force) return false;
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS[type] * 86400000).toISOString();
  const { data } = await admin
    .from("automated_reminder_log")
    .select("id")
    .eq("user_id", userId)
    .eq("reminder_type", type)
    .gte("sent_at", cutoff)
    .limit(1);
  return !!data && data.length > 0;
}

async function logSent(userId: string, type: ReminderType) {
  await admin.from("automated_reminder_log").insert({ user_id: userId, reminder_type: type });
}

async function getProfile(userId: string): Promise<{ name: string; lang: "de" | "en" }> {
  const { data } = await admin.from("profiles").select("name, ui_language").eq("user_id", userId).maybeSingle();
  const name = ((data as any)?.name || "").split(/\s+/)[0] || "";
  const lang: "de" | "en" = (data as any)?.ui_language === "en" ? "en" : "de";
  return { name, lang };
}

async function dispatchReminder(userId: string, type: ReminderType, force: boolean, dryRun: boolean) {
  if (await wasRecentlySent(userId, type, force)) return { userId, type, skipped: "cooldown" };
  const { name, lang } = await getProfile(userId);
  const ai = await aiVariant(type, lang, name || "");
  const [fallbackTitle, fallbackBody] = FALLBACK[type][lang];
  const title = ai?.title || fallbackTitle;
  const body = ai?.body || fallbackBody;
  if (dryRun) return { userId, type, dryRun: true, title, body };
  const res = await pushToUser(userId, title, body);
  if (res.sent > 0) await logSent(userId, type);
  return { userId, type, ...res, title };
}

async function findInactiveMarketers(): Promise<string[]> {
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "socialmedia_marketer");
  const userIds: string[] = Array.from(new Set(((roles || []) as any[]).map((r) => r.user_id))).filter(Boolean);
  if (userIds.length === 0) return [];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  const { data: recent } = await admin
    .from("login_events")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", twoDaysAgo);
  const activeSet = new Set(((recent || []) as any[]).map((r) => r.user_id));
  return userIds.filter((id) => !activeSet.has(id));
}

async function findMarketersWithOpenTasks(): Promise<string[]> {
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "socialmedia_marketer");
  const userIds: string[] = Array.from(new Set(((roles || []) as any[]).map((r) => r.user_id))).filter(Boolean);
  if (userIds.length === 0) return [];
  // Unlocked = has coaching progress OR ticked any daily task in the past 14 days
  const sinceISO = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const [{ data: coach }, { data: hist }] = await Promise.all([
    admin.from("marketer_coaching_progress").select("user_id").in("user_id", userIds),
    admin.from("marketer_daily_tasks").select("user_id, task_date, done").in("user_id", userIds).gte("task_date", sinceISO),
  ]);
  const unlocked = new Set<string>();
  ((coach || []) as any[]).forEach((r) => unlocked.add(r.user_id));
  ((hist || []) as any[]).forEach((r) => { if (r.done) unlocked.add(r.user_id); });
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = new Set<string>();
  ((hist || []) as any[]).forEach((r) => { if (r.done && r.task_date === today) doneToday.add(r.user_id); });
  return Array.from(unlocked).filter((id) => !doneToday.has(id));
}

async function findIdleModels(): Promise<string[]> {
  // Models = users in fanvue_model_users with an active plan that had items in last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data: mu } = await admin.from("fanvue_model_users").select("user_id, model_id");
  const rows = (mu || []) as any[];
  if (rows.length === 0) return [];
  const modelIds = Array.from(new Set(rows.map((r) => r.model_id))).filter(Boolean);

  const { data: asgs } = await admin
    .from("content_plan_assignments")
    .select("id, plan_id, model_id, start_date")
    .in("model_id", modelIds);
  const asgRows = (asgs || []) as any[];
  if (asgRows.length === 0) return [];

  const planIds = Array.from(new Set(asgRows.map((a) => a.plan_id)));
  const { data: dayRows } = await admin
    .from("content_plan_days")
    .select("plan_id, day_number, items")
    .in("plan_id", planIds);

  const itemsByPlanDay = new Map<string, number>();
  ((dayRows || []) as any[]).forEach((d) => {
    const cnt = Array.isArray(d.items) ? d.items.length : 0;
    itemsByPlanDay.set(`${d.plan_id}:${d.day_number}`, cnt);
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  // For each assignment, check if any of the past 3 days had items
  const assignmentsWithRecentItems: string[] = [];
  for (const a of asgRows) {
    const start = new Date(a.start_date); start.setHours(0, 0, 0, 0);
    if (today < start) continue;
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000);
    for (let off = 0; off <= 3; off++) {
      const dayNum = daysSinceStart - off + 1;
      if (dayNum < 1 || dayNum > 30) continue;
      const cnt = itemsByPlanDay.get(`${a.plan_id}:${dayNum}`) || 0;
      if (cnt > 0) { assignmentsWithRecentItems.push(a.id); break; }
    }
  }
  if (assignmentsWithRecentItems.length === 0) return [];

  const { data: status } = await admin
    .from("content_plan_task_status")
    .select("assignment_id, done, completed_at")
    .in("assignment_id", assignmentsWithRecentItems)
    .eq("done", true)
    .gte("completed_at", threeDaysAgo);
  const recentlyActiveAsg = new Set(((status || []) as any[]).map((s) => s.assignment_id));

  const idleModels = new Set<string>();
  for (const a of asgRows) {
    if (!assignmentsWithRecentItems.includes(a.id)) continue;
    if (recentlyActiveAsg.has(a.id)) continue;
    idleModels.add(a.model_id);
  }
  const userIds: string[] = [];
  for (const r of rows) {
    if (idleModels.has(r.model_id) && r.user_id) userIds.push(r.user_id);
  }
  return Array.from(new Set(userIds));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const caller = await verifyCaller(req);
    if (!caller) return unauthorized(corsHeaders);
    if (!caller.isAdmin && !caller.isServiceRole) return forbidden(corsHeaders);

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails("mailto:admin@shex.agency", vapidPublic, vapidPrivate);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = !!body?.force;
    const dryRun = !!body?.dry_run;
    const onlyType = body?.only as ReminderType | undefined;

    const results: any[] = [];

    if (!onlyType || onlyType === "marketer_inactive") {
      const ids = await findInactiveMarketers();
      for (const id of ids) results.push(await dispatchReminder(id, "marketer_inactive", force, dryRun));
    }
    if (!onlyType || onlyType === "marketer_tasks_today") {
      const ids = await findMarketersWithOpenTasks();
      for (const id of ids) results.push(await dispatchReminder(id, "marketer_tasks_today", force, dryRun));
    }
    if (!onlyType || onlyType === "model_content_idle") {
      const ids = await findIdleModels();
      for (const id of ids) results.push(await dispatchReminder(id, "model_content_idle", force, dryRun));
    }

    const summary = {
      total: results.length,
      sent: results.filter((r) => r.sent > 0).length,
      skipped_cooldown: results.filter((r) => r.skipped === "cooldown").length,
      no_subscriptions: results.filter((r) => r.sent === 0 && !r.skipped && !r.dryRun).length,
      dry_run: dryRun,
    };

    return new Response(JSON.stringify({ ok: true, summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
