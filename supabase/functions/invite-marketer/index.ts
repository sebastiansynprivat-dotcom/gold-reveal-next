// Invite a new Social Media Marketer via email.
// Admin provides name + email + optional model_ids. We create the auth user
// with an invite (Supabase sends the email), pre-assign role, display name,
// and model assignments so the marketer can use everything on first login.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, name, model_ids, redirect_to } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "E-Mail ist erforderlich." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin / partner
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await userClient
      .from("user_roles").select("role").eq("user_id", caller.id);
    const allowed = (roles || []).some((r: any) =>
      ["super_admin", "admin", "fanvue_partner"].includes(r.role)
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = (name && String(name).trim()) || "";

    // Invite user via email. Supabase sends the invite mail automatically.
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: { name: cleanName, role: "socialmedia_marketer" },
        redirectTo: redirect_to || undefined,
      }
    );

    let userId: string | null = invited?.user?.id ?? null;

    if (inviteErr || !userId) {
      const msg = inviteErr?.message || "";
      // If the user already exists, look them up and continue with role/assignments
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        // Find existing user by email
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === cleanEmail);
        if (!existing) {
          return new Response(JSON.stringify({ error: "Nutzer existiert bereits, konnte aber nicht geladen werden." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = existing.id;
      } else {
        return new Response(JSON.stringify({ error: msg || "Einladung fehlgeschlagen." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Ensure marketer role
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "socialmedia_marketer" },
      { onConflict: "user_id,role" }
    );

    // Persist display name
    await admin.from("admin_profiles").upsert(
      { user_id: userId, display_name: cleanName || cleanEmail },
      { onConflict: "user_id" }
    );

    // Pre-assign models (ignore duplicates)
    if (Array.isArray(model_ids) && model_ids.length) {
      const rows = model_ids.map((mid: string) => ({
        marketer_user_id: userId,
        model_id: mid,
        assigned_by: caller.id,
      }));
      await admin.from("marketer_model_assignments").upsert(rows, {
        onConflict: "marketer_user_id,model_id",
        ignoreDuplicates: true,
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
