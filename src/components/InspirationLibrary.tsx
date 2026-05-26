import { motion } from "framer-motion";
import { BookOpen, FileText, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const placeholderPdfs = [
  {
    icon: TrendingUp,
    title: "Vom Hi zum $135 Close",
    subtitle: "Echter Chat, Nachricht für Nachricht erklärt",
    accent: "from-amber-400/30 to-amber-600/5",
    pdf: "/pdfs/shex-chat-breakdown-01.pdf",
    badge: "NEU",
  },
  {
    icon: Sparkles,
    title: "Verkaufs-Skripte",
    subtitle: "Wort-für-Wort Vorlagen, die wirklich kaufen lassen",
    accent: "from-yellow-400/20 to-yellow-600/5",
    pdf: null,
    badge: null,
  },
  {
    icon: FileText,
    title: "Coaching Basics",
    subtitle: "Die Basics, die jeder Top-Chatter beherrscht",
    accent: "from-amber-300/20 to-amber-500/5",
    pdf: null,
    badge: null,
  },
];

export default function InspirationLibrary() {
  const handleClick = (item: typeof placeholderPdfs[number]) => {
    if (item.pdf) {
      window.open(item.pdf, "_blank", "noopener,noreferrer");
      return;
    }
    toast.info(`"${item.title}" – bald verfügbar`, {
      description: "Wir laden grade die PDFs hoch.",
    });
  };

  return (
    <motion.section
      data-section="inspiration"
      data-tour="inspiration"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="gold-gradient-border-animated rounded-2xl p-5 lg:p-6 pulse-glow relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/40 blur-lg rounded-full animate-pulse" />
            <BookOpen className="h-6 w-6 text-accent relative" />
          </div>
          <h3 className="text-base lg:text-lg font-bold text-foreground tracking-wide uppercase">
            Inspirations-Bibliothek
          </h3>
        </div>
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="shrink-0 rounded-full bg-accent/15 border border-accent/40 px-2.5 py-0.5 text-[10px] font-bold text-accent tracking-wider"
        >
          NEU
        </motion.span>
      </div>

      {/* Hook */}
      <p className="text-sm lg:text-base mb-4 leading-snug">
        <span className="text-muted-foreground">Chatter, die diese PDFs lesen, machen im Schnitt </span>
        <span className="text-gold-gradient font-bold">2× so viel Umsatz</span>
        <span className="text-muted-foreground"> wie der Durchschnitt.</span>
      </p>

      {/* PDF Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        {placeholderPdfs.map(({ icon: Icon, title, subtitle, accent }, i) => (
          <motion.button
            key={title}
            onClick={() => handleClick(title)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`group relative text-left rounded-xl border border-border/60 bg-gradient-to-br ${accent} bg-secondary/30 p-3 hover:border-accent/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all`}
          >
            <Icon className="h-5 w-5 text-accent mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-foreground leading-tight mb-1">{title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{subtitle}</p>
          </motion.button>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => handleClick("Bibliothek")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-black font-bold py-3 text-sm transition-[background-position] duration-500 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
      >
        Jetzt durchlesen
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.section>
  );
}
