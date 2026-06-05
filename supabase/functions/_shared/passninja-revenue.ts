// Shared helper for aggregating revenue + building PassNinja field payload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PASSNINJA_BASE = "https://api.passninja.com/v1";
export const TEMPLATE_ID = "ptk_0x391";

export function passninjaHeaders() {
  return {
    "Content-Type": "application/json",
    "X-ACCOUNT-ID": Deno.env.get("PASSNINJA_ACCOUNT_ID")!,
    "X-API-KEY": Deno.env.get("PASSNINJA_API_KEY")!,
  };
}

function fmtEur(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "k €";
  }
  return Math.round(n).toLocaleString("de-DE") + " €";
}

type RevenueSnapshot = {
  today: string;
  month: string;
  maloum: string;
  brezzels: string;
  fourbased: string;
  fansyme: string;
  salesToday: string;
  updated: string;
};

async function fetchRequiredPassKeys(): Promise<string[]> {
  try {
    const res = await fetch(`${PASSNINJA_BASE}/passtypes/keys/${encodeURIComponent(TEMPLATE_ID)}`, {
      method: "GET",
      headers: passninjaHeaders(),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("PassNinja required keys lookup failed:", res.status, text);
      return [];
    }
    const data = JSON.parse(text);
    return Array.isArray(data?.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : [];
  } catch (e) {
    console.error("PassNinja required keys lookup error:", e);
    return [];
  }
}

function valueForKey(key: string, r: RevenueSnapshot): string {
  const k = key.toLowerCase().replace(/[._-]/g, "");
  if (k.includes("today") || k.includes("heute") || k.includes("daily")) return r.today;
  if (k.includes("month") || k.includes("monat") || k.includes("level")) return r.month;
  if (k.includes("maloum")) return r.maloum;
  if (k.includes("brezzels")) return r.brezzels;
  if (k.includes("4based") || k.includes("fourbased")) return r.fourbased;
  if (k.includes("fansyme") || k.includes("fansy")) return r.fansyme;
  if (k.includes("sales")) return r.salesToday;
  if (k.includes("streak")) return "🔥";
  if (k.includes("updated") || k.includes("date") || k.includes("time")) return r.updated;
  if (k.includes("name")) return "SheX Dashboard";
  if (k.includes("discount") || k.includes("subtitle") || k.includes("note")) return `Heute ${r.today} · Monat ${r.month}`;
  if (k.includes("nfc")) return `shex:${r.month.replace(/\s/g, "")}`.slice(0, 64);
  return `Heute ${r.today}`;
}

export async function buildRevenueSnapshot(): Promise<RevenueSnapshot> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Time windows (Europe/Berlin – use simple UTC math; close enough for display)
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const { data: monthEvents } = await supabase
    .from("revenue_sale_events")
    .select("amount, platform, occurred_at")
    .gte("occurred_at", startOfMonth.toISOString());

  const events = monthEvents || [];
  let todayTotal = 0, monthTotal = 0, todayCount = 0;
  const byPlatform: Record<string, number> = {};

  for (const e of events as any[]) {
    const amt = Number(e.amount || 0);
    monthTotal += amt;
    byPlatform[e.platform] = (byPlatform[e.platform] || 0) + amt;
    if (new Date(e.occurred_at) >= startOfDay) {
      todayTotal += amt;
      todayCount += 1;
    }
  }

  const updated = now.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  return {
    today: fmtEur(todayTotal),
    month: fmtEur(monthTotal),
    maloum: fmtEur(byPlatform["maloum"] || 0),
    brezzels: fmtEur(byPlatform["brezzels"] || 0),
    fourbased: fmtEur(byPlatform["4based"] || 0),
    fansyme: fmtEur(byPlatform["fansyme"] || 0),
    salesToday: String(todayCount),
    updated,
  };
}

export async function buildPassFieldVariants() {
  const r = await buildRevenueSnapshot();
  const subtitle = `Heute ${r.today} · Monat ${r.month}`;
  const requiredKeys = await fetchRequiredPassKeys();
  const requiredFields = Object.fromEntries(requiredKeys.map((key) => [key, valueForKey(key, r)]));

  return [
    ...(requiredKeys.length ? [{ name: "passninja-required-keys", fields: requiredFields }] : []),
    {
      name: "shex-custom",
      fields: {
        today: r.today,
        month: r.month,
        maloum: r.maloum,
        brezzels: r.brezzels,
        fourbased: r.fourbased,
        fansyme: r.fansyme,
        sales_today: r.salesToday,
        streak: "🔥",
        updated: r.updated,
        note: "Live SheX Dashboard · Updates automatisch alle 5 Min",
      },
    },
    {
      name: "passninja-docs-default",
      fields: {
        "member.level": r.month,
        discount: subtitle,
        "member.name": "SheX Dashboard",
      },
    },
    {
      name: "passninja-sdk-default",
      fields: {
        memberName: "SheX Dashboard",
        discount: subtitle,
      },
    },
  ];
}
