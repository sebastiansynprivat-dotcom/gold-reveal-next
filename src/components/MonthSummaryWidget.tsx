import { useMemo } from "react";
import { motion } from "framer-motion";
import { endOfMonth, differenceInDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { Target, CalendarClock, TrendingUp } from "lucide-react";

interface MonthSummaryWidgetProps {
  monthlyRevenue: number;
  rate: number;
  tierName: string;
  tierEmoji: string;
}

export default function MonthSummaryWidget({ monthlyRevenue, rate, tierName, tierEmoji }: MonthSummaryWidgetProps) {
  const today = new Date();
  const monthEnd = endOfMonth(today);
  const daysLeft = differenceInDays(monthEnd, today);
  const dayOfMonth = today.getDate();
  const totalDays = monthEnd.getDate();
  const progressPercent = Math.round((dayOfMonth / totalDays) * 100);

  const projected = useMemo(() => {
    if (dayOfMonth <= 1) return monthlyRevenue;
    return Math.round((monthlyRevenue / dayOfMonth) * totalDays);
  }, [monthlyRevenue, dayOfMonth, totalDays]);

  const projectedEarnings = Math.round(projected * rate);

  // SVG circle progress
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card-subtle rounded-xl p-4 card-inner-glow"
    >
      <p className="text-xs font-medium text-muted-foreground mb-3">Dein Monat auf einen Blick</p>
      <div className="flex items-center gap-5">
        {/* Progress Ring */}
        <div className="relative shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke="hsl(0, 0%, 12%)"
              strokeWidth="6"
            />
            <motion.circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke="hsl(43, 76%, 46%)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-foreground">{progressPercent}%</span>
            <span className="text-[9px] text-muted-foreground">des Monats</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-accent shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Hochrechnung</p>
              <p className="text-sm font-bold text-foreground">{projected.toLocaleString("de-DE")}€</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-accent shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Proj. Verdienst</p>
              <p className="text-sm font-bold text-gold-gradient">{projectedEarnings.toLocaleString("de-DE")}€</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              Noch <span className="text-foreground font-semibold">{daysLeft} Tage</span> bis Monatsende
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
