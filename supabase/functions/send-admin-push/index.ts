import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Event = "new_request" | "new_revenue" | "new_request_comment" | "test";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, title, body, url, platform } = await req.json() as {
      event: Event; title: string; body: string; url?: string; platform?: string;
    };

    if (!event || !title || !body) {
      return new Response(JSON.stringify({ error: "event, title, body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails("mailto:admin@shex.agency", vapidPublic, vapidPrivate);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admin-user IDs
    const { data: roles } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin", "sub_admin"]);
    let adminIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For request-comment events, restrict to admins named Vanessa or Max
    if (event === "new_request_comment") {
      const { data: profs } = await admin
        .from("admin_profiles")
        .select("user_id, display_name")
        .in("user_id", adminIds);
      const matchIds = (profs ?? [])
        .filter((p: any) => {
          const n = String(p.display_name || "").toLowerCase();
          return n.includes("vanessa") || n.includes("max");
        })
        .map((p: any) => p.user_id);
      adminIds = matchIds;
      if (adminIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0, total: 0, reason: "no matching admins" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Filter by preferences (default: opted-in if no row, except for "test" and "new_request_comment")
    let targetIds = adminIds;
    if (event !== "test" && event !== "new_request_comment") {
      const col = event === "new_request" ? "new_request" : "new_revenue";
      const { data: prefs } = await admin
        .from("admin_notification_preferences")
        .select(`user_id, ${col}`)
        .in("user_id", adminIds);
      const prefMap = new Map<string, boolean>();
      for (const p of prefs ?? []) prefMap.set((p as any).user_id, (p as any)[col]);
      targetIds = adminIds.filter((id) => prefMap.get(id) !== false);
    }

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetIds);

    // Per-admin language
    const langMap = new Map<string, "de" | "en">();
    const { data: profs2 } = await admin
      .from("profiles")
      .select("user_id, ui_language")
      .in("user_id", targetIds);
    for (const p of profs2 || []) {
      langMap.set((p as any).user_id, (p as any).ui_language === "en" ? "en" : "de");
    }

    const anyEn = Array.from(langMap.values()).some((v) => v === "en");
    let titleEn = title;
    let bodyEn = body;
    if (anyEn) {
      try {
        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (apiKey) {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Translate German push notifications to natural, punchy English. Preserve emojis, numbers, currency symbols, names in quotes, platform names. Reply ONLY with JSON: {\"title\":\"...\",\"body\":\"...\"}" },
                { role: "user", content: JSON.stringify({ title, body }) },
              ],
            }),
          });
          if (r.ok) {
            const j = await r.json();
            const txt = j?.choices?.[0]?.message?.content || "";
            const m = txt.match(/\{[\s\S]*\}/);
            if (m) {
              const parsed = JSON.parse(m[0]);
              if (parsed.title) titleEn = parsed.title;
              if (parsed.body) bodyEn = parsed.body;
            }
          }
        }
      } catch (e) { console.error("admin translate err", e); }
    }

    const payloadDe = JSON.stringify({ title, body, url: url ?? "/admin" });
    const payloadEn = JSON.stringify({ title: titleEn, body: bodyEn, url: url ?? "/admin" });
    let sent = 0;
    for (const sub of subs ?? []) {
      try {
        const lang = langMap.get(sub.user_id) === "en" ? "en" : "de";
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
          lang === "en" ? payloadEn : payloadDe
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
