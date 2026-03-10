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

const FALLBACK_EVENTS: TickerEvent[] = [
  { id: "f1", text: "Ein Chatter hat gerade 85€ Umsatz gemacht", emoji: "🔥", timestamp: Date.now() - 60000 },
  { id: "f2", text: "Streak fortgesetzt – 5 Tage in Folge!", emoji: "⚡", timestamp: Date.now() - 120000 },
  { id: "f3", text: "Ein Chatter hat gerade 210€ Umsatz gemacht", emoji: "💎", timestamp: Date.now() - 180000 },
  { id: "f4", text: "Tagesziel erreicht!", emoji: "🎯", timestamp: Date.now() - 240000 },
  { id: "f5", text: "Ein Chatter hat gerade 45€ Umsatz gemacht", emoji: "🔥", timestamp: Date.now() - 300000 },
];

function formatEvent(amount: number): TickerEvent {
  const isHigh = amount >= 200;
  return {
    id: `rt-${Date.now()}-${Math.random()}`,
    text: isHigh
      ? `Großer Umsatz! Ein Chatter hat ${amount}€ gemacht!`
      : `Ein Chatter hat gerade ${amount}€ Umsatz gemacht`,
    emoji: isHigh ? "💎" : "🔥",
    timestamp: Date.now(),
  };
}

export default function LiveActivityTicker() {
  const [events, setEvents] = useState<TickerEvent[]>(FALLBACK_EVENTS);
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
