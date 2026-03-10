import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import { Gift } from "lucide-react";

const MILESTONES = [
  { amount: 500, tier: "Bronze", emoji: "🥉", rate: "21%" },
  { amount: 1000, tier: "Silber", emoji: "🥈", rate: "22%" },
  { amount: 1500, tier: "Gold", emoji: "🏆", rate: "23%" },
  { amount: 2000, tier: "Platin", emoji: "💠", rate: "24%" },
  { amount: 3000, tier: "Diamond", emoji: "💎", rate: "25%" },
  { amount: 50000, tier: "Titan", emoji: "🔱", rate: "35%" },
];

function getStorageKey() {
  const now = new Date();
  return `lootbox_unlocked_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUnlocked(): Record<number, boolean> {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey()) || "{}");
  } catch { return {}; }
}

function saveUnlocked(data: Record<number, boolean>) {
  localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

type Phase = "idle" | "shake" | "open" | "reveal";

// Radial light rays behind the emoji
function LightRays() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 0.6, 0], scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          className="absolute w-[2px] h-20 origin-bottom"
          style={{
            transform: `rotate(${i * 30}deg)`,
            background: "linear-gradient(to top, hsl(43 76% 46% / 0.5), transparent)",
          }}
        />
      ))}
    </div>
  );
}

// Floating particles on reveal
function FloatingParticles() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -60 - Math.random() * 40],
            x: [(Math.random() - 0.5) * 80],
            scale: [0, 1, 0.5],
          }}
          transition={{ duration: 1.5 + Math.random(), delay: 0.2 + i * 0.1, ease: "easeOut" }}
          className="absolute text-sm pointer-events-none"
          style={{ bottom: "40%", left: `${30 + Math.random() * 40}%` }}
        >
          {["✨", "⭐", "💫", "🌟"][i % 4]}
        </motion.div>
      ))}
    </>
  );
}

export default function LootBoxReward({ monthlyRevenue }: { monthlyRevenue: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentMilestone, setCurrentMilestone] = useState<typeof MILESTONES[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const unlocked = getUnlocked();
    for (const ms of MILESTONES) {
      if (monthlyRevenue >= ms.amount && !unlocked[ms.amount]) {
        setCurrentMilestone(ms);
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
      // Gold confetti burst
      const end = Date.now() + 1500;
      const fire = () => {
        confetti({
          particleCount: 30,
          spread: 70,
          startVelocity: 40,
          origin: { x: Math.random(), y: 0.5 },
          colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a", "#fff8e1"],
          ticks: 100,
        });
        if (Date.now() < end) requestAnimationFrame(fire);
      };
      fire();
      if (currentMilestone) {
        const unlocked = getUnlocked();
        unlocked[currentMilestone.amount] = true;
        saveUnlocked(unlocked);
      }
    }, 700);
  }, [phase, currentMilestone]);

  const handleClose = () => {
    setDialogOpen(false);
    setPhase("idle");
    setCurrentMilestone(null);
  };

  // Demo
  const [demoTriggered, setDemoTriggered] = useState(false);
  const triggerDemo = () => {
    const demoMs = MILESTONES[Math.floor(Math.random() * MILESTONES.length)];
    setCurrentMilestone(demoMs);
    setPhase("shake");
    setDialogOpen(true);
    setDemoTriggered(true);
  };

  return (
    <>
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
        <DialogContent className="max-w-xs sm:max-w-sm text-center overflow-visible border-accent/30">
          <DialogTitle className="sr-only">Meilenstein erreicht</DialogTitle>
          <DialogDescription className="sr-only">Du hast einen neuen Meilenstein erreicht</DialogDescription>

          <AnimatePresence mode="wait">
            {/* PHASE 1: Shaking box */}
            {phase === "shake" && (
              <motion.div
                key="shake"
                className="flex flex-col items-center gap-5 py-8 cursor-pointer select-none"
                onClick={handleBoxClick}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold"
                >
                  Neue Stufe freigeschaltet
                </motion.p>

                <div className="relative">
                  {/* Glow ring behind box */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 -m-6 rounded-full"
                    style={{ background: "radial-gradient(circle, hsl(43 76% 46% / 0.2), transparent 70%)" }}
                  />
                  <motion.div
                    animate={{
                      rotate: [0, -8, 8, -8, 8, -4, 4, 0],
                      scale: [1, 1.05, 1.05, 1.05, 1.05, 1.02, 1.02, 1],
                    }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                    className="text-8xl relative z-10 drop-shadow-[0_0_20px_hsl(43_76%_46%/0.4)]"
                  >
                    🎁
                  </motion.div>
                </div>

                <motion.p
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-sm text-accent/80 font-medium"
                >
                  Tippe um zu öffnen...
                </motion.p>
              </motion.div>
            )}

            {/* PHASE 2: Box explodes */}
            {phase === "open" && (
              <motion.div
                key="open"
                className="flex items-center justify-center py-12 relative"
              >
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{
                    scale: [1, 1.4, 1.6, 0],
                    rotate: [0, -10, 10, 0],
                    filter: ["brightness(1)", "brightness(1.5)", "brightness(2)", "brightness(3)"],
                  }}
                  transition={{ duration: 0.7, ease: "easeIn" }}
                  className="text-8xl"
                >
                  🎁
                </motion.div>
                {/* Explosion ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="absolute w-16 h-16 rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(43 76% 46% / 0.6), transparent)" }}
                />
              </motion.div>
            )}

            {/* PHASE 3: Reveal */}
            {phase === "reveal" && currentMilestone && (
              <motion.div
                key="reveal"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 150 }}
                className="flex flex-col items-center gap-3 py-6 relative"
              >
                <FloatingParticles />

                {/* Big emoji with rays */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <LightRays />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 8, stiffness: 100, delay: 0.1 }}
                    className="text-7xl relative z-10 drop-shadow-[0_0_30px_hsl(43_76%_46%/0.5)]"
                  >
                    {currentMilestone.emoji}
                  </motion.div>
                </div>

                {/* Tier name */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-1"
                >
                  <p className="text-2xl font-extrabold text-gold-gradient-shimmer tracking-wide">
                    {currentMilestone.tier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentMilestone.amount.toLocaleString("de-DE")}€ Monatsumsatz erreicht
                  </p>
                </motion.div>

                {/* Rate card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="gold-gradient-border-animated rounded-xl px-6 py-3 text-center mt-1"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Neue Rate</p>
                  <p className="text-3xl font-extrabold text-gold-gradient">{currentMilestone.rate}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Revenue Share</p>
                </motion.div>

                {/* Close */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={handleClose}
                  className="mt-3 px-8 py-2.5 rounded-xl gold-glow text-sm font-semibold text-accent-foreground transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, hsl(43 56% 52%), hsl(43 76% 46%))" }}
                >
                  Weiter
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
