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

// Golden light rays
function LightRays() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 0.5, 0], scaleY: [0.2, 1.2, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
          className="absolute w-[1.5px] origin-bottom"
          style={{
            height: i % 2 === 0 ? "70px" : "50px",
            transform: `rotate(${i * 22.5}deg)`,
            background: "linear-gradient(to top, hsl(43 76% 46% / 0.6), hsl(43 56% 72% / 0.1), transparent)",
          }}
        />
      ))}
    </div>
  );
}

// Sparkle particles on reveal
function RevealSparkles() {
  const sparkles = ["✦", "✧", "⟡", "✦", "✧", "⟡", "✦", "✧", "✦", "✧"];
  return (
    <>
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            y: [0, -50 - Math.random() * 60],
            x: [(Math.random() - 0.5) * 120],
            scale: [0, 0.8 + Math.random() * 0.6, 0],
            rotate: [0, 180 + Math.random() * 180],
          }}
          transition={{ duration: 1.2 + Math.random() * 0.8, delay: i * 0.08, ease: "easeOut" }}
          className="absolute pointer-events-none font-bold"
          style={{
            bottom: "35%",
            left: `${20 + Math.random() * 60}%`,
            color: `hsl(43 ${50 + Math.random() * 30}% ${45 + Math.random() * 25}%)`,
            fontSize: `${10 + Math.random() * 8}px`,
          }}
        >
          {s}
        </motion.div>
      ))}
    </>
  );
}

// Gold-themed box SVG
function GoldBox({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Box shadow */}
      <ellipse cx="50" cy="88" rx="30" ry="6" fill="hsl(43 56% 52% / 0.15)" />
      {/* Box body */}
      <rect x="20" y="45" width="60" height="40" rx="4" fill="url(#boxGrad)" stroke="hsl(43 76% 46% / 0.6)" strokeWidth="1.5" />
      {/* Box lid */}
      <rect x="16" y="35" width="68" height="14" rx="3" fill="url(#lidGrad)" stroke="hsl(43 76% 46% / 0.7)" strokeWidth="1.5" />
      {/* Ribbon vertical */}
      <rect x="45" y="35" width="10" height="50" fill="hsl(43 76% 46% / 0.4)" />
      {/* Ribbon bow */}
      <ellipse cx="50" cy="35" rx="14" ry="8" fill="hsl(43 76% 46% / 0.5)" stroke="hsl(43 76% 46% / 0.7)" strokeWidth="1" />
      <circle cx="50" cy="35" r="4" fill="hsl(43 76% 46% / 0.8)" />
      {/* Shine */}
      <rect x="25" y="50" width="8" height="3" rx="1.5" fill="hsl(43 56% 72% / 0.5)" />
      <rect x="25" y="56" width="5" height="2" rx="1" fill="hsl(43 56% 72% / 0.3)" />
      <defs>
        <linearGradient id="boxGrad" x1="20" y1="45" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(43 40% 18%)" />
          <stop offset="50%" stopColor="hsl(43 50% 25%)" />
          <stop offset="100%" stopColor="hsl(43 40% 15%)" />
        </linearGradient>
        <linearGradient id="lidGrad" x1="16" y1="35" x2="84" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(43 50% 22%)" />
          <stop offset="40%" stopColor="hsl(43 60% 30%)" />
          <stop offset="100%" stopColor="hsl(43 50% 20%)" />
        </linearGradient>
      </defs>
    </svg>
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
      const end = Date.now() + 2000;
      const fire = () => {
        confetti({
          particleCount: 25,
          spread: 60,
          startVelocity: 35,
          origin: { x: 0.3 + Math.random() * 0.4, y: 0.45 },
          colors: ["#c4973b", "#e8c96b", "#a07c2a", "#f5d98a", "#fff8e1"],
          ticks: 80,
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
        <DialogContent className="max-w-xs sm:max-w-sm text-center overflow-visible border-accent/20 p-0">
          <DialogTitle className="sr-only">Meilenstein erreicht</DialogTitle>
          <DialogDescription className="sr-only">Du hast einen neuen Meilenstein erreicht</DialogDescription>

          {/* Inner gold gradient overlay at top */}
          <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none rounded-t-lg" style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(43 76% 46% / 0.08) 0%, transparent 70%)"
          }} />

          <AnimatePresence mode="wait">
            {/* PHASE 1: Shaking gold box */}
            {phase === "shake" && (
              <motion.div
                key="shake"
                className="flex flex-col items-center gap-4 py-10 px-6 cursor-pointer select-none relative"
                onClick={handleBoxClick}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold"
                >
                  ★ Neue Stufe ★
                </motion.p>

                <div className="relative">
                  {/* Pulsing glow */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-8 rounded-full"
                    style={{ background: "radial-gradient(circle, hsl(43 76% 46% / 0.3), transparent 65%)" }}
                  />
                  <motion.div
                    animate={{
                      rotate: [0, -6, 6, -6, 6, -3, 3, 0],
                      y: [0, -3, 0, -3, 0, -1, 0, 0],
                    }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
                    className="relative z-10"
                    style={{ filter: "drop-shadow(0 0 24px hsl(43 76% 46% / 0.35))" }}
                  >
                    <GoldBox size={110} />
                  </motion.div>
                </div>

                <motion.p
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-xs text-accent/70 font-medium tracking-wide"
                >
                  Tippe um zu öffnen
                </motion.p>
              </motion.div>
            )}

            {/* PHASE 2: Box explodes */}
            {phase === "open" && (
              <motion.div
                key="open"
                className="flex items-center justify-center py-16 relative"
              >
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{
                    scale: [1, 1.2, 1.4, 0],
                    rotate: [0, -5, 5, 0],
                    opacity: [1, 1, 0.8, 0],
                  }}
                  transition={{ duration: 0.7, ease: "easeIn" }}
                  style={{ filter: "drop-shadow(0 0 30px hsl(43 76% 46% / 0.5))" }}
                >
                  <GoldBox size={110} />
                </motion.div>
                {/* Explosion ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.9 }}
                  animate={{ scale: 5, opacity: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="absolute w-12 h-12 rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(43 76% 46% / 0.5), hsl(43 56% 52% / 0.2), transparent)" }}
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
                className="flex flex-col items-center gap-2 py-8 px-6 relative"
              >
                <RevealSparkles />

                {/* Big emoji with light rays */}
                <div className="relative w-28 h-28 flex items-center justify-center mb-1">
                  <LightRays />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 8, stiffness: 100, delay: 0.1 }}
                    className="text-6xl relative z-10"
                    style={{ filter: "drop-shadow(0 0 25px hsl(43 76% 46% / 0.5))" }}
                  >
                    {currentMilestone.emoji}
                  </motion.div>
                </div>

                {/* Tier name */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-0.5"
                >
                  <p className="text-3xl font-extrabold text-gold-gradient-shimmer tracking-wide">
                    {currentMilestone.tier}
                  </p>
                </motion.div>

                {/* Divider */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="w-24 h-px my-1"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(43 56% 52% / 0.5), transparent)" }}
                />

                {/* Amount */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-xs text-muted-foreground"
                >
                  {currentMilestone.amount.toLocaleString("de-DE")}€ Monatsumsatz erreicht
                </motion.p>

                {/* Rate card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="gold-gradient-border-animated rounded-xl px-8 py-4 text-center mt-2"
                >
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mb-1">Deine neue Rate</p>
                  <p className="text-4xl font-black text-gold-gradient leading-none">{currentMilestone.rate}</p>
                  <p className="text-[10px] text-accent/60 mt-1 tracking-wide">Revenue Share</p>
                </motion.div>

                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  onClick={handleClose}
                  className="mt-3 px-10 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 46%), hsl(43 56% 42%))",
                    color: "hsl(0 0% 4%)",
                    boxShadow: "0 0 20px hsl(43 76% 46% / 0.3), inset 0 1px 0 hsl(43 56% 72% / 0.3)",
                  }}
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
