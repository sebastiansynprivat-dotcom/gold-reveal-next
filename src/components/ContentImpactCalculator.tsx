import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  /** projected monthly revenue (gross) based on current trend */
  projectedMonth: number;
  /** model commission percentage (0-100) */
  commissionPct: number;
  /** model currency code */
  currency: string;
  language?: "de" | "en";
}

const COPY = {
  de: {
    title: "Was ein neues Set bewirken könnte",
    subtitle: "Eine kleine Schätzung — keine Garantie, aber realistisch nach deiner aktuellen Performance.",
    sets: (n: number) => `${n} ${n === 1 ? "neues Set" : "neue Sets"} diesen Monat`,
    couldAdd: "Könnte zusätzlich bringen",
    netHint: "Dein Anteil",
    disclaimer: "Schätzung basierend auf deinem aktuellen Monatstrend. Wert variiert je nach Content & Plattform.",
    ideaCta: "Set-Idee mit dem Team besprechen",
  },
  en: {
    title: "What one new set could bring you",
    subtitle: "A rough estimate — not a promise, but realistic based on your current trend.",
    sets: (n: number) => `${n} new ${n === 1 ? "set" : "sets"} this month`,
    couldAdd: "Could add",
    netHint: "Your share",
    disclaimer: "Estimate based on your current monthly trend. Real impact varies by content & platform.",
    ideaCta: "Discuss set idea with the team",
  },
};

export default function ContentImpactCalculator({
  projectedMonth,
  commissionPct,
  currency,
  language = "de",
}: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const [sets, setSets] = useState(2);

  const { low, high, netLow, netHigh } = useMemo(() => {
    // Per-set range scales with current performance, with sensible floors
    // so new models still get a meaningful, motivating number.
    const perSetLow = Math.max(200, projectedMonth * 0.04);
    const perSetHigh = Math.max(450, projectedMonth * 0.08);
    const l = Math.round((perSetLow * sets) / 10) * 10;
    const h = Math.round((perSetHigh * sets) / 10) * 10;
    return {
      low: l,
      high: h,
      netLow: Math.round((l * commissionPct) / 100 / 10) * 10,
      netHigh: Math.round((h * commissionPct) / 100 / 10) * 10,
    };
  }, [sets, projectedMonth, commissionPct]);

  const fmt = (v: number) => {
    const locale = lang === "en" ? "en-US" : "de-DE";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `${v} ${currency}`;
    }
  };

  return (
    <section
      data-tour="impact"
      className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow relative overflow-hidden"
    >
      {/* Soft golden aurora */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="flex items-center gap-2 relative">
        <Camera className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">{copy.title}</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2 relative">{copy.subtitle}</p>

      {/* Slider */}
      <div className="space-y-3 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{copy.sets(sets)}</span>
          <span className="text-xl font-bold text-gold-gradient tabular-nums">+{sets}</span>
        </div>
        <Slider
          value={[sets]}
          min={1}
          max={4}
          step={1}
          onValueChange={(v) => setSets(v[0])}
          className="[&_[role=slider]]:border-accent [&_[role=slider]]:bg-accent [&_[role=slider]]:shadow-[0_0_12px_hsl(43_56%_52%/0.6)] [&>span:first-child>span]:bg-accent"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/70">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>

      {/* Result card */}
      <motion.div
        key={`${sets}-${low}-${high}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card-subtle rounded-xl p-4 relative gold-border-glow"
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-accent" /> {copy.couldAdd}
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-gold-gradient-shimmer mt-1 tabular-nums">
          +{fmt(low)} – +{fmt(high)}
        </p>
        {commissionPct > 0 && (
          <p className="text-xs text-emerald-400 mt-1 tabular-nums">
            {copy.netHint}: +{fmt(netLow)} – +{fmt(netHigh)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">
          {copy.disclaimer}
        </p>
      </motion.div>

      <p className={cn(
        "text-[11px] text-center text-muted-foreground/80 italic relative inline-flex items-center justify-center gap-1 w-full"
      )}>
        <Sparkles className="h-3 w-3 text-accent" />
        {copy.ideaCta}
      </p>
    </section>
  );
}
