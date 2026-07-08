import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Flame, Target, CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import { useUILanguage } from "@/hooks/useUILanguage";
import { isCommitmentTester } from "@/lib/commitmentFlag";
import { getCurrentStreak, getTodayRevenue, berlinDate } from "@/lib/commitmentStreak";
import { getQuoteForToday } from "@/lib/commitmentQuotes";
import { getTierInfo } from "@/lib/commitmentTiers";
import { cn } from "@/lib/utils";

const SLOT_LABELS: Record<string, { de: string; en: string }> = {
  morning: { de: "Morgens", en: "Morning" },
  noon: { de: "Mittags", en: "Noon" },
  evening: { de: "Abends", en: "Evening" },
  night: { de: "Nachts", en: "Night" },
};

type Row = {
  id: string;
  date: string;
  slots: string[];
  daily_goal: number | null;
  confirmed_by_user: boolean | null;
};

export default function CommitmentCard() {
  const { lang } = useUILanguage();
  const de = lang !== "en";
  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [streak, setStreak] = useState(0);
  const [todayRev, setTodayRev] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isCommitmentTester(user.id)) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("chatter_daily_commitment" as any)
        .select("id, date, slots, daily_goal, confirmed_by_user")
        .eq("user_id", user.id)
        .eq("date", berlinDate())
        .maybeSingle();

      if (!data) return;
      setRow(data as any);

      const [s, r] = await Promise.all([
        getCurrentStreak(user.id),
        getTodayRevenue(user.id),
      ]);
      setStreak(s);
      setTodayRev(r);
    })();

    // Refresh on window focus (evening confirmation may have happened elsewhere)
    const onFocus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [s, r] = await Promise.all([
        getCurrentStreak(user.id),
        getTodayRevenue(user.id),
      ]);
      setStreak(s);
      setTodayRev(r);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!userId || !row) return null;

  const goal = row.daily_goal ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((todayRev / goal) * 100)) : 0;
  const reached = goal > 0 && todayRev >= goal;
  const almost = pct >= 85 && !reached;
  const quote = getQuoteForToday(de ? "de" : "en");

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative rounded-2xl border p-4 lg:p-5 overflow-hidden",
        "bg-gradient-to-br from-yellow-500/10 via-black/40 to-yellow-600/5",
        "border-yellow-500/30",
        reached && "border-emerald-400/50 from-emerald-500/15 via-black/40 to-yellow-500/10",
        almost && "animate-pulse-slow",
      )}
      style={{
        boxShadow: reached
          ? "0 0 40px -10px rgba(52, 211, 153, 0.45), inset 0 0 30px -10px rgba(234, 179, 8, 0.25)"
          : "0 0 40px -12px rgba(234, 179, 8, 0.35), inset 0 0 30px -12px rgba(234, 179, 8, 0.15)",
      }}
    >
      {/* Top row: Streak + Goal */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Flame
              className={cn(
                "w-6 h-6",
                streak >= 3 ? "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]" : "text-yellow-400/60",
              )}
            />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-none">
              {streak} {de ? (streak === 1 ? "Tag" : "Tage") : streak === 1 ? "day" : "days"}
              <span className="text-white/50 text-xs font-normal ml-1">
                {de ? "Streak" : "streak"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Target className="w-4 h-4 text-yellow-400" />
          <span className="text-white/70">{de ? "Ziel" : "Goal"}:</span>
          <span className="font-bold text-yellow-300">{goal}€</span>
        </div>
      </div>

      {/* Slots row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(row.slots ?? []).map((s) => (
          <div
            key={s}
            className="flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-1 text-xs font-medium text-yellow-100"
          >
            <CheckCircle2 className="w-3 h-3 text-yellow-400" />
            {SLOT_LABELS[s]?.[de ? "de" : "en"] ?? s}
          </div>
        ))}
        {(!row.slots || row.slots.length === 0) && (
          <span className="text-xs text-white/40 flex items-center gap-1">
            <Circle className="w-3 h-3" /> {de ? "Keine Slots" : "No slots"}
          </span>
        )}
      </div>

      {/* Progress */}
      {goal > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/60">
              {todayRev}€ / {goal}€
            </span>
            <span className={cn("font-bold", reached ? "text-emerald-300" : "text-yellow-300")}>
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                reached
                  ? "bg-gradient-to-r from-emerald-400 to-yellow-400"
                  : "bg-gradient-to-r from-yellow-400 to-yellow-500",
              )}
            />
          </div>
          {reached && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {de ? "Ziel erreicht — Streak safe" : "Goal hit — streak safe"}
            </div>
          )}
        </div>
      )}

      {/* Quote */}
      <div className="border-t border-white/10 pt-3 mb-2">
        <p className="text-sm italic text-yellow-100/80 leading-snug">"{quote}"</p>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-1.5 text-[11px] text-white/50">
        <Clock className="w-3 h-3" />
        {row.confirmed_by_user === true ? (
          <span className="text-emerald-300/80">
            {de ? "Heute bestätigt — Streak wird um 23 Uhr gesichert." : "Confirmed today — streak locks at 11 PM."}
          </span>
        ) : row.confirmed_by_user === false ? (
          <span>{de ? "Heute pausiert. Morgen ist ein neuer Tag." : "Paused today. Tomorrow is a new day."}</span>
        ) : (
          <span>{de ? "Abend-Check-in: 21:00 Uhr" : "Evening check-in: 9:00 PM"}</span>
        )}
      </div>
    </motion.div>
  );
}
