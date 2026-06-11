// Daily Instagram follower scraper for Social Media (Fanvue) models.
// Uses Apify's `apify/instagram-profile-scraper` actor to fetch profile data
// and stores one snapshot per Instagram URL into fanvue_instagram_snapshots.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Synchronous Apify run endpoint — returns dataset items once the actor finishes.
// Docs: https://docs.apify.com/api/v2#/reference/actors/run-actor-synchronously-and-get-dataset-items
const APIFY_ACTOR = "apify~instagram-profile-scraper";

function normalizeUrl(u: string): string | null {
  if (!u) return null;
  let url = u.trim();
  if (!url) return null;
  if (url.startsWith("@")) url = `https://instagram.com/${url.slice(1)}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
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

type ApifyItem = {
  username?: string;
  url?: string;
  followersCount?: number;
  followers?: number;
  error?: string;
};

async function apifyScrape(usernames: string[], token: string): Promise<ApifyItem[]> {
  const endpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames,
      resultsType: "details",
      resultsLimit: 1,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[scrape-ig] apify error", res.status, body.slice(0, 300));
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: models, error } = await supabase
    .from("fanvue_models")
    .select("id, name, instagram_url, instagram_urls, is_active")
    .eq("is_active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build (model_id, normalized_url, handle) triples
  type Target = { model_id: string; name: string; url: string; handle: string };
  const targets: Target[] = [];
  for (const m of models ?? []) {
    const urls: string[] = [];
    const list = Array.isArray((m as any).instagram_urls) ? ((m as any).instagram_urls as string[]) : [];
    for (const u of list) {
      const n = normalizeUrl(u);
      if (n) urls.push(n);
    }
    if (urls.length === 0 && (m as any).instagram_url) {
      const n = normalizeUrl((m as any).instagram_url);
      if (n) urls.push(n);
    }
    for (const url of urls) {
      const handle = handleFromUrl(url);
      if (handle) targets.push({ model_id: m.id, name: m.name, url, handle });
    }
  }

  const uniqueHandles = Array.from(new Set(targets.map((t) => t.handle)));
  const results: Array<{ model_id: string; name: string; handle: string; followers: number | null }> = [];

  if (uniqueHandles.length === 0) {
    return new Response(
      JSON.stringify({ success: true, scanned: 0, saved: 0, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let items: ApifyItem[] = [];
  try {
    items = await apifyScrape(uniqueHandles, token);
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Map by lower-case username
  const byHandle = new Map<string, number>();
  for (const it of items) {
    const h = (it.username || "").toLowerCase();
    const f = it.followersCount ?? it.followers ?? null;
    if (h && typeof f === "number" && f >= 0) byHandle.set(h, f);
  }

  for (const t of targets) {
    const followers = byHandle.get(t.handle.toLowerCase()) ?? null;
    if (followers !== null) {
      await supabase.from("fanvue_instagram_snapshots").insert({
        model_id: t.model_id,
        instagram_url: t.url,
        followers,
      });
    }
    results.push({ model_id: t.model_id, name: t.name, handle: t.handle, followers });
  }

  return new Response(
    JSON.stringify({
      success: true,
      scanned: targets.length,
      saved: results.filter((r) => r.followers !== null).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
