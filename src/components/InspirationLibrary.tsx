import { motion } from "framer-motion";
import { BookOpen, FileText, TrendingUp, Sparkles, ArrowRight, Check, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLibraryReads } from "@/hooks/useLibraryReads";

const placeholderPdfs = [
  {
    icon: TrendingUp,
    title: "Vom Hi zum 115 € Abschluss",
    subtitle: "Echter Chat, Nachricht für Nachricht erklärt",
    accent: "from-amber-400/30 to-amber-600/5",
    route: "/bibliothek/chat-breakdown-01",
    contentKey: "chat-breakdown-01",
    badge: "NEU",
  },
  {
    icon: Sparkles,
    title: "Verkaufs-Skripte",
    subtitle: "Wort-für-Wort Vorlagen, die wirklich kaufen lassen",
    accent: "from-yellow-400/20 to-yellow-600/5",
    route: "/bibliothek/verkaufs-skripte",
    contentKey: "sales-scripts",
    badge: "NEU",
  },
  {
    icon: FileText,
    title: "Coaching Basics",
    subtitle: "Die Basics, die jeder Top-Chatter beherrscht",
    accent: "from-amber-300/20 to-amber-500/5",
    route: "/bibliothek/coaching-basics",
    contentKey: "coaching-basics",
    badge: "NEU",
  },

];

export default function InspirationLibrary() {
  const navigate = useNavigate();
  const { reads } = useLibraryReads();

  const handleClick = (item: typeof placeholderPdfs[number]) => {
    if (item.route) {
      navigate(item.route);
      return;
    }
    toast.info(`"${item.title}" – bald verfügbar`, {
      description: "Wir laden grade die PDFs hoch.",
    });
  };

  const trackable = placeholderPdfs.filter((p) => p.contentKey);
  const doneCount = trackable.filter((p) => reads[p.contentKey!]?.completed_at).length;
  const totalCount = placeholderPdfs.length;
  const overallPct = Math.round((doneCount / totalCount) * 100);

  const ctaItem = placeholderPdfs[0];
  const ctaLabel = "Zur ganzen Bibliothek";


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
      <p className="text-sm lg:text-base mb-3 leading-snug">
        <span className="text-muted-foreground">Chatter, die diese PDFs lesen, machen im Schnitt </span>
        <span className="text-gold-gradient font-bold">5× so viel Umsatz</span>
        <span className="text-muted-foreground"> wie der Durchschnitt.</span>
      </p>

      {/* Progress overview */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
          {doneCount} / {totalCount} gelesen
        </span>
      </div>

      {/* PDF Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        {placeholderPdfs.map((item, i) => {
          const { icon: Icon, title, subtitle, accent, badge, contentKey } = item;
          const r = contentKey ? reads[contentKey] : undefined;
          const isDone = !!r?.completed_at;
          const pct = r?.progress_pct ?? 0;
          const inProgress = !isDone && pct > 0;

          return (
            <motion.button
              key={title}
              onClick={() => handleClick(item)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative text-left rounded-xl border bg-gradient-to-br ${accent} bg-secondary/30 p-3 transition-all ${
                isDone
                  ? "border-emerald-500/50 opacity-80"
                  : "border-border/60 hover:border-accent/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.25)]"
              }`}
            >
              {/* Top-right status */}
              {isDone ? (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5">
                  <Check className="h-2.5 w-2.5" />
                  GELESEN
                </span>
              ) : inProgress ? (
                <span className="absolute top-2 right-2 rounded-full bg-accent/20 border border-accent/50 text-accent text-[9px] font-bold px-1.5 py-0.5">
                  {pct}%
                </span>
              ) : badge ? (
                <span className="absolute top-2 right-2 rounded-full bg-accent text-black text-[9px] font-bold px-1.5 py-0.5 tracking-wider">
                  {badge}
                </span>
              ) : null}

              <Icon className={`h-5 w-5 mb-2 group-hover:scale-110 transition-transform ${isDone ? "text-emerald-400" : "text-accent"}`} />
              <p className="text-sm font-bold text-foreground leading-tight mb-1">{title}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{subtitle}</p>
            </motion.button>
          );
        })}
      </div>

      {/* CTA */}
      <motion.button
        onClick={() => navigate("/bibliothek")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-black font-bold py-3 text-sm transition-[background-position] duration-500 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.section>
  );
}
