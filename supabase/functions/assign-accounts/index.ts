import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin using user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a client with the user's JWT to check admin status
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for data operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { platform } = await req.json();
    if (!platform) {
      return new Response(JSON.stringify({ error: "Platform required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles with this offer that have no account assigned
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("offer", platform)
      .or("account_email.is.null,account_email.eq.")
      .order("created_at", { ascending: true });

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ assigned: 0, message: "No unassigned chatters found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let assigned = 0;

    for (const profile of profiles) {
      // Check if user already has an account in accounts table
      const { data: existing } = await supabase
        .from("accounts")
        .select("id")
        .eq("assigned_to", profile.user_id)
        .maybeSingle();

      if (existing) continue;

      // Find next free account for this platform
      const { data: freeAccount } = await supabase
        .from("accounts")
        .select("*")
        .eq("platform", platform)
        .is("assigned_to", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!freeAccount) break; // No more free accounts

      // Assign account
      await supabase
        .from("accounts")
        .update({ assigned_to: profile.user_id, assigned_at: new Date().toISOString() })
        .eq("id", freeAccount.id);

      // Update profile with account data
      await supabase
        .from("profiles")
        .update({
          account_email: freeAccount.account_email,
          account_password: freeAccount.account_password,
          account_domain: freeAccount.account_domain,
        })
        .eq("user_id", profile.user_id);

      // Auto-share Google Drive folder if drive_folder_id is set
      if (freeAccount.drive_folder_id) {
        try {
          // Get the user's login email
          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
          const loginEmail = userData?.user?.email;
          if (loginEmail) {
            const driveRes = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/share-drive`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-service-role": "true",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
                body: JSON.stringify({
                  folder_id: freeAccount.drive_folder_id,
                  email: loginEmail,
                }),
              }
            );
            if (!driveRes.ok) {
              const driveErr = await driveRes.json();
              console.error("Drive share failed for user:", profile.user_id, driveErr);
            } else {
              console.log("Drive folder shared with", loginEmail);
            }
          }
        } catch (driveErr) {
          console.error("Drive share error for user:", profile.user_id, driveErr);
        }
      }

      // Send push notification to the assigned user
      try {
        const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
        if (vapidPublic && vapidPrivate) {
          webpush.setVapidDetails("mailto:admin@shex.agency", vapidPublic, vapidPrivate);
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", profile.user_id);
          const payload = JSON.stringify({
            title: "Gute Nachrichten 🥳",
            body: "Dir wurde ein neuer Account zugewiesen! Schau jetzt in dein Dashboard.",
            url: "/dashboard",
          });
          for (const sub of subs || []) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
                payload
              );
            } catch (pushErr: any) {
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              }
            }
          }
        }
      } catch (notifErr) {
        console.error("Push notification failed for user:", profile.user_id, notifErr);
      }

      assigned++;
    }

    return new Response(
      JSON.stringify({ assigned, message: `${assigned} Accounts zugewiesen` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
