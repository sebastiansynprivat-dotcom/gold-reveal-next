// Create a Social Media Marketer account and return a one-time setup link
// the admin can copy and share manually. This avoids relying on email delivery
// (no custom email domain is configured for this project).

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
    const redirectTo = redirect_to || undefined;

    // Find or create the auth user (without relying on email delivery).
    let userId: string | null = null;
    let isNewUser = false;

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === cleanEmail);

    if (existing) {
      // SAFETY: Refuse to invite an email that already belongs to an admin/super_admin/sub_admin.
      // Generating a recovery link for that account would let the marketer reset
      // (and thereby steal) the admin's password.
      const { data: existingRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", existing.id);
      const isAdminAccount = (existingRoles || []).some((r: any) =>
        ["super_admin", "admin", "sub_admin"].includes(r.role)
      );
      if (isAdminAccount) {
        return new Response(JSON.stringify({
          error: "Diese E-Mail gehört bereits zu einem Admin-Account. Bitte eine andere E-Mail für den Marketer verwenden.",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: { name: cleanName, role: "socialmedia_marketer" },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Konnte Account nicht anlegen." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.user.id;
      isNewUser = true;
    }

    // Generate a recovery link the marketer can use to set/reset their password.
    // Works for both newly created and pre-existing accounts.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkErr || !linkData) {
      return new Response(JSON.stringify({ error: linkErr?.message || "Link konnte nicht erzeugt werden." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionLink: string | undefined =
      (linkData as any)?.properties?.action_link ?? (linkData as any)?.action_link;

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

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, is_new_user: isNewUser, action_link: actionLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
