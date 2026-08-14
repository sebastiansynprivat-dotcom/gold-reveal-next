import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  platform: z.string().min(1),
  email: z.string().min(3),
});

function getProvidedApiKey(req: Request): string | null {
  const explicit = req.headers.get("x-api-key")?.trim();
  if (explicit) return explicit;
  const authorization = req.headers.get("authorization")?.trim();
  if (!authorization) return null;
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  return (bearer ? bearer[1] : authorization).trim() || null;
}

function isEmptySnapshot(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected =
      Deno.env.get("chat_ai_model_profiles") || Deno.env.get("CHAT_AI_MODEL_PROFILES");
    if (!expected) return json({ error: "Server not configured" }, 500);
    if (getProvidedApiKey(req) !== expected) return json({ error: "Unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const platform = parsed.data.platform.trim();
    const email = parsed.data.email.trim().toLowerCase();
    if (!platform || !email) return json({ error: "platform and email are required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: accounts, error: accErr } = await admin
      .from("accounts")
      .select("id, model_id, platform, account_email")
      .ilike("account_email", email)
      .ilike("platform", platform)
      .limit(5);

    if (accErr) return json({ error: accErr.message }, 500);
    if (!accounts || accounts.length === 0) return json({ code: "not_found" }, 404);
    if (accounts.length > 1) return json({ code: "ambiguous_account" }, 409);

    const modelId = (accounts[0] as any).model_id as string | null;
    if (!modelId) {
      return json({ model_id: null, profile_status: "missing", profile: null });
    }

    const { data: profile, error: profErr } = await admin
      .from("model_profiles")
      .select("confirmed_at, updated_at, approved_snapshot")
      .eq("model_id", modelId)
      .maybeSingle();

    if (profErr) return json({ error: profErr.message }, 500);

    const approved =
      !!profile?.confirmed_at && !isEmptySnapshot((profile as any).approved_snapshot);

    if (!approved) {
      return json({
        model_id: modelId,
        profile_status: "missing",
        confirmed_at: null,
        updated_at: null,
        profile: null,
      });
    }

    return json({
      model_id: modelId,
      profile_status: "approved",
      confirmed_at: (profile as any).confirmed_at,
      updated_at: (profile as any).updated_at ?? null,
      profile: (profile as any).approved_snapshot,
    });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
