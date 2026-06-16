import { motion } from "framer-motion";
import { ImagePlus, Sparkles, TrendingUp, Infinity as InfinityIcon, Camera } from "lucide-react";

interface Props {
  language?: "de" | "en";
}

const COPY = {
  de: {
    title: "Lifestyle & Feed-Content",
    subtitle:
      "Regelmäßig neue Bilder sind unser Traffic-Treibstoff – mehr Posts, mehr Reichweite, mehr Umsatz.",
    minimumLabel: "Minimum",
    minimumUnit: "Bilder",
    minimumHint: "als Grundstock im Pool",
    constantLabel: "Konstant nachliefern",
    constantHint: "Je frischer der Feed, desto mehr Augen auf deinen Content.",
    why: "Warum das wirkt",
    benefit1Title: "Mehr Traffic",
    benefit1Desc: "Neue Posts erreichen ständig neue Zielgruppen.",
    benefit2Title: "Mehr Umsatz",
    benefit2Desc: "Mehr Klicks auf dein Profil = mehr zahlende Fans.",
    benefit3Title: "Algorithmus-Boost",
    benefit3Desc: "Plattformen pushen aktive Creator nach oben.",
    cta: "Lade deine neuesten Bilder hoch & halte den Feed lebendig.",
  },
  en: {
    title: "Lifestyle & feed content",
    subtitle:
      "Fresh photos are our traffic fuel – more posts, more reach, more revenue.",
    minimumLabel: "Minimum",
    minimumUnit: "photos",
    minimumHint: "as a base library",
    constantLabel: "Keep them coming",
    constantHint: "The fresher your feed, the more eyes land on your content.",
    why: "Why it works",
    benefit1Title: "More traffic",
    benefit1Desc: "New posts constantly reach new audiences.",
    benefit2Title: "More revenue",
    benefit2Desc: "More clicks on your profile = more paying fans.",
    benefit3Title: "Algorithm boost",
    benefit3Desc: "Platforms push active creators to the top.",
    cta: "Upload your latest photos and keep the feed alive.",
  },
};

const POLAROIDS = [
  { rotate: -6, top: 6, accent: false },
  { rotate: 3, top: 0, accent: true },
  { rotate: -2, top: 10, accent: false },
  { rotate: 5, top: 2, accent: false },
  { rotate: -4, top: 8, accent: false },
];

export default function LifestyleContentSection({ language = "de" }: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];

  return (
    <section className="glass-card rounded-2xl p-5 space-y-5 card-inner-glow relative overflow-hidden">
      {/* Aurora glows */}
      <div className="pointer-events-none absolute -top-20 -left-16 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-12 h-56 w-56 rounded-full bg-accent/5 blur-3xl" />

      {/* Header */}
      <div className="relative space-y-1.5">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.subtitle}</p>
      </div>

      {/* Hero: stacked polaroid strip + 200 counter */}
      <div className="relative rounded-xl bg-gradient-to-br from-accent/8 via-transparent to-accent/5 border border-accent/20 p-4 overflow-hidden">
        {/* faint scanlines / texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 8px)",
          }}
        />

        <div className="relative flex items-center gap-4">
          {/* Polaroid stack */}
          <div className="relative h-24 w-32 sm:w-40 shrink-0">
            {POLAROIDS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, rotate: 0 }}
                animate={{ opacity: 1, y: p.top, rotate: p.rotate }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                className={[
                  "absolute left-1/2 top-1/2 -ml-9 -mt-12 h-20 w-16",
                  "rounded-md border shadow-lg backdrop-blur-sm",
                  p.accent
                    ? "border-accent/60 bg-gradient-to-br from-accent/40 via-accent/20 to-transparent z-20"
                    : "border-border/60 bg-gradient-to-br from-secondary/60 to-secondary/20 z-10",
                ].join(" ")}
                style={{ marginLeft: -32 + i * 18 }}
              >
                <div className="m-1.5 h-12 rounded-sm bg-gradient-to-br from-foreground/10 to-foreground/5" />
                <div className="mx-2 mt-1 flex items-center gap-1">
                  <Camera className="h-2 w-2 text-foreground/40" />
                  <div className="h-1 flex-1 rounded-full bg-foreground/10" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Counter */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-accent/90 font-semibold">
              {copy.minimumLabel}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-4xl sm:text-5xl font-black text-gold-gradient-shimmer tabular-nums leading-none">
                200
              </span>
              <span className="text-base font-bold text-foreground/80">+</span>
              <span className="text-xs text-muted-foreground ml-1">{copy.minimumUnit}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {copy.minimumHint}
            </p>
          </div>
        </div>
      </div>

      {/* Constant upload reminder */}
      <div className="relative flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5">
        <InfinityIcon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
            {copy.constantLabel}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            {copy.constantHint}
          </p>
        </div>
      </div>

      {/* Why it works */}
      <div className="relative space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-0.5">
          {copy.why}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { title: copy.benefit1Title, desc: copy.benefit1Desc, Icon: TrendingUp },
            { title: copy.benefit2Title, desc: copy.benefit2Desc, Icon: Sparkles },
            { title: copy.benefit3Title, desc: copy.benefit3Desc, Icon: ImagePlus },
          ].map(({ title, desc, Icon }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="glass-card-subtle rounded-xl p-3 border border-border/40"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-accent" />
                <p className="text-xs font-semibold text-foreground">{title}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="relative text-[11px] text-center text-muted-foreground/80 italic inline-flex items-center justify-center gap-1 w-full">
        <Sparkles className="h-3 w-3 text-accent" />
        {copy.cta}
      </p>
    </section>
  );
}
