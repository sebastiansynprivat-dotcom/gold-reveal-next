import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, Check, Trophy, Copy, Send, Play } from "lucide-react";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUILanguage } from "@/hooks/useUILanguage";

const STREAK_GOAL = 7;
const DAILY_TARGET = 30;
const STORAGE_KEY = "streak_data";

interface StreakData {
  dates: string[];
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

function buildDemoStreak(): StreakData {
  const dates: string[] = [];
  for (let i = 0; i < STREAK_GOAL; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return { dates, lastCheckedDate: getToday() };
}

function fireConfetti() {
  confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.5 },
    colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a"],
  });
}

export default function StreakTracker({ dailyRevenue }: { dailyRevenue: number }) {
  const { t, lang } = useUILanguage();
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [showStreakDialog, setShowStreakDialog] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { playStreakSound } = useSoundEffects();

  const whatsappText = t("streak.whatsappText");
  const today = getToday();
  const displayStreak = demoMode ? buildDemoStreak() : streak;
  const todayCompleted = displayStreak.dates.includes(today);
  const consecutiveDays = getConsecutiveDays(displayStreak.dates);
  const streakComplete = consecutiveDays >= STREAK_GOAL;

  useEffect(() => {
    if (dailyRevenue >= DAILY_TARGET && !streak.dates.includes(today)) {
      const updated = { ...streak, dates: [...streak.dates, today], lastCheckedDate: today };
      setStreak(updated);
      saveStreak(updated);
      toast.success(t("streak.toastReached"));
      playStreakSound();

      const newConsecutive = getConsecutiveDays(updated.dates);
      if (newConsecutive >= STREAK_GOAL) {
        setShowStreakDialog(true);
      }
    }
  }, [dailyRevenue]);

  const handleDialogOpen = useCallback((open: boolean) => {
    setShowStreakDialog(open);
    if (!open && demoMode) {
      setDemoMode(false);
    }
  }, [demoMode]);

  useEffect(() => {
    if (showStreakDialog) {
      setTimeout(fireConfetti, 300);
    }
  }, [showStreakDialog]);

  const startDemo = () => {
    setDemoMode(true);
    setShowStreakDialog(true);
  };

  const dateLocale = lang === "en" ? "en-US" : "de-DE";
  const last7Days = Array.from({ length: STREAK_GOAL }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (STREAK_GOAL - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString(dateLocale, { weekday: "short" }).slice(0, 2);
    const completed = displayStreak.dates.includes(dateStr);
    const isToday = dateStr === today;
    return { dateStr, dayLabel, completed, isToday };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          {t("streak.heading")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={startDemo}
            className="text-[10px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 opacity-50 hover:opacity-100"
            title={t("streak.demo")}
          >
            <Play className="h-3 w-3" />
            {t("streak.demo")}
          </button>
          <span className="text-2xl font-bold text-gold-gradient">{consecutiveDays}</span>
          <span className="text-xs text-muted-foreground">/ {STREAK_GOAL} {t("streak.daysSuffix")}</span>
        </div>
      </div>

      {/* Day circles */}
      <div className="flex items-center justify-between gap-1">
        {last7Days.map((day, index) => (
          <motion.div
            key={day.dateStr}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
          >
            <div
              className={`
                h-9 w-9 lg:h-10 lg:w-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                ${day.completed
                  ? "bg-accent text-accent-foreground gold-glow"
                  : day.isToday
                    ? "border-2 border-accent/50 text-accent streak-circle-pulse"
                    : "bg-secondary text-muted-foreground"
                }
              `}
            >
              {day.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              ) : day.dayLabel}
            </div>
            <span className={`text-[10px] ${day.isToday ? "text-accent font-semibold" : "text-muted-foreground"}`}>
              {day.isToday ? t("streak.today") : day.dayLabel}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Status message */}
      <div className={`rounded-lg px-3 py-2 text-xs lg:text-sm ${streakComplete ? "bg-accent/10 gold-border-glow" : "bg-secondary"}`}>
        {streakComplete ? (
          <span className="flex items-center gap-2 text-gold-gradient font-semibold">
            <Trophy className="h-4 w-4 text-accent" />
            {t("streak.unlocked")}
          </span>
        ) : todayCompleted ? (
          <span className="text-accent">
            {t("streak.todayDone")} {t("streak.daysToUpgradePre")} {STREAK_GOAL - consecutiveDays} {t("streak.daysToUpgradeSuffix")}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {t("streak.openTodayPre")} <strong className="text-foreground">{DAILY_TARGET}€</strong> {t("streak.openTodaySuffix")}
          </span>
        )}
      </div>

      {/* Streak Completion Dialog */}
      <Dialog open={showStreakDialog} onOpenChange={handleDialogOpen}>
        <DialogContent className="sm:max-w-md border-accent/30 bg-card">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-accent" />
            </div>
            <DialogTitle className="text-xl text-gold-gradient">
              {t("streak.dialog.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm pt-3 space-y-2" asChild>
              <div>
                <p className="text-base font-medium text-foreground">
                  {t("streak.dialog.bodyPre")} <span className="text-accent font-bold">{t("streak.dialog.bodyMid")}</span> <span className="text-accent font-bold">{DAILY_TARGET}€</span> {t("streak.dialog.bodyEnd")}
                </p>
                <p className="text-accent font-semibold">{t("streak.dialog.upgrade")}</p>
                <p className="text-muted-foreground pt-1">
                  {t("streak.dialog.sendText")}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              {t("streak.dialog.tapHint")}
            </p>
            <button
              className="w-full rounded-lg bg-secondary p-3 text-sm text-foreground text-left hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2"
              onClickCapture={async (e) => {
                e.stopPropagation();
                await navigator.clipboard.writeText(whatsappText);
                toast.success(t("streak.copied"));
                window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
              }}
            >
              <p className="flex-1">{whatsappText}</p>
              <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
