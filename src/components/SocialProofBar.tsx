import { motion } from "framer-motion";
import { Star, Users, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const SocialProofBar = () => {
  const [activeCount, setActiveCount] = useState(347);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="w-full max-w-3xl mx-auto mb-8"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        {/* Trustpilot */}
        <a
          href="https://de.trustpilot.com/review/she-x.de"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 glass-card-subtle rounded-xl px-4 py-2.5 hover:scale-[1.03] transition-transform cursor-pointer"
        >
          <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
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
        <div className="flex items-center gap-2 glass-card-subtle rounded-xl px-4 py-2.5">
          <div className="relative">
            <Users className="w-4 h-4 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="text-foreground font-semibold text-sm">{activeCount}</span>
          <span className="text-muted-foreground text-xs">aktive Chatter</span>
        </div>

        {/* Testimonial */}
        <div className="flex items-center gap-2 glass-card-subtle rounded-xl px-4 py-2.5 max-w-[260px]">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-foreground/80 italic leading-snug">
            "Innerhalb von 2 Wochen meinen ersten Umsatz gemacht!"
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SocialProofBar;
