import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, name, model_ids } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Missing email or password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Passwort muss mindestens 8 Zeichen haben." }), {
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

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name || "" },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message?.includes("already")
        ? "Diese E-Mail ist bereits registriert."
        : (createErr?.message ?? "Fehler beim Erstellen.");
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: userId,
      role: "socialmedia_marketer",
    });
    if (roleErr) {
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Rolle konnte nicht zugewiesen werden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist display name for dropdown lookups
    await admin.from("admin_profiles").upsert({
      user_id: userId,
      display_name: (name && String(name).trim()) || String(email).trim(),
    }, { onConflict: "user_id" });

    if (Array.isArray(model_ids) && model_ids.length) {
      const rows = model_ids.map((mid: string) => ({
        marketer_user_id: userId,
        model_id: mid,
        assigned_by: caller.id,
      }));
      await admin.from("marketer_model_assignments").insert(rows);
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
