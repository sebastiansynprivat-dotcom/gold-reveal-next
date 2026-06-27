// Helper: send a chatter push using a template key + log it to chatter_push_log.
// Always strictly scoped to one target_user_id — never broadcasts.
//
// Caller is responsible for cooldown checks (use wasRecentlySent below).

import { renderPush, PUSH_TEMPLATES } from "./pushTemplates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type AdminClient = {
  from: (t: string) => any;
};

export async function wasRecentlySent(
  admin: AdminClient,
  user_id: string,
  trigger_key: string,
  withinHours?: number,
): Promise<boolean> {
  const tpl = PUSH_TEMPLATES[trigger_key];
  const h = withinHours ?? tpl?.cooldown_hours ?? 0;
  if (!h || h <= 0) return false;
  const cutoff = new Date(Date.now() - h * 3600_000).toISOString();
  const { data } = await admin
    .from("chatter_push_log")
    .select("id")
    .eq("user_id", user_id)
    .eq("trigger_key", trigger_key)
    .gte("sent_at", cutoff)
    .limit(1);
  return !!(data && data.length > 0);
}

export async function sendChatterPush(
  admin: AdminClient,
  params: {
    user_id: string;
    trigger_key: string;
    lang?: "de" | "en";
    ctx?: Record<string, unknown>;
    skipCooldown?: boolean;
  },
): Promise<{ sent: boolean; reason?: string }> {
  const { user_id, trigger_key, ctx = {}, skipCooldown = false } = params;

  if (!user_id) return { sent: false, reason: "no user_id" };

  if (!skipCooldown && (await wasRecentlySent(admin, user_id, trigger_key))) {
    return { sent: false, reason: "cooldown" };
  }

  const rendered = renderPush(trigger_key, params.lang ?? "de", ctx);
  if (!rendered) return { sent: false, reason: "unknown template" };

  // Log first so that even if push delivery fails, cooldown is respected.
  await admin.from("chatter_push_log").insert({
    user_id,
    trigger_key,
    title: rendered.title,
    body: rendered.body,
    context: ctx,
  });

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        title: rendered.title,
        body: rendered.body,
        title_en: rendered.title_en,
        body_en: rendered.body_en,
        target_user_id: user_id,
      }),
    });
  } catch (e) {
    console.error("sendChatterPush delivery error", trigger_key, user_id, e);
    return { sent: false, reason: "delivery failed" };
  }

  return { sent: true };
}
