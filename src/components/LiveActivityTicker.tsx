import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TickerEvent {
  id: string;
  text: string;
  emoji: string;
  timestamp: number;
}

// Realistic random amount: mostly 5-80€
function randomAmount(): number {
  const base = Math.random();
  if (base < 0.5) return Math.floor(Math.random() * 16) + 5;    // 5-20€
  if (base < 0.8) return Math.floor(Math.random() * 25) + 21;   // 21-45€
  return Math.floor(Math.random() * 35) + 46;                    // 46-80€
}

let eventCounter = 0;

function generateFallbackEvent(): TickerEvent {
  eventCounter++;
  // ~25% chance: general milestone event (no amounts)
  if (Math.random() < 0.25) {
    const milestones = [
      { text: "Ein Chatter hat sein Tagesziel erreicht!", emoji: "🎯" },
      { text: "Ein Chatter hat seine Streak fortgesetzt!", emoji: "⚡" },
      { text: "Ein Chatter hat alle Aufgaben erledigt!", emoji: "✅" },
      { text: "Ein Chatter hat gerade eine MassDM gesendet!", emoji: "📩" },
      { text: "Ein neuer Chatter ist dem Team beigetreten!", emoji: "🙌" },
    ];
    const m = milestones[Math.floor(Math.random() * milestones.length)];
    return { id: `f-${Date.now()}-${Math.random()}`, text: m.text, emoji: m.emoji, timestamp: Date.now() };
  }
  // Normal revenue event (5-80€)
  const amt = randomAmount();
  return { id: `f-${Date.now()}-${Math.random()}`, text: `Ein Chatter hat gerade ${amt}€ Umsatz gemacht`, emoji: "🔥", timestamp: Date.now() };
}

const FALLBACK_EVENTS: TickerEvent[] = Array.from({ length: 6 }, () => generateFallbackEvent());

function formatEvent(amount: number): TickerEvent {
  return {
    id: `rt-${Date.now()}-${Math.random()}`,
    text: `Ein Chatter hat gerade ${Math.round(amount)}€ Umsatz gemacht`,
    emoji: "🔥",
    timestamp: Date.now(),
  };
}

export default function LiveActivityTicker() {
  const [events, setEvents] = useState<TickerEvent[]>(() => Array.from({ length: 6 }, () => generateFallbackEvent()));
  const [currentIndex, setCurrentIndex] = useState(0);

  // Subscribe to realtime revenue inserts/updates
  useEffect(() => {
    const channel = supabase
      .channel("live-activity-ticker")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_revenue" },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord?.amount && Number(newRecord.amount) > 0) {
            const evt = formatEvent(Math.round(Number(newRecord.amount)));
            setEvents((prev) => [evt, ...prev].slice(0, 8));
            setCurrentIndex(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Inject a new generated event every 15-30s to keep it alive
  useEffect(() => {
    const interval = setInterval(() => {
      const evt = generateFallbackEvent();
      setEvents((prev) => [evt, ...prev].slice(0, 8));
    }, 15000 + Math.random() * 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [events.length]);

  const current = events[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-lg bg-secondary/50 border border-border/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-accent shrink-0 animate-pulse" />
        <span className="text-[10px] text-accent font-semibold uppercase tracking-wider shrink-0">Live</span>
        <div className="h-3 w-px bg-border/50 shrink-0" />
        <div className="relative flex-1 h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + currentIndex}
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
  );
}
