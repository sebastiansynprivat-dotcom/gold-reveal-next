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

const BodySchema = z.object({ model_id: z.string().uuid() });

function parseKey(raw: string): Uint8Array {
  const s = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const bin = atob(s);
  if (bin.length !== 32) throw new Error("CONTENT_HUB_AES_KEY must decode to 32 bytes");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedAuth = Deno.env.get("CONTENT_HUB_AUTH");
    const rawKey = Deno.env.get("CONTENT_HUB_AES_KEY");
    if (!expectedAuth || !rawKey) return json({ error: "Server not configured" }, 500);

    if (req.headers.get("x-api-key") !== expectedAuth) return json({ error: "Unauthorized" }, 401);

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { model_id } = parsed.data;

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

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("platform, account_email, account_password")
      .eq("model_id", model_id);

    if (error) return json({ error: error.message }, 500);

    const enc = new TextEncoder();
    const result: Record<string, string[]> = {};
    let count = 0;

    for (const a of accounts ?? []) {
      const platform = (a as any).platform ?? "unknown";
      const email = (a as any).account_email ?? "";
      const password = (a as any).account_password ?? "";
      const plaintext = enc.encode(`${email}|++|${password}`);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext),
      );

      const blob = new Uint8Array(iv.length + ct.length);
      blob.set(iv, 0);
      blob.set(ct, iv.length);

      (result[platform] ||= []).push(toB64(blob));
      count++;
    }

    return json({ model_id, count, accounts: result });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
