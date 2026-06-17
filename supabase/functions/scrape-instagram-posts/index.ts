// Instagram post-activity scraper for Social Media (Fanvue) models + marketers.
// Uses Apify's `apify/instagram-post-scraper` actor to fetch recent posts and
// stores one snapshot per Instagram URL into fanvue_instagram_post_snapshots
// with counts for last 7d / 30d / total returned and the latest post timestamp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_ACTOR = "apify~instagram-post-scraper";
const RESULTS_LIMIT = 30; // max recent posts per handle

function normalizeUrl(u: string): string | null {
  if (!u) return null;
  let url = u.trim();
  if (!url) return null;
  if (url.startsWith("@")) url = `https://www.instagram.com/${url.slice(1)}`;
  else if (!/^https?:\/\//i.test(url) && !url.includes("/") && !/\s/.test(url)) {
    url = `https://www.instagram.com/${url}`;
  } else if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  if (!/instagram\.com/i.test(url)) return null;
  try {
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    if (!handle) return null;
    return `https://www.instagram.com/${handle}/`;
  } catch {
    return null;
  }
}

function handleFromUrl(u: string): string | null {
  try {
    const parsed = new URL(u);
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle || null;
  } catch {
    return null;
  }
}

type ApifyPost = {
  ownerUsername?: string;
  username?: string;
  timestamp?: string;
  takenAtTimestamp?: number;
};

async function apifyScrape(usernames: string[], token: string): Promise<ApifyPost[]> {
  const endpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernames,
      resultsLimit: RESULTS_LIMIT,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[scrape-ig-posts] apify error", res.status, body.slice(0, 300));
    throw new Error(`Apify run failed: ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("APIFY_API_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "APIFY_API_TOKEN missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let onlyModelId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.model_id === "string") onlyModelId = body.model_id;
    } catch { /* ignore */ }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase
    .from("fanvue_models")
    .select("id, name, instagram_url, instagram_urls, marketers, is_active");
  if (onlyModelId) {
    query = query.eq("id", onlyModelId);
  } else {
    query = query.eq("is_active", true);
  }
  const { data: models, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  type Target = { model_id: string; url: string; handle: string; kind: "model" | "marketer" };
  const targets: Target[] = [];
  for (const m of models ?? []) {
    const igs: string[] = [];
    const list = Array.isArray((m as any).instagram_urls) ? ((m as any).instagram_urls as string[]) : [];
    for (const u of list) {
      const n = normalizeUrl(u);
      if (n) igs.push(n);
    }
    if (igs.length === 0 && (m as any).instagram_url) {
      const n = normalizeUrl((m as any).instagram_url);
      if (n) igs.push(n);
    }
    for (const url of igs) {
      const handle = handleFromUrl(url);
      if (handle) targets.push({ model_id: m.id, url, handle, kind: "model" });
    }

    const marketers = Array.isArray((m as any).marketers) ? ((m as any).marketers as any[]) : [];
    for (const mk of marketers) {
      const ig = typeof mk?.instagram === "string" ? mk.instagram : "";
      const n = normalizeUrl(ig);
      if (!n) continue;
      const handle = handleFromUrl(n);
      if (handle) targets.push({ model_id: m.id, url: n, handle, kind: "marketer" });
    }
  }

  const uniqueHandles = Array.from(new Set(targets.map((t) => t.handle)));
  if (uniqueHandles.length === 0) {
    return new Response(JSON.stringify({ success: true, scanned: 0, saved: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let items: ApifyPost[] = [];
  try {
    items = await apifyScrape(uniqueHandles, token);
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Bucket posts by lowercased owner username
  const byHandle = new Map<string, Date[]>();
  for (const it of items) {
    const h = (it.ownerUsername || it.username || "").toLowerCase();
    if (!h) continue;
    let ts: Date | null = null;
    if (typeof it.timestamp === "string") {
      const d = new Date(it.timestamp);
      if (!isNaN(d.getTime())) ts = d;
    } else if (typeof it.takenAtTimestamp === "number") {
      ts = new Date(it.takenAtTimestamp * 1000);
    }
    if (!ts) continue;
    if (!byHandle.has(h)) byHandle.set(h, []);
    byHandle.get(h)!.push(ts);
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let saved = 0;
  const results: Array<{ handle: string; posts_total: number; posts_7d: number; posts_30d: number; last_post_at: string | null }> = [];

  for (const t of targets) {
    const dates = byHandle.get(t.handle.toLowerCase()) || [];
    const sorted = dates.slice().sort((a, b) => b.getTime() - a.getTime());
    const posts_total = sorted.length;
    const posts_7d = sorted.filter((d) => now - d.getTime() <= 7 * day).length;
    const posts_30d = sorted.filter((d) => now - d.getTime() <= 30 * day).length;
    const last_post_at = sorted[0]?.toISOString() ?? null;

    const { error: insErr } = await supabase
      .from("fanvue_instagram_post_snapshots")
      .insert({
        model_id: t.model_id,
        instagram_url: t.url,
        posts_total,
        posts_7d,
        posts_30d,
        last_post_at,
      });
    if (!insErr) saved += 1;
    results.push({ handle: t.handle, posts_total, posts_7d, posts_30d, last_post_at });
  }

  return new Response(
    JSON.stringify({ success: true, scanned: targets.length, saved, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
