// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type AuthContext = {
  userId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isServiceRole: boolean;
};

/**
 * Verify the caller. Returns null if no valid JWT is present.
 * Accepts the service role key as Bearer for internal/cron calls.
 */
export async function verifyCaller(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  // Service role bearer (used by internal edge functions / cron jobs)
  if (token === SERVICE_KEY) {
    return { userId: null, isAdmin: true, isSuperAdmin: true, isServiceRole: true };
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;

  const service = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const roleSet = new Set((roles || []).map((r: any) => r.role));
  const isSuperAdmin = roleSet.has("super_admin");
  const isAdmin = isSuperAdmin || roleSet.has("admin") || roleSet.has("sub_admin");
  return { userId: data.user.id, isAdmin, isSuperAdmin, isServiceRole: false };
}

export function unauthorized(corsHeaders: Record<string, string>, msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, msg = "Forbidden") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
