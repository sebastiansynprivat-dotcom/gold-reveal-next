import { supabase } from "@/integrations/supabase/client";

export function berlinDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

/**
 * Zählt consecutive Tage mit confirmed_by_user === true rückwärts ab gestern.
 * Heute wird nicht mitgezählt (noch nicht bestätigt), aber bricht den Streak nicht.
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("chatter_daily_commitment" as any)
    .select("date, confirmed_by_user")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(60);

  const rows = (data as { date: string; confirmed_by_user: boolean | null }[] | null) ?? [];
  const map = new Map(rows.map((r) => [r.date, r.confirmed_by_user]));

  let streak = 0;
  // start counting from yesterday backwards
  for (let i = 1; i <= 60; i++) {
    const day = berlinDate(-i);
    const v = map.get(day);
    if (v === true) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * 7-Tage-Durchschnittsumsatz für Kontext im Goal-Slider.
 */
export async function get7dAvgRevenue(userId: string): Promise<number> {
  const to = berlinDate();
  const from = berlinDate(-6);
  const { data } = await supabase.rpc("get_chatter_revenue_series_for_user", {
    p_user_id: userId,
    p_from: from,
    p_to: to,
  });
  const rows = (data as { date: string; total: number | string }[] | null) ?? [];
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  return Math.round(sum / 7);
}

/**
 * Heutiger Umsatz (Chatter) für die CommitmentCard-Progressbar.
 */
export async function getTodayRevenue(userId: string): Promise<number> {
  const today = berlinDate();
  const { data } = await supabase.rpc("get_chatter_revenue_series_for_user", {
    p_user_id: userId,
    p_from: today,
    p_to: today,
  });
  const rows = (data as { date: string; total: number | string }[] | null) ?? [];
  return rows.length ? Number(rows[0].total || 0) : 0;
}
