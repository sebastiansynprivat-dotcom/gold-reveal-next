// Admin → broadcast new content drop to every chatter assigned to any active
// account of the given model. Inserts content_drops row and fires push to each
// recipient via send-notification (per-recipient language already handled there).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Auth → resolve caller
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    // 2. Verify admin via service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdminData } = await admin.rpc("is_admin");
    // is_admin uses auth.uid() — call via user client
    const { data: isAdminUser } = await userClient.rpc("is_admin");
    if (!isAdminUser) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const model_id = String(body?.model_id || "").trim();
    const content_link = String(body?.content_link || "").trim();
    const message = String(body?.message || "").trim();
    if (!model_id) {
      return new Response(JSON.stringify({ error: "model_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!content_link && !message) {
      return new Response(JSON.stringify({ error: "content_link or message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // 3. Load model name
    const { data: model } = await admin
      .from("models")
      .select("id, name, username")
      .eq("id", model_id)
      .maybeSingle();
    if (!model) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const modelDisplay = (model.name || model.username || "").toString().trim() || "dein Model";

    // 4. Insert content_drops row
    const { data: drop, error: dropErr } = await admin
      .from("content_drops")
      .insert({
        model_id,
        model_name: modelDisplay,
        content_link,
        message,
        created_by: callerId,
      })
      .select("id")
      .single();
    if (dropErr) throw dropErr;

    // 5. Collect distinct chatter user_ids assigned to active accounts of this model
    const { data: assignedAccounts } = await admin
      .from("accounts")
      .select("assigned_to, platform")
      .eq("model_id", model_id)
      .eq("model_active", true)
      .not("assigned_to", "is", null);

    const recipientIds = Array.from(
      new Set((assignedAccounts || []).map((a: any) => a.assigned_to).filter(Boolean))
    ) as string[];

    // 6. Fire push to each recipient (await all; ignore individual failures)
    const title = `💎 Neuer Content von ${modelDisplay}`;
    const baseBody = message
      ? message
      : `Schau ihn dir jetzt an und nutze ihn in deinen Chats.`;
    const title_en = `💎 New content from ${modelDisplay}`;
    const body_en = message
      ? message
      : `Check it out and use it in your chats.`;

    const pushUrl = `${SUPABASE_URL}/functions/v1/send-notification`;
    await Promise.allSettled(
      recipientIds.map((uid) =>
        fetch(pushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            title,
            body: baseBody,
            title_en,
            body_en,
            target_user_id: uid,
          }),
        })
      )
    );

    return new Response(
      JSON.stringify({
        ok: true,
        drop_id: drop.id,
        recipients: recipientIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("broadcast-content-drop error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
