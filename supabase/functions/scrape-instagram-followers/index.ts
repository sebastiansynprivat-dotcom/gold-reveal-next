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
  // Strip query / fragment (e.g. ?igsh=... share tokens) and trailing slashes,
  // then rebuild canonical https://www.instagram.com/<handle>/
  try {
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    if (!handle) return null;
    return `https://www.instagram.com/${handle}/`;
  } catch {
    return null;
  }
}

async function firecrawlScrape(url: string, apiKey: string, useStealth: boolean) {
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
      waitFor: 2500,
      ...(useStealth ? { proxy: "stealth" } : {}),
    }),
  });
  return res;
}

// Instagram serves an OG meta description like
//   "1,234 Followers, 567 Following, 89 Posts - See Instagram photos and videos from..."
// to crawler user-agents. We try a few common bot UAs directly first.
const CRAWLER_UAS = [
  "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Twitterbot/1.0)",
];

async function scrapeDirect(url: string): Promise<number | null> {
  for (const ua of CRAWLER_UAS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        console.warn("[scrape-ig] direct fetch status", url, ua.slice(0, 30), res.status);
        continue;
      }
      const html = await res.text();
      // Pull og:description / meta description
      const metaMatch =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const desc = metaMatch ? metaMatch[1] : "";
      const parsed = parseFollowers(desc) ?? parseFollowers(html);
      if (parsed !== null) return parsed;
      console.warn("[scrape-ig] direct no parse", url, ua.slice(0, 30), "desc:", desc.slice(0, 120));
    } catch (e) {
      console.warn("[scrape-ig] direct exception", url, (e as Error).message);
    }
  }
  return null;
}

async function scrapeOne(url: string, apiKey: string): Promise<number | null> {
  // 1) Try direct fetch with crawler UAs (free, fast, works for most public IG profiles)
  const direct = await scrapeDirect(url);
  if (direct !== null) return direct;

  // 2) Fallback to Firecrawl (likely returns 403 "not supported" for IG, but kept as best-effort)
  try {
    let res = await firecrawlScrape(url, apiKey, false);
    if (res.status === 403 || res.status === 401 || res.status === 429) {
      res = await firecrawlScrape(url, apiKey, true);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[scrape-ig] firecrawl error", url, res.status, body.slice(0, 160));
      return null;
    }
    const json = await res.json();
    const md: string = json?.data?.markdown ?? json?.markdown ?? "";
    const html: string = json?.data?.html ?? json?.html ?? "";
    const desc: string = json?.data?.metadata?.description ?? json?.metadata?.description ?? "";
    const ogDesc: string = json?.data?.metadata?.ogDescription ?? json?.metadata?.ogDescription ?? "";
    const title: string = json?.data?.metadata?.title ?? json?.metadata?.title ?? "";
    return (
      parseFollowers(desc) ??
      parseFollowers(ogDesc) ??
      parseFollowers(title) ??
      parseFollowers(md) ??
      parseFollowers(html)
    );
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

    let savedAny = false;
    for (const u of urls) {
      const n = await scrapeOne(u, apiKey);
      if (n !== null) {
        await supabase.from("fanvue_instagram_snapshots").insert({
          model_id: m.id,
          instagram_url: u,
          followers: n,
        });
        savedAny = true;
        results.push({ model_id: m.id, name: m.name, followers: n, urls: 1 });
      } else {
        results.push({ model_id: m.id, name: m.name, followers: null, urls: 1 });
      }
    }
    if (!savedAny) {
      // no-op, already pushed null results
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      scanned: (models ?? []).length,
      saved: results.filter((r) => r.followers !== null).length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
