import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles, TrendingUp, Repeat, BookOpen, ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Props {
  /** projected monthly revenue (gross) based on current trend */
  projectedMonth: number;
  /** model commission percentage (0-100) */
  commissionPct: number;
  /** model currency code */
  currency: string;
  language?: "de" | "en";
  /** Optional URL to content instructions (e.g. Telegram channel for SYN models) */
  contentInstructionsUrl?: string;
}

const COPY = {
  de: {
    title: "Was neue Sets bewirken können",
    subtitle:
      "Eine vorsichtige Schätzung – realistisch, basierend auf deinem aktuellen Trend.",
    perMonth: "/ Monat",
    couldAdd: "Könnte zusätzlich bringen",
    recurring: "Pro Monat fortlaufend",
    recurringHint:
      "Sets sind kein Einmal-Boost – sie verkaufen sich Monat für Monat weiter und stapeln sich auf.",
    yourShare: "Dein Anteil",
    setLabel: (n: number) => (n === 1 ? "1 Set" : `${n} Sets`),
    sliderHint: "Schiebe den Regler – sieh, was deine nächsten Sets bringen können.",
    disclaimer:
      "Schätzwerte. Der reale Impact hängt von Content-Qualität, Plattform und Zielgruppe ab.",
    ideaCta: "Set-Idee mit dem Team besprechen",
    instructionsTitle: "So holst du das Maximum aus jedem Set",
    instructionsCta: "Hier Content Instructions anschauen",
  },
  en: {
    title: "What new sets could bring you",
    subtitle:
      "A careful estimate – realistic, based on your current monthly trend.",
    perMonth: "/ month",
    couldAdd: "Could add",
    recurring: "Recurring every month",
    recurringHint:
      "Sets aren't a one-time boost – they keep selling month after month and stack up.",
    yourShare: "Your share",
    setLabel: (n: number) => (n === 1 ? "1 set" : `${n} sets`),
    sliderHint: "Drag the slider – see what your next sets could bring.",
    disclaimer:
      "Estimates only. Real impact depends on content quality, platform and audience.",
    ideaCta: "Discuss set idea with the team",
    instructionsTitle: "How to get the most out of every set",
    instructionsCta: "View content instructions here",
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

  // 1 set ≈ 50–150 of the model's currency, lightly scaled with trend.
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

  const low = perSet.low * sets;
  const high = perSet.high * sets;
  const netLow = (low * commissionPct) / 100;
  const netHigh = (high * commissionPct) / 100;

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

      {/* Result card */}
      <motion.div
        key={sets}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-xl p-4 bg-accent/10 border border-accent/40 gold-border-glow text-center"
      >
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{copy.couldAdd}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold tabular-nums">
            +{sets}
          </span>
          <span>{copy.setLabel(sets)}</span>
        </div>
        <p className="mt-1 text-2xl font-bold text-gold-gradient tabular-nums leading-tight">
          +{fmt(low)} – {fmt(high)}
        </p>
        <p className="text-[10px] text-muted-foreground/80">{copy.perMonth}</p>
        {commissionPct > 0 && (
          <p className="mt-1.5 text-xs text-emerald-400 tabular-nums">
            {copy.yourShare}: +{fmt(netLow)} – {fmt(netHigh)}
          </p>
        )}
      </motion.div>

      {/* Slider */}
      <div className="relative space-y-2 px-1">
        <Slider
          value={[sets]}
          onValueChange={(v) => setSets(v[0])}
          min={1}
          max={6}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/70 tabular-nums px-0.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSets(n)}
              className={[
                "tabular-nums transition-colors",
                sets === n ? "text-accent font-semibold" : "hover:text-foreground",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground/70">
          {copy.sliderHint}
        </p>
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
