import { useMemo } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles, TrendingUp, Repeat } from "lucide-react";

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
    title: "Was neue Sets bewirken können",
    subtitle:
      "Eine vorsichtige Schätzung – realistisch, basierend auf deinem aktuellen Trend.",
    perMonth: "/ Monat",
    couldAdd: "Könnte zusätzlich bringen",
    netHint: "Dein Anteil",
    recurring: "Pro Monat fortlaufend",
    recurringHint:
      "Sets sind kein Einmal-Boost – sie verkaufen sich Monat für Monat weiter und stapeln sich auf.",
    yourShare: "Dein Anteil",
    setLabel: (n: number) => (n === 1 ? "1 Set" : `${n} Sets`),
    disclaimer:
      "Schätzwerte. Der reale Impact hängt von Content-Qualität, Plattform und Zielgruppe ab.",
    ideaCta: "Set-Idee mit dem Team besprechen",
  },
  en: {
    title: "What new sets could bring you",
    subtitle:
      "A careful estimate – realistic, based on your current monthly trend.",
    perMonth: "/ month",
    couldAdd: "Could add",
    netHint: "Your share",
    recurring: "Recurring every month",
    recurringHint:
      "Sets aren't a one-time boost – they keep selling month after month and stack up.",
    yourShare: "Your share",
    setLabel: (n: number) => (n === 1 ? "1 set" : `${n} sets`),
    disclaimer:
      "Estimates only. Real impact depends on content quality, platform and audience.",
    ideaCta: "Discuss set idea with the team",
  },
};

const TIERS = [1, 2, 3, 4, 5, 6];

export default function ContentImpactCalculator({
  projectedMonth,
  commissionPct,
  currency,
  language = "de",
}: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];

  // Per-set floor: 1 set ≈ 50–150 of the model's currency (halved from before).
  // Light scaling with current monthly performance so top earners still see
  // meaningful numbers, but never blown up.
  const perSet = useMemo(() => {
    const low = Math.max(50, projectedMonth * 0.02);
    const high = Math.max(150, projectedMonth * 0.04);
    return { low, high };
  }, [projectedMonth]);

  const fmt = (v: number) => {
    const locale = lang === "en" ? "en-US" : "de-DE";
    const rounded = Math.round(v / 10) * 10;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || "EUR",
        maximumFractionDigits: 0,
      }).format(rounded);
    } catch {
      return `${rounded} ${currency}`;
    }
  };

  return (
    <section
      data-tour="impact"
      className="glass-card rounded-2xl p-5 space-y-4 card-inner-glow relative overflow-hidden"
    >
      {/* Soft golden aurora */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-accent/5 blur-3xl" />

      <div className="flex items-center gap-2 relative">
        <Camera className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">{copy.title}</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2 relative">{copy.subtitle}</p>

      {/* Recurring callout */}
      <div className="relative flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2">
        <Repeat className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
            {copy.recurring}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            {copy.recurringHint}
          </p>
        </div>
      </div>

      {/* Tier grid – 6 stages */}
      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TIERS.map((n, i) => {
          const low = perSet.low * n;
          const high = perSet.high * n;
          const netLow = (low * commissionPct) / 100;
          const netHigh = (high * commissionPct) / 100;
          const featured = n === 2; // gently highlight the "sweet spot"
          return (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={[
                "relative rounded-xl p-3 overflow-hidden transition-colors",
                featured
                  ? "bg-accent/10 border border-accent/40 gold-border-glow"
                  : "glass-card-subtle border border-border/40",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {copy.setLabel(n)}
                </span>
                <span className="text-base font-bold text-gold-gradient tabular-nums">
                  +{n}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground tabular-nums leading-tight">
                +{fmt(low)} – {fmt(high)}
              </p>
              <p className="text-[10px] text-muted-foreground/80 -mt-0.5">
                {copy.perMonth}
              </p>
              {commissionPct > 0 && (
                <p className="mt-1 text-[10px] text-emerald-400 tabular-nums leading-tight">
                  {copy.yourShare}: +{fmt(netLow)} – {fmt(netHigh)}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="relative flex items-start gap-1.5">
        <TrendingUp className="h-3 w-3 text-accent shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          {copy.disclaimer}
        </p>
      </div>

      <p className="text-[11px] text-center text-muted-foreground/80 italic relative inline-flex items-center justify-center gap-1 w-full">
        <Sparkles className="h-3 w-3 text-accent" />
        {copy.ideaCta}
      </p>
    </section>
  );
}
