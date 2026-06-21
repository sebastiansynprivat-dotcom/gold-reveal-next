import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROFILE_FIELDS = [
  "name",
  "age",
  "city",
  "place_of_birth",
  "favorite_color",
  "favorite_movie",
  "favorite_food",
  "favorite_music",
  "occupation",
  "hobbies",
  "dream",
  "work",
  "education",
  "languages",
  "special_marks",
  "natural_hair",
  "shoe_size",
  "bra_size",
  "height",
  "weight",
  "content_preferences",
  "no_gos",
  "additional_info",
];

// ─── Google Drive auth (mirrors share-drive) ──────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  let serviceEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (!privateKeyRaw) throw new Error("Google Service Account not configured");

  let pemKey = "";
  const rawMatch = privateKeyRaw.match(
    /-----BEGIN PRIVATE KEY-----[^-]+-----END PRIVATE KEY-----/
  );
  if (rawMatch) {
    pemKey = rawMatch[0].replace(/\\n/g, "\n");
  } else {
    const pk = privateKeyRaw.match(
      /"private_key"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/
    );
    pemKey = pk
      ? pk[1].replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
      : privateKeyRaw.replace(/\\n/g, "\n");
  }
  if (!serviceEmail) {
    const em = privateKeyRaw.match(/"client_email"\s*:\s*"([^"]+)"/);
    if (em) serviceEmail = em[1];
  }
  if (!serviceEmail || !pemKey) throw new Error("Google credentials incomplete");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const toB64Url = (d: Uint8Array) => {
    let s = "";
    for (let i = 0; i < d.length; i++) s += String.fromCharCode(d[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const encode = (o: unknown) =>
    toB64Url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${encode(header)}.${encode(claim)}`;

  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[\s\r\n]/g, "");
  const binaryKey = decodeBase64(pemContents);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${toB64Url(new Uint8Array(sig))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google OAuth error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

const extractDriveId = (input: string): string => {
  const s = String(input).trim();
  const m =
    s.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return s.replace(/[^a-zA-Z0-9_-]/g, "");
};

// ─── Drive helpers ─────────────────────────────────────────────────────
async function findSteckbriefInFolder(
  folderId: string,
  token: string
): Promise<{ id: string; name: string; mimeType: string } | null> {
  const mimes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.document",
  ];
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed=false and (${mimes
      .map((m) => `mimeType='${m}'`)
      .join(" or ")})`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive list error: ${await res.text()}`);
  const data = await res.json();
  const files = (data.files || []) as Array<{
    id: string;
    name: string;
    mimeType: string;
  }>;
  if (files.length === 0) return null;
  // Prefer files matching "steckbrief" / "profile" / "profil"
  const ranked = files
    .map((f) => {
      const n = f.name.toLowerCase();
      let score = 0;
      if (n.includes("steckbrief")) score += 10;
      if (n.includes("profil")) score += 6;
      if (n.includes("profile")) score += 6;
      if (n.includes("info")) score += 2;
      return { ...f, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0];
}

async function fetchDocxBytesFromDrive(
  file: { id: string; mimeType: string },
  token: string
): Promise<Uint8Array> {
  if (file.mimeType === "application/vnd.google-apps.document") {
    // Export Google Doc to docx
    const url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Drive export error: ${await r.text()}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Drive download error: ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

// ─── DOCX → plain text via JSZip ───────────────────────────────────────
async function docxToText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const collect: string[] = [];
  const docFiles = [
    "word/document.xml",
    "word/header1.xml",
    "word/header2.xml",
    "word/footer1.xml",
    "word/footer2.xml",
  ];
  for (const path of docFiles) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("string");
    // Convert paragraph & table breaks to newlines first
    const withBreaks = xml
      .replace(/<w:p[ >]/g, "\n<w:p ")
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br\/>/g, "\n");
    // Strip all XML tags, keep text content
    const text = withBreaks
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16))
      )
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text) collect.push(text);
  }
  return collect.join("\n\n");
}

// ─── PDF → plain text via unpdf ────────────────────────────────────────
async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  const out = (Array.isArray(text) ? text.join("\n\n") : String(text || ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}


async function aiExtractProfile(rawText: string): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const schemaDescription = PROFILE_FIELDS.map((f) => `  - ${f}`).join("\n");

  const systemPrompt = `Du extrahierst Steckbrief-Daten eines Female-Creator-Models aus einem Word-Dokument (SheX "Biographie"-Vorlage).
Liefere AUSSCHLIESSLICH ein gültiges JSON-Objekt mit folgenden Keys (alle Werte als String, leerer String wenn unbekannt):
${schemaDescription}

Feld-Mapping (SheX Biographie-Tabelle → JSON-Key):
- "Name" → name
- "Age" → age  (falls "birthday" zusätzlich vorhanden ist, kombiniere als "25 — 07.03.01")
- "height" → height
- "cup size" / "BH" → bra_size
- "city" → city
- "work" → work UND occupation (gleicher Wert)
- "Hobbies" → hobbies (Komma-getrennt)
- "Origin" → place_of_birth (Land/Ort) und languages (Sprachen, Komma-getrennt) — Origin enthält oft beides
- "What content do you prefer doing" → content_preferences
- "No Go's" / "No Gos" → no_gos
- "Account name on 4based" → additional_info ("4based Account: <Wert>")
- natürliche Haarfarbe → natural_hair
- Lieblingsfarbe/-film/-essen/-musik → favorite_color / favorite_movie / favorite_food / favorite_music
- Schuhgröße → shoe_size, Gewicht → weight, Ausbildung → education, besondere Merkmale → special_marks, Traum → dream

Regeln:
- Behalte die Sprache der Quelle bei.
- Erfinde NICHTS. Wenn ein Feld nicht im Dokument steht: leerer String.
- Bei mehreren Werten in einer Zelle: Komma-getrennt.
- Listen / Tabellen-Zellen sauber zusammenführen, keine Spaltentitel als Werte übernehmen.
- Keine Markdown-Codeblöcke, kein Kommentar — nur das reine JSON.`;

  const userPrompt = `Hier ist der extrahierte Text des Steckbriefs:\n\n"""\n${rawText.slice(0, 30000)}\n"""`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded — bitte später erneut versuchen");
    if (res.status === 402) throw new Error("AI credits exhausted — bitte Workspace-Guthaben aufladen");
    throw new Error(`AI error [${res.status}]: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = String(content).match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }
  const out: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) {
    const v = (parsed as any)[f];
    out[f] = typeof v === "string" ? v.trim() : v != null ? String(v) : "";
  }
  return out;
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

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const modelId: string | undefined = body?.model_id;
    const mode: "drive" | "upload" = body?.mode === "upload" ? "upload" : "drive";
    if (!modelId) {
      return new Response(JSON.stringify({ error: "model_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let rawText = "";
    let sourceLabel = "";

    if (mode === "drive") {
      const { data: model } = await admin
        .from("models")
        .select("drive_folder_id, name")
        .eq("id", modelId)
        .maybeSingle();
      const folderInput = (model as any)?.drive_folder_id as string | null;
      if (!folderInput) {
        return new Response(
          JSON.stringify({
            error: "Dieses Model hat keinen Drive-Ordner hinterlegt.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const folderId = extractDriveId(folderInput);
      const token = await getGoogleAccessToken();
      const file = await findSteckbriefInFolder(folderId, token);
      if (!file) {
        return new Response(
          JSON.stringify({
            error:
              "Im Drive-Ordner wurde kein Word-/Google-Doc Steckbrief gefunden. Bitte lade die Datei manuell hoch.",
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const bytes = await fetchDocxBytesFromDrive(file, token);
      rawText = await docxToText(bytes);
      sourceLabel = `Drive: ${file.name}`;
    } else {
      const b64 = body?.file_base64 as string | undefined;
      if (!b64) {
        return new Response(JSON.stringify({ error: "file_base64 required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bytes = decodeBase64(b64.replace(/^data:[^,]+,/, ""));
      rawText = await docxToText(bytes);
      sourceLabel = body?.file_name || "Upload";
    }

    if (!rawText || rawText.length < 30) {
      return new Response(
        JSON.stringify({
          error: "Die Datei konnte nicht gelesen werden oder ist leer.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fields = await aiExtractProfile(rawText);
    const nonEmpty = Object.values(fields).filter((v) => v && v.length > 0).length;
    if (nonEmpty === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Die KI konnte keine Steckbrief-Felder erkennen. Bitte prüfe das Dokument.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into model_profiles — caller chose "overwrite all"
    const { data: existing } = await admin
      .from("model_profiles")
      .select("id, submitted_at")
      .eq("model_id", modelId)
      .maybeSingle();

    const payload: Record<string, unknown> = { ...fields, model_id: modelId };
    // Auto-mark as submitted so the admin view shows "Prüfung läuft" instead of "Steckbrief leer"
    if (!(existing as any)?.submitted_at) {
      payload.submitted_at = new Date().toISOString();
    }
    let writeError: unknown = null;
    if (existing?.id) {
      const { error } = await admin
        .from("model_profiles")
        .update(payload)
        .eq("id", (existing as any).id);
      writeError = error;
    } else {
      const { error } = await admin.from("model_profiles").insert(payload);
      writeError = error;
    }
    if (writeError) {
      return new Response(
        JSON.stringify({ error: `DB write failed: ${(writeError as any).message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: sourceLabel,
        filled_fields: nonEmpty,
        fields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-steckbrief error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
