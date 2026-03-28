import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Check caller is admin
    const { data: callerRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, target_user_id } = await req.json();

    if (action === "list") {
      const { data: roles } = await serviceClient
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "super_admin", "sub_admin"]);

      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ admins: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admins = [];
      for (const role of roles) {
        const { data: { user: adminUser } } = await serviceClient.auth.admin.getUserById(role.user_id);
        if (adminUser) {
          admins.push({
            user_id: role.user_id,
            email: adminUser.email,
            has_totp: false,
          });
        }
      }

      const { data: totpData } = await serviceClient
        .from("admin_totp_secrets")
        .select("user_id, is_verified")
        .in("user_id", admins.map(a => a.user_id));

      for (const admin of admins) {
        const totp = totpData?.find(t => t.user_id === admin.user_id);
        admin.has_totp = totp?.is_verified ?? false;
      }

      return new Response(JSON.stringify({ admins }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add") {
      if (!email) {
        return new Response(JSON.stringify({ error: "E-Mail erforderlich" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by email – paginate through all users
      let targetUser = null;
      let page = 1;
      const perPage = 1000;
      while (!targetUser) {
        const { data: { users }, error: listErr } = await serviceClient.auth.admin.listUsers({ page, perPage });
        if (listErr || !users || users.length === 0) break;
        targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
        if (users.length < perPage) break;
        page++;
      }

      // If user doesn't exist, create them with a generated password
      let created = false;
      let generatedPassword = "";
      if (!targetUser) {
        generatedPassword = generatePassword(14);
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: generatedPassword,
          email_confirm: true,
        });
        if (authError) {
          return new Response(JSON.stringify({ error: authError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        targetUser = authData.user;
        created = true;
      }

      // Check if already admin
      const { data: existing } = await serviceClient
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .in("role", ["admin", "super_admin", "sub_admin"])
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Dieser Benutzer ist bereits Admin." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await serviceClient
        .from("user_roles")
        .insert({ user_id: targetUser.id, role: "super_admin" });

      const response: Record<string, any> = { success: true, created };
      if (created) {
        response.generated_password = generatedPassword;
        response.email = email.toLowerCase().trim();
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "User ID erforderlich" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (target_user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Du kannst dich nicht selbst als Admin entfernen." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id)
        .eq("role", "admin");

      await serviceClient
        .from("admin_totp_secrets")
        .delete()
        .eq("user_id", target_user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
