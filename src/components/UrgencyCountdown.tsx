import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";
import { useState, useEffect } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const getEndOfWeek = () => {
  const now = new Date();
  const daysUntilSunday = 7 - now.getDay();
  const end = new Date(now);
  end.setDate(now.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
};

const formatTime = (ms: number) => {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
};

const SPOTS_KEY = "urgency-spots";
const VISITS_KEY = "urgency-visits";

const getPersistedSpots = (): number => {
  try {
    const stored = localStorage.getItem(SPOTS_KEY);
    const visits = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10);

    if (stored === null) {
      // First visit: 4-6 spots
      const initial = Math.floor(Math.random() * 3) + 4;
      localStorage.setItem(SPOTS_KEY, String(initial));
      localStorage.setItem(VISITS_KEY, "1");
      return initial;
    }

    const current = parseInt(stored, 10);
    // Every reload: 60% chance to lose a spot (min 1)
    const newVisits = visits + 1;
    localStorage.setItem(VISITS_KEY, String(newVisits));

    if (current > 1 && Math.random() < 0.6) {
      const next = current - 1;
      localStorage.setItem(SPOTS_KEY, String(next));
      return next;
    }
    return current;
  } catch {
    return 3;
  }
};

const UrgencyCountdown = () => {
  const [timeLeft, setTimeLeft] = useState(() => formatTime(getEndOfWeek().getTime() - Date.now()));
  const [spots] = useState(getPersistedSpots);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTime(getEndOfWeek().getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease }}
      className="w-full max-w-xl mx-auto mb-10"
    >
      <div className="glass-card-subtle rounded-xl px-5 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 border border-primary/10">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          <span className="text-foreground text-sm font-semibold">
            Nur noch <span className="text-primary">{spots} Plätze</span> diese Woche frei
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">{timeLeft.days}T</span>
            <span>:</span>
            <span className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">{pad(timeLeft.hours)}h</span>
            <span>:</span>
            <span className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">{pad(timeLeft.minutes)}m</span>
            <span>:</span>
            <span className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">{pad(timeLeft.seconds)}s</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UrgencyCountdown;
