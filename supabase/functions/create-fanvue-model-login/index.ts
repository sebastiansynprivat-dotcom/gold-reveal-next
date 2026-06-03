import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

function slugify(input: string): string {
  return (
    (input || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "model"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { model_id, action } = await req.json();
    if (!model_id) {
      return new Response(JSON.stringify({ error: "model_id required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("fanvue_model_users")
      .select("id, user_id, email, plaintext_password")
      .eq("model_id", model_id)
      .maybeSingle();

    if (action === "reset") {
      if (!existing) {
        return new Response(JSON.stringify({ error: "Kein Login zum Zurücksetzen" }), { status: 404, headers: corsHeaders });
      }
      const newPassword = generatePassword(12);
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.user_id, { password: newPassword });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: corsHeaders });
      }
      await admin
        .from("fanvue_model_users")
        .update({ plaintext_password: newPassword })
        .eq("id", existing.id);
      return new Response(JSON.stringify({ email: existing.email, password: newPassword, user_id: existing.user_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!existing) {
        return new Response(JSON.stringify({ error: "Kein Login vorhanden" }), { status: 404, headers: corsHeaders });
      }
      await admin.from("user_roles").delete().eq("user_id", existing.user_id);
      await admin.from("fanvue_model_users").delete().eq("user_id", existing.user_id);
      await admin.auth.admin.deleteUser(existing.user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // create
    if (existing) {
      return new Response(JSON.stringify({ error: "Login existiert bereits für dieses Model." }), { status: 409, headers: corsHeaders });
    }

    const { data: model } = await admin
      .from("fanvue_models")
      .select("name, username")
      .eq("id", model_id)
      .maybeSingle();

    const slug = slugify(model?.username || model?.name || model_id);

    let email = `${slug}@fanvue.shex.app`;
    for (let i = 2; i < 100; i++) {
      const { data: clash } = await admin
        .from("fanvue_model_users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!clash) break;
      email = `${slug}-${i}@fanvue.shex.app`;
    }

    const password = generatePassword(12);

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? "Fehler beim Erstellen" }), { status: 400, headers: corsHeaders });
    }

    const userId = authData.user.id;

    await admin.from("user_roles").insert({ user_id: userId, role: "fanvue_model" });
    const { error: insErr } = await admin.from("fanvue_model_users").insert({
      user_id: userId,
      model_id,
      email,
      plaintext_password: password,
    });
    if (insErr) {
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ email, password, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
