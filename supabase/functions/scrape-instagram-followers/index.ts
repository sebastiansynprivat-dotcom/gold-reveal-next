// Daily Instagram follower scraper for Social Media (Fanvue) models.
// Uses Firecrawl to fetch IG profile pages and parses the follower count
// from the rendered HTML / metadata. One snapshot per model_id, total of
// all linked Instagram URLs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

function parseFollowers(text: string): number | null {
  if (!text) return null;

  // 1) Try JSON-LD / meta description style: "12.3K Followers, 456 Following"
  //    Instagram often includes: "1,234,567 Followers"
  const patterns: RegExp[] = [
    /"userInteractionCount"\s*:\s*"?(\d+)"?/i,
    /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i,
    /([\d.,]+\s*[KkMm]?)\s*Followers?/,
    /Followers?[^\d]{0,20}([\d.,]+\s*[KkMm]?)/,
    /([\d.,]+\s*[KkMm]?)\s*Follower/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const raw = m[1].trim();
      const num = abbrevToNumber(raw);
      if (num !== null && num > 0) return num;
    }
  }
  return null;
}

function abbrevToNumber(s: string): number | null {
  const clean = s.replace(/\s+/g, "");
  const m = clean.match(/^([\d.,]+)([KkMmBb])?$/);
  if (!m) {
    const n = parseInt(clean.replace(/[.,]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  let n = parseFloat(m[1].replace(/,/g, "."));
  if (!Number.isFinite(n)) return null;
  const suf = (m[2] || "").toLowerCase();
  if (suf === "k") n *= 1_000;
  else if (suf === "m") n *= 1_000_000;
  else if (suf === "b") n *= 1_000_000_000;
  return Math.round(n);
}

function normalizeUrl(u: string): string | null {
  if (!u) return null;
  let url = u.trim();
  if (!url) return null;
  if (url.startsWith("@")) url = `https://instagram.com/${url.slice(1)}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/instagram\.com/i.test(url)) return null;
  return url;
}

async function scrapeOne(url: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false,
        waitFor: 1500,
      }),
    });
    if (!res.ok) {
      console.warn("[scrape-ig] firecrawl error", url, res.status);
      return null;
    }
    const json = await res.json();
    const md: string = json?.data?.markdown ?? json?.markdown ?? "";
    const html: string = json?.data?.html ?? json?.html ?? "";
    const desc: string = json?.data?.metadata?.description ?? json?.metadata?.description ?? "";
    return parseFollowers(desc) ?? parseFollowers(md) ?? parseFollowers(html);
  } catch (e) {
    console.warn("[scrape-ig] exception", url, (e as Error).message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing" }), {
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

  const results: Array<{ model_id: string; name: string; followers: number | null; urls: number }> = [];

  for (const m of models ?? []) {
    const urls: string[] = [];
    const list = Array.isArray((m as any).instagram_urls) ? (m as any).instagram_urls as string[] : [];
    for (const u of list) {
      const n = normalizeUrl(u);
      if (n) urls.push(n);
    }
    if (urls.length === 0 && (m as any).instagram_url) {
      const n = normalizeUrl((m as any).instagram_url);
      if (n) urls.push(n);
    }
    if (urls.length === 0) {
      results.push({ model_id: m.id, name: m.name, followers: null, urls: 0 });
      continue;
    }

    let total = 0;
    let got = false;
    for (const u of urls) {
      const n = await scrapeOne(u, apiKey);
      if (n !== null) {
        total += n;
        got = true;
      }
    }

    if (got) {
      await supabase.from("fanvue_instagram_snapshots").insert({
        model_id: m.id,
        followers: total,
      });
      results.push({ model_id: m.id, name: m.name, followers: total, urls: urls.length });
    } else {
      results.push({ model_id: m.id, name: m.name, followers: null, urls: urls.length });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      scanned: results.length,
      saved: results.filter((r) => r.followers !== null).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
