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

    // Verify admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { account_id, email } = await req.json();
    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id required" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if model login already exists
    const { data: existing } = await adminClient
      .from("model_users")
      .select("id, user_id")
      .eq("account_id", account_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Login existiert bereits für dieses Model." }), { status: 409, headers: corsHeaders });
    }

    // Get account info for email fallback
    const { data: account } = await adminClient
      .from("accounts")
      .select("account_email")
      .eq("id", account_id)
      .single();

    const modelEmail = email || `model+${account?.account_email || account_id}@shex.app`;
    const password = generatePassword(12);

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: modelEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });
    }

    const userId = authData.user.id;

    // Assign model role
    await adminClient.from("user_roles").insert({ user_id: userId, role: "model" });

    // Create model_users link
    await adminClient.from("model_users").insert({ user_id: userId, account_id });

    return new Response(JSON.stringify({ email: modelEmail, password, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
