// Shared helper for aggregating revenue + building PassNinja field payload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const PASSNINJA_BASE = "https://api.passninja.com/v1";
export const TEMPLATE_ID = "ptk_0x391";

export function passninjaHeaders() {
  return {
    "Content-Type": "application/json",
    "x-account-id": Deno.env.get("PASSNINJA_ACCOUNT_ID")!,
    "x-api-key": Deno.env.get("PASSNINJA_API_KEY")!,
  };
}

function fmtEur(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "k €";
  }
  return Math.round(n).toLocaleString("de-DE") + " €";
}

export async function buildPassFields() {
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
    sales_today: String(todayCount),
    streak: "🔥",
    updated,
    note: "Live SheX Dashboard · Updates automatisch alle 5 Min",
  };
}
