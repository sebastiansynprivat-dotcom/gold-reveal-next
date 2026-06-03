import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, inviteCode } = await req.json();

    if (!email || !password || !inviteCode) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Passwort muss mindestens 8 Zeichen haben." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedCode = Deno.env.get("SOCIALMEDIA_INVITE_CODE");
    if (!expectedCode || inviteCode.trim() !== expectedCode) {
      return new Response(JSON.stringify({ error: "Ungültiger Einladungscode." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).toLowerCase().trim(),
      password,
      email_confirm: true,
    });

    if (createErr || !created.user) {
      const msg = createErr?.message?.includes("already") ? "Diese E-Mail ist bereits registriert." : (createErr?.message ?? "Fehler beim Erstellen.");
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: created.user.id,
      role: "fanvue_partner",
    });

    if (roleErr) {
      // Best-effort rollback
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: "Rolle konnte nicht zugewiesen werden." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
