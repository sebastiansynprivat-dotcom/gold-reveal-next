import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useState, useEffect } from "react";

const SPOTS_KEY = "urgency-spots";

const getPersistedSpots = (): number => {
  try {
    const stored = localStorage.getItem(SPOTS_KEY);
    if (stored === null) {
      const initial = Math.floor(Math.random() * 3) + 4;
      localStorage.setItem(SPOTS_KEY, String(initial));
      return initial;
    }
    return parseInt(stored, 10);
  } catch {
    return 3;
  }
};

const tryDecreaseSpot = (): number | null => {
  try {
    const current = parseInt(localStorage.getItem(SPOTS_KEY) || "3", 10);
    if (current <= 1) return null;
    if (Math.random() < 0.6) {
      const next = current - 1;
      localStorage.setItem(SPOTS_KEY, String(next));
      return next;
    }
    return null;
  } catch {
    return null;
  }
};

const UrgencySpots = () => {
  const [spots, setSpots] = useState(getPersistedSpots);

  useEffect(() => {
    const delay = Math.floor(Math.random() * 50000) + 10000;
    const timeout = setTimeout(() => {
      const newSpots = tryDecreaseSpot();
      if (newSpots !== null) setSpots(newSpots);
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto mb-4 px-1"
    >
      <div className="glass-card-subtle rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 border border-primary/10">
        <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
        <span className="text-foreground text-sm font-semibold">
          Nur noch <span className="text-primary">{spots}</span> {spots === 1 ? "Platz" : "Plätze"} frei
        </span>
      </div>
    </motion.div>
  );
};

export default UrgencySpots;
