import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode as base32decode } from "https://deno.land/std@0.208.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateTOTP(secret: string): Promise<string> {
  const decoded = base32decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp >>= 8;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    decoded,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hmac = new Uint8Array(signature);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, "0");
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  // Allow 1 step window in each direction (±30s)
  const epoch = Math.floor(Date.now() / 1000);
  for (let i = -1; i <= 1; i++) {
    const counter = Math.floor(epoch / 30) + i;

    const decoded = base32decode(secret);
    const counterBytes = new Uint8Array(8);
    let tmp = counter;
    for (let j = 7; j >= 0; j--) {
      counterBytes[j] = tmp & 0xff;
      tmp >>= 8;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      decoded,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const expected = String(code % 1000000).padStart(6, "0");
    if (expected === token) return true;
  }
  return false;
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

    const { token, is_setup } = await req.json();
    if (!token || token.length !== 6) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    // Check admin role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "sub_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get TOTP secret
    const { data: totpData } = await serviceClient
      .from("admin_totp_secrets")
      .select("totp_secret, is_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!totpData) {
      return new Response(
        JSON.stringify({ error: "TOTP not configured. Please set up 2FA first." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the token
    const isValid = await verifyTOTP(totpData.totp_secret, token);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid code", valid: false }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If this is the initial setup verification, mark as verified
    if (is_setup && !totpData.is_verified) {
      await serviceClient
        .from("admin_totp_secrets")
        .update({ is_verified: true })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ valid: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
