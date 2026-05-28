// Fetches a model's Biographie.docx from its Google Drive folder,
// converts it to HTML and caches the result in public.model_biographies.
//
// Body: { model_id: string, force_refresh?: boolean }
// Auth: requires JWT. Only admins, model_users for that model, or chatters
//       assigned to an account of that model may fetch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
// @ts-ignore - mammoth ships browser build via esm.sh
import mammoth from "https://esm.sh/mammoth@1.6.0?bundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function getAccessToken(): Promise<string> {
  let serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (!privateKeyRaw) throw new Error("Google credentials not configured");

  let pemKey: string;
  const rawMatch = privateKeyRaw.match(
    /-----BEGIN PRIVATE KEY-----[^-]+-----END PRIVATE KEY-----/,
  );
  if (rawMatch) {
    pemKey = rawMatch[0].replace(/\\n/g, "\n");
  } else {
    const pkMatch = privateKeyRaw.match(/"private_key"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    pemKey = pkMatch
      ? pkMatch[1].replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
      : privateKeyRaw.replace(/\\n/g, "\n");
  }
  if (!serviceEmail) {
    const em = privateKeyRaw.match(/"client_email"\s*:\s*"([^"]+)"/);
    if (em) serviceEmail = em[1];
  }
  if (!serviceEmail || !pemKey) throw new Error("Google credentials incomplete");

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const toB64Url = (data: Uint8Array) => {
    let bin = "";
    for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const enc = (obj: unknown) =>
    toB64Url(new TextEncoder().encode(JSON.stringify(obj)));

  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc(claim)}`;
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[\s\r\n]/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodeBase64(pemContents),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${toB64Url(new Uint8Array(sig))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token error: ${await tokenRes.text()}`);
  }
  const { access_token } = await tokenRes.json();
  return access_token;
}

async function findBiographyFile(folderId: string, token: string) {
  // Search docx files in the folder whose name contains "iograph"
  const q = [
    `'${folderId}' in parents`,
    `trashed = false`,
    `(name contains 'iograph' or name contains 'iografi' or name contains 'iograf')`,
  ].join(" and ");
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&fields=files(id,name,mimeType,modifiedTime)&pageSize=10` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list error: ${await res.text()}`);
  const data = await res.json();
  const files: any[] = data.files || [];
  // Prefer docx; fall back to first match
  return (
    files.find((f) =>
      f.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) ||
    files.find((f) => f.mimeType === "application/vnd.google-apps.document") ||
    files[0] ||
    null
  );
}

async function downloadFile(file: any, token: string): Promise<ArrayBuffer> {
  const isGoogleDoc = file.mimeType === "application/vnd.google-apps.document";
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`
    : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download error: ${await res.text()}`);
  return await res.arrayBuffer();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const modelId: string | undefined = body.model_id;
    const forceRefresh: boolean = !!body.force_refresh;
    if (!modelId) {
      return new Response(JSON.stringify({ error: "model_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Access check: admin OR assigned chatter OR model user
    const [{ data: isAdminData }, { data: assigned }, { data: linked }] =
      await Promise.all([
        admin.rpc("is_admin"),
        admin
          .from("accounts")
          .select("id")
          .eq("model_id", modelId)
          .eq("assigned_to", user.id)
          .limit(1),
        admin
          .from("model_users")
          .select("id")
          .eq("model_id", modelId)
          .eq("user_id", user.id)
          .limit(1),
      ]);
    // is_admin uses auth.uid() which is null with service role - re-check via roles table
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const adminRoles = new Set(["admin", "super_admin", "sub_admin"]);
    const isAdmin = (roles || []).some((r: any) => adminRoles.has(r.role));

    const allowed =
      isAdmin || (assigned && assigned.length > 0) || (linked && linked.length > 0);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load model + cache
    const [{ data: model }, { data: cached }] = await Promise.all([
      admin.from("models").select("drive_folder_id, name").eq("id", modelId).maybeSingle(),
      admin.from("model_biographies").select("*").eq("model_id", modelId).maybeSingle(),
    ]);

    if (!model?.drive_folder_id) {
      return new Response(
        JSON.stringify({ html: null, reason: "no_drive_folder" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Serve cache if fresh
    if (!forceRefresh && cached?.html && cached.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({
            html: cached.html,
            file_name: cached.file_name,
            modified_time: cached.modified_time,
            fetched_at: cached.fetched_at,
            source: "cache",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const token = await getAccessToken();
    const file = await findBiographyFile(model.drive_folder_id, token);
    if (!file) {
      return new Response(
        JSON.stringify({ html: null, reason: "not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If Drive's modifiedTime matches cache, skip download
    if (
      !forceRefresh &&
      cached?.html &&
      cached.drive_file_id === file.id &&
      cached.modified_time === file.modifiedTime
    ) {
      await admin
        .from("model_biographies")
        .update({ fetched_at: new Date().toISOString() })
        .eq("model_id", modelId);
      return new Response(
        JSON.stringify({
          html: cached.html,
          file_name: cached.file_name,
          modified_time: cached.modified_time,
          fetched_at: new Date().toISOString(),
          source: "cache-revalidated",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = await downloadFile(file, token);
    const result = await mammoth.convertToHtml({ arrayBuffer: buf });
    const html = result.value as string;

    await admin.from("model_biographies").upsert({
      model_id: modelId,
      drive_file_id: file.id,
      file_name: file.name,
      html,
      modified_time: file.modifiedTime,
      fetched_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        html,
        file_name: file.name,
        modified_time: file.modifiedTime,
        fetched_at: new Date().toISOString(),
        source: "drive",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-model-biography error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
