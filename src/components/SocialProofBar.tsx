import { motion } from "framer-motion";
import { Star, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const CHATTERS_KEY = "social-proof-chatters";
const CHATTERS_LAST_SPOTS_KEY = "social-proof-last-spots";

const getPersistedChatters = (): number => {
  try {
    const stored = localStorage.getItem(CHATTERS_KEY);
    if (stored === null) {
      localStorage.setItem(CHATTERS_KEY, "347");
      return 347;
    }
    return parseInt(stored, 10);
  } catch {
    return 347;
  }
};

const syncChattersWithSpots = (): number => {
  try {
    const currentSpots = parseInt(localStorage.getItem("urgency-spots") || "6", 10);
    const lastSpots = parseInt(localStorage.getItem(CHATTERS_LAST_SPOTS_KEY) || String(currentSpots), 10);
    let chatters = getPersistedChatters();

    // If a spot was lost, add 1 chatter
    if (currentSpots < lastSpots) {
      chatters += 1;
      localStorage.setItem(CHATTERS_KEY, String(chatters));
    }
    localStorage.setItem(CHATTERS_LAST_SPOTS_KEY, String(currentSpots));
    return chatters;
  } catch {
    return 347;
  }
};

const SocialProofBar = () => {
  const [activeCount] = useState(syncChattersWithSpots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="w-full max-w-3xl mx-auto mb-4 md:mb-8 px-1"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-8">
        {/* Trustpilot */}
        <a
          href="https://de.trustpilot.com/review/she-x.de"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 sm:gap-2 glass-card-subtle rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 hover:scale-[1.03] transition-transform cursor-pointer"
        >
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 fill-emerald-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-semibold text-sm">4.8</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < 5 ? "text-emerald-400 fill-emerald-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-xs ml-1">Trustpilot</span>
          </div>
        </a>

        {/* Active chatters */}
        <div className="flex items-center gap-1.5 sm:gap-2 glass-card-subtle rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="relative">
            <Users className="w-4 h-4 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="text-foreground font-semibold text-sm">{activeCount}</span>
          <span className="text-muted-foreground text-xs">aktive Chatter</span>
        </div>

        {/* Testimonial */}
        <div className="flex items-center gap-1.5 sm:gap-2 glass-card-subtle rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 max-w-[220px] sm:max-w-[260px]">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-foreground/80 italic leading-snug">
            "Unglaublich das dieses Video kostenlos ist!"
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SocialProofBar;
