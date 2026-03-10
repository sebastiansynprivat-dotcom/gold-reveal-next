import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Copy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STREAK_GOAL = 30;
const DAILY_TARGET = 100;
const STORAGE_KEY = "monthly_streak_data";

const WHATSAPP_TEXT =
  "Hey, ich habe die 30-Tage-Challenge geschafft! 🔥💎 Ich möchte gerne meinen Spezialbonus erhalten.";

interface StreakData {
  dates: string[];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dates: [] };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let count = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) count++;
    else break;
  }
  return count;
}

function fireConfetti() {
  confetti({
    particleCount: 250,
    spread: 120,
    origin: { y: 0.5 },
    colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a", "#60a5fa"],
  });
}

export default function MonthlyStreakTracker({ dailyRevenue }: { dailyRevenue: number }) {
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [showDialog, setShowDialog] = useState(false);

  const today = getToday();
  const todayCompleted = streak.dates.includes(today);
  const consecutiveDays = getConsecutiveDays(streak.dates);
  const streakComplete = consecutiveDays >= STREAK_GOAL;
  const progressPct = Math.min((consecutiveDays / STREAK_GOAL) * 100, 100);

  useEffect(() => {
    if (dailyRevenue >= DAILY_TARGET && !streak.dates.includes(today)) {
      const updated = { dates: [...streak.dates, today] };
      setStreak(updated);
      saveStreak(updated);
      toast.success("💎 100€ Tagesziel erreicht! Monats-Streak +1");

      const newConsecutive = getConsecutiveDays(updated.dates);
      if (newConsecutive >= STREAK_GOAL) {
        setShowDialog(true);
      }
    }
  }, [dailyRevenue]);

  useEffect(() => {
    if (showDialog) {
      setTimeout(fireConfetti, 300);
    }
  }, [showDialog]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          30-Tage-Challenge
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gold-gradient">{consecutiveDays}</span>
          <span className="text-xs text-muted-foreground">/ {STREAK_GOAL} Tage</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress
          value={progressPct}
          className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-accent/70 shimmer-bar"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{consecutiveDays} von {STREAK_GOAL} Tagen</span>
          <span>{streakComplete ? "Geschafft! 💎" : `Noch ${STREAK_GOAL - consecutiveDays} Tage`}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`rounded-lg px-3 py-2 text-xs lg:text-sm ${streakComplete ? "bg-accent/10 gold-border-glow" : "bg-secondary"}`}>
        {streakComplete ? (
          <span className="flex items-center gap-2 text-gold-gradient font-semibold">
            <Trophy className="h-4 w-4 text-accent" />
            Spezialbonus freigeschaltet! 💎
          </span>
        ) : todayCompleted ? (
          <span className="text-accent">
            💎 100€ heute erreicht! Noch {STREAK_GOAL - consecutiveDays} Tage bis zum Spezialbonus!
          </span>
        ) : (
          <span className="text-muted-foreground">
            Erreiche heute <strong className="text-foreground">{DAILY_TARGET}€</strong> Umsatz für deine 30-Tage-Streak.
          </span>
        )}
      </div>

      {/* Completion Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md border-accent/30 bg-card">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            <DialogTitle className="text-xl text-gold-gradient">
              💎 30-Tage-Challenge geschafft!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm pt-3 space-y-2" asChild>
              <div>
                <p className="text-base font-medium text-foreground">
                  Du hast <span className="text-accent font-bold">30 Tage in Folge</span> mind. <span className="text-accent font-bold">{DAILY_TARGET}€</span> Umsatz gemacht! 🔥
                </p>
                <p className="text-accent font-semibold">Du hast dir einen Spezialbonus verdient!</p>
                <p className="text-muted-foreground pt-1">
                  Sende diesen Text in deine WhatsApp-Gruppe:
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              👇 Tippe auf die Nachricht – sie wird kopiert & du landest direkt in WhatsApp.
            </p>
            <button
              className="w-full rounded-lg bg-secondary p-3 text-sm text-foreground text-left hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2"
              onClick={async () => {
                await navigator.clipboard.writeText(WHATSAPP_TEXT);
                toast.success("Text kopiert!");
                window.open(`https://wa.me/?text=${encodeURIComponent(WHATSAPP_TEXT)}`, "_blank");
              }}
            >
              <p className="flex-1">{WHATSAPP_TEXT}</p>
              <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
