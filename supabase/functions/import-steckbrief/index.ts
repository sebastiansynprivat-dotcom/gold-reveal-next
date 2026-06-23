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
  "personality",
  "additional_info",
  "content_preferences",
  "no_gos",
];

const SHOOTING_PREFS: { key: string; label: string }[] = [
  { key: "content_anal_fingering", label: "Anales Fingern" },
  { key: "content_anal_plug", label: "Analplug" },
  { key: "content_anal_penetration", label: "Anale Penetration" },
  { key: "content_squirting", label: "Squirten" },
  { key: "content_orgasm", label: "Orgasmus zeigen" },
  { key: "content_moaning_name", label: "Stöhnen eines besonderen Namens" },
  { key: "content_roleplay_costumes", label: "Rollenspiele in Kostümen" },
  { key: "content_audios_for_chat", label: "Audios für den Chat aufnehmen" },
  { key: "content_video_speaking", label: "Im Video sprechen" },
  { key: "content_dick_ratings", label: "Dickratings" },
  { key: "content_joi", label: "Jerk Off Instructions (JOI / Wichsanleitung)" },
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
    "application/pdf",
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
    const withBreaks = xml
      .replace(/<w:p[ >]/g, "\n<w:p ")
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br\/>/g, "\n");
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


const GERMAN_CITIES = [
  "Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main", "Stuttgart",
  "Düsseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
  "Hannover", "Nürnberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld",
  "Bonn", "Münster", "Mannheim", "Karlsruhe", "Augsburg", "Wiesbaden",
  "Mönchengladbach", "Kiel", "Aachen", "Braunschweig", "Freiburg im Breisgau",
  "Mainz", "Lübeck", "Erfurt", "Rostock", "Kassel", "Potsdam", "Heidelberg",
];

// ─── Style examples loader ────────────────────────────────────────────
async function loadStyleExamples(
  admin: ReturnType<typeof createClient>,
  excludeModelId: string
): Promise<string> {
  try {
    const { data } = await admin
      .from("model_profiles")
      .select(
        "name,age,city,hobbies,personality,additional_info,content_preferences,no_gos,occupation,dream"
      )
      .neq("model_id", excludeModelId)
      .not("personality", "is", null)
      .not("confirmed_at", "is", null)
      .order("confirmed_at", { ascending: false })
      .limit(4);
    const rows = (data || []) as Array<Record<string, any>>;
    const usable = rows.filter(
      (r) => (r.personality && r.personality.length > 30) || (r.additional_info && r.additional_info.length > 30)
    );
    if (usable.length === 0) return "";
    return usable
      .slice(0, 3)
      .map((r, i) => {
        const parts: string[] = [];
        if (r.name) parts.push(`Name: ${r.name}`);
        if (r.age) parts.push(`Alter: ${r.age}`);
        if (r.city) parts.push(`Stadt: ${r.city}`);
        if (r.occupation) parts.push(`Beruf: ${r.occupation}`);
        if (r.hobbies) parts.push(`Hobbys: ${r.hobbies}`);
        if (r.personality) parts.push(`Personality: ${r.personality}`);
        if (r.additional_info) parts.push(`Additional Info: ${r.additional_info}`);
        if (r.content_preferences) parts.push(`Content-Präferenzen: ${r.content_preferences}`);
        if (r.no_gos) parts.push(`No-Gos: ${r.no_gos}`);
        if (r.dream) parts.push(`Traum: ${r.dream}`);
        return `--- Beispiel ${i + 1} (bestätigter Steckbrief) ---\n${parts.join("\n")}`;
      })
      .join("\n\n");
  } catch (e) {
    console.error("loadStyleExamples failed:", e);
    return "";
  }
}

// ─── Common rules block (tonality + shooting prefs + content sorting) ─
function rulesBlock(): string {
  const prefList = SHOOTING_PREFS.map((p) => `  - "${p.key}" → ${p.label}`).join("\n");
  return `
TONALITÄT — SEHR WICHTIG (gilt für personality, additional_info, dream):
- Schreibe IN DER ICH-PERSPEKTIVE der Creatorin selbst, als hätte sie es persönlich aufgeschrieben.
- Klingt warm, natürlich, authentisch — wie ein echter Mensch, nicht wie KI.
- Verwende echte, lebendige Sprache mit kleinen Unperfektheiten: kurze Sätze, Mini-Anekdoten, persönliche Ticks ("ich liebe es, wenn…", "ehrlich gesagt…", "am liebsten…").
- KEINE generischen KI-Floskeln wie "verspielt, neugierig und voller Energie" oder "liebt es, das Leben in vollen Zügen zu genießen".
- Konkret > abstrakt. Statt "ich bin abenteuerlustig" lieber "samstags packe ich gern spontan den Rucksack und fahre los".

SORTIERUNG VON CONTENT-PRÄFERENZEN AUS DEM TEXT:
Wenn im Quelltext oder den Zusatz-Infos Content-Themen erwähnt werden, einsortieren in:
(a) "content_preferences" — alles was die Creatorin gern, gut oder bevorzugt macht (Content-Arten, Settings, Themes, Stimmung). Komma-getrennt oder kurze Sätze, in ICH-Form.
(b) "no_gos" — alles was sie ausdrücklich nicht macht / ablehnt. Komma-getrennt oder kurze Sätze, in ICH-Form.
(c) "shooting_preferences" → JSON-Objekt mit folgenden Keys (Wert: true / false / null):
${prefList}
  Regeln:
  - true = ausdrücklich erwähnt als "mache ich" / "gerne" / "kein Problem" / synonym.
  - false = ausdrücklich abgelehnt / als No-Go genannt / "mache ich nicht".
  - null = nicht erwähnt → NICHT raten.
  - Indirekte Hinweise erlaubt (z. B. "ich nehme gerne Audios für Chats auf" → content_audios_for_chat=true; "ich spreche nicht im Video" → content_video_speaking=false).
`.trim();
}

async function aiInventProfileFromImage(
  imageBase64: string,
  mimeType: string,
  modelName: string,
  extraText: string = "",
  styleExamples: string = ""
): Promise<{ fields: Record<string, string>; shooting: Record<string, boolean | null> }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const shuffledCities = [...GERMAN_CITIES].sort(() => Math.random() - 0.5).slice(0, 10);
  const seed = crypto.randomUUID();

  const schemaDescription = PROFILE_FIELDS.map((f) => `  - ${f}`).join("\n");

  const systemPrompt = `Du bist ein kreativer Charakter-Designer für einen Creator-Model-Steckbrief.
Du bekommst ein Foto eines Models (und optional Zusatz-Text vom Admin/Creator) und erstellst dazu einen authentischen Steckbrief — geschrieben aus Sicht der Creatorin selbst.

Liefere AUSSCHLIESSLICH ein gültiges JSON-Objekt mit folgenden Top-Level-Keys:
${schemaDescription}
  - shooting_preferences  (JSON-Objekt, siehe unten)

Alle Textwerte als String. Leere Strings für unbekannte Felder erlaubt, außer "personality" (Pflicht).

REGELN — Faktenbasis:
- Sprache: Deutsch.
- "city" MUSS eine größere deutsche Stadt sein. Wähle EINE aus (variieren): ${shuffledCities.join(", ")}.
- "place_of_birth" darf eine andere deutsche Stadt sein.
- Alter zwischen 19 und 32, passend zum Foto.
- Größe in cm, Gewicht realistisch, Schuhgröße EU 36–41, BH realistisch.
- "natural_hair" MUSS visuell zum Foto passen.
- Hobbies: 3–5 abwechslungsreich, Komma-getrennt, KEINE Klischees wiederholen.
- "work" und "occupation" gleicher Wert: realistischer Beruf/Studium.
- "languages": Deutsch + 1–2 weitere.
- "favorite_*": konkret, nicht generisch.
- "education": kurzer Bildungsweg.
- "name": Modelname wenn vorgegeben, sonst weiblicher deutscher Vorname.
- Variation-Seed: ${seed}.

${rulesBlock()}

${extraText.trim() ? `
WIE DU TEXT + FOTO ZUSAMMEN AUSWERTEST:
1. FOTO ANALYSIEREN (intern): Aussehen, Style, Vibe, Ausstrahlung, sichtbare Merkmale.
2. TEXT LESEN: Fakten + Persönlichkeits-Hinweise + erwähnte Content-Themen extrahieren.
3. PERSON VERSTEHEN: Beides zu einer stimmigen Person verschmelzen — welche Eigenschaften ergeben sich aus der Kombination?
4. EXPLIZITE FAKTEN AUS DEM TEXT übernehmen, holprige Stellen glätten — aber NICHT umdichten.
5. CONTENT-THEMEN AUS DEM TEXT sauber in content_preferences / no_gos / shooting_preferences einsortieren (siehe Regeln oben).
6. LÜCKEN logisch ableiten (Hobbys+Foto → Lieblingsmusik etc.), niemals zufällig.
7. PERSONALITY in 2–3 Sätzen, in ICH-Form, spezifisch zur kombinierten Person (Charakter aus Text + Vibe aus Foto). Kein KI-Sprech.
` : `
PERSONALITY: 2–3 Sätze in ICH-Form, authentisch, konkret zum Foto-Vibe. Kein KI-Sprech.
`}

${styleExamples ? `\nSTIL-REFERENZ — so klingen bestätigte Steckbriefe in dieser Agency. Übernimm NICHT die Inhalte, nur Tonfall, Länge und Detailgrad:\n\n${styleExamples}\n` : ""}

Vorgegebener Model-Name: ${modelName || "(keiner — frei wählen)"}

Keine Markdown-Codeblöcke, kein Kommentar — nur das reine JSON-Objekt.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: extraText.trim()
              ? `Hier ist das Foto. ZUSATZ-INFOS vom Admin:\n"""\n${extraText.trim().slice(0, 8000)}\n"""\n\nErstelle den Steckbrief als JSON, mit Content-Themen korrekt einsortiert.`
              : "Hier ist das Foto. Erstelle den Steckbrief als JSON." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
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
  return parseProfileResponse(content);
}

async function aiExtractProfile(
  rawText: string,
  styleExamples: string = ""
): Promise<{ fields: Record<string, string>; shooting: Record<string, boolean | null> }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const schemaDescription = PROFILE_FIELDS.map((f) => `  - ${f}`).join("\n");

  const systemPrompt = `Du extrahierst Steckbrief-Daten eines Female-Creator-Models aus einem Word/PDF-Dokument (SheX "Biographie"-Vorlage).
Liefere AUSSCHLIESSLICH ein gültiges JSON-Objekt mit folgenden Top-Level-Keys:
${schemaDescription}
  - shooting_preferences  (JSON-Objekt, siehe Regeln)

Alle Textwerte als String (leerer String wenn unbekannt).

Feld-Mapping (SheX-Tabelle → JSON-Key):
- "Name" → name
- "Age"/"birthday" → age
- "height" → height, "cup size"/"BH" → bra_size
- "city" → city, "Origin" → place_of_birth + languages
- "work" → work UND occupation
- "Hobbies" → hobbies (Komma-getrennt)
- "Account name on 4based" → additional_info
- Charakter / Persönlichkeit / "How would you describe yourself" → personality (Pflichtfeld)
- Lieblingsfarbe/-film/-essen/-musik → favorite_*
- Schuhgröße/Gewicht/Ausbildung/besondere Merkmale/Traum → entsprechende Felder
- "What content do you prefer doing" → content_preferences UND shooting_preferences (gemäß Regeln unten)
- "No Go's" / "No-Gos" → no_gos UND ggf. shooting_preferences=false

${rulesBlock()}

REGELN — Quelltreue + Tonalität:
- Behalte die Sprache der Quelle bei.
- Erfinde NICHTS. Wenn ein Feld nicht im Dokument steht: leerer String. AUSNAHMEN:
  • "personality": falls keine explizite Beschreibung vorliegt, aus Hobbys/Beruf/Origin/Content-Antworten ableiten — IMMER in ICH-Form, authentisch, nicht generisch.
  • "additional_info": darf um sympathische, persönliche Ergänzungen erweitert werden (in ICH-Form), basierend auf den Angaben.
- Bei mehreren Werten in einer Zelle: Komma-getrennt.
- Tabellen-Zellen sauber zusammenführen, keine Spaltentitel als Werte übernehmen.
- Holprige Formulierungen darfst du leicht glätten, ohne den Inhalt zu verändern.

${styleExamples ? `\nSTIL-REFERENZ — so klingen bestätigte Steckbriefe. Übernimm NUR Tonfall/Länge/Detailgrad, nicht die Inhalte:\n\n${styleExamples}\n` : ""}

Keine Markdown-Codeblöcke, kein Kommentar — nur das reine JSON.`;

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
  return parseProfileResponse(content);
}

function parseProfileResponse(content: string): {
  fields: Record<string, string>;
  shooting: Record<string, boolean | null>;
} {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = String(content).match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }
  const fields: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) {
    const v = (parsed as any)[f];
    fields[f] = typeof v === "string" ? v.trim() : v != null ? String(v) : "";
  }
  const shooting: Record<string, boolean | null> = {};
  const sp = (parsed as any).shooting_preferences || {};
  for (const p of SHOOTING_PREFS) {
    const v = sp[p.key];
    if (v === true || v === "true") shooting[p.key] = true;
    else if (v === false || v === "false") shooting[p.key] = false;
    else shooting[p.key] = null;
  }
  return { fields, shooting };
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
    const mode: "drive" | "upload" | "image" =
      body?.mode === "upload" ? "upload" : body?.mode === "image" ? "image" : "drive";
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

    const styleExamples = await loadStyleExamples(admin, modelId);

    let rawText = "";
    let sourceLabel = "";
    let result: { fields: Record<string, string>; shooting: Record<string, boolean | null> } | null = null;

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
      rawText =
        file.mimeType === "application/pdf"
          ? await pdfToText(bytes)
          : await docxToText(bytes);
      sourceLabel = `Drive: ${file.name}`;
    } else if (mode === "image") {
      const b64 = body?.file_base64 as string | undefined;
      if (!b64) {
        return new Response(JSON.stringify({ error: "file_base64 required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fileName = (body?.file_name as string | undefined) || "";
      const dataUrlMime = b64.match(/^data:([^;,]+)[;,]/)?.[1] || "";
      const cleanB64 = b64.replace(/^data:[^,]+,/, "");
      const mime = dataUrlMime || (/\.png$/i.test(fileName) ? "image/png" : "image/jpeg");
      const { data: model } = await admin
        .from("models").select("name").eq("id", modelId).maybeSingle();
      const extraText = (body?.extra_text as string | undefined) || "";
      result = await aiInventProfileFromImage(cleanB64, mime, (model as any)?.name || "", extraText, styleExamples);
      sourceLabel = `KI aus Bild: ${fileName || "Upload"}${extraText.trim() ? " + Text" : ""}`;
    } else {
      const b64 = body?.file_base64 as string | undefined;
      if (!b64) {
        return new Response(JSON.stringify({ error: "file_base64 required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fileName = (body?.file_name as string | undefined) || "";
      const dataUrlMime = b64.match(/^data:([^;,]+)[;,]/)?.[1] || "";
      const bytes = decodeBase64(b64.replace(/^data:[^,]+,/, ""));
      const isPdf =
        dataUrlMime === "application/pdf" ||
        /\.pdf$/i.test(fileName) ||
        (bytes.length >= 4 &&
          bytes[0] === 0x25 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x44 &&
          bytes[3] === 0x46);
      rawText = isPdf ? await pdfToText(bytes) : await docxToText(bytes);
      sourceLabel = fileName || "Upload";
    }


    if (mode !== "image" && (!rawText || rawText.length < 30)) {
      return new Response(
        JSON.stringify({
          error: "Die Datei konnte nicht gelesen werden oder ist leer.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result) result = await aiExtractProfile(rawText, styleExamples);
    const { fields, shooting } = result;
    const nonEmpty = Object.values(fields).filter((v) => v && v.length > 0).length;
    const shootingSet = Object.values(shooting).filter((v) => v !== null).length;
    if (nonEmpty === 0 && shootingSet === 0) {
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

    const payload: Record<string, unknown> = { ...fields, ...shooting, model_id: modelId };
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
        filled_fields: nonEmpty + shootingSet,
        fields,
        shooting_preferences: shooting,
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
