// Admin-only: mint a real session for any target user so the admin can
// actually log in as that chatter (not just a context override).
// Returns access_token + refresh_token; the client then calls
// supabase.auth.setSession(...) so RLS evaluates with the chatter's auth.uid().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller, unauthorized, forbidden } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const ctx = await verifyCaller(req);
  if (!ctx) return unauthorized(cors);
  if (!ctx.isAdmin) return forbidden(cors);

  const { user_id } = await req.json().catch(() => ({}));
  if (!user_id || typeof user_id !== "string") {
    return new Response(JSON.stringify({ error: "user_id required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const service = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: target, error: gErr } = await service.auth.admin.getUserById(user_id);
  if (gErr || !target?.user?.email) {
    return new Response(JSON.stringify({ error: "Target user has no email" }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const email = target.user.email;

  // Generate a magic-link token, then verify it server-side to obtain a session.
  const { data: linkData, error: lErr } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (lErr || !linkData?.properties?.hashed_token) {
    return new Response(JSON.stringify({ error: lErr?.message || "Failed to mint link" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: verify, error: vErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (vErr || !verify?.session) {
    return new Response(JSON.stringify({ error: vErr?.message || "verify failed" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      access_token: verify.session.access_token,
      refresh_token: verify.session.refresh_token,
      user_id: verify.session.user.id,
      email,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
