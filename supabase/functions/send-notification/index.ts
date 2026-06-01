// Push notifications with per-recipient language support.
// Body: { title, body, title_en?, body_en?, target_user_id? }
// When *_en provided: each recipient gets the version matching profiles.ui_language.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, body, title_en, body_en, target_user_id } = await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Subscriptions
    let query = adminClient.from("push_subscriptions").select("*");
    if (target_user_id) query = query.eq("user_id", target_user_id);
    const { data: subscriptions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Build per-user language map if an EN version exists
    const hasEn = typeof title_en === "string" && typeof body_en === "string" && title_en.trim() && body_en.trim();
    const langMap = new Map<string, "de" | "en">();
    if (hasEn && subscriptions && subscriptions.length > 0) {
      const userIds = Array.from(new Set(subscriptions.map((s: any) => s.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profs } = await adminClient
          .from("profiles")
          .select("user_id, ui_language")
          .in("user_id", userIds);
        for (const p of profs || []) {
          const v = (p as any).ui_language;
          langMap.set((p as any).user_id, v === "en" ? "en" : "de");
        }
      }
    }

    const payloadDe = JSON.stringify({ title, body, url: "/dashboard" });
    const payloadEn = hasEn ? JSON.stringify({ title: title_en, body: body_en, url: "/dashboard" }) : payloadDe;

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions || []) {
      try {
        const lang = hasEn ? (langMap.get(sub.user_id) || "de") : "de";
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
          lang === "en" ? payloadEn : payloadDe
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await adminClient.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed.push(sub.endpoint.slice(-20));
      }
    }

    await adminClient.from("notifications").insert({
      title,
      body,
      recipients_count: sent,
    });

    return new Response(
      JSON.stringify({ sent, failed: failed.length, total: subscriptions?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
