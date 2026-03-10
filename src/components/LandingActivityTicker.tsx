import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";

interface TickerEvent {
  id: string;
  text: string;
  emoji: string;
}

const AMOUNTS = [5, 10, 20, 30, 50, 100];

function randomEvent(): TickerEvent {
  const amt = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  return { id: `${Date.now()}-${Math.random()}`, text: `Ein Chatter hat gerade ${amt}€ Umsatz gemacht`, emoji: "🔥" };
}

export default function LandingActivityTicker() {
  const [current, setCurrent] = useState<TickerEvent>(randomEvent);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(randomEvent());
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full max-w-[800px] mx-auto mt-2 mb-4"
    >
      <div className="rounded-lg bg-secondary/50 border border-border/30 px-3 py-2">
        <div className="relative overflow-hidden flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-accent shrink-0 animate-pulse" />
          <span className="text-[10px] text-accent font-semibold uppercase tracking-wider shrink-0">Live</span>
          <div className="h-3 w-px bg-border/50 shrink-0" />
          <div className="relative flex-1 h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0 flex items-center"
              >
                <span className="text-xs text-muted-foreground truncate">
                  {current.emoji} {current.text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
        🚀 Schau jetzt das Video und sichere dir deinen Platz – du bist schon bald dabei!
      </p>
    </motion.div>
  );
}
