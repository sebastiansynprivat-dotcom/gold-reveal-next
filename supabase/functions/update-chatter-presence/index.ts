import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("CHAT_AI_TOOL");
  const provided = req.headers.get("x-api-key") || "";
  if (!secret || !timingSafeEqual(provided, secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const telegram_id = body?.telegram_id;
  const platform = body?.platform;
  if (typeof telegram_id !== "string" || !telegram_id.trim()) {
    return json({ error: "telegram_id (non-empty string) is required" }, 400);
  }
  if (typeof platform !== "string" || !platform.trim()) {
    return json({ error: "platform (non-empty string) is required" }, 400);
  }

  const normalized = telegram_id.trim().replace(/^@/, "");
  const platformKey = platform.trim();

  const entry: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["username", "email", "state", "message"] as const) {
    const v = body?.[k];
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") {
        return json({ error: `${k} must be a string` }, 400);
      }
      entry[k] = v;
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, presence")
    .ilike("telegram_id", normalized)
    .limit(1)
    .maybeSingle();

  if (profileErr) return json({ error: profileErr.message }, 500);
  if (!profile) return json({ exists: false, telegram_id: normalized }, 404);

  const current = (profile.presence && typeof profile.presence === "object" && !Array.isArray(profile.presence))
    ? profile.presence as Record<string, unknown>
    : {};
  const nextPresence = { ...current, [platformKey]: entry };

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ presence: nextPresence })
    .eq("id", profile.id);

  if (upErr) return json({ error: upErr.message }, 500);

  return json({ ok: true, profile_id: profile.id, platform: platformKey, entry });
});
