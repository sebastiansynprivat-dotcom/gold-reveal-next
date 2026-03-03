import { useState, useEffect } from "react";
import { Flame, Check, Trophy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const STREAK_GOAL = 7;
const DAILY_TARGET = 30;
const STORAGE_KEY = "streak_data";

interface StreakData {
  dates: string[]; // ISO date strings of completed days
  lastCheckedDate: string | null;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dates: [], lastCheckedDate: null };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let count = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export default function StreakTracker({ dailyRevenue }: { dailyRevenue: number }) {
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const today = getToday();
  const todayCompleted = streak.dates.includes(today);
  const consecutiveDays = getConsecutiveDays(streak.dates);
  const streakComplete = consecutiveDays >= STREAK_GOAL;

  useEffect(() => {
    if (dailyRevenue >= DAILY_TARGET && !todayCompleted) {
      const updated = { ...streak, dates: [...streak.dates, today], lastCheckedDate: today };
      setStreak(updated);
      saveStreak(updated);
      toast.success("🔥 Tagesziel erreicht! Streak +1");

      const newConsecutive = getConsecutiveDays(updated.dates);
      if (newConsecutive >= STREAK_GOAL) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"] });
        toast.success("🏆 7 Tage Streak! Account-Upgrade freigeschaltet!");
      }
    }
  }, [dailyRevenue]);

  // Build last 7 days for visual display
  const last7Days = Array.from({ length: STREAK_GOAL }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (STREAK_GOAL - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2);
    const completed = streak.dates.includes(dateStr);
    const isToday = dateStr === today;
    return { dateStr, dayLabel, completed, isToday };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          Streak-Tracker
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold text-gold-gradient">{consecutiveDays}</span>
          <span className="text-xs text-muted-foreground">/ {STREAK_GOAL} Tage</span>
        </div>
      </div>

      {/* Day circles */}
      <div className="flex items-center justify-between gap-1">
        {last7Days.map((day) => (
          <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
            <div
              className={`
                h-9 w-9 lg:h-10 lg:w-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                ${day.completed
                  ? "bg-accent text-accent-foreground gold-glow"
                  : day.isToday
                    ? "border-2 border-accent/50 text-accent"
                    : "bg-secondary text-muted-foreground"
                }
              `}
            >
              {day.completed ? <Check className="h-4 w-4" /> : day.dayLabel}
            </div>
            <span className={`text-[10px] ${day.isToday ? "text-accent font-semibold" : "text-muted-foreground"}`}>
              {day.isToday ? "Heute" : day.dayLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Status message */}
      <div className={`rounded-lg px-3 py-2 text-xs lg:text-sm ${streakComplete ? "bg-accent/10 gold-border-glow" : "bg-secondary"}`}>
        {streakComplete ? (
          <span className="flex items-center gap-2 text-gold-gradient font-semibold">
            <Trophy className="h-4 w-4 text-accent" />
            Account-Upgrade freigeschaltet! 🎉
          </span>
        ) : todayCompleted ? (
          <span className="text-accent">
            ✅ Heute erledigt – mach morgen weiter! ({STREAK_GOAL - consecutiveDays} Tage übrig)
          </span>
        ) : (
          <span className="text-muted-foreground">
            Erreiche heute <strong className="text-foreground">{DAILY_TARGET}€</strong> Umsatz, um deine Streak fortzusetzen.
          </span>
        )}
      </div>
    </div>
  );
}
