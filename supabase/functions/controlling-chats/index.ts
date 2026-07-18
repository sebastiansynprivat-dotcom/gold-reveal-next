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

const BodySchema = z.object({ telegram_id: z.string().min(1) });

function parseKey(raw: string): Uint8Array {
  const s = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const bin = atob(s);
  if (bin.length !== 32) throw new Error("CONTROLLING_CHATS_AES_KEY must decode to 32 bytes");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function getProvidedApiKey(req: Request): string | null {
  const explicit = req.headers.get("x-api-key")?.trim();
  if (explicit) return explicit;

  const authorization = req.headers.get("authorization")?.trim();
  if (!authorization) return null;

  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return (bearerMatch ? bearerMatch[1] : authorization).trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedAuth = Deno.env.get("CONTROLLING_CHATS_AUTH");
    const rawKey = Deno.env.get("CONTROLLING_CHATS_AES_KEY");
    if (!expectedAuth || !rawKey) return json({ error: "Server not configured" }, 500);

    if (getProvidedApiKey(req) !== expectedAuth) return json({ error: "Unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const normalized = parsed.data.telegram_id.trim().replace(/^@/, "");
    if (!normalized) return json({ error: "telegram_id required" }, 400);

    let keyBytes: Uint8Array;
    try {
      keyBytes = parseKey(rawKey);
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, user_id")
      .ilike("telegram_id", normalized)
      .limit(1)
      .maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);

    if (!profile) return json({ telegram_id: normalized, tokens: [] });

    const orParts: string[] = [];
    if (profile.user_id) orParts.push(`user_id.eq.${profile.user_id}`);
    if (profile.id) orParts.push(`profile_id.eq.${profile.id}`);

    const accountIds = new Set<string>();
    if (orParts.length > 0) {
      const { data: asg, error: aErr } = await supabase
        .from("account_assignments")
        .select("account_id")
        .is("end_date", null)
        .or(orParts.join(","));
      if (aErr) return json({ error: aErr.message }, 500);
      for (const r of asg ?? []) if (r.account_id) accountIds.add(r.account_id as string);
    }

    const tokens: { platform: string; username: string; token: string }[] = [];

    if (accountIds.size > 0) {
      const { data: accounts, error: accErr } = await supabase
        .from("accounts")
        .select("platform, username, account_email, account_password")
        .in("id", Array.from(accountIds));
      if (accErr) return json({ error: accErr.message }, 500);

      const enc = new TextEncoder();
      for (const a of accounts ?? []) {
        const platform = ((a as any).platform ?? "unknown").toString();
        const email = (a as any).account_email ?? "";
        const password = (a as any).account_password ?? "";
        const username = ((a as any).username && (a as any).username.trim())
          ? (a as any).username.trim()
          : email;

        const plaintext = enc.encode(`${email}|++|${password}`);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = new Uint8Array(
          await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext),
        );
        const blob = new Uint8Array(iv.length + ct.length);
        blob.set(iv, 0);
        blob.set(ct, iv.length);

        tokens.push({ platform, username, token: toB64(blob) });
      }
    }

    return json({ telegram_id: normalized, tokens });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
