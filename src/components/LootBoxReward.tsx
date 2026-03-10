import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import { Gift } from "lucide-react";

const MILESTONES = [
  { amount: 500, tier: "Bronze 🥉", rate: "21%", rewards: ["Grind Starter 🔥", "First Blood 💪", "Hustle Rookie ⚡"] },
  { amount: 1000, tier: "Silber 🥈", rate: "22%", rewards: ["Cash Hunter 💰", "Grind Master ⚡", "Money Maker 🔥"] },
  { amount: 1500, tier: "Gold 🏆", rate: "23%", rewards: ["Gold Digger 👑", "Revenue King 💎", "Profit Machine 🚀"] },
  { amount: 2000, tier: "Platin 💠", rate: "24%", rewards: ["Platin Player 💠", "Top Earner 🏅", "Elite Chatter 🎯"] },
  { amount: 3000, tier: "Diamond 💎", rate: "25%", rewards: ["Diamond Hands 💎", "Legendary Grinder 🔱", "Cash Machine 🤑"] },
  { amount: 50000, tier: "Titan 🔱", rate: "35%", rewards: ["Titan Lord 🔱", "Unstoppable 👑", "God Mode 🌟"] },
];

function getStorageKey() {
  const now = new Date();
  return `lootbox_unlocked_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUnlocked(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey()) || "{}");
  } catch { return {}; }
}

function saveUnlocked(data: Record<number, string>) {
  localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

type Phase = "idle" | "shake" | "open" | "reveal";

export default function LootBoxReward({ monthlyRevenue }: { monthlyRevenue: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentMilestone, setCurrentMilestone] = useState<typeof MILESTONES[0] | null>(null);
  const [reward, setReward] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check for new milestones
  useEffect(() => {
    const unlocked = getUnlocked();
    for (const ms of MILESTONES) {
      if (monthlyRevenue >= ms.amount && !unlocked[ms.amount]) {
        setCurrentMilestone(ms);
        setReward(ms.rewards[Math.floor(Math.random() * ms.rewards.length)]);
        setPhase("shake");
        setDialogOpen(true);
        break;
      }
    }
  }, [monthlyRevenue]);

  const handleBoxClick = useCallback(() => {
    if (phase !== "shake") return;
    setPhase("open");
    setTimeout(() => {
      setPhase("reveal");
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a", "#ffffff"],
      });
      // Save as unlocked
      if (currentMilestone) {
        const unlocked = getUnlocked();
        unlocked[currentMilestone.amount] = reward;
        saveUnlocked(unlocked);
      }
    }, 600);
  }, [phase, currentMilestone, reward]);

  const handleClose = () => {
    setDialogOpen(false);
    setPhase("idle");
    setCurrentMilestone(null);
  };

  // Demo trigger
  const [demoTriggered, setDemoTriggered] = useState(false);
  const triggerDemo = () => {
    const demoMs = MILESTONES[0];
    setCurrentMilestone(demoMs);
    setReward(demoMs.rewards[Math.floor(Math.random() * demoMs.rewards.length)]);
    setPhase("shake");
    setDialogOpen(true);
    setDemoTriggered(true);
  };

  return (
    <>
      {/* Demo Button */}
      {!demoTriggered && (
        <button
          onClick={triggerDemo}
          className="w-full flex items-center gap-3 glass-card-subtle rounded-xl p-3 lg:p-4 border border-accent/30 bg-accent/5 text-left cursor-pointer hover:bg-accent/10 hover:border-accent/50 transition-all"
        >
          <Gift className="h-5 w-5 text-accent shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">🧪 Demo: Loot-Box Meilenstein öffnen</p>
            <p className="text-xs text-muted-foreground mt-0.5">Klicke hier um die Loot-Box Animation zu testen</p>
          </div>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle className="sr-only">Meilenstein erreicht</DialogTitle>
          <DialogDescription className="sr-only">Du hast einen neuen Meilenstein erreicht</DialogDescription>
          
          <AnimatePresence mode="wait">
            {phase === "shake" && (
              <motion.div
                key="shake"
                className="flex flex-col items-center gap-4 py-6 cursor-pointer select-none"
                onClick={handleBoxClick}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Meilenstein erreicht!</p>
                <motion.div
                  animate={{
                    rotate: [0, -5, 5, -5, 5, -3, 3, 0],
                    scale: [1, 1.02, 1.02, 1.02, 1.02, 1.01, 1.01, 1],
                  }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
                  className="text-7xl"
                >
                  🎁
                </motion.div>
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-sm text-accent font-medium"
                >
                  Tippe um zu öffnen...
                </motion.p>
              </motion.div>
            )}

            {phase === "open" && (
              <motion.div
                key="open"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.3, 0], rotate: [0, 0, 180] }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center py-10"
              >
                <span className="text-7xl">🎁</span>
              </motion.div>
            )}

            {phase === "reveal" && currentMilestone && (
              <motion.div
                key="reveal"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  className="text-5xl"
                >
                  🏆
                </motion.div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">
                    {currentMilestone.amount.toLocaleString("de-DE")}€ erreicht!
                  </p>
                  <div className="glass-card-subtle rounded-lg px-4 py-3 gold-glow">
                    <p className="text-xs text-muted-foreground mb-1">Neuer Titel freigeschaltet</p>
                    <p className="text-xl font-bold text-gold-gradient">{reward}</p>
                  </div>
                  <div className="glass-card-subtle rounded-lg px-4 py-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Neue Stufe</p>
                    <p className="text-lg font-bold text-foreground">{currentMilestone.tier}</p>
                    <p className="text-sm text-accent font-semibold">{currentMilestone.rate} Revenue Share</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-2 px-6 py-2 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
                >
                  Weiter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
