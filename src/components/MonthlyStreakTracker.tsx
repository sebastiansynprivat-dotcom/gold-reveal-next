import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Copy, Play, Diamond, Gem } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const STREAK_GOAL = 30;
const DAILY_TARGET = 100;
const STORAGE_KEY = "monthly_streak_data";
const DIAMOND_SENT_KEY = "diamond_notification_sent";

const WHATSAPP_TEXT =
  "Hey, ich habe die 30-Tage-Challenge geschafft! 🔥💎 Ich bin jetzt Diamond Chatter!";

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

function fireDiamondConfetti() {
  // First burst
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.45 },
    colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a", "#60a5fa", "#818cf8"],
  });
  // Second burst delayed
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 120,
      origin: { y: 0.6, x: 0.3 },
      colors: ["#c4973b", "#e8c96b", "#60a5fa"],
    });
    confetti({
      particleCount: 100,
      spread: 120,
      origin: { y: 0.6, x: 0.7 },
      colors: ["#a07c2a", "#f5d98a", "#818cf8"],
    });
  }, 400);
}

async function sendDiamondNotification() {
  // Only send once
  if (localStorage.getItem(DIAMOND_SENT_KEY)) return;

  try {
    // Fetch the template
    const { data: template } = await supabase
      .from("notification_templates")
      .select("title, body")
      .eq("template_key", "diamond_chatter")
      .single();

    if (!template) return;

    // Broadcast to all chatters (no target_user_id = all)
    await supabase.functions.invoke("send-notification", {
      body: {
        title: template.title,
        body: template.body,
      },
    });

    localStorage.setItem(DIAMOND_SENT_KEY, "true");
  } catch (err) {
    console.error("Diamond notification failed:", err);
  }
}

function buildDemoStreak(): StreakData {
  const dates: string[] = [];
  for (let i = 0; i < STREAK_GOAL; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return { dates };
}

export default function MonthlyStreakTracker({ dailyRevenue }: { dailyRevenue: number }) {
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [showDialog, setShowDialog] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const today = getToday();
  const displayStreak = demoMode ? buildDemoStreak() : streak;
  const todayCompleted = displayStreak.dates.includes(today);
  const consecutiveDays = getConsecutiveDays(displayStreak.dates);
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
        sendDiamondNotification();
      }
    }
  }, [dailyRevenue]);

  useEffect(() => {
    if (showDialog) {
      setTimeout(fireDiamondConfetti, 300);
    }
  }, [showDialog]);

  const handleDialogOpen = useCallback((open: boolean) => {
    setShowDialog(open);
    if (!open && demoMode) {
      setDemoMode(false);
    }
  }, [demoMode]);

  const startDemo = () => {
    setDemoMode(true);
    setShowDialog(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm lg:text-base font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          30-Tage-Challenge
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={startDemo}
            className="text-[10px] text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 opacity-50 hover:opacity-100"
            title="Demo starten"
          >
            <Play className="h-3 w-3" />
            Demo
          </button>
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
            <Gem className="h-4 w-4 text-accent" />
            Diamond Chatter Status freigeschaltet! 💎
          </span>
        ) : todayCompleted ? (
          <span className="text-accent">
            💎 100€ heute erreicht! Noch {STREAK_GOAL - consecutiveDays} Tage bis zum Diamond Status!
          </span>
        ) : (
          <span className="text-muted-foreground">
            Erreiche heute <strong className="text-foreground">{DAILY_TARGET}€</strong> Umsatz für deine 30-Tage-Streak.
          </span>
        )}
      </div>

      {/* Diamond Completion Dialog */}
      <Dialog open={showDialog} onOpenChange={handleDialogOpen}>
        <DialogContent className="sm:max-w-md border-accent/30 bg-card dialog-glow">
          <DialogHeader className="text-center items-center">
            {/* Diamond badge with glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
              className="mx-auto mb-3"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center gold-glow-strong"
                >
                  <Gem className="h-10 w-10 text-accent" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-accent/40"
                />
              </div>
            </motion.div>

            <DialogTitle className="text-2xl text-gold-gradient">
              💎 Diamond Chatter
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm pt-3 space-y-3" asChild>
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base font-medium text-foreground"
                >
                  Du hast <span className="text-accent font-bold">30 Tage in Folge</span> mind.{" "}
                  <span className="text-accent font-bold">{DAILY_TARGET}€</span> Umsatz gemacht!
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-accent font-bold text-lg"
                >
                  Du bist jetzt Diamond Chatter 💎
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-muted-foreground text-xs"
                >
                  Nur die Top 1% schaffen das. Dein Badge ist jetzt im Leaderboard sichtbar.
                </motion.p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="space-y-3 pt-2"
          >
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
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
